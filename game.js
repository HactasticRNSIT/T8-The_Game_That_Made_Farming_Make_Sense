// --- Game Data & Configurations ---
const CROPS = {
    'wheat': { name: 'High-Yield Wheat', cost: 15000, yield: 50, soilImpact: -15, waterNeed: 70, type: 'commercial' },
    'millet': { name: 'Drought-Resistant Millet', cost: 5000, yield: 30, soilImpact: 5, waterNeed: 20, type: 'sustainable' },
    'cotton': { name: 'Bt Cotton (Cash Crop)', cost: 25000, yield: 40, soilImpact: -25, waterNeed: 85, type: 'commercial' },
    'legumes': { name: 'Legumes (Nitrogen Fixing)', cost: 8000, yield: 25, soilImpact: 20, waterNeed: 40, type: 'sustainable' }
};

const SEASONS = ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid (Summer)'];

// --- Game State ---
let state = {
    funds: 50000,
    seasonIndex: 0,
    soilHealth: 80,
    waterReserves: 80,
    selectedCrop: null,
    inventory: { type: null, amount: 0 },
    hasLoan: false,
    hasInsurance: false,
    ledger: [{ desc: 'Starting Balance', amount: 50000 }],
    planted: false
};

// --- Initialization ---
function initGame() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        state = JSON.parse(savedState);
    }
    
    // Check auth
    if (!localStorage.getItem('farmerId')) {
        window.location.href = 'index.html';
        return;
    }

    renderCrops();
    updateUI();
}

function updateUI() {
    document.getElementById('funds-display').innerText = state.funds.toFixed(0);
    document.getElementById('season-display').innerText = SEASONS[state.seasonIndex % 3] + ` (Year ${Math.floor(state.seasonIndex/3) + 1})`;
    
    // Progress Bars
    document.getElementById('soil-health-bar').style.width = `${Math.max(0, Math.min(100, state.soilHealth))}%`;
    document.getElementById('soil-health-text').innerText = state.soilHealth > 70 ? 'Good' : state.soilHealth > 40 ? 'Moderate' : 'Poor (Risk of Failure)';
    
    document.getElementById('water-bar').style.width = `${Math.max(0, Math.min(100, state.waterReserves))}%`;
    document.getElementById('water-text').innerText = state.waterReserves > 60 ? 'Abundant' : state.waterReserves > 30 ? 'Adequate' : 'Low (Drought Risk)';

    // Inventory
    document.getElementById('inventory-amount').innerText = state.inventory.amount;
    document.getElementById('inventory-type').innerText = state.inventory.type ? CROPS[state.inventory.type].name : 'None';

    // Market Prices (Dynamic based on season/randomness)
    if(state.inventory.amount > 0) {
        const basePrice = state.inventory.type === 'cotton' ? 4000 : state.inventory.type === 'wheat' ? 2000 : 1500;
        document.getElementById('mandi-price').innerText = Math.floor(basePrice * (0.8 + Math.random()*0.3)); // Volatile
        document.getElementById('coop-price').innerText = Math.floor(basePrice * 1.1); // Stable, higher
    } else {
        document.getElementById('mandi-price').innerText = '--';
        document.getElementById('coop-price').innerText = '--';
    }

    // Ledger
    const ledgerHtml = state.ledger.map(item => `
        <li>
            <span>${item.desc}</span>
            <span class="${item.amount > 0 ? 'positive' : 'negative'}">₹${item.amount > 0 ? '+' : ''}${item.amount}</span>
        </li>
    `).reverse().join('');
    document.getElementById('ledger-list').innerHTML = ledgerHtml;
    
    // Field Visual
    const field = document.getElementById('field-visual-display');
    if(state.planted) {
        field.className = 'field-plot planted';
        field.innerText = `Growing: ${CROPS[state.selectedCrop].name}`;
    } else {
        field.className = 'field-plot empty';
        field.innerText = 'Ready for planting.';
    }
}

