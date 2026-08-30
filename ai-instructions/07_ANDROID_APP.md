# SriDwar — Android / Mobile / Tablet Rules

## Supported Experiences
Review where applicable:
- Android app
- Android app browser/WebView
- Android phones
- Android tablets
- iPhones
- iPads
- Redmi Pad 2 12.1-inch tablet
- mobile/tablet browsers

## Known Issues
Previously reported:
- broken header video on Redmi Pad 2
- excessive empty space caused by broken media/layout
- broken/invisible UPI QR/barcode
- uneven carousel/card dimensions
- navigation/CTA problems
- content being cut off or hidden on smaller screens

These are historical reports. Verify current behavior before changing code.

## Responsive Testing
Test portrait and landscape.
Check:
- safe areas
- viewport height
- touch targets
- scrolling
- modal sizing
- media aspect ratio
- carousel behavior
- payment controls
- download/share controls

## Android Rule
Do not assume desktop-browser behavior proves Android behavior. A fix must be tested in the relevant mobile/tablet environment.
