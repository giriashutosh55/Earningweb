if (!localStorage.getItem('token')) {
    window.location.href = 'index.html';
}

let currentAdId = null;
let timerInterval = null;
let profileData = null;

// Replace this URL with your actual Adsterra or Monetag Direct Link URL
const SPONSOR_AD_URL = "https://omg10.com/4/10813901";

const loadProgress = async () => {
    try {
        const res = await apiCall('/user/profile');
        profileData = res;
        document.getElementById('ad-progress').innerText = res.adsWatchedToday;

        const mainBtn = document.getElementById('main-watch-btn');
        if (mainBtn) {
            if (res.adsWatchedToday >= 20) {
                mainBtn.innerText = 'Daily Limit Reached';
                mainBtn.disabled = true;
                mainBtn.style.opacity = '0.5';
            } else {
                mainBtn.innerText = `Watch Ad (${res.adsWatchedToday}/20)`;
                mainBtn.disabled = false;
            }
        }
    } catch (e) {
        console.error("Failed to load ad progress");
    }
};

let isAdOpened = false;

const watchAd = () => {
    currentAdId = 'sponsor_ad_' + Date.now();
    const modal = document.getElementById('video-modal');
    modal.style.display = 'flex';
    isAdOpened = false;

    // Reset UI
    const openBtn = document.getElementById('open-sponsor-btn');
    openBtn.style.display = 'inline-block';
    openBtn.href = SPONSOR_AD_URL; // Bind actual URL here so browser handles new tab natively
    
    document.getElementById('ad-opened-text').style.display = 'none';
    document.getElementById('timer').innerText = '30';
    
    const claimBtn = document.getElementById('claim-btn');
    claimBtn.disabled = true;
    claimBtn.innerText = 'Wait...';

    clearInterval(timerInterval);
};

const startAdTimer = () => {
    if (isAdOpened) return; // Prevent multiple clicks
    
    isAdOpened = true;
    
    // Update UI
    document.getElementById('open-sponsor-btn').style.display = 'none';
    document.getElementById('ad-opened-text').style.display = 'block';

    let timeLeft = 30; // 30 seconds wait time
    const claimBtn = document.getElementById('claim-btn');

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            claimBtn.disabled = false;
            claimBtn.innerText = 'Claim 5 Coins';
        }
    }, 1000);
};

const closeModal = () => {
    clearInterval(timerInterval);
    document.getElementById('video-modal').style.display = 'none';
};

document.getElementById('claim-btn').addEventListener('click', async () => {
    try {
        const claimBtn = document.getElementById('claim-btn');
        claimBtn.disabled = true;
        claimBtn.innerText = 'Claiming...';

        const res = await apiCall('/earn/ad', {
            method: 'POST',
            body: JSON.stringify({ ad_id: currentAdId })
        });
        showToast(res.message, 'success');
        closeModal();
        setTimeout(loadProgress, 1000); // refresh limit
    } catch (e) {
        closeModal();
    }
});

// Using global function since it's called from HTML inline onclick
window.watchAd = watchAd;
window.closeModal = closeModal;
window.startAdTimer = startAdTimer;

loadProgress();
