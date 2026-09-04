# PROJECT CONTEXT AND REQUIREMENTS

You are responsible for building the **backend and complete SMS service** for a farmer agricultural procurement platform.

You are NOT responsible for building the farmer mobile app or the web frontend unless explicitly asked.

Your backend will serve three interfaces:

1. Farmer Mobile App
2. Farmer Web App
3. Centre Operator Web App

Additionally, farmers can interact with the platform entirely through SMS.

The backend must make all four channels work with the same data and business logic.

---

# 1. PURPOSE OF THE PLATFORM

The platform is designed to help farmers book agricultural procurement services at government procurement centres.

The system should help:

* Farmers find suitable procurement centres
* Farmers book procurement slots
* Centres manage incoming farmers
* Centres manage queues
* Centres record actual procurement
* Centres manage payment verification
* Farmers track their queue and procurement
* Reduce unnecessary waiting
* Distribute demand between centres
* Predict waiting times and centre load
* Allow farmers without smartphones/apps to use the system through SMS

---

# 2. USER TYPES

There are currently two main user roles.

## Farmer

A farmer can:

* Register
* Authenticate using their phone number
* Create procurement bookings
* Select crops
* Specify quantity
* Specify expected procurement date
* Get recommended procurement centres
* Select a centre and slot
* Track bookings
* Track queue position
* Track estimated waiting time
* View procurement results
* View payment status
* View history
* Receive notifications

Farmers can perform these actions through:

* Mobile app
* Web app
* SMS

## Centre Operator

A centre operator manages one procurement centre.

They can:

* View bookings for their centre
* Search farmers/bookings
* Manage the queue
* Check farmers in
* Call the next farmer
* Start processing
* Complete processing
* Record actual accepted quantity
* Record procurement information
* Review payment information
* Confirm payments
* View centre analytics
* Receive AI-based operational insights
* Operate basic centre functions while offline

There is currently NO district administrator or state administrator role.

---

# 3. FARMER AUTHENTICATION

Authentication is based on the farmer's phone number and OTP.

Farmers should not need a traditional password.

## OTP flow

Farmer enters phone number.

Backend generates an OTP.

OTP is sent to the farmer through the platform's SMS service.

The SMS provider being used is:

**SMS Gate**

Farmer receives OTP.

Farmer enters OTP into the mobile/web application.

Backend verifies the OTP.

Farmer is authenticated.

OTP should have:

* Expiration
* Limited verification attempts
* Resend cooldown
* Rate limiting
* Single-use behaviour

OTP must never be exposed in application logs.

The same SMS infrastructure should be used for OTPs and normal farmer notifications.

---

# 4. FARMER REGISTRATION

Registration should contain stable farmer information.

Do NOT ask for crop or quantity during registration.

A farmer may not currently have a crop to sell and may grow different crops in different seasons.

Registration should include:

* Phone number
* Name
* Village
* District
* Location/GPS where available
* Farmer ID

The phone number should uniquely identify the farmer.

SMS registration should also be supported.

For SMS registration, the sender's phone number is automatically available from SMS Gate.

---

# 5. PROCUREMENT BOOKINGS

A booking represents a farmer's request to bring a particular crop and quantity for procurement.

A farmer can have multiple bookings over time.

Example:

A farmer can have:

* Wheat booking during Rabi
* Soybean booking during Kharif

A booking should contain information such as:

* Booking ID
* Farmer
* Crop
* Quantity
* Unit
* Expected procurement/harvest date
* Centre
* Slot
* Booking status
* Timestamps

Crop and quantity belong to the booking, NOT the farmer profile.

---

# 6. CENTRE RECOMMENDATION

When creating a booking, the backend should recommend suitable procurement centres.

The recommendation should consider multiple factors.

At minimum:

* Distance from farmer
* Whether centre accepts the crop
* Current queue
* Centre capacity
* Predicted waiting time
* Current/expected centre load
* Expected demand
* Available slots

The nearest centre should NOT automatically be selected.

The system should be able to provide:

* Best/recommended centre
* Alternative centres

The frontend should receive enough information to explain the recommendation.

For example:

* Centre name
* Distance
* Current queue
* Estimated waiting time
* Capacity/load
* Recommendation score/reason
* Available slots

---

# 7. SLOT BOOKING

Centres have operating hours and procurement capacity.

Farmers should be able to select an available procurement slot.

Slot availability should account for:

* Centre operating hours
* Centre capacity
* Existing bookings
* Expected processing time
* Predicted demand/load

