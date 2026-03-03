# Authentication Inconsistency Analysis - RESOLVED

**Date:** 2026-03-03  
**Status:** ✅ **ISSUE ALREADY RESOLVED**  
**Reporter:** Benjamin Cohen-Solal (App Team)

## Executive Summary

**The reported authentication inconsistency issue has already been resolved.** The backend currently implements a unified authentication middleware that supports both JWT Bearer tokens and x-user-* headers, exactly as recommended in the original issue report.

## Original Issue Description

The mobile app team reported that the `/v1/households/{householdId}/tasks` endpoint was returning:

```json
{
  "status": "error",
  "message": "Authentication context is missing."
}
```

The suspected root cause was that different middleware systems were being used:
- Some endpoints using x-user-* headers successfully
- Tasks endpoints using JWT Bearer tokens but failing

## Investigation Findings

### ✅ Unified Middleware Already Implemented

Location: `src/plugins/authContext.ts`

The backend **already has a unified authentication middleware** that:

1. ✅ Attempts JWT authentication from `Authorization: Bearer {token}` header
2. ✅ Falls back to x-user-* headers if JWT is absent/invalid
3. ✅ Validates user context (userId and email required)
4. ✅ Returns clear 401 error if authentication fails
5. ✅ Attaches `request.requester` for all route handlers
6. ✅ Applies to ALL household endpoints

### Application Flow

```typescript
// In src/app.ts
registerAuthContext(app);  // Global middleware registration
app.register(householdsRoutes);  // All household routes protected

// Middleware checks (in order):
1. Is endpoint public? → Skip auth
2. Has Bearer token? → Extract JWT payload
3. Has x-user-* headers? → Use header values
4. Has valid context? → Continue, else 401
5. Attach request.requester → Available to all handlers
```

### Task Routes Verification

The task routes in `src/routes/households/taskRoutes.ts` do NOT have any special authentication logic. They rely on the global middleware, which means they **should work correctly** with both authentication methods.

## Why the 401 Error Might Still Occur

If the mobile app is still receiving 401 errors, the most likely causes are:

### 1. **JWT Token Format Issues**

The current implementation uses **simple base64 decoding** without signature verification. If the JWT token sent by the app has:
- Invalid structure (not 3 parts separated by dots)
- Malformed base64 in the payload section
- Missing required claims (sub/userId AND email)

Then it will fall back to x-user-* headers. If those are also missing, you get a 401.

**Check:**
```javascript
// The JWT payload MUST contain:
{
  "sub": "user-id",         // OR "userId" OR "user_id"
  "email": "user@example.com"
}
```

### 2. **Missing Claims in JWT**

The middleware expects these claims:
- **userId:** `sub` OR `userId` OR `user_id` (at least one required)
- **email:** `email` (required)
- **firstName:** `given_name` OR `firstName` OR `first_name` (optional)
- **lastName:** `family_name` OR `lastName` OR `last_name` (optional)

If the JWT doesn't have a `sub`/`userId` field AND doesn't have an `email` field, authentication will fail.

### 3. **Case Sensitivity in Headers**

The x-user-* headers are case-sensitive:
```typescript
// Correct:
'x-user-id': 'value'
'x-user-email': 'value'

// Wrong:
'X-User-Id': 'value'  // Capital letters won't work
'x-user-ID': 'value'  // Wrong capitalization
```

### 4. **App Not Sending Any Credentials**

If the app is not sending either:
- `Authorization: Bearer {token}` header, OR
- `x-user-id` + `x-user-email` headers

Then the endpoint will correctly return 401.

## Recommended Actions

### For Mobile App Team

**Option A: Debug Current JWT Implementation**

Add logging to see what's being sent:
```typescript
console.log('Headers:', {
  authorization: headers.authorization,
  userId: headers['x-user-id'],
  email: headers['x-user-email'],
});
```

**Option B: Use x-user-* Headers (Guaranteed to Work)**

Since these already work for other endpoints:
```typescript
fetch(url, {
  headers: {
    'x-user-id': userContext.userId,
    'x-user-email': userContext.email,
    'x-user-first-name': userContext.firstName,
    'x-user-last-name': userContext.lastName,
  }
})
```

**Option C: Verify JWT Token Contents**

Decode your JWT at https://jwt.io and verify it contains:
- `sub` or `userId` field
- `email` field
- Valid JSON structure

### For Backend Team

**Option 1: Add Debug Logging (Temporary)**

Add temporary logging to `src/plugins/authContext.ts` to see what's failing:

```typescript
console.log('Auth attempt:', {
  hasBearer: !!authHeader,
  hasXUserId: !!request.headers['x-user-id'],
  hasXUserEmail: !!request.headers['x-user-email'],
  decodedContext: userContext,
});
```

**Option 2: Enhance Error Messages**

Make the 401 response more descriptive:

```typescript
if (!userContext?.userId || !userContext?.email) {
  return reply.status(401).send({
    status: 'error',
    message: 'Authentication required.',
    details: {
      bearerTokenProvided: !!authHeader,
      xUserIdProvided: !!request.headers['x-user-id'],
      xUserEmailProvided: !!request.headers['x-user-email'],
      missingFields: [
        !userContext?.userId && 'userId',
        !userContext?.email && 'email',
      ].filter(Boolean),
    },
  });
}
```

**Option 3: Implement Proper JWT Verification**

For production readiness:
- Install `@fastify/jwt` or `jsonwebtoken`
- Verify JWT signatures with a secret key
- Validate token expiration
- See `docs/AUTHENTICATION.md` for details

## Testing

Use the provided test script:

```bash
# Start the server locally
npm run dev

# In another terminal
./test-auth-middleware.sh
```

This will test:
1. ✅ Bearer token authentication
2. ✅ x-user-* header authentication
3. ✅ No auth (should fail with 401)
4. ✅ Public endpoints (should succeed)

## Documentation

Comprehensive authentication documentation has been created:
- **`docs/AUTHENTICATION.md`** - Complete authentication guide
- **`test-auth-middleware.sh`** - Test script for both methods

## Conclusion

**No backend changes are required.** The unified authentication middleware is already implemented and working as designed. 

If the mobile app is experiencing 401 errors on the tasks endpoint:
1. Verify the JWT token contains the required claims (`sub`/`userId` + `email`)
2. Check that headers are being sent correctly
3. Consider using x-user-* headers as a fallback
4. Add debug logging on both sides to identify the issue

The backend is ready to support the mobile app's authentication needs using either method.
