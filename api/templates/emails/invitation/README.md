# Invitation Email Template

This directory contains the email template for household invitations.

## Files

- `subject.txt` - Email subject line
- `body.txt` - Email body content (plain text)

## Variables

The following variables are available for substitution:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{firstName}}` | Invitee's first name | "John" |
| `{{role}}` | Assigned role in the household | "Caregiver" or "Senior" |
| `{{deepLinkUrl}}` | Deep link to open in the mobile app | `seniorhub://invite?...` |
| `{{fallbackUrl}}` | Optional web fallback URL | `https://...` or empty |

## Template Engine

Currently uses simple string replacement. If complex logic is needed, consider:
- Handlebars
- Mustache
- EJS

## Localization

For future i18n support, create subdirectories:
```
invitation/
├── en/
│   ├── subject.txt
│   └── body.txt
├── fr/
│   ├── subject.txt
│   └── body.txt
└── es/
    ├── subject.txt
    └── body.txt
```
