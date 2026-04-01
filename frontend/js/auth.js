// Check if already logged in
if(localStorage.getItem('token')){
    window.location.href = 'dashboard.html';
}

let paymentDetails = null;

const switchTab = (tab) => {
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-container').style.display = 'none';
    
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'block';
    } else {
        document.getElementById('register-container').style.display = 'block';
    }
};

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const res = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        localStorage.setItem('token', res.token);
        localStorage.setItem('userName', res.name);
        showToast('Login successful!');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } catch (e) {
        // error handled in api.js showToast
    }
});

document.getElementById('btn-pay-initial').addEventListener('click', async () => {
    try {
        const res = await apiCall('/payment/create-order', { method: 'POST' });
        
        const options = {
            "key": res.razorpayKeyId,
            "amount": "1000",
            "currency": "INR",
            "name": "DailyEarn",
            "description": "One-time registration fee",
            "order_id": res.orderId,
            "handler": function (response) {
                paymentDetails = response;
                showToast('Payment successful! You can now create an account.', 'success');
                // Hide pay section and show registration form
                document.getElementById('pay-section').style.display = 'none';
                document.getElementById('register-form').style.display = 'block';
            },
            "theme": {
                "color": "#e91e63"
            }
        };
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response){
            showToast('Payment Failed. Please try again.', 'error');
        });
        rzp1.open();
        
    } catch (e) {
        // handled in api.js showToast
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    if (!paymentDetails) {
        showToast('Please complete payment first.', 'error');
        return;
    }
    
    try {
        const regRes = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ 
                name, 
                email, 
                password,
                razorpay_payment_id: paymentDetails.razorpay_payment_id,
                razorpay_order_id: paymentDetails.razorpay_order_id,
                razorpay_signature: paymentDetails.razorpay_signature
            })
        });
        
        showToast('Registration successful! Logging in...', 'success');
        localStorage.setItem('token', regRes.token);
        localStorage.setItem('userName', regRes.name);
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
        
    } catch (e) {
        // handled in api.js
    }
});