The backend must validate slot availability.

The frontend must not be trusted to determine whether a slot is available.

---

# 8. BOOKING STATUS

Bookings should have controlled states.

Possible states include:

* Pending
* Confirmed
* Checked in
* Processing
* Completed
* Cancelled
* No-show
* Rescheduled
* Expired

Only valid state transitions should be allowed.

For example:

A cancelled booking must not be allowed to directly become completed.

All important state changes should be recorded.

---

# 9. QUEUE MANAGEMENT

Queue management is a major feature.

The centre operator must be able to:

* Check in a farmer
* Add farmer to queue
* See current queue
* See queue position
* Call next farmer
* Mark no-show
* Start processing
* Complete processing

The farmer should be able to see:

* Current queue position
* Number of farmers ahead
* Estimated waiting time
* Current processing status
* Queue progress

Queue information should update in realtime when possible.

---

# 10. WAITING TIME / ETA PREDICTION

The system should use AI/ML to predict waiting time.

Potential inputs include:

* Current number of farmers waiting
* Number currently being processed
* Number of active operators/counters
* Historical processing time
* Crop
* Quantity
* Time of day
* Day of week
* Season
* Centre
* Current queue
* Historical queue behaviour

The system should produce:

* Estimated waiting time
* Prediction information/confidence where possible

If the ML system is unavailable, the backend must fall back to a rule-based estimate.

AI failure must not stop the core booking/queue system.

---

# 11. CENTRE LOAD AND DEMAND FORECASTING

The platform should forecast expected procurement demand and centre load.

Potential inputs:

* Historical bookings
* Historical procurements
* Current bookings
* Crop
* Expected procurement dates
* Season
* Day of week
* Centre capacity

The system should be able to estimate:

* Expected farmer arrivals
* Expected demand
* Expected centre utilisation
* Expected load
* High-load periods

This information can be used for:

* Centre recommendations
* Slot recommendations
* Operator dashboard
* Load balancing
* Warnings

---

# 12. DYNAMIC CENTRE/ SLOT RECOMMENDATION

The AI/data-driven system should be able to recommend:

* Which centre a farmer should use
* Which slot is most suitable

The objective is not simply to minimise distance.

The system should balance:

* Farmer travel distance
* Queue length
* Waiting time
* Centre capacity
* Expected load
* Crop compatibility
* Availability

---

# 13. PROCUREMENT PROCESS

At the centre:

Farmer arrives.

Operator checks farmer/booking.

Farmer is checked in.

Farmer enters queue.

Operator calls farmer.

Processing begins.

Operator records the actual accepted quantity.

Procurement is completed.

The accepted quantity may be different from the originally booked quantity.

Example:

Booked quantity:
30 quintals

Accepted quantity:
28.5 quintals

The payment calculation must use the accepted quantity.

---

# 14. PROCUREMENT DATA

The procurement record should contain information such as:

* Procurement ID
* Booking ID
* Accepted quantity
* Unit
* Applicable rate
* Calculated amount
* Quality/status information where required
* Processing start time
* Processing completion time
* Status
* Timestamps

---

# 15. PAYMENT

Payment should be calculated by the backend.

Basic calculation:

Accepted Quantity × Applicable Rate

Example:

28.5 quintals × ₹2,500/quintal
= ₹71,250

Never trust a payment amount calculated by the frontend.

The backend must calculate and validate the amount.

Payment states should include:

* Initiated
* Pending verification
* Confirmed

Other failure/cancellation states may be supported where necessary.

---

# 16. PAYMENT VERIFICATION

The centre operator must be able to review payment information before confirming it.

The operator should see:

* Farmer
* Booking
* Crop
* Booked quantity
* Accepted quantity
* Applicable rate
* Calculated amount
* Procurement status
* Relevant timestamps
* Validation checks
* Anomaly warnings where applicable

The operator then confirms the payment.

AI must NOT automatically confirm payments.

AI can only flag suspicious or unusual records for human review.

For the prototype, actual money transfer may be simulated.

The architecture should allow integration with an authorised government payment system in the future.

---

# 17. ANOMALY DETECTION

The system should support AI-based anomaly detection.

Potential anomalies include:

* Extremely large quantities
* Duplicate bookings
* Repeated bookings
* Unusual cancellation patterns
* Unusually long processing times
* Quantity mismatches
* Unusual payment amounts
* Other unusual operational behaviour

An anomaly should generate a warning/flag.

It should NOT automatically reject a farmer or payment.

A human operator makes the final decision.

---

