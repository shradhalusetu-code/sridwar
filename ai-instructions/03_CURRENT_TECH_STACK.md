# SriDwar — Current Technical Stack

## Known Components
The project has used/mentioned:
- Frontend website/application
- Android app / app browser experience
- Supabase
- Google Apps Script / Google Sync
- Render
- server-side TypeScript/Node-style services
- PDF generation
- certificate generation
- email workflows
- payment gateway / UPI-related integrations

## Known Files / Services
Important names previously mentioned:
- `server.ts`
- `certificateService.ts`
- `composeCertificatePdf()`
- Apps Script webhook/automation
- Supabase database and APIs

## Configuration
Previously referenced environment/configuration names include:
- `GAS_EMAIL_WEBHOOK_URL`
- `EMAIL_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CERTIFICATE_ADMIN_SECRET`

Do not assume these are currently configured correctly. Inspect the current repository/deployment configuration before changing anything.

## Database Warning
A previous issue involved:
`Failed reading activities: JSON object requested, multiple (or no) rows returned`

A later code fix changed lookup behavior to order by `created_at` and limit results. This must be verified against the currently deployed code before assuming it is resolved.

## Important Rule
This file records known context, not an absolute claim that every item is still current. Verify against the actual project.
