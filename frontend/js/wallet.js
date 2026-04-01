if(!localStorage.getItem('token')){
    window.location.href = 'index.html';
}

const loadWallet = async () => {
    try {
        const profile = await apiCall('/user/profile');
        document.getElementById('total-coins').innerText = profile.user.total_coins;
        document.getElementById('total-inr').innerText = (profile.user.total_coins / 100).toFixed(2);
        
        const res = await apiCall('/wallet/transactions');
        const transactions = res.transactions;
        const txList = document.getElementById('tx-list');
        
        if (transactions.length === 0) {
            txList.innerHTML = '<p class="text-center text-muted">No transactions yet.</p>';
            return;
        }

        txList.innerHTML = '';
        
        transactions.forEach(tx => {
            const isEarn = tx.coins > 0;
            const card = document.createElement('div');
            card.className = 'card list-item';
            card.style.alignItems = 'center';
            card.style.marginBottom = '8px';
            
            let icon = '🔄';
            if (tx.type === 'checkin') icon = '📅';
            if (tx.type === 'ad_watch') icon = '▶️';
            if (tx.type === 'withdrawal') icon = '💸';

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size: 24px;">${icon}</div>
                    <div>
                        <p style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${tx.description}</p>
                        <p class="text-muted" style="font-size: 12px;">${new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <div style="font-weight:bold; color: ${isEarn ? 'var(--green)' : 'var(--red)'}">
                    ${isEarn ? '+' : ''}${tx.coins}
                </div>
            `;
            txList.appendChild(card);
        });

    } catch (e) {
        // Handled silently due to apiCall wrapper
    }
};

loadWallet();
