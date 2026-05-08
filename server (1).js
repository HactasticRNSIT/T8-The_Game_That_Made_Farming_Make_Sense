// FarmWise Backend - Node.js + Express
// Run: npm install && node server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ======================== SIMPLE JSON DB ========================
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ players: {}, leaderboard: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ======================== GAME DATA ========================
const CROPS = [
  { id:'wheat',  name:'Wheat',   emoji:'🌾', seedCost:300,  sellPrice:2400, waterPerDay:2, growDays:14, season:'Rabi' },
  { id:'rice',   name:'Rice',    emoji:'🌾', seedCost:400,  sellPrice:3200, waterPerDay:4, growDays:16, season:'Kharif' },
  { id:'cotton', name:'Cotton',  emoji:'🌿', seedCost:700,  sellPrice:5400, waterPerDay:3, growDays:20, season:'Kharif' },
  { id:'tomato', name:'Tomato',  emoji:'🍅', seedCost:200,  sellPrice:1800, waterPerDay:3, growDays:10, season:'All' },
  { id:'onion',  name:'Onion',   emoji:'🧅', seedCost:250,  sellPrice:2100, waterPerDay:2, growDays:12, season:'Rabi' },
  { id:'maize',  name:'Maize',   emoji:'🌽', seedCost:180,  sellPrice:1900, waterPerDay:2, growDays:11, season:'Kharif' },
  { id:'soy',    name:'Soybean', emoji:'🫘', seedCost:500,  sellPrice:4100, waterPerDay:2, growDays:18, season:'Kharif' },
  { id:'chilli', name:'Chilli',  emoji:'🌶️', seedCost:350,  sellPrice:3800, waterPerDay:2, growDays:15, season:'All' },
];

const MARKET_VOLATILITY = 0.2; // ±20% price swing

function getMarketPrice(cropId) {
  const crop = CROPS.find(c => c.id === cropId);
  if (!crop) return 0;
  const swing = 1 + (Math.random() * MARKET_VOLATILITY * 2 - MARKET_VOLATILITY);
  return Math.floor(crop.sellPrice * swing);
}

function createNewPlayer(name, state, season) {
  return {
    id: Date.now().toString(),
    name,
    state,
    season,
    level: 1,
    xp: 0,
    balance: 10000,
    soilHealth: 50,
    week: 1,
    plots: Array.from({ length: 24 }, (_, i) => ({
      id: i,
      status: 'empty',
      cropId: null,
      growth: 0,
      watered: false,
      fertilized: false,
    })),
    inventory: {},
    transactions: [
      { id: 1, icon: '🌾', label: 'Starting grant - PM Kisan scheme', date: 'Season start', amount: 10000, type: 'income' }
    ],
    badges: [],
    cooperativeMember: false,
    createdAt: new Date().toISOString(),
  };
}

