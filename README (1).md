# 🌾 FarmWise — Hackathon Submission

> *Problem Statement 10: The Game That Made Farming Make Sense*

---

## 🎯 What We Built

FarmWise is a **multi-season farming simulation game** for rural Indian youth that teaches:
- Crop selection based on season, soil, and market demand
- Soil health management through composting and crop rotation
- Smart irrigation scheduling (drip vs flood vs sprinkler ROI)
- Pest & disease identification using IPM principles
- Cooperative marketing to secure better prices
- Seasonal financial planning and input cost analysis

**All educational content is delivered through gameplay — zero instructional text walls.**

---

## 🚀 Quick Start

### Frontend (works offline — no internet needed)
```bash
# Just open in a browser — no build step!
open index.html
```

### Backend API
```bash
npm install
npm start
# Server runs at http://localhost:3000
```

---

## 📁 Project Structure

```
farmwise/
├── index.html      ← Full frontend (login + 5 game screens)
├── server.js       ← Node.js + Express REST API
├── package.json    ← Dependencies
├── db.json         ← Auto-created: player save data (JSON)
└── README.md       ← This file
```

---

## 📱 Pages / Screens

| Screen | What it does |
|--------|-------------|
| **Login** | Player onboarding — name, state, starting season |
| **Dashboard** | Season overview, farm metrics, weather, quick actions |
| **My Farm** | Interactive 24-plot farm — plant, water, fertilize, harvest |
| **Market** | Live commodity prices, cooperative selling, price trend charts |
| **Finances** | Cash flow charts, transaction history, input cost breakdown |
| **Learn** | 9 agronomy modules with progress tracking and XP rewards |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create new player |
| POST | `/api/login` | Load existing player |
| GET | `/api/player/:id` | Full player state |
| POST | `/api/farm/:id/plant` | Plant a crop on a plot |
| POST | `/api/farm/:id/water` | Water a plot |
| POST | `/api/farm/:id/fertilize` | Apply fertilizer |
| POST | `/api/farm/:id/harvest` | Harvest a ready crop |
| POST | `/api/farm/:id/irrigate-all` | Irrigate all plots at once |
| POST | `/api/farm/:id/harvest-all` | Harvest all ready plots |
| POST | `/api/farm/:id/advance-week` | Advance one game week |
| POST | `/api/farm/:id/compost` | Improve soil health |
| GET | `/api/market/prices` | Live (randomised) commodity prices |
| POST | `/api/market/:id/sell` | Sell inventory |
| POST | `/api/cooperative/:id/join` | Join cooperative (+15% prices) |
| GET | `/api/weather` | 7-day forecast with irrigation advice |
| GET | `/api/learn/modules` | All learning modules |
| POST | `/api/learn/:id/complete/:moduleId` | Mark module complete |
| GET | `/api/finance/:id` | Financial summary |
| GET | `/api/leaderboard` | Top farmers by balance |
| GET | `/api/crops` | All crop data |

---

## 🎮 Game Mechanics

### Economy
- Start with ₹10,000 (PM-KISAN grant simulation)
- Seeds cost ₹180–₹700 depending on crop
- Irrigation costs ₹40/plot/day
- Fertilizer costs ₹120/plot
- Labour deducted weekly (₹50/active plot)
- Harvest earns market price × quality bonus × soil bonus

### Soil Health Index (SHI)
- Ranges 0–100. Above 70 = +10% yield bonus
- Increases: compost (+5), completing soil module (+5)
- Decreases: over-tilling, neglect (-1/week)

### Cooperative Marketing
- Join to earn +15% on all sales
- Unlocked by completing Module 6 or joining via Market screen

### Level System
| Level | XP Required |
|-------|-------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 300 |
| 4 | 600 |
| 5 | 1000 |
| 6 | 1500 |

---

## 🏗️ Tech Stack

- **Frontend**: Vanilla HTML5 + CSS3 + JavaScript (zero dependencies, works offline)
- **Backend**: Node.js + Express (REST API)
- **Database**: JSON file (works on low-end devices, no DB install needed)
- **Fonts**: Google Fonts (Syne + DM Sans — loaded once, cached)

---

## ✅ Problem Statement Checklist

| Requirement | Status |
|-------------|--------|
| Crop selection mechanics | ✅ 8 crops with season restrictions |
| Soil health management | ✅ SHI gauge, composting, crop rotation tips |
| Irrigation scheduling | ✅ Manual/bulk, weather-aware advice |
| Pest management | ✅ Alert system, Learn module with IPM |
| Cooperative marketing | ✅ Full cooperative join + bonus system |
| Seasonal financial planning | ✅ Cash flow charts, cost breakdown, transactions |
| Works on low-end Android | ✅ Pure HTML/CSS/JS, <200KB, no frameworks |
| No internet required | ✅ Fully offline frontend |
| Educational via gameplay | ✅ Zero instructional walls — all in game |
| Authentic agronomy | ✅ Real Indian crops, seasons, price schemes |

---

## 👥 Built for Hackathon — Problem Statement 10