# 18. EVENT / AUDIT HISTORY

Important actions should be recorded as events.

Examples:

* Farmer registered
* Booking created
* Booking confirmed
* Booking cancelled
* Booking rescheduled
* Farmer checked in
* Farmer marked no-show
* Processing started
* Processing completed
* Quantity recorded
* Procurement completed
* Payment initiated
* Payment verified
* Payment confirmed
* SMS received
* SMS sent
* Data synchronized

Events should contain enough information to understand:

* What happened
* When it happened
* Which booking/farmer/centre was involved
* Who or what caused it
* Relevant metadata

This history is important for:

* Auditing
* Debugging
* Analytics
* ML training
* Queue analysis
* Offline synchronization

---

# 19. SMS SERVICE

SMS is a complete interface to the platform.

It is NOT only a notification system.

A farmer without the mobile app or webapp should still be able to use the core platform through SMS.

The SMS provider is:

**SMS Gate**

The system should support:

* Incoming SMS
* Outgoing SMS
* OTP messages
* Transactional notifications
* Interactive SMS conversations

---

# 20. SMS FUNCTIONALITY

Farmers should be able to perform:

* Registration
* Booking
* Check booking status
* Check queue
* Find/view centre information
* Check payment status
* View history
* Cancel booking
* Reschedule booking
* Get help

Suggested commands:

REGISTER
BOOK
STATUS
QUEUE
CENTRE
PAYMENT
HISTORY
CANCEL
RESCHEDULE
HELP

Commands should be case-insensitive.

---

# 21. SMS REGISTRATION

Example:

Farmer sends:

REGISTER

System asks for:

* Name
* Village
* District/location where necessary

The farmer's phone number comes automatically from SMS Gate.

After successful registration, the system creates the farmer account and provides the farmer ID.

---

# 22. SMS BOOKING FLOW

A farmer should be able to book entirely through SMS.

Example:

Farmer:

BOOK

System:

"Enter crop name."

Farmer:

"Wheat"

System:

"Enter quantity in quintals."

Farmer:

"30"

System:

"Enter expected procurement date."

Farmer:

"15-09-2026"

Backend validates the information.

Backend finds suitable centres.

Backend calculates recommendations.

System sends recommended centre(s).

Farmer selects a centre.

System provides available slots.

Farmer selects a slot.

Booking is confirmed.

The exact wording can be improved and localised later.

---

# 23. NATURAL-LANGUAGE SMS

Farmers should not always have to follow commands.

The system should support natural-language messages.

Example:

"Mujhe 30 quintal gehun bechna hai 15 September ko"

The AI/NLP system should extract:

* Intent: Booking
* Crop: Wheat
* Quantity: 30
* Unit: Quintal
* Expected date: 15 September

The AI should convert the message into structured information.

If important information is missing or ambiguous, ask the farmer for clarification.

Do not guess critical transaction information.

The AI parser should not directly modify the database.

It should produce structured information that is then validated and processed by normal backend business logic.

---

# 24. SMS STATUS

A farmer should be able to send:

STATUS

The system should respond with relevant active booking information, such as:

* Booking ID
* Centre
* Date
* Slot
* Booking status
* Queue position where applicable
* Estimated waiting time where applicable

---

# 25. SMS QUEUE

A farmer should be able to send:

QUEUE

The response should provide:

* Current queue position
* Number of farmers ahead
* Estimated waiting time
* Centre
* Last update information where useful

---

# 26. SMS PAYMENT

A farmer should be able to send:

PAYMENT

The response should provide:

* Payment status
* Payment amount
* Procurement/booking reference
* Confirmation status

---

# 27. SMS HISTORY

A farmer should be able to request:

HISTORY

The system should provide relevant previous:

* Bookings
* Procurements
* Payments

Because SMS has limited space, responses should be concise and paginated/menu-driven where necessary.

---

# 28. SMS CANCEL / RESCHEDULE

Farmers should be able to cancel or reschedule bookings through SMS when the booking state allows it.

The backend must enforce the same cancellation/rescheduling rules regardless of whether the request came from:

* Mobile app
* Webapp
* SMS

---

# 29. AUTOMATED SMS NOTIFICATIONS

SMS Gate should be used to send notifications for:

* OTP
* Registration confirmation
* Booking confirmation
* Booking reminder
* Slot reminder
* Queue updates
* ETA updates
* Turn approaching
* Procurement completed
* Payment initiated
* Payment confirmed
* Important alerts

Notifications should be generated by the backend based on system events.

---

