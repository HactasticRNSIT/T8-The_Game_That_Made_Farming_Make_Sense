const fs = require('fs');
const path = 'public/index.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Add API_URL and saveGame logic
const backendLogic = `
// --- BACKEND INTEGRATION ---
window.API_URL = window.location.origin === 'http://localhost:3000' ? '/api' : 'https://farming-simulation-game.onrender.com/api';

async function saveGame() {
  if (!state.player.name || state.player.name === 'Arjun') return; // Don't save demo
  try {
    await fetch(window.API_URL + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: state.player.name, gameState: state })
    });
  } catch(e) { console.warn('Offline mode: data not saved to server'); }
}

setInterval(saveGame, 15000); // Auto-save every 15s
`;

// Inject before game state
content = content.replace('// ======================== GAME STATE ========================', backendLogic + '\n// ======================== GAME STATE ========================');

// 2. Update startGame for Login/Register
const updatedStartGame = `
async function startGame() {
  const name = document.getElementById('inp-name').value.trim();
  const st = document.getElementById('inp-state').value;
  const season = document.getElementById('inp-season').value;
  if (!name || !st) { toast('Please enter your name and select a state.', 'err'); return; }

  try {
      let res = await fetch(window.API_URL + '/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name })
      });
      if (res.ok) {
          const data = await res.json();
          if (data.gameState && Object.keys(data.gameState).length > 0) {
              Object.assign(state, data.gameState);
              toast('Game loaded from server!');
          }
      } else if (res.status === 404) {
          res = await fetch(window.API_URL + '/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: name })
          });
          if (!res.ok) throw new Error('Registration failed');
          toast('New farm profile created!');
      }
  } catch(e) {
      console.warn('Backend unavailable, running in local-only mode');
  }

  state.player.name = name;
  state.player.state = st;
  state.season = season === 'kharif' ? 'Kharif' : season === 'rabi' ? 'Rabi' : 'Zaid';
  document.getElementById('banner-greeting').textContent = 'Good morning, ' + name + '! 👋';
  document.getElementById('banner-sub').textContent = state.season + ' Season · Week 6 of 20 · ' + st;
  document.getElementById('player-name').textContent = name;
  document.getElementById('player-state').textContent = st;
  document.getElementById('nav-season').textContent = state.season;
  showApp();
}
`;

content = content.replace(/function startGame\(\) \{[\s\S]*?\n\}/, updatedStartGame);

// 3. Inject saveGame into updateBalance
content = content.replace('document.getElementById(\'fin-balance\').textContent = fmt(state.balance);', 'document.getElementById(\'fin-balance\').textContent = fmt(state.balance);\n  saveGame();');

fs.writeFileSync(path, content);
console.log('Backend logic successfully injected!');
