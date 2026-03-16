import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { verifyTabletSessionToken } from '../domain/security/displayTabletSession.js';
import { createHouseholdRepository } from '../data/repositories/createHouseholdRepository.js';

const normalize = (value: string | undefined): string => (value && value.trim().length > 0 ? value.trim() : '');
const getStringClaim = (payload: Record<string, unknown>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

const validateActiveTabletSession = async (
  tabletId: string,
  householdId: string,
): Promise<boolean> => {
  const repository = createHouseholdRepository();
  const tablet = await repository.getDisplayTabletById(tabletId, householdId);

  if (!tablet) {
    return false;
  }

  return tablet.status === 'active' && tablet.revokedAt === null;
};

/**
 * Decode a JWT token (simple base64 decode for development)
 * In production, this should use proper JWT verification with a secret key
 */
const decodeJWT = (token: string): Record<string, unknown> | null => {
  try {
    // Split the JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      console.log('[Auth] JWT does not have 3 parts, token:', token.substring(0, 50) + '...');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    console.log('[Auth] JWT decoded successfully, claims:', Object.keys(parsed));
    return parsed;
  } catch (error) {
    console.error('[Auth] JWT decode failed:', error);
    return null;
  }
};

/**
 * Unified authentication middleware
 * Supports:
 * 1. User authentication via Bearer token JWT or x-user-* headers
 * 2. Tablet authentication via x-tablet-session-token
 */
export const registerAuthContext = (fastify: FastifyInstance): void => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Public endpoints that don't require authentication
    const publicEndpoints = [
      '/health',
      '/v1/medications/autocomplete',
      '/v1/invitations/accept-link',
      '/v1/households/invitations/resolve',
      '/v1/households/invitations/accept',
      '/v1/display-tablets/authenticate', // Tablet setup authentication endpoint
      '/v1/display-tablets/session/refresh',
    ];
    if (publicEndpoints.some(endpoint => request.url.startsWith(endpoint))) {
      return;
    }

    // Try tablet authentication first (Method 1: via session token JWT)
    const tabletSessionToken = normalize(request.headers['x-tablet-session-token'] as string | undefined);

    if (tabletSessionToken) {
      const tabletPayload = verifyTabletSessionToken(tabletSessionToken);

      if (tabletPayload) {
        const isActiveSession = await validateActiveTabletSession(
          tabletPayload.tabletId,
          tabletPayload.householdId,
        );

        if (!isActiveSession) {
          fastify.log.warn({
            tabletId: tabletPayload.tabletId,
            householdId: tabletPayload.householdId,
            path: request.url,
          }, 'Rejected tablet session token for inactive or revoked tablet');

          return reply.status(401).send({
            status: 'error',
            message: 'Tablet session is no longer valid.',
          });
        }

        // Valid tablet session - set tablet context
        request.tabletSession = {
          tabletId: tabletPayload.tabletId,
          householdId: tabletPayload.householdId,
          permissions: tabletPayload.permissions,
          isTablet: true,
        };

        fastify.log.info({
          tabletId: tabletPayload.tabletId,
          householdId: tabletPayload.householdId,
          path: request.url
        }, 'Tablet authenticated via session token');

        return; // Tablet is authenticated
      } else {
        // Invalid tablet token
        fastify.log.warn({
          token: tabletSessionToken.substring(0, 20) + '...',
          path: request.url
        }, 'Invalid tablet session token');

        return reply.status(401).send({
          status: 'error',
          message: 'Invalid or expired tablet session token.',
        });
      }
    }

    // Fall back to user authentication
    let userContext: {
      userId: string;
      email: string;
      firstName?: string;
      lastName?: string;
    } | null = null;

    // Method 1: Extract from Bearer token
    const authHeader = request.headers.authorization as string | undefined;
    console.log('[Auth] Authorization header present:', !!authHeader);
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.substring(7);
      console.log('[Auth] Bearer token length:', token.length);
      try {
        const decoded = decodeJWT(token);
        if (decoded) {
          console.log('[Auth] JWT decoded successfully');
          const firstName = getStringClaim(decoded, 'firstName', 'given_name', 'first_name');
          const lastName = getStringClaim(decoded, 'lastName', 'family_name', 'last_name');
          const userId = getStringClaim(decoded, 'sub', 'userId', 'user_id');
          const email = getStringClaim(decoded, 'email');
          console.log('[Auth] Extracted claims - userId:', userId, 'email:', email, 'firstName:', firstName, 'lastName:', lastName);

          userContext = {
            userId: userId || '',
            email: email || '',
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
          };
        } else {
          console.log('[Auth] JWT decode returned null');
          // Development fallback for Google OAuth tokens
          // Google OAuth access tokens start with 'ya29.' and are not JWTs
          if (token.startsWith('ya29.')) {
            console.log('[Auth] Detected Google OAuth token, using development fallback');
            // Use the test user that we added to in-memory database
            // This matches the user from the mobile app logs
            userContext = {
              userId: '111325199791749121741',
              email: 'ben.cohen.solal@gmail.com',
              firstName: 'Ben',
              lastName: 'Cohen Solal',
            };
          }
        }
      } catch (error) {
        console.error('[Auth] JWT verification failed:', error);
      }
    } else if (authHeader) {
      console.log('[Auth] Authorization header exists but not Bearer:', authHeader.substring(0, 50) + '...');
    }

    // Method 2: Fallback to x-user-* headers (if JWT absent or invalid)
    if (!userContext) {
      const userId = normalize(request.headers['x-user-id'] as string | undefined);
      const email = normalize(request.headers['x-user-email'] as string | undefined);
      const firstName = normalize(request.headers['x-user-first-name'] as string | undefined);
      const lastName = normalize(request.headers['x-user-last-name'] as string | undefined);

      if (userId && email) {
        userContext = { userId, email, firstName, lastName };
      }
    }

    // Verify that we have a valid user context
    if (!userContext?.userId || !userContext?.email) {
      // Development bypass: if x-dev-user-id header is present, use it
      const devUserId = normalize(request.headers['x-dev-user-id'] as string | undefined);
      const devEmail = normalize(request.headers['x-dev-user-email'] as string | undefined);

      if (devUserId && devEmail) {
        console.log('[Auth] Using development bypass for user:', devUserId);
        userContext = {
          userId: devUserId,
          email: devEmail,
          firstName: normalize(request.headers['x-dev-user-first-name'] as string | undefined),
          lastName: normalize(request.headers['x-dev-user-last-name'] as string | undefined),
        };
      } else {
        return reply.status(401).send({
          status: 'error',
          message: 'Authentication required. Provide either Bearer token, x-user-* headers, or x-tablet-session-token.',
        });
      }
    }

    // Attach user context to request
    request.requester = {
      userId: userContext.userId,
      email: userContext.email,
      firstName: userContext.firstName || '',
      lastName: userContext.lastName || '',
    };
  });
};

/**
 * Middleware to require write permission
 * This will block tablet sessions from write operations
 */
export const requireWritePermission = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  // If this is a tablet session, deny write access
  if (request.tabletSession) {
    return reply.status(403).send({
      status: 'error',
      message: 'Tablets have read-only access. Write operations are not permitted.',
    });
  }

  // User sessions have write permission by default
  if (!request.requester) {
    return reply.status(401).send({
      status: 'error',
      message: 'Authentication required.',
    });
  }
};

/**
 * Middleware to require user authentication (blocks tablets)
 * Use this for routes that should only be accessible to authenticated users, not tablets
 */
export const requireUserAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.requester) {
    return reply.status(401).send({
      status: 'error',
      message: 'This operation requires user authentication.',
    });
  }
};