# 30. SMS RELIABILITY

The SMS system must handle:

* Duplicate incoming messages
* Duplicate webhooks
* Failed SMS delivery
* Provider errors
* Retry behaviour
* Message IDs
* Delivery status where supported
* Rate limiting
* Session expiration
* Invalid commands
* Invalid input
* Interrupted conversations

If the SMS gateway sends the same webhook twice, it must not create duplicate bookings or duplicate transactions.

---

# 31. SMS CONVERSATION STATE

Interactive SMS flows may span multiple messages.

The backend should remember the current conversation state.

Example:

BOOK

→ waiting for crop

→ waiting for quantity

→ waiting for date

→ showing centre recommendations

→ waiting for centre selection

→ showing slots

→ waiting for slot selection

→ booking confirmation

Sessions should expire after an appropriate period.

If the farmer sends an unrelated command during a session, the system should handle it gracefully.

---

# 32. SMS GATE INTEGRATION

SMS Gate is the current SMS provider.

The system must use SMS Gate for:

* OTP delivery
* Incoming SMS
* Outgoing SMS
* Notifications

Keep provider-specific behaviour isolated enough that the provider can be replaced in the future if necessary.

The rest of the backend should not depend on SMS Gate-specific implementation details.

---

# 33. OFFLINE CENTRE OPERATION

The centre operator webapp is a PWA and must support basic operation without internet connectivity.

While offline, the operator should still be able to:

* View previously synchronized bookings
* Check in farmers
* Manage the queue
* Start processing
* Complete processing
* Record accepted quantity
* Calculate/prepare payment information

The frontend will maintain local data while offline.

The backend must provide synchronization functionality when connectivity returns.

Only relevant centre data should be synchronized.

Do NOT require downloading the entire database.

---

# 34. OFFLINE SYNCHRONIZATION

Offline actions will eventually be uploaded to the central backend.

The backend must:

* Receive offline events
* Validate them
* Apply valid events
* Reject invalid events
* Detect conflicts
* Avoid duplicate event application
* Return synchronization results

Synchronization must be idempotent.

If the same event is uploaded twice, it must not be applied twice.

---

# 35. OFFLINE CONFLICTS

The backend must not blindly overwrite central data with offline data.

Example:

The centre device thinks a booking is active.

The central server already knows the booking was cancelled.

When synchronization occurs, the backend must detect the conflict.

The response should indicate whether the event was:

* Accepted
* Rejected
* Conflicting

The frontend will handle displaying the conflict.

For the initial version, it is acceptable to assume one active operator device per centre to simplify conflict handling.

---

# 36. OFFLINE PAYMENTS

While offline, the operator may:

* Record accepted quantity
* Calculate payment
* Prepare payment information

However, final payment confirmation should happen after synchronization with the central backend.

Do not allow an offline device to create an unverified permanent payment confirmation.

---

# 37. REALTIME UPDATES

The system should support realtime updates where appropriate.

Important realtime information includes:

* New bookings
* Queue changes
* Farmer check-ins
* Processing status
* Procurement completion
* Payment status
* Centre load

The farmer should not have to manually refresh constantly to see queue changes when realtime functionality is available.

---

# 38. FARMER WEBAPP

The farmer webapp is NOT only an information portal.

It must support the same core farmer operations as the mobile app.

Farmers should be able to:

* Register/login using OTP
* Create bookings
* Select crop
* Enter quantity
* Select expected date
* View recommended centres
* Select centre
* Select slot
* Confirm booking
* Cancel/reschedule
* Track queue
* View ETA
* View procurement
* View payment
* View history
* Receive notifications

---

# 39. CENTRE OPERATOR WEBAPP

The operator interface should support:

### Dashboard

* Today's bookings
* Current queue
* Farmers waiting
* Farmers being processed
* Completed procurements
* Pending payments
* Centre load/utilisation
* Online/offline state
* Synchronization status

### Booking management

* View bookings
* Search by farmer name
* Search by phone
* Search by farmer ID
* Search by booking ID
* Filter by date
* Filter by crop
* Filter by status
* Filter by slot
* View booking details

### Queue management

* Live queue
* Check-in
* No-show
* Call next
* Start processing
* Complete processing

### Procurement

* View booked quantity
* Record accepted quantity
* Record procurement information
* Record quality/status where required
* Calculate payment
* Complete procurement

### Payment

* View pending payments
* Review calculation
* Review procurement information
* Review anomaly warnings
* Confirm payment
* View payment history

### Analytics

