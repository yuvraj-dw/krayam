# Brag Plan: Krayam (Comprehensive Explainer Video)

## What is this app?
Krayam is a comprehensive agricultural procurement platform built for Smart India Hackathon 2026. It unifies natural-language SMS booking for rural farmers on feature phones with real-time operator queues, walk-in management, dynamic quality-based pricing, cryptographic QR gate passes & vouchers, live Server-Sent Events (SSE), and offline PWA synchronization.

## The angle
Indian farmers don't need complicated apps that fail in spotty network areas. With Krayam, they can text in plain Hindi or Hinglish from a ₹999 basic phone, get instant slot confirmation with a cryptographic QR gate pass, walk in to the mandi, undergo transparent quality inspection with guaranteed price bounds, and receive verified digital payouts.

## Hook (first 3-4s)
A basic feature phone / terminal pops up:
Farmer texts: *"Mujhe 25 quintal gehu bechna hai kal"*
Reveal: *"No smartphone required. 100% natural-language SMS powered by Gemini NLP."*

## The Flow (Middle Highlights - 42s total)
1. **Scene 1: Natural-Language SMS & Instant AI Intent (0s - 7s)**
   - Plain SMS text in Hinglish.
   - Gemini NLP intent extraction with 98% confidence.
   - Dual-channel architecture: feature phone equals modern smartphone app.
2. **Scene 2: Cryptographic QR Gate Pass (`https://hizru.me/p/...`) (7s - 14s)**
   - Emerald green themed vector SVG QR code.
   - HMAC-SHA256 tamper-evident signed token.
   - Publicly accessible without app login or account friction.
3. **Scene 3: Operator Walk-In & Queue Management (14s - 21s)**
   - Live queue depth, wait times, instant QR gate check-in (`/operator/check-in/scan`).
   - Seamless on-the-spot walk-in registration (`is_walk_in: true`) for unregistered farmers.
4. **Scene 4: Dynamic Quality Pricing & Anti-Fraud Sanity (21s - 28s)**
   - Quality grading (`Grade A`, `FAQ`).
   - Server-enforced price range validation (`min_price <= unit_price <= max_price`).
   - Rejection of sub-MSP exploitation.
5. **Scene 5: Instant Settlement & Cryptographic Payment Receipt (`/r/...`) (28s - 35s)**
   - Deterministic calculation: `accepted_quantity * unit_price` = ₹58,800.
   - Digital settlement voucher with signed receipt QR.
   - Outbound SMS notification sent to farmer.
6. **Scene 6: Realtime SSE & Offline PWA Sync Outro (35s - 42s)**
   - Live outbox event bus streaming over SSE.
   - Offline PWA sync keeping mandis operational through blackouts.
   - Grand finale: Krayam — Built for Smart India Hackathon 2026.

## Tone
- Preset: `polished`
- Creative direction: Tech-forward agricultural revolution with crisp tactile motion, rich UI cards, and authentic agricultural color palette (`#1b5e20`, `#2e7d32`, `#10b981`, `#f0fdf4`).

## Format & Timing
- Format: `landscape` (1920x1080, 30fps)
- Duration: 42 seconds (42.0s)
- Audio: Upbeat tech soundtrack with tactile UI clicks, scan blips, and settlement chimes.

## Music Guidance
- Track: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- SFX: `ui/switch9.ogg`, `ui/click1.ogg`, `ui/switch1.ogg`
