# DailyEarn - Task & Reward Web App

DailEarn is a simple earning app where users can earn coins by completing daily check-ins and watching video ads. Coins can be converted to INR and withdrawn via UPI.

## Features
- User Authentication (Register/Login) with JWT
- Daily check-in system (+10 coins per day)
- Watch video ads to earn (+5 coins per ad)
- Daily ad limits (max 20 per day, max 3 times for a specific ad)
- Wallet transactions history
- UPI withdrawal request system (Minimum ₹15)
- Fully responsive, mobile-first design with a deep purple theme

## Tech Stack
- **Frontend**: HTML5, CSS3 (No framework), Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)

## Setup Instructions

### 1. Prerequisites
- Node.js installed

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (already created) and ensure the following variables are present:
```env
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key
```

### 4. Database Schema
Ensure the required tables are created in your Supabase project:
- `users`
- `daily_checkins`
- `ad_watches`
- `coin_transactions`
- `withdrawals`

### 5. Run the Server
```bash
node server.js
```

The application will be available at `http://localhost:3000`. Navigate to the URL, register a new account, and explore the dashboard.
