// Dynamically choose API URL based on where the app is running
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.API_URL = isLocal ? '/api' : 'http://localhost:3000/api'; // NOTE: Netlify will block this via HTTPS Mixed Content. Run backend locally!

function toggleAuth() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('register-form').classList.toggle('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    // For hackathon MVP, simple login
    
    try {
        const response = await fetch(`${window.API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('farmerId', username);
            localStorage.setItem('gameState', JSON.stringify(data.gameState));
            window.location.href = 'game.html';
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        // Fallback for local testing without backend
        alert('Server unreachable. Running in local offline mode.');
        localStorage.setItem('farmerId', username);
        window.location.href = 'game.html';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    
    try {
        const response = await fetch(`${window.API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Farm Created! Please login.');
            toggleAuth();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Error registering:', error);
        alert('Server unreachable. Please start the backend server.');
    }
}

// Check if already logged in
window.onload = () => {
    if (localStorage.getItem('farmerId') && window.location.pathname.includes('index.html')) {
        window.location.href = 'game.html';
    }
}

