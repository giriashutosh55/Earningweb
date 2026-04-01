if(!localStorage.getItem('token')){
    window.location.href = 'index.html';
}

document.getElementById('user-name').innerText = localStorage.getItem('userName') || 'User';

const loadProfile = async () => {
    try {
        const res = await apiCall('/user/profile');
        const { user, hasCheckedInToday, adsWatchedToday, todaysEarnings } = res;
        
        document.getElementById('total-coins').innerText = user.total_coins;
        document.getElementById('total-inr').innerText = (user.total_coins / 100).toFixed(2);
        
        document.getElementById('today-earn').innerText = todaysEarnings;
        document.getElementById('today-ads').innerText = adsWatchedToday;

        const checkinBtn = document.getElementById('checkin-btn');
        const checkinStatus = document.getElementById('checkin-status');

        if (hasCheckedInToday) {
            checkinBtn.style.display = 'none';
            checkinStatus.style.display = 'block';
        } else {
            checkinBtn.style.display = 'block';
            checkinStatus.style.display = 'none';
        }
    } catch (e) {
        console.error('Failed to load profile');
    }
};

document.getElementById('checkin-btn').addEventListener('click', async () => {
    try {
        const res = await apiCall('/earn/checkin', { method: 'POST' });
        showToast(res.message, 'success');
        
        // Disable button instantly
        document.getElementById('checkin-btn').style.display = 'none';
        document.getElementById('checkin-status').style.display = 'block';
        
        // Refresh balance after delay
        setTimeout(loadProfile, 1000);
    } catch (e) {
        // Handled by generic api.js error catch
    }
});

loadProfile();
