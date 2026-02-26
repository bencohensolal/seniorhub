# Gmail SMTP Setup Guide

This guide explains how to configure Gmail SMTP for sending real invitation emails using your Gmail account.

## Why Gmail SMTP?

- ✅ **100% Free** - 500 emails/day
- ✅ **No domain verification required** - Works immediately
- ✅ **Excellent deliverability** - Benefits from Google's reputation
- ✅ **Simple setup** - Just email + app password
- ✅ **Perfect for testing and MVP phase**

## Setup Steps

### 1. Enable 2-Factor Authentication

Gmail App Passwords require 2FA to be enabled:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Follow the steps to enable 2FA if not already enabled

### 2. Generate an App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. You may need to sign in again
3. In the "Select app" dropdown, choose **"Mail"**
4. In the "Select device" dropdown, choose **"Other (Custom name)"**
5. Enter a name: **"Senior Hub Backend"**
6. Click **"Generate"**
7. **Copy the 16-character password** (spaces don't matter, but copy all)
   - Example: `abcd efgh ijkl mnop`
8. **Important:** You won't be able to see this password again!

### 3. Configure Railway

In your Railway project, set these environment variables:

```bash
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
EMAIL_FROM=Senior Hub <your-email@gmail.com>
```

**Important notes:**
- Use your full Gmail address for `GMAIL_USER`
- Remove spaces from the app password
- `EMAIL_FROM` should use the same email address

### 4. Deploy and Test

After setting the variables:

1. Redeploy your Railway service
2. Check logs to confirm: `[Email] Using Gmail SMTP provider`
3. Look for: `[GmailSmtpProvider] SMTP connection verified successfully`
4. Create a test household and invite someone
5. Check your Gmail "Sent" folder to verify emails were sent

## Monitoring

### Check Railway Logs

Successful email:
```
[GmailSmtpProvider] Email sent successfully: { messageId: '...', to: 'user@example.com' }
```

Connection verification:
```
[GmailSmtpProvider] SMTP connection verified successfully
```

### API Metrics

Your API exposes invitation email metrics:

```bash
GET /v1/observability/invitations/email-metrics
```

## Troubleshooting

### "Invalid login" or "Authentication failed"

**Cause:** App password is incorrect or 2FA not enabled

**Solution:**
1. Verify 2FA is enabled on your Google Account
2. Generate a new App Password
3. Copy it without spaces
4. Update `GMAIL_APP_PASSWORD` in Railway

### "SMTP connection failed"

**Cause:** Gmail credentials missing or incorrect

**Solution:**
1. Double-check `GMAIL_USER` is your full email
2. Verify `GMAIL_APP_PASSWORD` has no spaces
3. Make sure environment variables are set in Railway
4. Redeploy after updating variables

### "Connection timeout"

**Cause:** Network/firewall issue

**Solution:**
- This is rare with Gmail
- Check Railway service logs for more details
- Gmail SMTP uses standard port 587 (usually not blocked)

### Emails going to spam

**Rare with Gmail, but if it happens:**

1. Ask recipients to mark as "Not spam"
2. Add a proper signature in your email template
3. Avoid spam trigger words
4. Consider verifying SPF/DKIM (advanced)

## Limits

**Gmail Free Account:**
- 500 emails per day
- Sufficient for:
  - ~50 household creations/day (with 10 invites each)
  - ~100 households/day (with 5 invites each)

**If you exceed limits:**
- Error: "Daily sending quota exceeded"
- Wait 24 hours or upgrade to Google Workspace

## Development vs Production

### Development (Local)
```bash
# .env
EMAIL_PROVIDER=console
```
Emails logged to console, no actual sending.

### Testing (With Real Emails)
```bash
# .env or Railway
EMAIL_PROVIDER=gmail
GMAIL_USER=your-test@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=Senior Hub Test <your-test@gmail.com>
```
Real emails sent via Gmail.

### Production (Scaling)
For production with high volume (>500 emails/day), consider:
- **Google Workspace** - Higher limits, professional email
- **Resend** - $20/month for 50,000 emails
- **Amazon SES** - Pay-as-you-go ($0.10/1000 emails)

See `docs/EMAIL_OPTIONS.md` for comparison.

## Security Best Practices

1. **Never commit credentials** to git
2. **Use environment variables** in Railway
3. **Rotate app passwords** periodically
4. **Don't share app passwords** - they have full account access
5. **Revoke unused app passwords** at [App Passwords](https://myaccount.google.com/apppasswords)

## Cost Comparison

| Provider | Free Tier | Cost After Free |
|----------|-----------|-----------------|
| **Gmail SMTP** | 500/day | N/A (free forever) |
| Resend | 100/day, 3000/month | $20/month for 50k |
| Amazon SES | 62,000/month (EC2) | $0.10/1000 emails |

**Recommendation:** Use Gmail SMTP for MVP/testing, then migrate to Resend or SES when you need more than 500/day.

## Migration Path

When ready to migrate from Gmail to another provider:

1. Keep Gmail as backup during transition
2. Update Railway variables to new provider
3. Test thoroughly before removing Gmail config
4. Monitor email metrics for delivery rates

## Support

- **Gmail Issues:** https://support.google.com/accounts
- **App Password Help:** https://support.google.com/accounts/answer/185833
- **Backend Issues:** Check Railway logs and `/v1/observability/invitations/email-metrics`
