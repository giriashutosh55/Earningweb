if(!localStorage.getItem('token')){
    window.location.href = 'index.html';
}

let currentCoins = 0;

const loadData = async () => {
    try {
        const profile = await apiCall('/user/profile');
        currentCoins = profile.user.total_coins;
        
        document.getElementById('total-coins').innerText = currentCoins;
        document.getElementById('total-inr').innerText = (currentCoins / 100).toFixed(2);
        
        if (profile.user.upi_id) {
            document.getElementById('upi-id').value = profile.user.upi_id;
        }

        const res = await apiCall('/wallet/withdrawals');
        const history = res.withdrawals;
        const histList = document.getElementById('history-list');

        if (history.length === 0) {
            histList.innerHTML = '<p class="text-center text-muted">No withdrawal history.</p>';
            return;
        }
        
        histList.innerHTML = '';
        history.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card list-item';
            card.style.alignItems = 'center';
            card.style.marginBottom = '8px';
            
            let statusColor = 'var(--text-light)';
            if (item.status === 'approved') statusColor = 'var(--green)';
            if (item.status === 'rejected') statusColor = 'var(--red)';

            card.innerHTML = `
                <div>
                    <h4 style="margin-bottom: 2px;">₹${item.amount_inr.toFixed(2)}</h4>
                    <p class="text-muted" style="font-size: 11px;">${item.upi_id}</p>
                    <p class="text-muted" style="font-size: 11px;">${new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <div class="badge" style="background: rgba(0,0,0,0.05); color: ${statusColor}; border: 1px solid ${statusColor}22">
                    ${item.status.toUpperCase()}
                </div>
            `;
            histList.appendChild(card);
        });

    } catch(e) {}
};

document.getElementById('withdraw-coins').addEventListener('input', (e) => {
    const coins = parseInt(e.target.value) || 0;
    document.getElementById('receive-amount').innerText = (coins / 100).toFixed(2);
});

document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const upiId = document.getElementById('upi-id').value;
    const coinsStr = document.getElementById('withdraw-coins').value;
    const coins = parseInt(coinsStr);
    
    if (coins < 1500) {
        showToast('Minimum withdrawal is 1500 coins', 'error');
        return;
    }
    
    if (coins > currentCoins) {
        showToast('Insufficient coins balance', 'error');
        return;
    }
    
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    
    try {
        const res = await apiCall('/wallet/withdraw', {
            method: 'POST',
            body: JSON.stringify({ coinsToWithdraw: coins, upiId })
        });
        showToast(res.message, 'success');
        document.getElementById('withdraw-coins').value = '';
        document.getElementById('receive-amount').innerText = '0.00';
        setTimeout(loadData, 1000);
    } catch(err) {
        // err handled
    } finally {
        btn.disabled = false;
    }
});

loadData();
