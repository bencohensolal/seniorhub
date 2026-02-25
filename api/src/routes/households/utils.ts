// Utility functions for invitation rate limiting
const inviteRateState = new Map<string, { count: number; windowStartMs: number }>();
const INVITE_RATE_LIMIT = 10;
const INVITE_WINDOW_MS = 60_000;

export const checkInviteRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const current = inviteRateState.get(userId);
  if (!current) {
    inviteRateState.set(userId, { count: 1, windowStartMs: now });
    return true;
  }

  if (now - current.windowStartMs > INVITE_WINDOW_MS) {
    inviteRateState.set(userId, { count: 1, windowStartMs: now });
    return true;
  }

  if (current.count >= INVITE_RATE_LIMIT) {
    return false;
  }

  current.count += 1;
  return true;
};

// Email masking utility
export const maskEmail = (email: string): string => email.replace(/(^.).+(@.+$)/, '$1***$2');

// Invitation sanitization for responses
export const sanitizeInvitation = (invitation: {
  id: string;
  householdId: string;
  inviteeFirstName: string;
  inviteeLastName: string;
  inviteeEmail: string;
  assignedRole: string;
  status: string;
  tokenExpiresAt: string;
  createdAt: string;
}) => ({
  id: invitation.id,
  householdId: invitation.householdId,
  inviteeFirstName: invitation.inviteeFirstName,
  inviteeLastName: invitation.inviteeLastName,
  inviteeEmailMasked: maskEmail(invitation.inviteeEmail),
  assignedRole: invitation.assignedRole,
  status: invitation.status,
  tokenExpiresAt: invitation.tokenExpiresAt,
  createdAt: invitation.createdAt,
});