function renderCrops() {
    const container = document.getElementById('crop-options');
    container.innerHTML = '';
    
    for (const [key, crop] of Object.entries(CROPS)) {
        const card = document.createElement('div');
        card.className = `crop-card ${state.selectedCrop === key ? 'selected' : ''}`;
        card.onclick = () => selectCrop(key);
        card.innerHTML = `
            <div class="crop-header">
                <span class="crop-name">${crop.name}</span>
                <span class="crop-cost">Cost: ₹${crop.cost}</span>
            </div>
            <div class="crop-stats">
                <span>Yield: ~${crop.yield} qtl</span>
                <span>Water Need: ${crop.waterNeed}%</span>
                <span>Soil Impact: ${crop.soilImpact > 0 ? '+' : ''}${crop.soilImpact}</span>
            </div>
        `;
        container.appendChild(card);
    }
}

// --- Interactions ---

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function selectCrop(cropKey) {
    if(state.planted) {
        showModal('Already Planted', 'You cannot change your crop after planting. Wait for the harvest.');
        return;
    }
    state.selectedCrop = cropKey;
    renderCrops();
}

function addTransaction(desc, amount) {
    state.funds += amount;
    state.ledger.push({desc, amount});
    updateUI();
}

function showModal(title, text) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerText = text;
    document.getElementById('educational-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('educational-modal').classList.add('hidden');
}

// --- Simulation Logic ---

function executeFarming() {
    if (!state.selectedCrop) {
        showModal('Select Crop', 'Please select a crop to plant.');
        return;
    }
    if (state.planted) {
        showModal('Already Planted', 'Your field is already planted for this season.');
        return;
    }

    const crop = CROPS[state.selectedCrop];
    const irrigation = document.getElementById('irrigation-type').value;
    const pest = document.getElementById('pest-type').value;
    const fertilizer = document.getElementById('fertilizer-type').value;

    let totalCost = crop.cost;
    
    // Apply choices impacts
    if(irrigation === 'drip') totalCost += 5000;
    if(pest === 'biological') totalCost += 3000;
    if(fertilizer === 'organic') totalCost += 2000;

    if (state.funds < totalCost) {
        showModal('Insufficient Funds', 'You do not have enough funds to execute this plan. Consider a loan or cheaper inputs.');
        return;
    }

    // Deduction
    addTransaction(`Planted ${crop.name} (Inputs)`, -totalCost);
    
    // Store choices for harvest calculation
    state.currentPlan = { irrigation, pest, fertilizer };
    state.planted = true;
    updateUI();
    
    showModal('Farming Plan Executed', 'Your seeds are sown! Use "Advance Season" to see the harvest results.');
}

function advanceSeason() {
    if (!state.planted) {
        showModal('Field Empty', 'You should plant something before advancing the season to avoid losing time.');
        return;
    }

    const crop = CROPS[state.selectedCrop];
    const plan = state.currentPlan;

    // Simulate Weather Event
    const eventRoll = Math.random();
    let weatherModifier = 1.0;
    let weatherEvent = 'Normal weather.';

    if (eventRoll < 0.2) { // 20% chance of drought
        weatherModifier = 0.5;
        weatherEvent = 'A severe drought hit this season!';
        if (crop.type === 'sustainable') {
             weatherModifier = 0.8;
             weatherEvent += ' Fortunately, your drought-resistant crop survived well.';
        }
        if (state.hasInsurance) {
            weatherEvent += ' Crop insurance covered your losses!';
            addTransaction('Insurance Payout (Drought)', crop.cost * 1.5);
            state.hasInsurance = false;
            document.getElementById('btn-insurance').innerText = 'Buy Insurance';
        }
    } else if (eventRoll > 0.8) { // 20% chance of heavy rain
        weatherEvent = 'Heavy unseasonal rains!';
        if (state.soilHealth < 40) {
            weatherModifier = 0.6;
            weatherEvent += ' Poor soil health caused waterlogging and root rot.';
        }
    }

    // Calculate Water & Soil Impact
    let waterUsed = crop.waterNeed;
    if(plan.irrigation === 'drip') waterUsed *= 0.5;
    state.waterReserves -= waterUsed;
    state.waterReserves += 50; // Natural rain replenish
    
    let soilDelta = crop.soilImpact;
    if(plan.fertilizer === 'organic') soilDelta += 15;
    if(plan.fertilizer === 'synthetic') soilDelta -= 10;
    if(plan.pest === 'chemical') soilDelta -= 5;
    state.soilHealth += soilDelta;

    // Calculate Yield
    let finalYield = crop.yield * weatherModifier;
    if (state.soilHealth < 30) finalYield *= 0.6; // Bad soil penalty

    state.inventory = {
        type: state.selectedCrop,
        amount: Math.floor(finalYield)
    };

    // Educational prompt based on choices
    let learningText = `${weatherEvent}\n\nHarvested: ${state.inventory.amount} quintals of ${crop.name}. `;
    
    if (plan.irrigation === 'drip') {
        learningText += 'Drip irrigation saved 50% of water. ';
    } else if (state.waterReserves < 30) {
        learningText += 'Warning: Flood irrigation is depleting groundwater rapidly. ';
    }

    if (plan.fertilizer === 'organic') {
        learningText += 'Organic compost improved your soil structure. ';
    } else if (state.soilHealth < 50) {
        learningText += 'Continuous use of synthetic chemicals is degrading your soil health. Yields will suffer. ';
    }

    showModal('Season Complete', learningText);

    // Reset for next season
    state.planted = false;
    state.selectedCrop = null;
    state.currentPlan = null;
    state.seasonIndex++;
    
    // Reset Insurance per season
    if(state.hasInsurance) {
        state.hasInsurance = false;
        document.getElementById('btn-insurance').innerText = 'Buy Insurance';
    }

    // Loan Interest
    if (state.hasLoan) {
        addTransaction('Loan Interest Deduction', -800);
    }

    renderCrops();
    updateUI();
    document.getElementById('harvest-results').classList.remove('hidden');
    document.getElementById('yield-text').innerText = `You have ${state.inventory.amount} qtl in inventory. Go to Market to sell.`;
}

