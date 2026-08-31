---
name: sridwar-project-engineering
description: Safely maintain and develop the SriDwar Hindu devotional services platform. Use this skill for coding, debugging, UI, responsive, Android/Capacitor, payment, authentication, Supabase, Google Forms/Sheets sync, email, PDF, certificate, or service-flow tasks. Always inspect the real project implementation and relevant project documentation first, determine whether the requested change already exists, identify the root cause, make the smallest safe change, verify the result, and preserve working functionality.
---

# SriDwar Project Engineering Skill

## Mission

Maintain SriDwar as a reliable, polished, trustworthy Hindu devotional services platform across supported browsers, screen sizes, tablets, and Android/Capacitor.

The project uses React/TypeScript/Vite, Supabase, Google Forms/Sheets synchronization, UPI payments, and Capacitor for Android.

The project files and current implementation are the primary source of truth.

## Mandatory workflow

For every task:

1. Read `00_PROJECT_MASTER.md`.
2. Read `CLAUDE_KNOWLEDGE_MAP.md` and identify only the supporting documents relevant to the task.
3. Inspect the actual implementation before proposing or changing code.
4. Review relevant attachments, screenshots, assets, configuration, instructions, and existing project information supplied with the task.
5. Determine whether the requested feature/fix is already implemented.
6. If it appears implemented, verify the real behavior and implementation before changing anything.
7. Do not trust old status reports or previous-session claims without checking the current files.
8. Identify the root cause before making a fix.
9. Check relevant shared components, functions, services, configuration, database interactions, and call sites before modifying them.
10. Make the smallest safe change that fully addresses the requested issue.
11. Test the affected flow and check obvious regressions.
12. Re-read modified files and verify the final implementation before reporting completion.

## Source-of-truth priority

Use this order when information conflicts:

1. Current project files and actual implementation.
2. Current configuration, assets, and confirmed project decisions.
3. Relevant current project documentation.
4. `00_PROJECT_MASTER.md`.
5. `CLAUDE_KNOWLEDGE_MAP.md` and its relevant supporting documents.
6. Older instructions and status reports.

If evidence conflicts or is incomplete, inspect further and state the uncertainty. Never guess.

## Preserve existing functionality

Never unnecessarily remove, duplicate, revert, overwrite, redesign, or replace working functionality.

Treat these integrations as protected:

- Supabase
- Authentication, signup, login, password/account flows
- Google Forms/Sheets synchronization
- UPI/payment and checkout flows
- Cart/order processing
- Email/notification flows
- Database operations
- PDF generation and downloads
- Certificates
- Profiles
- Navigation
- Responsive layouts
- Capacitor/Android behavior
- Existing service and booking flows

If a shared component is changed:

1. Find its relevant call sites.
2. Understand each dependency on its current behavior.
3. Confirm the change will not break another route, service, device, or integration.
4. Test the affected usages where possible.

If the requested change conflicts with working behavior, say so plainly before making the change.

## Scope discipline

Do not:

- Perform a full-project audit unless explicitly requested.
- Inspect unrelated systems without a reason.
- Rewrite whole files when a focused fix is sufficient.
- Introduce libraries, services, APIs, or infrastructure unless necessary.
- Refactor unrelated code during a bug fix.
- Redesign working UI without explicit instruction.
- Change copy, pricing, business rules, or religious claims merely because an alternative seems preferable.

If a task is too large or risky for one pass, say so honestly rather than shipping a shallow or incomplete implementation.

## Verification standard

Never say a task is "fixed" merely because code was edited.

Before claiming completion:

1. Re-read every modified file.
2. Search/grep for the old problematic pattern or implementation.
3. Confirm the intended new implementation exists.
4. Run available typecheck, build, test, and/or lint checks appropriate to the change.
5. Test the affected flow where possible.
6. Check relevant shared call sites for regressions.
7. Confirm protected integrations still connect to the correct components/services/data.
8. For device-specific changes, verify the relevant browser/mobile/Android implementation.
9. State anything that could not be tested.

If full verification is impossible, say exactly what was verified and what remains unverified.

## Mobile and Android

SriDwar must work reliably on:

- Desktop browsers
- Laptop browsers
- Mobile browsers
- Tablets
- Android/Capacitor

For changes involving authentication, payments, downloads, email, PDFs, forms, navigation, or responsive UI:

1. Check desktop behavior.
2. Check mobile-browser behavior.
3. Check Android/Capacitor-specific behavior when relevant.
4. Do not assume browser and Android behavior are identical.

## Devotional content rules

User-facing copy must remain:

- Devotional
- Warm
- Humble
- Respectful
- Authentically Hindu
- Accurate to the actual SriDwar service

Avoid generic SaaS language where devotional language is appropriate.

Never fabricate:

- Religious claims
- Ritual procedures
- Temple practices
- Deity-specific traditions
- Guaranteed spiritual outcomes
- Claims about what a temple or priest performed

If traditional or ritual information is uncertain, flag the uncertainty or ask for clarification instead of inventing details.

## Service-accurate confirmations

Success, payment, email, certificate, order, and booking messages must describe the actual service.

Do not use generic terminology that creates a false claim.

Examples:

- A counselling session is not a "Sankalpa."
- A product order is not a "puja performed at the temple."
- Darshan is not automatically a completed puja.
- A puja confirmation must only claim what the booked service actually provides.
- A certificate must accurately represent the service it certifies.

## Financially and emotionally sensitive flows

Give extra care to:

- Darshan
- Puja booking
- Seva
- Payments
- Orders
- Pricing
- Checkout
- Confirmation
- Certificates
- Refund/cancellation flows
- Account/login

Prioritize accuracy, reliability, correct pricing, clear status, data integrity, prevention of duplicate actions/payments, and mobile reliability.

Never hide a payment or pricing problem with a superficial UI change or hard-coded value.

## Root-cause discipline

Do not use blanket replacements or superficial fixes when the problem is structural.

Examples:

- Do not globally rename text when different services require different terminology.
- Do not hard-code a price to hide a calculation error.
- Do not disable validation to remove an error.
- Do not replace a real integration with mock behavior.
- Do not duplicate a feature instead of fixing its source.
- Do not modify a shared component without checking its usages.

When a proper per-item, per-service, per-device, or per-flow implementation is required, implement that correctly rather than applying a blanket workaround.

## Code delivery

When the task requires code/file output:

1. Provide only complete, ready-to-replace files that actually need updating.
2. Never require manual merging.
3. Do not provide diffs as the implementation.
4. Do not provide partial snippets as the implementation.
5. Do not create a ZIP unless explicitly requested.
6. Do not create unnecessary duplicate files.
7. Do not modify unrelated files.

The final files must be complete and safe to replace in the project.

## Final response

Keep the completion report concise:

1. **Changed:** what was actually changed and why.
2. **Files:** files updated.
3. **Verified:** checks/tests actually performed.
4. **Remaining:** limitations or uncertainty.

Do not claim something is fully fixed if verification is incomplete.

## Non-negotiable principle

**Inspect → Verify existing behavior → Identify root cause → Make the smallest safe fix → Re-check integrations → Test → Deliver only the required final files.**

Preserve everything that works. Change only what is necessary to fix, implement, improve, or correctly configure the identified task.