// ======================== AUTH ========================
app.post('/api/register', (req, res) => {
  const { name, state, season } = req.body;
  if (!name || !state || !season) {
    return res.status(400).json({ error: 'Name, state, and season are required.' });
  }

  const db = readDB();
  const playerId = `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  const player = createNewPlayer(name, state, season);
  player.id = playerId;

  db.players[playerId] = player;
  writeDB(db);

  res.json({ success: true, playerId, player });
});

app.post('/api/login', (req, res) => {
  const { playerId } = req.body;
  const db = readDB();
  const player = db.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found.' });
  res.json({ success: true, player });
});

// ======================== PLAYER STATE ========================
app.get('/api/player/:id', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Player not found.' });
  res.json(player);
});

app.get('/api/player/:id/summary', (req, res) => {
  const db = readDB();
  const p = db.players[req.params.id];
  if (!p) return res.status(404).json({ error: 'Not found.' });
  const planted = p.plots.filter(pl => pl.status !== 'empty').length;
  const ready = p.plots.filter(pl => pl.status === 'ready').length;
  const watered = p.plots.filter(pl => pl.watered).length;
  res.json({
    balance: p.balance,
    soilHealth: p.soilHealth,
    level: p.level,
    xp: p.xp,
    week: p.week,
    plotsPlanted: planted,
    plotsReady: ready,
    plotsWatered: watered,
    totalPlots: p.plots.length,
    season: p.season,
    cooperativeMember: p.cooperativeMember,
  });
});

// ======================== FARM ACTIONS ========================
app.post('/api/farm/:id/plant', (req, res) => {
  const { plotId, cropId } = req.body;
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Player not found.' });

  const crop = CROPS.find(c => c.id === cropId);
  if (!crop) return res.status(400).json({ error: 'Unknown crop.' });

  const plot = player.plots[plotId];
  if (!plot || plot.status !== 'empty') return res.status(400).json({ error: 'Plot is not empty.' });

  if (player.balance < crop.seedCost) {
    return res.status(400).json({ error: 'Insufficient balance for seeds.' });
  }

  plot.cropId = cropId;
  plot.status = 'planted';
  plot.growth = 0;
  plot.watered = false;
  player.balance -= crop.seedCost;
  player.xp += 10;

  player.transactions.push({
    id: Date.now(),
    icon: crop.emoji,
    label: `${crop.name} seeds planted (Plot ${plotId + 1})`,
    date: `Week ${player.week}`,
    amount: -crop.seedCost,
    type: 'expense'
  });

  checkLevelUp(player);
  writeDB(db);
  res.json({ success: true, plot, balance: player.balance, xp: player.xp, level: player.level });
});

app.post('/api/farm/:id/water', (req, res) => {
  const { plotId } = req.body;
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const plot = player.plots[plotId];
  if (!plot || plot.status === 'empty') return res.status(400).json({ error: 'No crop here.' });
  if (plot.watered) return res.status(400).json({ error: 'Already watered today.' });

  const waterCost = 40;
  if (player.balance < waterCost) return res.status(400).json({ error: 'Not enough balance.' });

  plot.watered = true;
  plot.growth = Math.min(100, plot.growth + 8);
  if (plot.growth >= 100) plot.status = 'ready';
  else if (plot.growth >= 30) plot.status = 'growing';

  player.balance -= waterCost;
  player.xp += 5;

  writeDB(db);
  res.json({ success: true, plot, balance: player.balance });
});

app.post('/api/farm/:id/fertilize', (req, res) => {
  const { plotId } = req.body;
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const plot = player.plots[plotId];
  if (!plot || plot.status === 'empty') return res.status(400).json({ error: 'No crop here.' });

  const cost = 120;
  if (player.balance < cost) return res.status(400).json({ error: 'Insufficient balance.' });

  plot.fertilized = true;
  plot.growth = Math.min(100, plot.growth + 15);
  if (plot.growth >= 100) plot.status = 'ready';
  else if (plot.growth >= 30) plot.status = 'growing';

  player.balance -= cost;
  player.xp += 8;

  writeDB(db);
  res.json({ success: true, plot, balance: player.balance });
});

app.post('/api/farm/:id/harvest', (req, res) => {
  const { plotId } = req.body;
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const plot = player.plots[plotId];
  if (!plot || plot.status !== 'ready') return res.status(400).json({ error: 'Crop not ready.' });

  const crop = CROPS.find(c => c.id === plot.cropId);
  const qtyHarvested = Math.floor(Math.random() * 30 + 20);
  const qualityBonus = plot.fertilized ? 1.15 : 1.0;
  const soilBonus = player.soilHealth >= 70 ? 1.1 : 1.0;
  const earned = Math.floor(crop.sellPrice * qualityBonus * soilBonus);

  player.balance += earned;
  player.inventory[crop.id] = (player.inventory[crop.id] || 0) + qtyHarvested;
  player.xp += 50;

  player.transactions.push({
    id: Date.now(),
    icon: crop.emoji,
    label: `${crop.name} harvest (Plot ${plotId + 1})`,
    date: `Week ${player.week}`,
    amount: earned,
    type: 'income'
  });

  // Reset plot
  plot.status = 'empty';
  plot.cropId = null;
  plot.growth = 0;
  plot.watered = false;
  plot.fertilized = false;

  checkLevelUp(player);
  checkBadges(player);
  writeDB(db);
  res.json({ success: true, earned, qtyHarvested, cropName: crop.name, balance: player.balance, xp: player.xp, level: player.level });
});

app.post('/api/farm/:id/remove', (req, res) => {
  const { plotId } = req.body;
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const plot = player.plots[plotId];
  plot.status = 'empty'; plot.cropId = null; plot.growth = 0; plot.watered = false; plot.fertilized = false;

  writeDB(db);
  res.json({ success: true });
});

app.post('/api/farm/:id/irrigate-all', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  let count = 0;
  player.plots.forEach(p => {
    if (p.status !== 'empty' && !p.watered) {
      p.watered = true;
      p.growth = Math.min(100, p.growth + 8);
      if (p.growth >= 100) p.status = 'ready';
      else if (p.growth >= 30) p.status = 'growing';
      count++;
    }
  });

  const cost = count * 40;
  player.balance -= cost;
  player.xp += count * 3;

  writeDB(db);
  res.json({ success: true, count, cost, balance: player.balance });
});

app.post('/api/farm/:id/harvest-all', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  let totalEarned = 0, count = 0;
  player.plots.forEach(p => {
    if (p.status === 'ready') {
      const crop = CROPS.find(c => c.id === p.cropId);
      const earned = Math.floor(crop.sellPrice * (p.fertilized ? 1.15 : 1.0));
      totalEarned += earned;
      count++;
      p.status = 'empty'; p.cropId = null; p.growth = 0; p.watered = false; p.fertilized = false;
    }
  });

  player.balance += totalEarned;
  player.xp += count * 50;
  checkLevelUp(player);

  writeDB(db);
  res.json({ success: true, count, totalEarned, balance: player.balance });
});

// ======================== SOIL ========================
app.post('/api/farm/:id/compost', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const cost = 200;
  if (player.balance < cost) return res.status(400).json({ error: 'Not enough balance.' });

  player.soilHealth = Math.min(100, player.soilHealth + 5);
  player.balance -= cost;
  player.xp += 15;

  writeDB(db);
  res.json({ success: true, soilHealth: player.soilHealth, balance: player.balance });
});

// ======================== MARKET ========================
app.get('/api/market/prices', (req, res) => {
  const prices = CROPS.map(c => ({
    cropId: c.id,
    name: c.name,
    emoji: c.emoji,
    basePrice: c.sellPrice,
    currentPrice: getMarketPrice(c.id),
    season: c.season,
    trend: Math.random() > 0.5 ? 'up' : 'down',
  }));
  res.json(prices);
});

app.post('/api/market/:id/sell', (req, res) => {
  const { cropId, quantity } = req.body;
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const available = player.inventory[cropId] || 0;
  const qty = Math.min(quantity || available, available);
  if (qty === 0) return res.status(400).json({ error: 'No stock to sell.' });

  const price = getMarketPrice(cropId);
  const coopBonus = player.cooperativeMember ? 1.15 : 1.0;
  const earned = Math.floor(qty * price * coopBonus);
  const crop = CROPS.find(c => c.id === cropId);

  player.inventory[cropId] -= qty;
  player.balance += earned;
  player.xp += 20;

  player.transactions.push({
    id: Date.now(),
    icon: crop.emoji,
    label: `${crop.name} sold at market${player.cooperativeMember ? ' (coop bonus)' : ''}`,
    date: `Week ${player.week}`,
    amount: earned,
    type: 'income'
  });

  writeDB(db);
  res.json({ success: true, earned, qty, price, cooperativeBonus: player.cooperativeMember, balance: player.balance });
});

// ======================== COOPERATIVE ========================
app.post('/api/cooperative/:id/join', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });
  player.cooperativeMember = true;
  player.xp += 30;
  checkBadges(player);
  writeDB(db);
  res.json({ success: true, message: 'Joined Krishak Cooperative Society! You now earn 15% more on all sales.' });
});

// ======================== ADVANCE WEEK ========================
app.post('/api/farm/:id/advance-week', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  player.week++;

  // Auto-grow all plots
  player.plots.forEach(p => {
    if (p.status === 'planted' || p.status === 'growing') {
      const growRate = p.watered ? 12 : 6;
      p.growth = Math.min(100, p.growth + growRate);
      if (p.growth >= 100) p.status = 'ready';
      else if (p.growth >= 30) p.status = 'growing';
      p.watered = false; // reset daily water
    }
  });

  // Soil degradation if not composted
  if (Math.random() > 0.7) player.soilHealth = Math.max(0, player.soilHealth - 1);

  // Weekly expense: labour
  const labourCost = player.plots.filter(p => p.status !== 'empty').length * 50;
  player.balance -= labourCost;
  if (labourCost > 0) {
    player.transactions.push({
      id: Date.now(),
      icon: '👨‍🌾',
      label: 'Weekly labour cost',
      date: `Week ${player.week}`,
      amount: -labourCost,
      type: 'expense'
    });
  }

  player.xp += 20;
  checkLevelUp(player);
  writeDB(db);

  res.json({
    success: true,
    week: player.week,
    balance: player.balance,
    soilHealth: player.soilHealth,
    plots: player.plots,
    labourCost,
    level: player.level,
    xp: player.xp
  });
});

// ======================== LEARN ========================
app.get('/api/learn/modules', (req, res) => {
  const modules = [
    { id:1, title:'Crop Selection & Planning',     emoji:'🌱', progress:100, locked:false, duration:'15 min', xpReward:50 },
    { id:2, title:'Smart Irrigation Methods',       emoji:'💧', progress:80,  locked:false, duration:'20 min', xpReward:60 },
    { id:3, title:'Soil Health & Composting',       emoji:'🪱', progress:65,  locked:false, duration:'18 min', xpReward:75 },
    { id:4, title:'Pest & Disease Management',      emoji:'🐛', progress:40,  locked:false, duration:'25 min', xpReward:80 },
    { id:5, title:'Farm Economics & Planning',      emoji:'📊', progress:20,  locked:false, duration:'30 min', xpReward:100 },
    { id:6, title:'Cooperative Marketing',          emoji:'🤝', progress:0,   locked:false, duration:'20 min', xpReward:70 },
    { id:7, title:'Climate-Adaptive Farming',       emoji:'🌡️', progress:0,   locked:true,  duration:'35 min', xpReward:120 },
    { id:8, title:'Agricultural Finance & Credit',  emoji:'🏦', progress:0,   locked:true,  duration:'25 min', xpReward:90 },
    { id:9, title:'AgriTech Tools & Sensors',       emoji:'📱', progress:0,   locked:true,  duration:'40 min', xpReward:100 },
  ];
  res.json(modules);
});

app.post('/api/learn/:playerId/complete/:moduleId', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.playerId];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const rewards = { 1:50, 2:60, 3:75, 4:80, 5:100, 6:70 };
  const xp = rewards[req.params.moduleId] || 50;
  player.xp += xp;

  if (req.params.moduleId === '3') player.soilHealth = Math.min(100, player.soilHealth + 5);
  if (req.params.moduleId === '6') player.cooperativeMember = true;

  checkLevelUp(player);
  writeDB(db);

  res.json({ success: true, xpEarned: xp, level: player.level, xp: player.xp });
});

// ======================== LEADERBOARD ========================
app.get('/api/leaderboard', (req, res) => {
  const db = readDB();
  const players = Object.values(db.players).map(p => ({
    name: p.name,
    state: p.state,
    level: p.level,
    balance: p.balance,
    xp: p.xp,
    week: p.week
  }));
  players.sort((a, b) => b.balance - a.balance);
  res.json(players.slice(0, 20));
});

// ======================== FINANCE ========================
app.get('/api/finance/:id', (req, res) => {
  const db = readDB();
  const player = db.players[req.params.id];
  if (!player) return res.status(404).json({ error: 'Not found.' });

  const income = player.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = player.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

  res.json({
    balance: player.balance,
    totalIncome: income,
    totalExpense: expense,
    netProfit: income - expense,
    transactions: player.transactions.slice(-20).reverse(),
    costBreakdown: {
      seeds: Math.floor(expense * 0.22),
      irrigation: Math.floor(expense * 0.28),
      fertilizer: Math.floor(expense * 0.18),
      labour: Math.floor(expense * 0.24),
      transport: Math.floor(expense * 0.08),
    }
  });
});

// ======================== WEATHER ========================
const WEATHER_TYPES = ['sunny','cloudy','rain','storm','hot'];
app.get('/api/weather', (req, res) => {
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const type = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    const rainChance = type === 'rain' ? 85 : type === 'storm' ? 95 : type === 'cloudy' ? 30 : 5;
    return {
      day: i === 0 ? 'Today' : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(new Date().getDay() + i) % 7],
      type,
      temp: Math.floor(25 + Math.random() * 15),
      humidity: Math.floor(40 + Math.random() * 50),
      rainChance,
      irrigationAdvice: rainChance > 70 ? 'Skip irrigation — rain expected' : 'Irrigate your plots today',
    };
  });
  res.json(forecast);
});

// ======================== CROPS INFO ========================
app.get('/api/crops', (req, res) => res.json(CROPS));

// ======================== HELPERS ========================
function checkLevelUp(player) {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];
  let newLevel = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (player.xp >= thresholds[i]) newLevel = i + 1;
  }
  if (newLevel > player.level) {
    player.level = newLevel;
    // Give level-up reward
    const reward = newLevel * 500;
    player.balance += reward;
    player.transactions.push({
      id: Date.now(),
      icon: '⭐',
      label: `Level Up! Reached Level ${newLevel}`,
      date: `Week ${player.week}`,
      amount: reward,
      type: 'income'
    });
  }
}

function checkBadges(player) {
  const totalHarvests = player.transactions.filter(t => t.label.includes('harvest')).length;
  if (totalHarvests >= 5 && !player.badges.includes('5_harvests')) player.badges.push('5_harvests');
  if (player.cooperativeMember && !player.badges.includes('cooperative')) player.badges.push('cooperative');
  if (player.soilHealth >= 80 && !player.badges.includes('soil_master')) player.badges.push('soil_master');
  if (player.balance >= 50000 && !player.badges.includes('big_farmer')) player.badges.push('big_farmer');
}

// ======================== START ========================
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🌾 FarmWise Backend Server — Running!      ║
  ║   http://localhost:${PORT}                      ║
  ╠══════════════════════════════════════════════╣
  ║  POST /api/register          — New player    ║
  ║  POST /api/login             — Load player   ║
  ║  GET  /api/player/:id        — Get state     ║
  ║  POST /api/farm/:id/plant    — Plant crop    ║
  ║  POST /api/farm/:id/water    — Water plot    ║
  ║  POST /api/farm/:id/harvest  — Harvest       ║
  ║  POST /api/farm/:id/advance-week             ║
  ║  GET  /api/market/prices     — Live prices   ║
  ║  POST /api/market/:id/sell   — Sell produce  ║
  ║  GET  /api/leaderboard       — Rankings      ║
  ║  GET  /api/weather           — Forecast      ║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
