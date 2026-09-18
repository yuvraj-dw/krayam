# Farmer Procurement Platform

## Feature List

---

# 1. Farmer Mobile App

### Account & Profile

* Farmer registration
* Login / authentication
* Farmer profile
* Farmer ID
* Village and location details
* Language selection

### Booking / Procurement

* Select crop
* Enter quantity
* Select expected procurement/harvest date
* Use current location
* Get recommended procurement centre
* View alternative centres
* Compare centres by:

  * Distance
  * Current queue
  * Estimated waiting time
  * Centre capacity/load
  * Accepted crops
* Select centre
* Select available slot
* Confirm booking
* Cancel booking
* Reschedule booking where allowed

### Queue & Booking Tracking

* View current booking
* Booking status
* Booking ID
* Centre details
* Live queue position
* Number of farmers ahead
* Estimated waiting time
* Queue progress
* Turn-approaching notifications

### Centre Information

* Centre location
* Distance
* Accepted crops
* Operating hours
* Current queue
* Current/expected load
* Map/navigation

### Procurement

* View booked quantity
* View actual accepted quantity
* Procurement status
* Procurement history

### Payment

* View payment amount
* Payment status
* Payment details
* Payment history
* Payment notifications

### Notifications

* Booking confirmation
* Booking reminders
* Queue updates
* ETA updates
* Turn approaching
* Procurement completed
* Payment initiated
* Payment confirmed

### History

* Previous bookings
* Previous procurements
* Previous payments

---

# 2. Farmer Web App

The webapp should allow farmers to perform the same core activities as the mobile app through a browser.

### Account & Profile

* Registration
* Login
* Farmer profile
* Farmer ID
* Village/location details
* Language selection

### Booking

* Create procurement booking
* Select crop
* Enter quantity
* Select expected procurement date
* Provide/use location
* View recommended centre
* View alternative centres
* Compare centres
* Select centre
* Select slot
* Confirm booking
* Cancel booking
* Reschedule booking where allowed

### Booking & Queue Tracking

* View current booking
* Booking status
* Booking ID
* Live queue position
* Number of farmers ahead
* Estimated waiting time
* Queue progress
* Turn-approaching alerts

### Centre Information

* Centre details
* Location
* Distance
* Accepted crops
* Operating hours
* Current queue/load
* Map/navigation

### Procurement & Payment

* View procurement status
* View booked quantity
* View accepted quantity
* View payment amount
* View payment status
* View payment history

### Notifications

* Booking updates
* Queue updates
* Procurement updates
* Payment updates
* Important announcements

### History

* Booking history
* Procurement history
* Payment history

---

# 3. Centre Operator Web App

The same web application can provide a separate operator interface based on the user's role.

## Dashboard

* Today's bookings
* Current queue
* Farmers waiting
* Farmers being processed
* Completed procurements
* Pending payments
* Centre load/utilization
* Online/offline status
* Synchronization status

## Booking Management

* View bookings
* Search by:

  * Farmer name
  * Phone number
  * Farmer ID
  * Booking ID
* Filter by:

  * Date
  * Crop
  * Status
  * Slot
* View booking details
* Cancel booking
* Reschedule booking where allowed

## Queue Management

* Live queue
* Check-in farmer
* Mark no-show
* Call next farmer
* Start processing
* Complete processing
* Update queue status

## Procurement Management

* View booked quantity
* Enter actual accepted quantity
* Record procurement details
* Record quality/status where required
* Calculate payable amount
* Complete procurement
* View procurement history

## Payment Management

* View pending payments
* View farmer details
* View booking details
* View booked quantity
* View accepted quantity
* View applicable rate
* View calculated amount
* Review payment information
* Confirm payment
* View payment history

## Analytics

* Farmers served
* Total quantity procured
* Average waiting time
* Average processing time
* Peak hours
* Centre utilization
* No-shows
* Cancellations
* Pending payments
* Completed payments
* Daily/weekly/monthly statistics

## AI Insights

* Predicted waiting time
* Expected farmer arrivals
* Expected centre load
* Demand forecast
* High-load warnings
* Suggested load distribution
* Slot recommendations
* Anomaly alerts

## Realtime

* Live queue updates
* New bookings
* Farmer status updates
* Procurement updates
* Payment status updates
* Dashboard statistics

## Offline Mode

* Access previously synchronized bookings
* Check-in farmers
* Manage queue
* Start/complete processing
* Record accepted quantity
* Prepare payment information
* Store actions locally
* Automatically synchronize when online
* View pending synchronization operations
* View last successful synchronization
* Manually retry synchronization

Payment confirmation and SMS notifications are finalized after synchronization with the backend.

---

# 4. SMS Interface

The SMS interface should be fully functional for farmers who do not use the mobile or web app.

### Registration

* Register farmer
* Enter name
* Enter village/location
* Receive farmer ID
* Registration confirmation

### Booking

* Start booking
* Select/enter crop
* Enter quantity
* Enter expected procurement date
* Receive recommended centre
* View alternative centres
* Select centre
* Select slot
* Confirm booking

### Booking Management

* Check booking status
* Cancel booking
* Reschedule booking
* View booking details
* View booking history

### Queue

* Check queue position
* Check number of farmers ahead
* Check estimated waiting time
* Receive queue updates
* Receive turn-approaching notification

### Centre Information

* Find recommended centre
* Check centre distance
* Check accepted crops
* Check operating hours
* Check current queue/load

### Procurement

* Check procurement status
* Check accepted quantity
* Receive procurement completion notification

### Payment

* Check payment status
* Check payment amount
* Receive payment initiated notification
* Receive payment confirmation
* View payment history

### SMS Commands

* REGISTER
* BOOK
* STATUS
* QUEUE
* CENTRE
* PAYMENT
* HISTORY
* CANCEL
* RESCHEDULE
* HELP

### Natural-Language SMS

Farmers can also send normal-language messages instead of following commands.

Example:

"Mujhe 30 quintal gehun bechna hai 15 September ko"

The system extracts:

* Intent: Booking
* Crop: Wheat
* Quantity: 30 quintals
* Date: 15 September

The request is then processed through the same backend as the mobile and web applications.

### Automated SMS

* Registration confirmation
* Booking confirmation
* Booking reminder
* Slot reminder
* Queue updates
* ETA updates
* Turn-approaching notification
* Procurement completion
* Payment initiated
* Payment confirmed
* Important alerts

---

# 5. Common Platform Features

All three interfaces use the same backend and business logic.

### Core Backend

* Farmer management
* Centre management
* Booking management
* Slot management
* Queue management
* Procurement management
* Payment management
* Notification system
* Realtime updates
* Authentication
* Audit/event logging
* Offline synchronization

### AI/ML

* Centre recommendation
* Waiting-time prediction
* Centre load prediction
* Demand forecasting
* Dynamic slot recommendations
* Anomaly detection
* Natural-language SMS processing

### System Architecture

Farmer Mobile App
→
FastAPI Backend
→
Database / AI Services

Farmer Web App
→
FastAPI Backend
→
Database / AI Services

Centre Operator Web App
→
FastAPI Backend
→
Database / AI Services

SMS Gateway
↔
FastAPI Backend
↔
Database / AI Services

A booking created through the mobile app, webapp, or SMS should be visible and manageable through the other channels. All channels should therefore use the same backend APIs and business logic.
