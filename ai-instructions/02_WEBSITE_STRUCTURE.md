# SriDwar — Website & Application Structure

## Major Areas
The project may contain:
- Home
- Temple / Shrine pages
- Darshan / Temple Visit
- Puja
- Seva
- Offerings / Temple Bazaar
- Yoga / Holistic Wellness
- Counselling / Guidance
- Forms / Inquiry / Contact
- Cart
- Payment / Checkout
- Confirmation
- Dharmic ID / Authentication
- Profile
- Transactions
- Certificates
- PDFs
- Email/notification flows

## Architecture Rule
Do not assume these areas use separate implementations. Inspect imports, routes, shared components, services and APIs before changing anything.

## Navigation Rule
Every CTA/button/link must lead to its intended destination. Do not replace an existing route with a homepage fallback merely to hide a navigation problem.

## Responsive Scope
Review applicable layouts on:
- Android phones
- iPhones
- Android tablets
- iPads
- Redmi Pad 2 / 12.1-inch tablet
- laptops
- desktops
- large displays where supported

Test portrait and landscape where relevant.

## Shared Components
When a problem appears in multiple places, determine whether a shared component, utility or CSS rule is responsible before making page-specific patches.
