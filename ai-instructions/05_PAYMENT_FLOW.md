# SriDwar — Payment Flow Rules

## Core Principle
Payment, cart, confirmation and reconciliation are separate states.

## Cart
- Add to Cart adds the selected item to cart only.
- It must not trigger payment.
- Multiple selected services must remain visible.
- Combined amount must be correct.
- Cart data must remain isolated per user.
- Maximum selected items: 10, where this rule is currently applicable.
- Abandoned/skipped payment should preserve the cart until removal or successful completion.

## Pay Now
Proceed to Secure Offering / Pay Now should initiate the payment flow directly.
It must not silently add another cart item.

## Payment Confirmation
Never treat the existence of a payment row as proof of successful payment.

Before sending a final payment confirmation/PDF, verify:
- payment status is a confirmed/successful state accepted by the current implementation
- amount/reference/payment information is valid
- confirmation has not already been sent

Never send paid confirmation for pending, failed or abandoned payments.

## Immediate Acknowledgement
An initial acknowledgement may be sent when the workflow reaches the appropriate submission/payment state, but it must not falsely claim final payment verification.

## Final Confirmation
Once payment is genuinely confirmed:
- send the payment confirmation email
- provide/send the confirmation PDF
- send only once
- prevent a later pending-payment message from contradicting a confirmed payment

## Payment Methods
Only display payment methods that are actually supported in the current platform/device context.
Never present a broken or non-functional method as usable.

## Reliability
For payment bugs, trace the entire chain:
UI → payment initiation → gateway → backend → database/sync → reconciliation → confirmation → email/PDF.

Do not fix only the visible symptom.
