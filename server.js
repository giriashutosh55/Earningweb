require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client initialization (using service key as requested for backend)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Razorpay Initialization
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// Rate Limiting (100 req/15min)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// ================= API ROUTES =================

// 0. Create Payment Order
app.post('/api/payment/create-order', async (req, res) => {
    try {
        const options = {
            amount: 10 * 100, // Rs. 10 in paise
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        
        res.json({ 
            orderId: order.id,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});

// 1. Register User (with payment verification)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Payment details are required. Please pay 10Rs first.' });
        }

        // Verify Payment
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Check if user exists
        const { data: existingUser } = await supabase.from('users').select('id, is_paid').eq('email', email).single();
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase.from('users').insert([
            { name, email, password_hash, is_paid: true, razorpay_order_id }
        ]).select('id, name, email').single();

        if (error) throw error;
        
        // Login user directly
        const token = jwt.sign({ id: data.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ 
            message: 'Registration successful!', 
            user: data,
            token,
            name: data.name
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// 1.5 Verify Payment
app.post('/api/auth/verify-payment', async (req, res) => {
    try {
        const { email, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
             // Optional: Handle verification failure logic
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Update user
        const { data: user, error } = await supabase.from('users')
            .update({ is_paid: true })
            .eq('email', email)
            .select('*').single();
            
        if (error || !user) return res.status(400).json({ error: 'User not found' });

        // Login user
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ message: 'Payment successful, logged in!', token, name: user.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during verification.' });
    }
});

// 2. Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

        const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (!user || error) return res.status(400).json({ error: 'Invalid email or password.' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid email or password.' });

        if (!user.is_paid) {
            return res.status(403).json({ error: 'Payment incomplete. Please register again to complete payment.' });
        }

        // Generate JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ message: 'Login successful', token, name: user.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// 3. Get User Profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { data: user, error } = await supabase.from('users')
            .select('id, name, email, total_coins, upi_id')
            .eq('id', req.user.id).single();
            
        if (error) throw error;
        
        // Also get today's stats (checkin status, ad watch count)
        const today = new Date().toISOString().split('T')[0];
        
        const { data: checkin } = await supabase.from('daily_checkins')
            .select('id').eq('user_id', req.user.id).eq('checkin_date', today);
            
        // Ad watch count for today
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        const { count: adCount } = await supabase.from('ad_watches')
            .select('id', { count: 'exact' })
            .eq('user_id', req.user.id)
            .gte('watched_at', startOfDay.toISOString());
            
        // Today's earnings
        const { data: coinTx } = await supabase.from('coin_transactions')
            .select('coins')
            .eq('user_id', req.user.id)
            .gte('created_at', startOfDay.toISOString())
            .gt('coins', 0);
            
        const todaysEarnings = coinTx ? coinTx.reduce((acc, curr) => acc + curr.coins, 0) : 0;

        res.json({ 
            user, 
            hasCheckedInToday: checkin && checkin.length > 0,
            adsWatchedToday: adCount || 0,
            todaysEarnings
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

// 4. Daily Check-in
app.post('/api/earn/checkin', authenticateToken, async (req, res) => {
    try {
        const todayObj = new Date();
        const todayStr = todayObj.toISOString().split('T')[0];

        // Check if already checked in
        const { data: existing } = await supabase.from('daily_checkins')
            .select('id').eq('user_id', req.user.id).eq('checkin_date', todayStr);
            
        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'Already checked in today.' });
        }

        // Calculate Streak
        const { data: allCheckins } = await supabase.from('daily_checkins')
            .select('checkin_date')
            .eq('user_id', req.user.id)
            .order('checkin_date', { ascending: false })
            .limit(14);
            
        let currentStreak = 0;
        let pDate = new Date();
        pDate.setDate(todayObj.getDate() - 1); // start checking from yesterday
        
        if (allCheckins && allCheckins.length > 0) {
            for (let i = 0; i < allCheckins.length; i++) {
                if (allCheckins[i].checkin_date === pDate.toISOString().split('T')[0]) {
                    currentStreak++;
                    pDate.setDate(pDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }
        
        const newStreak = currentStreak + 1;
        let coinsEarned = 5;
        let description = 'Daily check-in reward';
        
        // 15 coins on 7th consecutive day
        if (newStreak % 7 === 0) {
            coinsEarned = 15;
            description = `7-Day Streak Check-in Reward! (${newStreak} Days)`;
        }

        // Insert checkin
        const { error: checkinErr } = await supabase.from('daily_checkins')
            .insert([{ user_id: req.user.id, checkin_date: todayStr, coins_earned: coinsEarned }]);
        if (checkinErr) throw checkinErr;

        // Update total coins
        const { data: user } = await supabase.from('users').select('total_coins').eq('id', req.user.id).single();
        await supabase.from('users').update({ total_coins: user.total_coins + coinsEarned }).eq('id', req.user.id);

        // Record transaction
        await supabase.from('coin_transactions').insert([{
            user_id: req.user.id,
            type: 'checkin',
            coins: coinsEarned,
            description: description
        }]);

        res.json({ message: `Checked in successfully! You earned ${coinsEarned} coins. (Streak: ${newStreak} days)`, coinsEarned, streak: newStreak });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during check-in.' });
    }
});

// 5. Watch Ad
app.post('/api/earn/ad', authenticateToken, async (req, res) => {
    try {
        const { ad_id } = req.body;
        const coinsEarned = 5;
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);

        // 1. Check max ads per day (20)
        const { count: dailyAds } = await supabase.from('ad_watches')
            .select('id', { count: 'exact' })
            .eq('user_id', req.user.id)
            .gte('watched_at', startOfDay.toISOString());
            
        if (dailyAds >= 20) {
            return res.status(400).json({ error: 'Daily ad limit (20) reached. Come back tomorrow!' });
        }

        // 2. Check same ad limit (max 3 per day)
        if (ad_id) {
            const { count: sameAdCount } = await supabase.from('ad_watches')
                .select('id', { count: 'exact' })
                .eq('user_id', req.user.id)
                .eq('ad_id', ad_id)
                .gte('watched_at', startOfDay.toISOString());
            
            if (sameAdCount >= 3) {
                return res.status(400).json({ error: 'You have watched this specific ad max times today.' });
            }
        }

        // Record ad watch
        await supabase.from('ad_watches').insert([{ 
            user_id: req.user.id, 
            coins_earned: coinsEarned,
            ad_id: ad_id || 'random_ad'
        }]);

        // Update user coins
        const { data: user } = await supabase.from('users').select('total_coins').eq('id', req.user.id).single();
        await supabase.from('users').update({ total_coins: user.total_coins + coinsEarned }).eq('id', req.user.id);

        // Record transaction
        await supabase.from('coin_transactions').insert([{
            user_id: req.user.id,
            type: 'ad_watch',
            coins: coinsEarned,
            description: 'Video ad reward'
        }]);

        res.json({ message: 'Ad reward claimed!', coinsEarned });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error processing ad reward.' });
    }
});

// 6. Get Wallet Transactions
app.get('/api/wallet/transactions', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from('coin_transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        res.json({ transactions: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transactions.' });
    }
});

// 7. Withdraw Coins
app.post('/api/wallet/withdraw', authenticateToken, async (req, res) => {
    try {
        const { coinsToWithdraw, upiId } = req.body;
        
        if (!coinsToWithdraw || !upiId) return res.status(400).json({ error: 'Coins and UPI ID required.' });
        if (coinsToWithdraw < 1500) return res.status(400).json({ error: 'Minimum withdrawal is 1500 coins.' });

        const { data: user } = await supabase.from('users').select('total_coins').eq('id', req.user.id).single();
        if (user.total_coins < coinsToWithdraw) return res.status(400).json({ error: 'Insufficient coins.' });

        const amountInr = coinsToWithdraw / 100;

        // Deduct coins
        await supabase.from('users').update({ 
            total_coins: user.total_coins - coinsToWithdraw,
            upi_id: upiId // save latest upi id
        }).eq('id', req.user.id);

        // Record withdrawal request
        const { data: withdrawal, error } = await supabase.from('withdrawals').insert([{
            user_id: req.user.id,
            coins_deducted: coinsToWithdraw,
            amount_inr: amountInr,
            upi_id: upiId,
            status: 'pending'
        }]).select().single();
        
        if (error) throw error;

        // Record transaction
        await supabase.from('coin_transactions').insert([{
            user_id: req.user.id,
            type: 'withdrawal',
            coins: -coinsToWithdraw,
            description: `Withdrawal request for ₹${amountInr}`
        }]);

        res.json({ message: 'Withdrawal requested successfully!', withdrawal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during withdrawal request.' });
    }
});

// 8. Get Withdrawal History
app.get('/api/wallet/withdrawals', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from('withdrawals')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json({ withdrawals: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch withdrawals.' });
    }
});

// Any unmatched route serves the frontend app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
