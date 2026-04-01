Tum ek senior full-stack developer ho. Mujhe ek complete "Daily Task & Earn" web application banana hai.
Neeche diya gaya complete PRD (Product Requirements Document) follow karo aur poora working code do.

========================================
PROJECT: DailyEarn — Task & Reward Web App
STACK: HTML + CSS + JS (frontend) | Node.js + Express.js (backend) | Supabase (database)
========================================

## 1. PROJECT OVERVIEW

Ek simple earning app jisme:
- User daily check-in kare aur coins kamaaye
- Video ads dekhe aur coins kamaaye
- 100 coins = ₹1 INR
- Minimum withdrawal = ₹15 (yaani 1500 coins)
- UPI ke through withdrawal request kare

---

## 2. DATABASE SCHEMA (Supabase / PostgreSQL)

Neeche di gayi 5 tables banao:

### Table 1: users
- id (UUID, primary key, default: gen_random_uuid())
- email (TEXT, unique, not null)
- password_hash (TEXT, not null)
- name (TEXT, not null)
- upi_id (TEXT, nullable)
- total_coins (INTEGER, default: 0)
- created_at (TIMESTAMPTZ, default: now())

### Table 2: daily_checkins
- id (UUID, primary key)
- user_id (UUID, references users.id)
- checkin_date (DATE, not null)
- coins_earned (INTEGER, default: 10)
- created_at (TIMESTAMPTZ, default: now())
- UNIQUE(user_id, checkin_date)  ← ek din mein sirf ek check-in

### Table 3: ad_watches
- id (UUID, primary key)
- user_id (UUID, references users.id)
- watched_at (TIMESTAMPTZ, default: now())
- coins_earned (INTEGER, default: 5)
- ad_id (TEXT)  ← video ka identifier

### Table 4: coin_transactions
- id (UUID, primary key)
- user_id (UUID, references users.id)
- type (TEXT: 'checkin' | 'ad_watch' | 'withdrawal')
- coins (INTEGER)  ← positive = earn, negative = deduct
- description (TEXT)
- created_at (TIMESTAMPTZ, default: now())

### Table 5: withdrawals
- id (UUID, primary key)
- user_id (UUID, references users.id)
- coins_deducted (INTEGER)
- amount_inr (NUMERIC)  ← coins_deducted / 100
- upi_id (TEXT)
- status (TEXT: 'pending' | 'approved' | 'rejected', default: 'pending')
- created_at (TIMESTAMPTZ, default: now())

---

## 3. BACKEND API (Node.js + Express.js)

### File Structure:

/frontend
index.html        ← Login/Register page
dashboard.html    ← Main dashboard
ads.html          ← Video ads page
wallet.html       ← Wallet & transactions
withdraw.html     ← Withdrawal page
/css
style.css
/js
api.js          ← API call functions
auth.js         ← Login/register logic
dashboard.js
ads.js
wallet.js
withdraw.js

### Design Requirements:
- Mobile-first responsive design
- Color scheme: Deep purple (#6C3CE1) primary, white background
- Font: System font stack
- Simple card-based layout
- Bottom navigation bar (Dashboard, Ads, Wallet, Withdraw)
- No external CSS framework — pure CSS only
- Loader spinner jab API call ho raha ho
- Toast notifications for success/error messages

### Pages Detail:

**1. index.html (Login/Register)**
- Tab switcher: Login | Register
- Register form: Name, Email, Password
- Login form: Email, Password
- JWT token localStorage mein save karo
- Login hone ke baad dashboard.html pe redirect

**2. dashboard.html**
- Top bar: App name + logout button
- User ka naam aur total coins display karo
- Coins to INR converter display: "₹X.XX earned"
- Daily Check-in Card:
  - Agar nahi kiya: Big "Check In Today" button (green)
  - Agar kar liya: "Already checked in ✓" (grey disabled)
  - "+10 coins" badge
- Stats Row: Today's earnings | Total coins | Ads watched today
- Quick links: "Watch Ads →" | "My Wallet →"

**3. ads.html**
- Header: "Watch Ads & Earn"
- Daily progress bar: "X/20 ads watched today"
- Ad cards list (5 ads):
  - Har card mein: Ad thumbnail (placeholder image), title, duration, "+5 coins" badge
  - "Watch Ad" button
  - Click karne pe: Modal opens with fake video player
    - Countdown timer (30 seconds) dikhao
    - "Please watch the full ad" message
    - Timer complete hone ke baad "Claim 5 Coins" button enable ho
    - API call karo, coins update karo
- Already watched ads grey/disabled dikho

**4. wallet.html**
- Header: "My Wallet"
- Balance Card: Total coins + INR equivalent
- Transaction history list:
  - Har item: icon (check/play/arrow) + description + date + coins +/-
  - Color coded: green for earn, red for deduct

**5. withdraw.html**
- Header: "Withdraw Earnings"
- Current balance display
- Minimum withdrawal notice: "Min ₹15 (1500 coins) required"
- Form:
  - UPI ID input
  - Coins to withdraw (number input, min 1500)
  - Auto-calculate INR amount
  - "Request Withdrawal" button
- Withdrawal history table: amount, UPI, status badge, date

---

## 5. BUSINESS RULES

1. Daily check-in: 10 coins, sirf ek baar per day (midnight reset)
2. Video ad watch: 5 coins per ad, max 20 ads per day
3. Coin conversion: 100 coins = ₹1
4. Minimum withdrawal: 1500 coins (₹15)
5. Withdrawal status: pending (admin manually process karega, filhaal sirf pending dikhao)
6. Same ad limit: Ek user ek ad ko ek din mein max 3 baar dekh sakta hai
7. JWT token expiry: 7 days

---

## 6. SECURITY REQUIREMENTS

- Passwords: bcrypt se hash karo (saltRounds: 10)
- JWT: har protected route pe verify karo
- Supabase: service_role key sirf backend mein use karo, kabhi frontend mein nahi
- Input validation: har API endpoint pe
- Rate limiting: express-rate-limit use karo (100 req/15min per IP)
- CORS: sirf localhost aur production domain allow karo

---

## 7. PACKAGES TO INSTALL

Backend:
- express
- @supabase/supabase-js
- bcryptjs
- jsonwebtoken
- dotenv
- cors
- express-rate-limit

---

## 8. ADDITIONAL INSTRUCTIONS

1. Pehle backend banao, phir frontend.
2. Supabase MCP server already connected hai, toh tum direct Supabase mein tables bana sakte ho.
3. Har file ke liye complete working code do — koi placeholder ya "TODO" mat chhodo.
4. server.js mein graceful error handling karo.
5. Frontend ke api.js mein base URL constant rakho:
   const API_BASE = 'http://localhost:3000/api';
6. Agar JWT expire ho jaye ya missing ho toh localStorage clear karo aur login page pe redirect karo.
7. Video ad player ek simple HTML5 <video> tag se simulate karo ya ek countdown timer se — real ad network integrate karna zaruri nahi.
8. README.md bhi do jisme setup instructions ho.

Ab poora code do — ek ek file complete karo.

