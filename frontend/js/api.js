const API_BASE = '/api';

// Loader
const showLoader = () => {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'loader-overlay';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
};

const hideLoader = () => {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
};

// Toast
const showToast = (message, type = 'success') => {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        document.body.appendChild(toast);
    }
    toast.className = `toast show ${type}`;
    toast.innerText = message;
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
};

// Fetch wrapper with auth and loader
const apiCall = async (endpoint, options = {}) => {
    showLoader();
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            throw new Error('Session expired');
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        
        hideLoader();
        return data;
    } catch (error) {
        hideLoader();
        showToast(error.message, 'error');
        throw error;
    }
};

const logout = () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
};

// Generate Bottom Nav automatically if container exists
const setupNav = () => {
    const navContainer = document.getElementById('bottom-nav');
    if (!navContainer) return;
    
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    navContainer.innerHTML = `
        <a href="dashboard.html" class="nav-item ${currentPage === 'dashboard.html' ? 'active' : ''}">
            <span class="nav-icon">🏠</span>
            Dashboard
        </a>
        <a href="ads.html" class="nav-item ${currentPage === 'ads.html' ? 'active' : ''}">
            <span class="nav-icon">▶️</span>
            Watch Ads
        </a>
        <a href="wallet.html" class="nav-item ${currentPage === 'wallet.html' ? 'active' : ''}">
            <span class="nav-icon">👛</span>
            Wallet
        </a>
        <a href="withdraw.html" class="nav-item ${currentPage === 'withdraw.html' ? 'active' : ''}">
            <span class="nav-icon">💸</span>
            Withdraw
        </a>
    `;
};

document.addEventListener('DOMContentLoaded', setupNav);
