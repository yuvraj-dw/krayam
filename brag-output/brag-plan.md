# Brag Plan: Krayam

## What is this app?
Krayam is a resilient dual-channel agricultural procurement platform built for Smart India Hackathon 2026, giving farmers on basic feature phones natural-language SMS booking and digital vector QR gate passes, while giving mandi operators real-time queue management, quality-based pricing, and offline PWA sync.

## The angle
Indian farmers don't need another heavy smartphone app that crashes in poor network areas. They just text in Hindi or Hinglish from a ₹999 Nokia, get instant Gemini NLP intent parsing, receive a cryptographically signed HMAC-SHA256 vector QR gate pass over SMS, and roll straight through mandi check-in and automated payout.

## Hook (first 2-3 seconds)
High-contrast terminal / SMS bubble arrival:
"Mujhe 25 quintal wheat bechna hai kal."
Cut to: "No smartphone required. Meet Krayam."

## Key moments (the middle)
1. **Gemini NLP over Plain SMS:** Natural language SMS in Hinglish turned into structured mandi booking instantly.
2. **Emerald Green Signed QR Gate Pass:** Themed vector QR code with HMAC cryptographic tamper-proof pass (`/p/{booking_id}`).
3. **Mandi Operator Realtime Queue & Quality Pricing:** Live SSE dashboard, quality check validation against min/max MSP bounds, and instant automated payout.

## Outro / punchline
"From SMS text to mandi payout.
Krayam: Fair procurement for every farmer."

## User flow worth showing
SMS message sent ("Mujhe 25 quintal wheat bechna hai kal") → Instant confirmation with signed QR gate pass URL → Mandi operator scans QR code, validates crop quality, and verifies instant digital payment.

## Tone
- Preset: `polished`
- Creative direction: `tech-forward agricultural revolution with crisp tactile motion`
- Interpretation: Confident, fast-paced, high visual quality with agricultural emerald green accents, realistic SMS bubble UI, and vibrant QR pass card.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Primary Green: `#1b5e20`
- Accent Emerald: `#2e7d32`
- Light Background: `#f4fbf5`
- Card Surface: `#ffffff`
- Text Dark: `#1f2937`
- Text Muted: `#6b7280`
- Badge Green: `#d1fae5`
- Display Font: System sans-serif / Segoe UI / Inter
- Body Font: Segoe UI, sans-serif

## Share copy (draft)
Built Krayam for SIH 2026: An agricultural procurement engine where farmers can book mandi slots in conversational Hinglish via SMS, get signed vector QR gate passes, and receive verified digital payouts.

## Audio direction
- Role: Warm, energetic corporate/tech beat with crisp UI clicks
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: Starts at 0s, builds smoothly, tight ducking during reveals, crisp final ring
- SFX posture: Tactile UI clicks (`switch1.ogg`, `click1.ogg`, `chip-lay-1.ogg`) for SMS sent, QR pass pop, and payment verification stamp.

## Storyboard

### Scene 1 — Hook: The Simple Text (0.0s - 4.5s)
- **Visual:** Clean off-white background (`#f4fbf5`). A modern smartphone message bubble pops in:
  - Sender: "Farmer Ramesh"
  - Bubble: "Mujhe 25 quintal wheat bechna hai kal"
  - Tag: "Gemini NLP Intent Engine • 95% Confidence"
  - Subtitle: "Any Phone. Plain SMS."
- **Sequential:** Message bubble arrives with a slide + pop, then Gemini tag appears beneath it.
- **Audio intent:** Snappy, curiosity-inducing entrance.
- **Audio-coupled idea:** Gentle UI pop on message arrival.

### Scene 2 — The Instant Digital Gate Pass (4.5s - 9.5s)
- **Visual:** Transition to the Krayam Digital Gate Pass card:
  - Header: Emerald green gradient (`#1b5e20` to `#2e7d32`) with "Krayam Digital Gate Pass" & booking reference `BK-8F32A`.
  - Center: High-res emerald vector QR code in a crisp white container.
  - Badges: "HMAC-SHA256 Signed" • "Public Viewable: hizru.me/p/BK-8F32A"
  - Details list: Crop: Wheat | Qty: 25.0 Quintal | Centre: Nashik Rural Mandi.
- **Sequential:** Card scales in smoothly; details slide into place; QR badge highlights.
- **Audio intent:** Modern, secure, satisfying payoff.
- **Audio-coupled idea:** Card place sound (`card-place-1.ogg`) on card settle.

### Scene 3 — Mandi Operator Real-Time Control & Quality Pricing (9.5s - 15.5s)
- **Visual:** Split/Dashboard layout showing the Mandi Operator Terminal:
  - Operator Live Queue: Position #1, Checked-in, ETA: ~15 min.
  - Quality Inspection Modal:
    - Crop: Wheat (Grade A)
    - Price Range: ₹2,000 – ₹3,000 / quintal
    - Offered Price: ₹2,400 / quintal (Validated ✅)
    - Accepted Quantity: 24.5 Quintal
  - Big Payout Card: "Total Payment: ₹58,800" with green "PAYMENT VERIFIED" stamp.
- **Sequential:** Live queue counter ticks, price slider settles within bounds, verified stamp drops.
- **Audio intent:** High energy, operational confidence, instant validation.
- **Audio-coupled idea:** Stamp impact / click sound on payment verification.

### Scene 4 — Outro: Krayam (15.5s - 20.0s)
- **Visual:** Premium emerald green full-screen finish:
  - Big bold logo: "KRAYAM"
  - Tagline: "Agricultural Procurement for Every Farmer"
  - Highlights row: "Plain SMS & Gemini NLP • Real-Time SSE Bus • Offline PWA Sync"
  - Badge: "Smart India Hackathon 2026"
- **Sequential:** Logo scales down smoothly, tagline unblurs, badges fade in with subtle glow.
- **Audio intent:** Triumphant finish with music fade.
