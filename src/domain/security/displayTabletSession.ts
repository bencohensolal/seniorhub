import { createHmac } from 'node:crypto';
import { env } from '../../config/env.js';

const SESSION_TTL_HOURS = 8;

interface TabletSessionPayload {
  tabletId: string;
  householdId: string;
  permissions: string[];
  exp: number; // Expiration timestamp (seconds since epoch)
}

/**
 * Generate a session token for an authenticated display tablet
 * The token is valid for 8 hours and grants read-only access
 */
export const generateTabletSessionToken = (tabletId: string, householdId: string): string => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const exp = now + SESSION_TTL_HOURS * 3600; // Expiration time in seconds

  const payload: TabletSessionPayload = {
    tabletId,
    householdId,
    permissions: ['read'],
    exp,
  };

  // Create a simple signed token: base64(payload).signature
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', env.TOKEN_SIGNING_SECRET)
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
};

/**
 * Verify and decode a tablet session token
 * Returns the payload if valid, null otherwise
 */
export const verifyTabletSessionToken = (token: string): TabletSessionPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [payloadStr, signature] = parts;
    if (!payloadStr || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', env.TOKEN_SIGNING_SECRET)
      .update(payloadStr)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload: TabletSessionPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString('utf-8')
    );

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    // Validate payload structure
    if (!payload.tabletId || !payload.householdId || !Array.isArray(payload.permissions)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
};

/**
 * Check if a session token grants read permission
 */
export const hasReadPermission = (payload: TabletSessionPayload): boolean => {
  return payload.permissions.includes('read');
};

/**
 * Check if a session token grants write permission (should always be false for tablets)
 */
export const hasWritePermission = (payload: TabletSessionPayload): boolean => {
  return payload.permissions.includes('write');
};
