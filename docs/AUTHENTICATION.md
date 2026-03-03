# Authentication System

## Overview

The Senior Hub backend uses a **unified authentication middleware** that supports two authentication methods:

1. **Bearer Token (JWT)** - Modern, standard authentication
2. **x-user-* Headers** - Legacy authentication for backwards compatibility

Both methods are supported simultaneously, with the middleware attempting JWT authentication first and falling back to header-based authentication if needed.

## Architecture

### Middleware: `src/plugins/authContext.ts`

The `registerAuthContext` function registers a Fastify `preHandler` hook that:

1. **Checks if the endpoint is public** (exempts authentication)
2. **Attempts JWT authentication** from `Authorization: Bearer {token}` header
3. **Falls back to x-user-* headers** if JWT is absent or invalid
4. **Validates user context** and returns 401 if authentication fails
5. **Attaches `request.requester`** with user information for use in route handlers

### Registration

The middleware is registered globally in `src/app.ts`:

```typescript
registerAuthContext(app);
app.register(householdsRoutes);
```

This ensures all household endpoints automatically have authentication enforced.

## Authentication Methods

### Method 1: Bearer Token (JWT)

**Recommended for production use.**

```bash
curl -H "Authorization: Bearer {jwt_token}" \
     https://api.seniorhub.app/v1/households/{id}/tasks
```

#### JWT Payload Structure

The JWT token should contain the following claims:

```json
{
  "sub": "user-id",              // or "userId" or "user_id"
  "email": "user@example.com",
  "given_name": "John",          // or "firstName" or "first_name" (optional)
  "family_name": "Doe"           // or "lastName" or "last_name" (optional)
}
```

The middleware extracts user information from these standard JWT claims:
- `sub`, `userId`, or `user_id` → `requester.userId`
- `email` → `requester.email`
- `given_name`, `firstName`, `first_name` → `requester.firstName`
- `family_name`, `lastName`, `last_name` → `requester.lastName`

#### Current Implementation Note

⚠️ **Development Mode**: The current JWT implementation uses simple base64 decoding without signature verification. This is suitable for development but **must be enhanced for production** with proper JWT verification using a secret key or public key validation.

### Method 2: x-user-* Headers (Legacy)

**Maintained for backwards compatibility.**

```bash
curl -H "x-user-id: user123" \
     -H "x-user-email: user@example.com" \
     -H "x-user-first-name: John" \
     -H "x-user-last-name: Doe" \
     https://api.seniorhub.app/v1/households/{id}/tasks
```

#### Required Headers

- `x-user-id` - User's unique identifier (required)
- `x-user-email` - User's email address (required)
- `x-user-first-name` - User's first name (optional)
- `x-user-last-name` - User's last name (optional)

## Public Endpoints

The following endpoints **do not require authentication**:

- `/health` - Health check endpoint
- `/v1/medications/autocomplete` - Public medication search
- `/v1/invitations/accept-link` - Invitation acceptance
- `/v1/households/invitations/resolve` - Invitation resolution
- `/v1/households/invitations/accept` - Accept invitation

## Error Responses

### 401 Unauthorized

Returned when:
- No authentication credentials are provided
- Bearer token is malformed or missing required claims
- x-user-* headers are missing required fields (userId or email)

**Response:**
```json
{
  "status": "error",
  "message": "Authentication required. Provide either Bearer token or x-user-* headers."
}
```

## Request Context

After successful authentication, the middleware attaches user information to the request:

```typescript
interface FastifyRequest {
  requester: {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}
```

All route handlers and use cases can access this via `request.requester`.

## Testing

### Manual Testing

Use the provided test script to verify both authentication methods:

```bash
./test-auth-middleware.sh
```

Or test manually:

```bash
# Test with Bearer token
curl -H "Authorization: Bearer eyJ...token..." \
     http://localhost:3000/v1/households/{id}/tasks

# Test with x-user-* headers
curl -H "x-user-id: user123" \
     -H "x-user-email: test@example.com" \
     http://localhost:3000/v1/households/{id}/tasks

# Test without authentication (should return 401)
curl http://localhost:3000/v1/households/{id}/tasks
```

### Integration Tests

See `src/routes/households.integration.test.ts` for examples of authenticated requests in tests.

## Migration Guide

### For Frontend/Mobile Clients

If you're currently using x-user-* headers, you can:

**Option 1: Keep using x-user-* headers** (no changes needed)
```typescript
fetch(url, {
  headers: {
    'x-user-id': userId,
    'x-user-email': email,
    // ...
  }
})
```

**Option 2: Migrate to Bearer tokens** (recommended)
```typescript
fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  }
})
```

**Option 3: Hybrid approach** (during migration)
```typescript
fetch(url, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    // Fallback headers
    'x-user-id': userId,
    'x-user-email': email,
  }
})
```

## Security Considerations

### Current State (Development)

- ✅ Dual authentication method support
- ✅ Consistent user context across all endpoints
- ✅ Request logging with PII redaction
- ⚠️ JWT signature not verified (base64 decode only)

### Production Requirements

Before deploying to production, implement:

1. **JWT Signature Verification**
   - Use a JWT library (e.g., `jsonwebtoken`, `@fastify/jwt`)
   - Verify signatures with secret key or public key
   - Validate token expiration

2. **Token Rotation**
   - Implement refresh token mechanism
   - Short-lived access tokens (15-60 minutes)
   - Long-lived refresh tokens (days/weeks)

3. **Rate Limiting**
   - Prevent brute force attacks
   - Limit failed authentication attempts

4. **HTTPS Only**
   - Enforce TLS/SSL in production
   - Never transmit tokens over HTTP

## Future Enhancements

- [ ] Add JWT signature verification
- [ ] Implement token refresh mechanism
- [ ] Add API key support for service-to-service calls
- [ ] Support OAuth2/OIDC providers (Auth0, Firebase, etc.)
- [ ] Add role-based access control (RBAC) middleware
- [ ] Implement token revocation/blacklist
- [ ] Add audit logging for authentication events