function sellCrop(method) {
    if (state.inventory.amount <= 0) {
        showModal('Empty Inventory', 'You have nothing to sell.');
        return;
    }

    const priceSpan = method === 'mandi' ? 'mandi-price' : 'coop-price';
    const price = parseInt(document.getElementById(priceSpan).innerText);
    
    let totalRevenue = state.inventory.amount * price;
    
    if (method === 'coop') {
        totalRevenue -= 1000; // Coop fee
        showModal('Cooperative Market', 'By pooling resources with the FPO, you bypassed local middlemen and secured a higher, stable price. A ₹1000 logistical fee was deducted.');
    } else {
        showModal('Local Mandi', 'You sold at the local mandi. The middleman set the price which was subject to high daily volatility.');
    }

    addTransaction(`Sold ${state.inventory.amount} qtl of ${CROPS[state.inventory.type].name}`, totalRevenue);
    
    state.inventory = { type: null, amount: 0 };
    document.getElementById('harvest-results').classList.add('hidden');
    updateUI();
    saveGame();
}

function buyInsurance() {
    if(state.hasInsurance) return;
    if(state.funds < 1500) {
        showModal('Insufficient Funds', 'Need ₹1500 for insurance premium.');
        return;
    }
    state.hasInsurance = true;
    addTransaction('Crop Insurance Premium', -1500);
    document.getElementById('btn-insurance').innerText = 'Insured (Active)';
    showModal('Insurance Purchased', 'Under PMFBY, you are now protected against natural calamities for this season.');
}

function takeLoan() {
    if(state.hasLoan) {
        // Repay
        if(state.funds < 20000) {
            showModal('Insufficient Funds', 'You need ₹20000 to repay the principal.');
            return;
        }
        addTransaction('Loan Repayment (Principal)', -20000);
        state.hasLoan = false;
        document.getElementById('btn-loan').innerText = 'Take ₹20000 Loan';
        showModal('Debt Cleared', 'You have repaid your Kisan Credit Card loan.');
    } else {
        // Take
        state.hasLoan = true;
        addTransaction('KCC Loan Disbursed', 20000);
        document.getElementById('btn-loan').innerText = 'Repay Loan (₹20000)';
        showModal('Formal Credit Accessed', 'You bypassed predatory moneylenders (24% interest) and used institutional credit (4% interest).');
    }
}

async function saveGame() {
    localStorage.setItem('gameState', JSON.stringify(state));
    const username = localStorage.getItem('farmerId');
    
    try {
        await fetch(`${window.API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, gameState: state })
        });
    } catch(e) {
        console.log('Saved locally (offline mode)');
    }
}

function logout() {
    saveGame();
    localStorage.removeItem('farmerId');
    window.location.href = 'index.html';
}

// Start
initGame();