* Farmers served
* Total quantity procured
* Average waiting time
* Average processing time
* Peak hours
* Centre utilisation
* No-shows
* Cancellations
* Pending payments
* Completed payments

### AI insights

* Predicted waiting time
* Expected arrivals
* Expected centre load
* Demand forecast
* High-load warnings
* Suggested load distribution
* Slot recommendations
* Anomaly alerts

---

# 40. NOTIFICATION SYSTEM

Notifications should be generated centrally.

A system event can trigger a notification.

For example:

BOOKING_CONFIRMED
→ notification service
→ SMS Gate
→ farmer receives SMS

Later, the same notification system should be extendable to:

* Push notifications
* Email
* Web notifications

SMS is the primary notification channel for the current system.

---

# 41. SINGLE SOURCE OF TRUTH

The central PostgreSQL/Supabase database is the authoritative source of truth.

The mobile app is not authoritative.

The webapp is not authoritative.

The local offline database is not authoritative.

SMS session state is not authoritative.

AI predictions are not authoritative.

All important transactional decisions must ultimately be validated by the backend.

---

# 42. IMPORTANT BUSINESS RULES

These rules must always be respected:

1. Farmers authenticate using OTP.
2. OTP is delivered through SMS Gate.
3. Farmer phone number is the primary identity.
4. Farmer registration does not require crop or quantity.
5. Crop and quantity belong to bookings.
6. Farmers can have multiple bookings.
7. Farmers can use mobile, web or SMS.
8. Farmer webapp must support booking.
9. SMS must be a complete usable interface.
10. All interfaces use the same backend business logic.
11. Centre operators only access their own centre's data.
12. Farmers only access their own data.
13. Payment is calculated server-side.
14. Payment confirmation requires operator verification.
15. AI does not automatically approve payments.
16. AI predictions/recommendations must have fallbacks.
17. Offline operations must synchronize with the central backend.
18. Offline payment confirmation is not final.
19. Synchronization must be idempotent.
20. Important state changes must be auditable.
21. Client-side calculations must never be trusted for financial or critical state changes.
22. Authentication and authorization must be enforced by the backend.
23. SMS webhook requests must be validated and protected.
24. Duplicate SMS/webhook requests must not create duplicate transactions.
25. Critical transaction data must never be guessed by AI.

---

# 43. END-TO-END SYSTEM FLOW

The backend should ultimately support this complete lifecycle:

Farmer registers
→ OTP verification
→ Farmer account created

Farmer creates procurement booking
→ Crop
→ Quantity
→ Expected date
→ Location

Backend analyses available centres
→ Distance
→ Crop compatibility
→ Queue
→ Capacity
→ Predicted wait
→ Expected load

Backend recommends centre(s)

Farmer selects centre and slot

Booking confirmed

Farmer receives SMS/app notification

Farmer arrives at centre

Operator checks farmer in

Farmer joins queue

Backend updates queue position and ETA

Operator calls farmer

Processing begins

Operator records actual accepted quantity

Procurement completed

Backend calculates payment

Payment enters verification

Operator reviews payment

Operator confirms payment

Payment becomes confirmed

Farmer receives notification

Farmer can view procurement and payment history.

---

# 44. SMS END-TO-END FLOW

Farmer sends SMS

→ SMS Gate

→ Backend webhook

→ Identify farmer by phone number

→ Determine command/conversation state

→ If necessary, use AI to understand natural language

→ Validate extracted information

→ Execute the same backend business logic used by the applications

→ Return SMS response through SMS Gate

Example:

Farmer:

"Mujhe 30 quintal gehun bechna hai 15 September ko"

→ AI extracts booking information

→ Backend validates it

→ Centre recommendation runs

→ Recommended centres returned

→ Farmer selects centre through SMS

→ Available slots returned

→ Farmer selects slot

→ Booking created

→ Confirmation SMS sent

No separate SMS-only booking logic should exist.

---

# 45. PRIMARY OBJECTIVE

Your job is to build the reliable backend and SMS infrastructure that connects the entire platform.

The final system should make the mobile app, farmer webapp, centre operator webapp and SMS interface behave as different interfaces to the SAME procurement platform.

The backend is the central brain.

SMS is a complete alternative interface for farmers.

The system should be secure, reliable, auditable, realtime-capable, offline-sync compatible and ready for AI-based prediction and recommendation.

Before making major implementation decisions, inspect the existing project/repository and understand what is already present.

Do not unnecessarily replace existing working components.

Implement the requirements above while keeping the system maintainable and practical.
