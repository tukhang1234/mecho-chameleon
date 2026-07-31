// --- main.js: Game Loop + Wave/Boss System + MULTIPLAYER (Co-op & PvP) ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const mainMenu = document.getElementById('main-menu');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('game-over-screen');
const playBtn = document.getElementById('play-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('scoreDisplay');
const gearsDisplay = document.getElementById('gearsDisplay');
const healthBar = document.getElementById('healthBar');
const stealthBar = document.getElementById('stealthCooldownBar');
const waveDisplay = document.getElementById('waveDisplay');
const waveAnnounce = document.getElementById('wave-announce');
const finalScoreEl = document.getElementById('finalScore');
const finalGearsEl = document.getElementById('finalGears');
const finalWaveEl = document.getElementById('finalWave');
const menuFromGameOverBtn = document.getElementById('menu-from-gameover-btn');
// Titan Energy UI
const energyBarWrapper = document.getElementById('energy-bar-wrapper');
const energyBarEl = document.getElementById('energyBar');

// Multiplayer UI elements
const mpBtn = document.getElementById('mp-btn');
const modeSelectScr = document.getElementById('mode-select');
const lobbyScr = document.getElementById('lobby-screen');

// Shop UI elements
const shopBtn = document.getElementById('shop-btn');
const shopScreen = document.getElementById('shop-screen');
const backFromShop = document.getElementById('back-from-shop');
const menuCoinsDisplay = document.getElementById('menuCoinsDisplay');
const shopCoinsDisplay = document.getElementById('shopCoinsDisplay');
const shopItems = document.querySelectorAll('.shop-item');

// Settings UI elements
const settingsBtn = document.getElementById('settings-btn');
const settingsScreen = document.getElementById('settings-screen');
const backFromSettings = document.getElementById('back-from-settings');
const modePcBtn = document.getElementById('mode-pc-btn');
const modeMobileBtn = document.getElementById('mode-mobile-btn');
const mobileControls = document.getElementById('mobile-controls');
const mobileStealthBtn = document.getElementById('mobile-stealth-btn');
const mobileTongueBtn = document.getElementById('mobile-tongue-btn');

let controlMode = localStorage.getItem('chameleon_control') || 'pc';
let joystickLeft = null;
let joystickRight = null;
const victoryScr = document.getElementById('victory-screen');
const coopBtn = document.getElementById('coop-btn');
const pvpBtn = document.getElementById('pvp-btn');
const backFromMode = document.getElementById('back-from-mode');
const cancelLobbyBtn = document.getElementById('cancel-lobby-btn');
const lobbyStatus = document.getElementById('lobby-status');
const lobbyModeLabel = document.getElementById('lobby-mode-label');
const p1Label = document.getElementById('p1-label');
const oppHPContainer = document.getElementById('opp-hp-container');
const oppHealthBar = document.getElementById('oppHealthBar');
const victoryScoreEl = document.getElementById('victoryScore');
const victoryGearsEl = document.getElementById('victoryGears');
const victoryRestartBtn = document.getElementById('victory-restart-btn');
const menuFromVictoryBtn = document.getElementById('menu-from-victory-btn');

// Game State
let gameState = 'menu';
let animId;

// Entities
let player, particles, screenShake, audio;
let enemies = [];
let collectibles = [];
let powerups = [];

// Input
const keys = {};
const mouse = { x: 0, y: 0, down: false };
let autoAimEnabled = true;

// Game Data
let score = 0, gears = 0, playerHealth = 100, maxPlayerHealth = 100;
let waveNumber = 0;
let waveActive = false;
let waveTimer = 0;
let enemiesLeft = 0;

// Shop / Persistence
let coins = parseInt(localStorage.getItem('chameleon_coins')) || 0;
coins += 100000; // Cheat: add 100k
localStorage.setItem('chameleon_coins', coins.toString());
let shopInventory = JSON.parse(localStorage.getItem('chameleon_inventory')) || { armor: false, arms_m1: false, arms_m2: false, arms_m3: false, arms_m4: false, arms_m5: false, arms_m6: false, core: false, titan_blue: false };
let equippedItems = JSON.parse(localStorage.getItem('chameleon_equipped')) || { armor: false, arms_m1: false, arms_m2: false, arms_m3: false, arms_m4: false, arms_m5: false, arms_m6: false, core: false, titan_blue: false };
// Patch old saves that might be missing new fields
if (!('titan_blue' in shopInventory)) { shopInventory.titan_blue = false; equippedItems.titan_blue = false; }

let bossAlive = false;
let boss = null;
let waveInterval = null;

// Perf
let bgStars = [], bgScanY = 0, bgT = 0;
const MAX_PARTICLES = 80;

// ==========================
// MULTIPLAYER STATE
// ==========================
let socket = null;
let mpMode = null;   // null | 'coop' | 'pvp'
let playerIndex = 0;      // 1 = Host, 2 = Client
let opponentState = null;   // Latest state received from opponent
let remoteEnemies = [];     // Enemy positions synced from host (coop client)
let enemyNetIdCounter = 0;  // Unique IDs for enemies (for co-op hit relay)
let syncFrame = 0;      // Frame counter for enemy sync throttle

// PvP state
let pvpOpponentHealth = 100;
let tongueHitOpp = false;  // Prevent tongue from hitting opponent multiple times per swing

// Co-op client hit tracking
let clientTongueHitIds = new Set(); // track which enemy IDs tongue hit this swing

// ==========================
// SETUP
// ==========================
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    buildStars();
}
window.addEventListener('resize', resize);
resize();

function buildStars() {
    bgStars = [];
    for (let i = 0; i < 40; i++) {
        bgStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.4 + 0.2,
            t: Math.random() * Math.PI * 2,
            cyan: Math.random() < 0.25
        });
    }
}

// Input
window.addEventListener('keydown', e => {
    const focused = document.activeElement;
    if (focused && focused.id === 'chat-input') {
        if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof toggleChat === 'function') toggleChat(false);
            else focused.blur();
        }
        return; // Allow normal typing in chat
    }

    // If a game UI button is focused while playing, forcefully blur it
    // This prevents Space/Enter from triggering hidden menu screens
    if (gameState === 'playing') {
        if (focused && focused.tagName === 'BUTTON') {
            focused.blur();
        }
        // Prevent Enter/Space from triggering click events on any element
        if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
    }
    keys[e.key] = true;

    // Toggle Stats Panel — works in ALL modes (C key)
    if (gameState === 'playing' && e.key.toLowerCase() === 'c') {
        const statsPanel = document.getElementById('stats-panel');
        if (statsPanel) statsPanel.classList.toggle('hidden');
    }

    // Toggle Chat — only in multiplayer (T key)
    if (gameState === 'playing' && e.key.toLowerCase() === 't' && mpMode) {
        const chatContainer = document.getElementById('chat-container');
        const chatInput = document.getElementById('chat-input');
        if (chatContainer) {
            const wasHidden = chatContainer.classList.contains('hidden');
            chatContainer.classList.toggle('hidden');
            if (wasHidden && chatInput) chatInput.focus();
        }
    }

    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => {
    if (e.button === 0) mouse.down = true;
    if (e.button === 2) mouse.rightDown = true;
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
});
window.addEventListener('contextmenu', e => {
    e.preventDefault();
});




// ==========================
// MENU BACKGROUND
// ==========================
function menuBg() {
    bgT += 0.008;
    drawBg(bgT);
    if (gameState !== 'playing') requestAnimationFrame(menuBg);
}

function saveGameData() {
    localStorage.setItem('chameleon_coins', coins);
    localStorage.setItem('chameleon_inventory', JSON.stringify(shopInventory));
    localStorage.setItem('chameleon_equipped', JSON.stringify(equippedItems));
}

function updateShopUI() {
    menuCoinsDisplay.innerText = coins;
    shopCoinsDisplay.innerText = coins;
    const armsDisp = document.getElementById('armsCoinsDisplay');
    if (armsDisp) armsDisp.innerText = coins;
    const titanDisp = document.getElementById('titanCoinsDisplay');
    if (titanDisp) titanDisp.innerText = coins;

    const allItems = document.querySelectorAll('.shop-item[data-item]');
    allItems.forEach(el => {
        const itemType = el.getAttribute('data-item');
        const btn = el.querySelector('.buy-btn');
        const price = parseInt(btn.getAttribute('data-price'));

        if (shopInventory[itemType]) {
            if (equippedItems[itemType]) {
                el.classList.add('equipped');
                btn.className = 'buy-btn equipped-btn';
                btn.innerText = 'EQUIPPED';
            } else {
                el.classList.remove('equipped');
                btn.className = 'buy-btn equip-btn';
                btn.innerText = 'EQUIP';
            }
        } else {
            el.classList.remove('equipped');
            btn.className = 'buy-btn';
            btn.innerText = price + ' 🪙';
        }
    });
}
updateShopUI();
menuBg();

// ==========================
// INIT GAME
// ==========================
function initGame() {
    if (waveInterval) clearInterval(waveInterval);
    player = new Player(canvas.width / 2, canvas.height / 2);
    player.equipped = equippedItems;
    player.invulnTimer = 0;
    enemies = []; collectibles = []; powerups = [];
    particles = new ParticleSystem();
    screenShake = new ScreenShake();
    if (!audio) audio = new AudioSystem();

    score = 0; gears = 0; maxPlayerHealth = 100;
    if (equippedItems.armor) maxPlayerHealth += 50;
    if (equippedItems.titan_blue) maxPlayerHealth += 200; // Titan: rất nhiều máu
    playerHealth = maxPlayerHealth;
    waveNumber = 0; waveActive = false; waveTimer = 0;
    boss = null; bossAlive = false;
    remoteEnemies = [];
    syncFrame = 0;
    enemyNetIdCounter = 0;

    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouchDevice || controlMode === 'mobile') {
        mobileControls.classList.remove('hidden');
        if (!joystickLeft) joystickLeft = new VirtualJoystick('joystick-left');
        if (!joystickRight) joystickRight = new VirtualJoystick('joystick-right');
    } else {
        mobileControls.classList.add('hidden');
    }

    gameState = 'playing';
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    modeSelectScr.classList.add('hidden');
    lobbyScr.classList.add('hidden');
    hud.classList.remove('hidden');

    // Auto Aim HUD logic
    const autoAimContainer = document.getElementById('auto-aim-container');
    if (autoAimContainer) {
        if (equippedItems.arms_m2 || equippedItems.arms_m3 || equippedItems.arms_m4 || equippedItems.arms_m5 || equippedItems.arms_m6) {
            autoAimContainer.classList.remove('hidden');
        } else {
            autoAimContainer.classList.add('hidden');
        }
    }

    // Titan Energy Bar visibility
    if (energyBarWrapper) {
        if (equippedItems.titan_blue) {
            energyBarWrapper.classList.remove('hidden');
        } else {
            energyBarWrapper.classList.add('hidden');
        }
    }

    // Stats toggle button: always show while playing (ALL modes)
    const statsToggleBtn2 = document.getElementById('stats-toggle-btn');
    if (statsToggleBtn2) statsToggleBtn2.classList.remove('hidden');
    // Ensure panel starts closed
    const statsPanel2 = document.getElementById('stats-panel');
    if (statsPanel2) statsPanel2.classList.add('hidden');

    // Multiplayer HUD elements
    if (mpMode) {
        p1Label.classList.remove('hidden');
        p1Label.innerText = playerIndex === 1 ? '👤 P1 — YOU (HOST)' : '👤 P2 — YOU';
        document.getElementById('chat-toggle-btn').classList.remove('hidden');
        const hint = document.getElementById('chat-key-hint');
        if (hint) hint.classList.remove('hidden');
    } else {
        p1Label.classList.add('hidden');
        document.getElementById('chat-toggle-btn').classList.add('hidden');
        document.getElementById('chat-container').classList.add('hidden');
        const hint = document.getElementById('chat-key-hint');
        if (hint) hint.classList.add('hidden');
    }

    if (mpMode === 'pvp') {
        oppHPContainer.classList.remove('hidden');
        pvpOpponentHealth = 100;
        updateOppHealthBar(100);
    } else {
        oppHPContainer.classList.add('hidden');
    }

    audio.stopMusic();
    audio.startGameMusic();

    // PvP: no enemies, no waves — just players vs each other
    if (mpMode === 'pvp') {
        spawnGear(); spawnGear(); spawnGear();
        // Periodically drop power-ups for PvP
        pvpPowerupTimer();
        waveActive = false;
    } else if (mpMode === 'coop' && playerIndex === 2) {
        // Co-op CLIENT: don't spawn own enemies, rely on host sync
        spawnGear(); spawnGear(); spawnGear();
        waveActive = false;
    } else {
        // Single-player OR co-op HOST: run normal wave system
        spawnGear(); spawnGear(); spawnGear();
        startNextWave();
    }

    if (animId) cancelAnimationFrame(animId);
    gameLoop();
}

function pvpPowerupTimer() {
    if (gameState !== 'playing' || mpMode !== 'pvp') return;
    spawnUpgrade();
    setTimeout(pvpPowerupTimer, 18000);
}

// ==========================
// WAVE SYSTEM
// ==========================
function startNextWave() {
    // Co-op clients don't manage waves (host does)
    if (mpMode === 'coop' && playerIndex === 2) return;

    waveNumber++;
    const isBossWave = waveNumber % 10 === 0;
    const bossType = Math.ceil(waveNumber / 10);
    const count = isBossWave ? 0 : Math.min(6 + waveNumber * 2, 40);
    enemiesLeft = isBossWave ? 1 : count;
    waveActive = true;

    showWaveAnnounce(isBossWave
        ? `⚠️ WAVE ${waveNumber} — BOSS INCOMING!`
        : `WAVE ${waveNumber}`
    );

    if (isBossWave) {
        setTimeout(() => {
            spawnBoss(bossType);
        }, 2200);
    } else {
        spawnWaveEnemies(count, waveNumber);
    }
}

function spawnWaveEnemies(count, wave) {
    let spawned = 0;
    if (waveInterval) clearInterval(waveInterval);
    waveInterval = setInterval(() => {
        if (gameState !== 'playing') { clearInterval(waveInterval); return; }
        if (spawned >= count) { clearInterval(waveInterval); return; }
        spawnEnemy(wave);
        spawned++;
    }, Math.max(200, 800 - wave * 20));
}

function spawnEnemy(wave) {
    const side = Math.random() * 4 | 0;
    let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = -40; }
    else if (side === 1) { x = canvas.width + 40; y = Math.random() * canvas.height; }
    else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 40; }
    else { x = -40; y = Math.random() * canvas.height; }
    const spd = 1.5 + wave * 0.08 + Math.random() * 1.2;
    const e = new Enemy(x, y, spd);
    e.netId = ++enemyNetIdCounter;
    enemies.push(e);
}

function spawnBoss(bossType) {
    if (gameState !== 'playing') return;
    const bx = canvas.width / 2;
    const by = -80;
    boss = new Boss(bx, by, ((bossType - 1) % 5) + 1);
    boss.netId = ++enemyNetIdCounter;
    bossAlive = true;
    enemies.push(boss);
    if (audio) audio.startBossMusic();
}

function checkWaveEnd() {
    if (!waveActive) return;
    if (mpMode === 'coop' && playerIndex === 2) return;
    if (enemies.length === 0 && !bossAlive) {
        waveActive = false;
        waveTimer = 120;
    }
}

function showWaveAnnounce(text) {
    if (!waveAnnounce) return;
    waveAnnounce.innerText = text;
    waveAnnounce.classList.remove('hidden', 'fade-out');
    void waveAnnounce.offsetWidth;
    waveAnnounce.classList.add('fade-out');
    setTimeout(() => waveAnnounce.classList.add('hidden'), 2500);
}

function spawnGear() {
    if (collectibles.length >= 8) return;
    const x = 60 + Math.random() * (canvas.width - 120);
    const y = 60 + Math.random() * (canvas.height - 120);
    collectibles.push(new Gear(x, y));
}

function spawnUpgrade() {
    const x = canvas.width / 2 + (Math.random() - 0.5) * 200;
    const y = canvas.height / 2 + (Math.random() - 0.5) * 200;
    powerups.push(new PowerUp(x, y));
}

function showUpgradeText(text) {
    const notif = document.getElementById('upgrade-notification');
    notif.innerText = '💎 ' + text;
    notif.classList.remove('hidden');
    const fresh = notif.cloneNode(true);
    notif.parentNode.replaceChild(fresh, notif);
    setTimeout(() => fresh.classList.add('hidden'), 2500);
}

// ==========================
// HUD
// ==========================
function updateHUD() {
    scoreDisplay.innerText = Math.floor(score);
    gearsDisplay.innerText = gears;
    if (waveDisplay) waveDisplay.innerText = waveNumber;

    healthBar.style.width = Math.max(0, (playerHealth / maxPlayerHealth) * 100) + '%';
    const hpPct = playerHealth / maxPlayerHealth;
    if (hpPct < 0.3) healthBar.style.background = '#ff003c';
    else if (hpPct < 0.6) healthBar.style.background = '#ff8800';
    else healthBar.style.background = '#00f3ff';

    if (player.stealthCooldown <= 0) {
        stealthBar.innerText = 'READY';
        stealthBar.classList.add('ready');
    } else {
        const pct = ((player.maxStealthCooldown - player.stealthCooldown) / player.maxStealthCooldown * 100) | 0;
        stealthBar.innerText = pct + '%';
        stealthBar.classList.remove('ready');
    }

    // Titan Energy Bar update
    if (energyBarEl && player.equipped && player.equipped.titan_blue) {
        const epct = Math.max(0, (player.energy / player.maxEnergy) * 100);
        energyBarEl.style.width = epct + '%';
        // Glow effect: red when low
        if (epct < 20) {
            energyBarEl.style.background = 'linear-gradient(90deg, #880000, #ff2200)';
            energyBarEl.style.boxShadow = '0 0 12px #ff2200';
        } else {
            energyBarEl.style.background = 'linear-gradient(90deg, #0066ff, #00aaff)';
            energyBarEl.style.boxShadow = '0 0 12px #00aaff';
        }
    }

    // Update Stats Panel (now includes score + wave)
    const statHp = document.getElementById('stat-hp');
    const statDmg = document.getElementById('stat-dmg');
    const statSpd = document.getElementById('stat-spd');
    const statCd = document.getElementById('stat-cd');
    const statStealth = document.getElementById('stat-stealth');
    const statScore = document.getElementById('stat-score');
    const statWave = document.getElementById('stat-wave');
    if (statHp) statHp.innerText = `${Math.floor(playerHealth)}/${maxPlayerHealth}`;
    if (statDmg) statDmg.innerText = `${player.finalDamage ? player.finalDamage : 40}x`;
    if (statSpd) statSpd.innerText = `${player.speed.toFixed(1)}`;
    if (statCd) statCd.innerText = `${player.armsCooldown || 0}f`;
    if (statStealth) statStealth.innerText = `${Math.floor(player.stealthLevel * 100)}%`;
    if (statScore) statScore.innerText = Math.floor(score);
    if (statWave) statWave.innerText = waveNumber || 1;
}

function updateOppHealthBar(hp) {
    if (!oppHealthBar) return;
    const pct = Math.max(0, hp / 100) * 100;
    oppHealthBar.style.width = pct + '%';
    if (pct > 50) oppHealthBar.style.background = 'linear-gradient(90deg, #ff003c, #ff6688)';
    else if (pct > 25) oppHealthBar.style.background = 'linear-gradient(90deg, #ff4400, #ff8844)';
    else oppHealthBar.style.background = 'linear-gradient(90deg, #880022, #ff003c)';
}

// ==========================
// COLLISION DETECTION
// ==========================
function checkCollisions() {
    const tip = player.tongueActive ? player.getTipPosition() : null;

    // --- Tongue vs Gear ---
    if (tip && player.tongueProgress > 0.1) {
        for (let i = collectibles.length - 1; i >= 0; i--) {
            const g = collectibles[i];
            if (Math.hypot(g.x - tip.x, g.y - tip.y) < g.radius + 14) {
                score += g.value; gears++;
                if (particles.particles.length < MAX_PARTICLES)
                    particles.emit(g.x, g.y, g.color, 14, 4);
                if (audio) audio.playSound('pickup');
                collectibles.splice(i, 1);
                handleGearUpgrade();
                spawnGear();
            }
        }
    }

    // --- Walk into Gear ---
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const g = collectibles[i];
        if (Math.hypot(player.x - g.x, player.y - g.y) < player.radius + g.radius) {
            score += g.value; gears++;
            if (particles.particles.length < MAX_PARTICLES)
                particles.emit(g.x, g.y, g.color, 10, 3);
            if (audio) audio.playSound('pickup');
            collectibles.splice(i, 1);
            handleGearUpgrade();
            spawnGear();
        }
    }

    // --- PowerUp pickup ---
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
            if (p.isHealthPill) {
                playerHealth = Math.min(maxPlayerHealth, playerHealth + 40);
                showUpgradeText('+40 HP RESTORED!');
                if (audio) audio.playSound('pickup');
            } else {
                player.applyBuff(p.buffType);
                maxPlayerHealth += 20;
                playerHealth = maxPlayerHealth;
                showUpgradeText(`${p.label} + MAX HP!`);
                if (audio) audio.playSound('pickup');
            }
            if (particles.particles.length < MAX_PARTICLES)
                particles.emit(p.x, p.y, p.color, 20, 4);
            powerups.splice(i, 1);
        }
    }

    // ⚔️⚔️⚔️ PvP: tongue/bullet/laser vs OPPONENT ⚔️⚔️⚔️
    if (mpMode === 'pvp' && opponentState && socket) {
        const oppR = 18;

        // Tongue vs opponent
        if (tip && player.tongueProgress > 0.1) {
            if (!tongueHitOpp && Math.hypot(opponentState.x - tip.x, opponentState.y - tip.y) < oppR + 15) {
                tongueHitOpp = true;
                socket.emit('pvp_hit', { damage: player.finalDamage });
                if (particles && particles.particles.length < MAX_PARTICLES)
                    particles.burst(opponentState.x, opponentState.y, '#ff8800', 12, 0, -1);
                if (audio) audio.playSound('hit');
                screenShake.trigger(3, 6);
            }
        }
        if (player.tongueState === 'idle') tongueHitOpp = false;

        // Bullets vs opponent
        for (let b = player.bullets.length - 1; b >= 0; b--) {
            const bullet = player.bullets[b];
            if (Math.hypot(opponentState.x - bullet.x, opponentState.y - bullet.y) < oppR + bullet.radius) {
                socket.emit('pvp_hit', { damage: bullet.damage });
                player.bullets.splice(b, 1);
                screenShake.trigger(2, 4);
                break;
            }
        }

        // Laser vs opponent
        for (const laser of player.lasers) {
            if (laser.life === laser.maxLife - 1) {
                const ldx = opponentState.x - laser.x;
                const ldy = opponentState.y - laser.y;
                const proj = ldx * Math.cos(laser.angle) + ldy * Math.sin(laser.angle);
                const perp = Math.abs(-ldx * Math.sin(laser.angle) + ldy * Math.cos(laser.angle));
                if (proj > 0 && proj < laser.length && perp < oppR + 10) {
                    socket.emit('pvp_hit', { damage: laser.damage });
                }
            }
        }
    }

    // 🤝🤝🤝 Co-op CLIENT: hit remote enemies 🤝🤝🤝
    if (mpMode === 'coop' && playerIndex === 2 && socket) {
        checkCoopClientCollisions(tip);
        return; // skip normal enemy collisions (client has no local enemies)
    }

    // 🧟‍♂️🧟‍♂️🧟‍♂️ Normal (single-player OR co-op HOST): enemies 🧟‍♂️🧟‍♂️🧟‍♂️
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        // Tongue hit
        if (player.tongueActive && tip && player.tongueProgress > 0.1) {
            if (!player.tongueHitList.has(e) && Math.hypot(e.x - tip.x, e.y - tip.y) < e.radius + 15) {
                player.tongueHitList.add(e);
                const { dead } = e.takeDamage(player.finalDamage, tip.x, tip.y);
                if (particles.particles.length < MAX_PARTICLES)
                    particles.burst(e.x, e.y, e.color, 14, tip.x - e.x, tip.y - e.y);
                if (audio) audio.playSound(dead ? (e.isBoss ? 'death' : 'split') : 'hit');
                screenShake.trigger(3, 5);
                if (dead) onEnemyDeath(e, i);
            }
        }

        // Bullet hit
        if (!e.dead) {
            for (let b = player.bullets.length - 1; b >= 0; b--) {
                const bullet = player.bullets[b];
                if (Math.hypot(e.x - bullet.x, e.y - bullet.y) < e.radius + bullet.radius) {
                    const { dead } = e.takeDamage(bullet.damage, bullet.x, bullet.y);
                    bullet.hit = true;
                    if (dead) { onEnemyDeath(e, i); break; }
                }
            }
        }

        // Laser hit
        if (!e.dead && player.lasers.length > 0) {
            for (const laser of player.lasers) {
                if (laser.life === laser.maxLife - 1) {
                    const dx = e.x - laser.x;
                    const dy = e.y - laser.y;
                    const proj = dx * Math.cos(laser.angle) + dy * Math.sin(laser.angle);
                    const perp = Math.abs(-dx * Math.sin(laser.angle) + dy * Math.cos(laser.angle));
                    if (proj > 0 && proj < laser.length && perp < e.radius + 10) {
                        const { dead } = e.takeDamage(laser.damage, e.x, e.y);
                        if (dead) { onEnemyDeath(e, i); break; }
                    }
                }
            }
        }

        // Boss projectiles vs player
        if (!e.dead && e.isBoss) {
            for (let p = e.projectiles.length - 1; p >= 0; p--) {
                const proj = e.projectiles[p];
                if (Math.hypot(player.x - proj.x, player.y - proj.y) < player.radius + proj.radius) {
                    e.projectiles.splice(p, 1);
                    hitPlayer(8);
                }
            }
        }
    }

    // --- Enemy body vs Player ---
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.dead) continue;
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.radius + e.radius) {
            const dmgMult = player.stealthLevel > 0.8 ? 0 : (1 - player.stealthLevel * 0.6);
            if (dmgMult > 0) {
                hitPlayer(e.damage * dmgMult);
                const dx = player.x - e.x, dy = player.y - e.y;
                const d = Math.hypot(dx, dy) || 1;
                player.x += (dx / d) * e.knockback;
                player.y += (dy / d) * e.knockback;
            }
            if (!e.isBoss) {
                e.dead = true;
                onEnemyDeath(e, i);
            }
        }
    }
}

// Co-op CLIENT collision against synced remote enemy positions
function checkCoopClientCollisions(tip) {
    if (!socket) return;

    for (const re of remoteEnemies) {
        if (re.dead) continue;

        // Tongue vs remote enemy
        if (tip && player.tongueProgress > 0.1) {
            if (!clientTongueHitIds.has(re.netId) && Math.hypot(re.x - tip.x, re.y - tip.y) < re.radius + 15) {
                clientTongueHitIds.add(re.netId);
                socket.emit('client_hit', { netId: re.netId, damage: player.finalDamage });
                if (particles && particles.particles.length < MAX_PARTICLES)
                    particles.burst(re.x, re.y, re.color || '#ff7700', 10, tip.x - re.x, tip.y - re.y);
                if (audio) audio.playSound('hit');
                screenShake.trigger(3, 5);
            }
        }

        // Bullets vs remote enemy
        for (let b = player.bullets.length - 1; b >= 0; b--) {
            const bullet = player.bullets[b];
            if (Math.hypot(re.x - bullet.x, re.y - bullet.y) < re.radius + bullet.radius) {
                socket.emit('client_hit', { netId: re.netId, damage: bullet.damage });
                player.bullets.splice(b, 1);
                break;
            }
        }

        // Lasers vs remote enemy
        for (const laser of player.lasers) {
            if (laser.life === laser.maxLife - 1) {
                const dx = re.x - laser.x;
                const dy = re.y - laser.y;
                const proj = dx * Math.cos(laser.angle) + dy * Math.sin(laser.angle);
                const perp = Math.abs(-dx * Math.sin(laser.angle) + dy * Math.cos(laser.angle));
                if (proj > 0 && proj < laser.length && perp < re.radius + 10) {
                    socket.emit('client_hit', { netId: re.netId, damage: laser.damage });
                }
            }
        }

        // Remote enemy body vs player
        if (!re.dead && Math.hypot(player.x - re.x, player.y - re.y) < player.radius + re.radius) {
            const dmgMult = player.stealthLevel > 0.8 ? 0 : (1 - player.stealthLevel * 0.6);
            if (dmgMult > 0) hitPlayer((re.damage || 8) * dmgMult);
        }
    }

    // Reset tongue hit ids when tongue is idle
    if (player.tongueState === 'idle') clientTongueHitIds.clear();
}

function hitPlayer(amount) {
    if (player.invulnTimer > 0) return;
    
    // Absolute defense logic (Model 6 Defend Drone)
    if (player.drones) {
        const defendDrone = player.drones.find(d => d.type === 'm6_defend');
        if (defendDrone && defendDrone.shieldActive) {
            defendDrone.shieldActive = false;
            defendDrone.shieldRecharge = 180; // 3 seconds recharge
            if (typeof particles !== 'undefined' && particles.particles.length < MAX_PARTICLES) {
                particles.burst(player.x, player.y, '#00ff00', 20, 0, 0);
            }
            if (typeof audio !== 'undefined') audio.playSound('stealth');
            return; 
        }
    }

    player.invulnTimer = 30; // 0.5s invulnerability

    playerHealth -= amount;
    screenShake.trigger(7, 12);
    if (particles && particles.particles.length < MAX_PARTICLES)
        particles.emit(player.x, player.y, '#ff003c', 10, 3);
    if (audio) audio.playSound('hit');
    if (playerHealth <= 0) endGame();
}

function onEnemyDeath(e, idx) {
    score += e.isBoss ? (500 + waveNumber * 100) : Math.floor(60 * (e.radius / 12));

    // Titan: Restore 10 energy on kill
    if (player.equipped && player.equipped.titan_blue) {
        player.energy = Math.min(player.maxEnergy, (player.energy || 0) + 10);
    }

    if (!e.isBoss && e.radius > 12) {
        if (e.radius === 36 && Math.random() < 0.35) {
            powerups.push(new HealthPill(e.x, e.y));
        }
        const newR = e.radius === 36 ? 24 : 12;
        for (let s = 0; s < 2; s++) {
            const a = Math.random() * Math.PI * 2;
            const ne = new Enemy(e.x + Math.cos(a) * newR, e.y + Math.sin(a) * newR, 1.5 + Math.random() * 1.5, 'seeker', newR);
            ne.netId = ++enemyNetIdCounter;
            ne.vx = Math.cos(a) * 3; ne.vy = Math.sin(a) * 3;
            enemies.push(ne);
        }
    }

    if (e.isBoss) {
        bossAlive = false;
        boss = null;
        spawnUpgrade();
        spawnUpgrade();
        audio.stopMusic();
        audio.startGameMusic();
    }

    if (particles && particles.particles.length < MAX_PARTICLES)
        particles.emit(e.x, e.y, e.color, 20, 4);
    if (audio && !e.isBoss) audio.playSound(e.radius > 12 ? 'split' : 'hit');

    enemies.splice(idx, 1);
}

function handleGearUpgrade() {
    if (gears % 5 === 0) { player.tongueRange += 20; showUpgradeText('TONGUE RANGE +20!'); }
    else if (gears % 12 === 0) { player.maxStealthCooldown = Math.max(80, player.maxStealthCooldown - 25); showUpgradeText('STEALTH CD REDUCED!'); }
    else if (gears % 8 === 0) { player.speed = Math.min(7.5, player.speed + 0.25); showUpgradeText('SPEED +0.25!'); }
}

// ==========================
// BACKGROUND
// ==========================
function drawBg(t) {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#030310';
    ctx.fillRect(0, 0, W, H);

    const gs = 70;
    ctx.strokeStyle = 'rgba(0,180,255,0.045)';
    ctx.lineWidth = 1;
    for (let x = t * 18 % gs; x < W + gs; x += gs) {
        ctx.beginPath(); ctx.moveTo(x | 0, 0); ctx.lineTo(x | 0, H); ctx.stroke();
    }
    for (let y = t * 18 % gs; y < H + gs; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y | 0); ctx.lineTo(W, y | 0); ctx.stroke();
    }

    ctx.shadowBlur = 0;
    for (const s of bgStars) {
        s.t += 0.015;
        const a = 0.35 + Math.sin(s.t) * 0.25;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.cyan ? '#00f3ff' : '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    bgScanY = (bgScanY + 2) % H;
    const sg = ctx.createLinearGradient(0, bgScanY - 12, 0, bgScanY + 12);
    sg.addColorStop(0, 'transparent');
    sg.addColorStop(0.5, 'rgba(0,243,255,0.04)');
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.fillRect(0, bgScanY - 12, W, 24);
}

// ==========================
// UPDATE
// ==========================
function update() {
    if (gameState !== 'playing') return;
    bgT += 0.008;

    // Wave timing (host or single-player only)
    if (!waveActive && mpMode !== 'pvp' && !(mpMode === 'coop' && playerIndex === 2)) {
        waveTimer--;
        if (waveTimer <= 0) startNextWave();
    }

    score += (0.05 + player.stealthLevel * 0.1);

    if (player.invulnTimer > 0) player.invulnTimer--;

    player.update(keys, mouse, canvas);

    // Update enemies (skip for coop client, they use remoteEnemies)
    if (!(mpMode === 'coop' && playerIndex === 2)) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e.dead) { enemies.splice(i, 1); continue; }
            if (e.isBoss) e.update(player, particles, audio);
            else e.update(player);
        }
    }

    collectibles.forEach(g => g.update());
    powerups.forEach(p => p.update());

    if (particles.particles.length < MAX_PARTICLES) particles.update();
    else {
        particles.particles.length = MAX_PARTICLES;
        particles.update();
    }

    screenShake.update();
    checkCollisions();

    if (!(mpMode === 'coop' && playerIndex === 2)) checkWaveEnd();

    updateDamageNumbers();
    updateHUD();

    // 📡 Multiplayer: send state & sync 
    if (mpMode && socket) {
        sendPlayerState();
        if (mpMode === 'coop' && playerIndex === 1) sendEnemySync();
    }
}

// ==========================
// DRAW
// ==========================
function draw() {
    if (gameState !== 'playing') return;

    drawBg(bgT);

    ctx.save();
    screenShake.apply(ctx);

    collectibles.forEach(g => g.draw(ctx));
    powerups.forEach(p => p.draw(ctx));

    // Draw enemies: local for host/singleplayer, remote for coop client
    if (mpMode === 'coop' && playerIndex === 2) {
        drawRemoteEnemies(ctx);
    } else {
        enemies.forEach(e => e.draw(ctx));
    }

    // Draw this player
    player.draw(ctx);

    // Draw opponent (multiplayer)
    if (mpMode && opponentState) drawOpponent(ctx);

    if (particles.particles.length > 0) particles.draw(ctx);
    drawDamageNumbers(ctx);

    // Boss wave overlay (host only or single-player)
    if (!(mpMode === 'coop' && playerIndex === 2)) {
        const isBossWave = waveNumber % 10 === 0 && bossAlive;
        if (isBossWave) {
            ctx.globalAlpha = 0.7;
            ctx.font = '13px Orbitron, monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff003c';
            ctx.shadowBlur = 8; ctx.shadowColor = '#ff003c';
            ctx.fillText('⚠️ BOSS WAVE ⚠️', canvas.width / 2, 50);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }

    // PvP: show opponent health in HUD (updates via received state)
    if (mpMode === 'pvp' && opponentState && opponentState.health !== undefined) {
        updateOppHealthBar(opponentState.health);
    }

    ctx.restore();
}

// ==========================
// GAME LOOP
// ==========================
function gameLoop() {
    update();
    draw();
    if (gameState === 'playing' || gameState === 'countdown') {
        animId = requestAnimationFrame(gameLoop);
    }
}

// ==========================
// END GAME
// ==========================
function endGame() {
    gameState = 'gameover';
    if (audio) { audio.stopMusic(); audio.playSound('death'); }
    hud.classList.add('hidden');
    p1Label.classList.add('hidden');
    oppHPContainer.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.innerText = Math.floor(score);
    finalGearsEl.innerText = gears;
    if (finalWaveEl) finalWaveEl.innerText = waveNumber;

    // Hide in-game UI panels
    const statsToggleBtnEnd = document.getElementById('stats-toggle-btn');
    const statsPanelEnd = document.getElementById('stats-panel');
    const chatToggleBtnEnd = document.getElementById('chat-toggle-btn');
    const chatContainerEnd = document.getElementById('chat-container');
    const chatHintEnd = document.getElementById('chat-key-hint');
    if (statsToggleBtnEnd) statsToggleBtnEnd.classList.add('hidden');
    if (statsPanelEnd) statsPanelEnd.classList.add('hidden');
    if (chatToggleBtnEnd) chatToggleBtnEnd.classList.add('hidden');
    if (chatContainerEnd) chatContainerEnd.classList.add('hidden');
    if (chatHintEnd) chatHintEnd.classList.add('hidden');

    // Notify opponent in PvP that this player died
    if (socket && mpMode === 'pvp') {
        socket.emit('player_died');
    }

    const earned = Math.floor(score / 50) + gears * 10;
    coins += earned;
    saveGameData();
    updateShopUI();

    menuBg();
}

function showVictory() {
    gameState = 'gameover';
    if (audio) { audio.stopMusic(); }
    hud.classList.add('hidden');
    p1Label.classList.add('hidden');
    oppHPContainer.classList.add('hidden');
    victoryScr.classList.remove('hidden');
    victoryScoreEl.innerText = Math.floor(score);
    victoryGearsEl.innerText = gears;

    const earned = Math.floor(score / 50) + gears * 10 + 500; // Bonus for victory
    coins += earned;
    saveGameData();
    updateShopUI();

    menuBg();
}

// ==========================
// BUTTON EVENTS
// ==========================
settingsBtn.addEventListener('click', (e) => {
    e.target.blur();
    mainMenu.classList.add('hidden');
    settingsScreen.classList.remove('hidden');
    if (controlMode === 'pc') {
        modePcBtn.classList.add('selected');
        modeMobileBtn.classList.remove('selected');
    } else {
        modeMobileBtn.classList.add('selected');
        modePcBtn.classList.remove('selected');
    }
});

backFromSettings.addEventListener('click', () => {
    settingsScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

modePcBtn.addEventListener('click', () => {
    controlMode = 'pc';
    localStorage.setItem('chameleon_control', 'pc');
    modePcBtn.classList.add('selected');
    modeMobileBtn.classList.remove('selected');
});

modeMobileBtn.addEventListener('click', () => {
    controlMode = 'mobile';
    localStorage.setItem('chameleon_control', 'mobile');
    modeMobileBtn.classList.add('selected');
    modePcBtn.classList.remove('selected');
});

mobileStealthBtn.addEventListener('click', () => {
    if (gameState === 'playing') {
        keys[' '] = true;
        setTimeout(() => { keys[' '] = false; }, 50);
    }
});

mobileTongueBtn.addEventListener('mousedown', () => { if (gameState === 'playing') mouse.rightDown = true; });
mobileTongueBtn.addEventListener('mouseup', () => { if (gameState === 'playing') mouse.rightDown = false; });
mobileTongueBtn.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameState === 'playing') mouse.rightDown = true; });
mobileTongueBtn.addEventListener('touchend', (e) => { e.preventDefault(); if (gameState === 'playing') mouse.rightDown = false; });

playBtn.addEventListener('click', (e) => {
    e.target.blur();
    if (gameState === 'playing') return;
    mpMode = null; playerIndex = 0; opponentState = null;
    if (!audio) audio = new AudioSystem();

    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouchDevice && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen failed', err));
    }

    showLoadingScreen('LOADING MATCH...', 1000, () => {
        initGame();
    });
});

// ==========================
// AUTO AIM TOGGLE
// ==========================
const autoAimBtn = document.getElementById('auto-aim-btn');
if (autoAimBtn) {
    autoAimBtn.addEventListener('click', () => {
        autoAimEnabled = !autoAimEnabled;
        if (autoAimEnabled) {
            autoAimBtn.innerText = 'AUTO-AIM: ON';
            autoAimBtn.classList.add('active');
        } else {
            autoAimBtn.innerText = 'AUTO-AIM: OFF';
            autoAimBtn.classList.remove('active');
        }
    });
}

// ==========================
// SHOP LOGIC
// ==========================
const mechaArmsCat = document.getElementById('mecha-arms-category');
const mechaArmsPanel = document.getElementById('mecha-arms-panel');
const backFromArms = document.getElementById('back-from-arms');
const armsCoinsDisplay = document.getElementById('armsCoinsDisplay');

if (mechaArmsCat) {
    mechaArmsCat.addEventListener('click', () => {
        // Open Mecha Arms sub-panel
        shopScreen.classList.add('hidden');
        mechaArmsPanel.classList.remove('hidden');
        if (armsCoinsDisplay) armsCoinsDisplay.innerText = coins;
        updateShopUI();
    });
}

// Titan Hangar panel
const titanCat = document.getElementById('titan-category');
const titanPanel = document.getElementById('titan-panel');
const backFromTitan = document.getElementById('back-from-titan');
const titanCoinsDisplay = document.getElementById('titanCoinsDisplay');

if (titanCat && titanPanel) {
    titanCat.addEventListener('click', () => {
        shopScreen.classList.add('hidden');
        titanPanel.classList.remove('hidden');
        if (titanCoinsDisplay) titanCoinsDisplay.innerText = coins;
        updateShopUI();
    });
}
if (backFromTitan) {
    backFromTitan.addEventListener('click', (e) => {
        e.target.blur();
        titanPanel.classList.add('hidden');
        shopScreen.classList.remove('hidden');
        updateShopUI();
    });
}

if (backFromArms) {
    backFromArms.addEventListener('click', (e) => {
        e.target.blur();
        mechaArmsPanel.classList.add('hidden');
        shopScreen.classList.remove('hidden');
        updateShopUI();
    });
}

shopBtn.addEventListener('click', (e) => {
    e.target.blur();
    gameState = 'shop';
    mainMenu.classList.add('hidden');
    shopScreen.classList.remove('hidden');
    updateShopUI();
});

backFromShop.addEventListener('click', (e) => {
    e.target.blur();
    gameState = 'menu';
    shopScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// Use event delegation for buy buttons since there are new sub-items
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('buy-btn')) {
        e.target.blur();
        const itemEl = e.target.closest('.shop-item');
        const itemType = itemEl.getAttribute('data-item');
        const price = parseInt(e.target.getAttribute('data-price'));

        if (!shopInventory[itemType]) {
            if (coins >= price) {
                coins -= price;
                shopInventory[itemType] = true;
                // Auto-equip if bought, unequip other arms if it's an arm model
                // Titan and arms are mutually exclusive
                if (itemType.startsWith('arms_')) {
                    equippedItems.arms_m1 = false;
                    equippedItems.arms_m2 = false;
                    equippedItems.arms_m3 = false;
                    equippedItems.arms_m4 = false;
                    equippedItems.arms_m5 = false;
                    equippedItems.arms_m6 = false;
                    equippedItems.titan_blue = false; // arms and titan are mutually exclusive
                } else if (itemType === 'titan_blue') {
                    // Titan unequips all arms
                    equippedItems.arms_m1 = false;
                    equippedItems.arms_m2 = false;
                    equippedItems.arms_m3 = false;
                    equippedItems.arms_m4 = false;
                    equippedItems.arms_m5 = false;
                    equippedItems.arms_m6 = false;
                }
                equippedItems[itemType] = true;
                saveGameData();
                updateShopUI();
                if (audio) audio.playSound('pickup');
            } else {
                // Not enough coins error
                e.target.parentElement.classList.add('shake-error');
                e.target.innerText = 'NOT ENOUGH COINS!';
                setTimeout(() => {
                    e.target.parentElement.classList.remove('shake-error');
                    updateShopUI();
                }, 1000);
            }
        } else {
            // Toggle Equip
            if (!equippedItems[itemType]) {
                if (itemType.startsWith('arms_')) {
                    equippedItems.arms_m1 = false;
                    equippedItems.arms_m2 = false;
                    equippedItems.arms_m3 = false;
                    equippedItems.arms_m4 = false;
                    equippedItems.arms_m5 = false;
                    equippedItems.arms_m6 = false;
                    equippedItems.titan_blue = false;
                } else if (itemType === 'titan_blue') {
                    equippedItems.arms_m1 = false;
                    equippedItems.arms_m2 = false;
                    equippedItems.arms_m3 = false;
                    equippedItems.arms_m4 = false;
                    equippedItems.arms_m5 = false;
                    equippedItems.arms_m6 = false;
                }
                equippedItems[itemType] = true;
            } else {
                equippedItems[itemType] = false;
            }
            saveGameData();
            updateShopUI();
            if (audio) audio.playSound('pickup');
        }
    }
});

restartBtn.addEventListener('click', (e) => {
    e.target.blur();
    if (gameState === 'playing') return;
    if (mpMode && socket) {
        socket.emit('request_restart');
        e.target.innerText = 'Waiting for opponent (1/2)...';
    } else {
        gameOverScreen.classList.add('hidden');
        if (!audio) audio = new AudioSystem();
        showLoadingScreen('RELOADING MATCH...', 1000, () => {
            initGame();
        });
    }
});

menuFromGameOverBtn.addEventListener('click', (e) => {
    e.target.blur();
    gameOverScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

const exitGameBtn = document.getElementById('exit-game-btn');
if (exitGameBtn) {
    exitGameBtn.addEventListener('click', (e) => {
        e.target.blur();
        if (gameState === 'playing') {
            endGame();
            document.getElementById('stats-panel').classList.add('hidden');
            if (socket) socket.emit('player_died');
        }
    });
}
const statsToggleBtn = document.getElementById('stats-toggle-btn');
if (statsToggleBtn) {
    const toggleStats = (e) => {
        if (e) { e.preventDefault(); e.target.blur(); }
        const panel = document.getElementById('stats-panel');
        if (panel) panel.classList.toggle('hidden');
    };
    statsToggleBtn.addEventListener('click', toggleStats);
    statsToggleBtn.addEventListener('touchstart', toggleStats);
}

const chatToggleBtn = document.getElementById('chat-toggle-btn');
if (chatToggleBtn) {
    const toggleChat = (e) => {
        if (e) { e.preventDefault(); e.target.blur(); }
        const chatContainer = document.getElementById('chat-container');
        const chatInput = document.getElementById('chat-input');
        if (chatContainer) {
            const wasHidden = chatContainer.classList.contains('hidden');
            chatContainer.classList.toggle('hidden');
            if (wasHidden && chatInput) chatInput.focus();
        }
    };
    chatToggleBtn.addEventListener('click', toggleChat);
    chatToggleBtn.addEventListener('touchstart', toggleChat);
}

victoryRestartBtn.addEventListener('click', (e) => {
    e.target.blur();
    if (gameState === 'playing') return;
    if (mpMode && socket) {
        socket.emit('request_restart');
        e.target.innerText = 'Waiting for opponent (1/2)...';
    } else {
        victoryScr.classList.add('hidden');
        if (!audio) audio = new AudioSystem();
        showLoadingScreen('RELOADING MATCH...', 1000, () => {
            initGame();
        });
    }
});

menuFromVictoryBtn.addEventListener('click', (e) => {
    e.target.blur();
    victoryScr.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

document.addEventListener('click', (e) => {
    // Prevent spacebar from triggering focused buttons later
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
    }

    if (!audio) audio = new AudioSystem();
    if (gameState === 'menu') audio.startMenuMusic();
});

// Multiplayer buttons 
mpBtn.addEventListener('click', (e) => {
    if (e) e.target.blur();
    if (!audio) audio = new AudioSystem();
    mainMenu.classList.add('hidden');
    modeSelectScr.classList.remove('hidden');
});

backFromMode.addEventListener('click', (e) => {
    if (e) e.target.blur();
    modeSelectScr.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

coopBtn.addEventListener('click', (e) => {
    if (e) e.target.blur();
    modeSelectScr.classList.add('hidden');
    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouchDevice && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen failed', err));
    }
    findMatch('coop');
});

pvpBtn.addEventListener('click', (e) => {
    if (e) e.target.blur();
    modeSelectScr.classList.add('hidden');
    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouchDevice && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen failed', err));
    }
    findMatch('pvp');
});

cancelLobbyBtn.addEventListener('click', (e) => {
    if (e) e.target.blur();
    if (socket) socket.emit('cancel_search');
    lobbyScr.classList.add('hidden');
    modeSelectScr.classList.remove('hidden');
});


// ==========================
// MULTIPLAYER FUNCTIONS
// ==========================

// Connect to server and find a match 
function findMatch(mode) {
    if (!socket) {
        socket = io();
        setupSocketListeners();
    }
    mpMode = mode;
    showLobbyScreen(mode);
    socket.emit('find_match', { mode });
}

function setupSocketListeners() {
    socket.on('waiting', () => {
        lobbyStatus.innerText = '⏳ Waiting for Player 2...';
    });

    socket.on('chatMessage', (text) => {
        if (typeof appendChatMessage === 'function') {
            appendChatMessage("Teammate", text, "other");
        }
    });

    socket.on('match_found', ({ mode, playerIndex: idx }) => {
        mpMode = mode;
        playerIndex = idx;
        opponentState = null;
        pvpOpponentHealth = 100;
        tongueHitOpp = false;

        const modeLabel = mode === 'coop' ? '🤝 CO-OP' : '⚔️ PvP';
        const roleLabel = idx === 1 ? 'HOST (P1)' : 'CLIENT (P2)';
        lobbyStatus.innerText = `✅ Match found: ${modeLabel}! You are ${roleLabel}. Starting...`;

        setTimeout(() => {
            lobbyScr.classList.add('hidden');
            if (!audio) audio = new AudioSystem();
            showLoadingScreen('LOADING MATCH...', 1500, () => {
                initGame();
                if (mpMode === 'pvp') {
                    if (playerIndex === 1) player.x = 200;
                    else player.x = canvas.width - 200;
                    player.y = canvas.height / 2;
                    gameState = 'countdown';
                    showCountdownScreen(() => {
                        gameState = 'playing';
                    });
                }
            });
        }, 1800);
    });

    socket.on('restart_vote_status', (data) => {
        const btn = gameOverScreen.classList.contains('hidden') ? victoryRestartBtn : restartBtn;
        if (btn) btn.innerText = `Waiting for opponent (${data.votes}/2)...`;
    });

    socket.on('restart_game', () => {
        gameOverScreen.classList.add('hidden');
        victoryScr.classList.add('hidden');
        if (restartBtn) restartBtn.innerText = 'PLAY AGAIN';
        if (victoryRestartBtn) victoryRestartBtn.innerText = 'PLAY AGAIN';
        if (!audio) audio = new AudioSystem();
        showLoadingScreen('RELOADING MATCH...', 1000, () => {
            initGame();
            if (mpMode === 'pvp') {
                if (playerIndex === 1) player.x = 200;
                else player.x = canvas.width - 200;
                player.y = canvas.height / 2;
                gameState = 'countdown';
                showCountdownScreen(() => {
                    gameState = 'playing';
                });
            }
        });
    });

    socket.on('opponent_state', (data) => {
        opponentState = data;
        // Update opponent HP bar in PvP
        if (mpMode === 'pvp' && data.health !== undefined) {
            pvpOpponentHealth = data.health;
        }
    });

    // Co-op: receive enemy positions from host
    socket.on('enemy_sync', (data) => {
        if (mpMode !== 'coop' || playerIndex !== 2) return;
        remoteEnemies = data.enemies || [];
        if (data.waveNumber !== undefined && data.waveNumber !== waveNumber) {
            waveNumber = data.waveNumber;
            if (waveDisplay) waveDisplay.innerText = waveNumber;
        }
        if (data.waveAnnounce) showWaveAnnounce(data.waveAnnounce);
    });

    // Co-op HOST: client hit an enemy — apply damage
    socket.on('client_hit', ({ netId, damage }) => {
        if (mpMode !== 'coop' || playerIndex !== 1) return;
        const e = enemies.find(en => en.netId === netId);
        if (e && !e.dead) {
            const { dead } = e.takeDamage(damage, e.x, e.y);
            if (particles && particles.particles.length < MAX_PARTICLES)
                particles.emit(e.x, e.y, e.color, 8, 3);
            if (dead) {
                const idx = enemies.indexOf(e);
                if (idx !== -1) onEnemyDeath(e, idx);
                // Give partner a score share
                score += e.isBoss ? 250 : 30;
            }
        }
    });

    // PvP: opponent's hit lands on this player
    socket.on('pvp_hit', ({ damage }) => {
        hitPlayer(damage);
        if (screenShake) screenShake.trigger(5, 8);
    });

    // PvP: opponent died — this player wins!
    socket.on('opponent_died', () => {
        if (mpMode === 'pvp' && gameState === 'playing') {
            showVictory();
        }
    });

    socket.on('opponent_disconnected', () => {
        if (gameState === 'playing') {
            opponentState = null;
            showWaveAnnounce('⚠️ Opponent disconnected!');
            setTimeout(() => {
                if (gameState === 'playing') endGame();
            }, 2500);
        }
    });

    socket.on('disconnect', () => {
        if (gameState === 'playing') {
            showWaveAnnounce('⚠️ Lost connection to server!');
        }
    });
}

// Send this player's state to server 
function sendPlayerState() {
    if (!socket || !socket.connected || gameState !== 'playing') return;
    socket.emit('player_state', {
        x: player.x,
        y: player.y,
        angle: player.angle,
        stealthLevel: player.stealthLevel,
        tongueState: player.tongueState,
        tongueProgress: player.tongueProgress,
        tongueTargetX: player.tongueTargetX,
        tongueTargetY: player.tongueTargetY,
        hasGun: player.hasGun,
        hasLaser: player.hasLaser,
        hasMissile: player.hasMissile,
        buffCount: player.buffCount,
        damageMultiplier: player.damageMultiplier,
        bullets: player.bullets.map(b => ({ x: b.x, y: b.y, color: b.color, radius: b.radius })),
        lasers: player.lasers ? player.lasers.map(l => ({ x: l.x, y: l.y, angle: l.angle, color: l.color, alpha: l.alpha })) : [],
        health: playerHealth,
        equipped: player.equipped,
        armsPunchAnimL: player.armsPunchAnimL,
        armsPunchAnimR: player.armsPunchAnimR,
        armsAngle: player.armsAngle
    });
}

// Co-op HOST: send enemy positions to client (~20fps) 
function sendEnemySync() {
    if (!socket || !socket.connected) return;
    syncFrame++;
    if (syncFrame % 3 !== 0) return; // ~20fps

    socket.emit('enemy_sync', {
        enemies: enemies.map(e => ({
            netId: e.netId,
            x: e.x,
            y: e.y,
            hp: e.hp,
            maxHp: e.maxHp,
            dead: e.dead,
            radius: e.radius,
            angle: e.angle,
            hitFlash: e.hitFlash,
            isBoss: !!e.isBoss,
            bossType: e.bossType,
            color: e.color,
            damage: e.damage,
            phase: e.phase,
            pulse: e.pulse,
            shieldAngle: e.shieldAngle,
            // Boss projectiles
            projectiles: e.isBoss ? (e.projectiles || []).map(p => ({
                x: p.x, y: p.y, color: p.color, radius: p.radius
            })) : undefined,
        })),
        waveNumber: waveNumber,
    });
}

// Lobby UI helpers 
function showLobbyScreen(mode) {
    lobbyScr.classList.remove('hidden');
    const tag = lobbyModeLabel;
    if (mode === 'coop') {
        tag.innerText = '🤝 CO-OP';
        tag.classList.remove('pvp-tag');
    } else {
        tag.innerText = '⚔️ PvP';
        tag.classList.add('pvp-tag');
    }
    lobbyStatus.innerText = '🔄 Connecting to server...';
}

// Draw remote player (opponent) 
function drawOpponent(ctx) {
    if (!opponentState) return;
    const { x, y, angle, stealthLevel, tongueState, tongueProgress,
        tongueTargetX, tongueTargetY, buffCount, damageMultiplier, bullets: remoteBullets, lasers: remoteLasers } = opponentState;

    const col = 'hsl(30, 100%, 55%)'; // Orange for P2
    const alpha = Math.max(0.07, 1 - (stealthLevel || 0));
    const radius = 18;

    // Draw opponent's bullets
    if (remoteBullets) {
        for (const b of remoteBullets) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius || 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff8800';
            ctx.shadowBlur = 10; ctx.shadowColor = '#ff8800';
            ctx.fill();
            ctx.restore();
        }
    }

    // Draw opponent's lasers
    if (remoteLasers) {
        for (const l of remoteLasers) {
            ctx.save();
            ctx.globalAlpha = l.alpha || 1;
            ctx.translate(l.x, l.y);
            ctx.rotate(l.angle);
            ctx.beginPath();
            ctx.rect(0, -6, 2000, 12);
            ctx.fillStyle = l.color;
            ctx.shadowBlur = 20; ctx.shadowColor = l.color;
            ctx.fill();
            ctx.restore();
        }
    }

    // Tongue
    if (tongueState && tongueState !== 'idle') {
        const tipX = x + (tongueTargetX - x) * tongueProgress;
        const tipY = y + (tongueTargetY - y) * tongueProgress;
        ctx.save();
        ctx.globalAlpha = alpha * 0.25;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 8;
        ctx.shadowBlur = 18; ctx.shadowColor = '#ff8800';
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#ffaa44'; ctx.lineWidth = 3; ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.beginPath(); ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 14; ctx.shadowColor = '#ff8800'; ctx.fill();
        ctx.restore();
    }

    // Body
    ctx.save();
    ctx.globalAlpha = alpha;

    // Robot Arms for Opponent
    if (opponentState.equipped && (stealthLevel || 0) < 0.8 && typeof Player !== 'undefined' && Player.prototype._drawRobotArms) {
        opponentState.radius = radius;
        Player.prototype._drawRobotArms.call(opponentState, ctx, alpha, col);
    }

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowBlur = 20; ctx.shadowColor = col;
    ctx.globalAlpha = alpha * 0.25; ctx.stroke();
    ctx.globalAlpha = alpha;

    // Hexagon body
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = x + Math.cos(a) * radius;
        const py = y + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, 'hsl(30, 80%, 75%)');
    grad.addColorStop(1, 'hsl(30, 100%, 28%)');
    ctx.fillStyle = grad;
    ctx.shadowBlur = 12; ctx.shadowColor = col;
    ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();

    // Eye
    const eyeX = x + Math.cos(angle) * radius * 0.4;
    const eyeY = y + Math.sin(angle) * radius * 0.4;
    ctx.beginPath(); ctx.arc(eyeX, eyeY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff8800'; ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8800'; ctx.fill();

    // P2 label above
    ctx.globalAlpha = 0.9;
    ctx.font = 'bold 10px Orbitron, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffaa44'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff8800';
    ctx.fillText(mpMode === 'pvp' ? '⚔️ ENEMY' : '🤝 P2', x, y - radius - 14);

    // Buff indicator
    if (buffCount > 0) {
        ctx.globalAlpha = 0.85;
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6;
        ctx.fillText(`x${(damageMultiplier || 1).toFixed(1)}`, x, y + radius + 12);
    }

    ctx.restore();
}

// Draw remote enemies (co-op client) 
function drawRemoteEnemies(ctx) {
    for (const re of remoteEnemies) {
        if (re.dead) continue;

        // Provide dummy variables if missing
        if (!re.pulse) re.pulse = Math.random() * Math.PI * 2;
        re.pulse += 0.05;
        if (!re.shieldAngle) re.shieldAngle = 0;
        re.shieldAngle += 0.05;
        if (!re.projectiles) re.projectiles = [];

        if (re.isBoss) {
            if (typeof Boss !== 'undefined' && Boss.prototype.draw) {
                Boss.prototype.draw.call(re, ctx);
            }
        } else {
            if (typeof Enemy !== 'undefined' && Enemy.prototype.draw) {
                Enemy.prototype.draw.call(re, ctx);
            }
        }

        // HP bar (if damaged)
        if (re.hp < re.maxHp) {
            const r = re.radius || 12;
            const bw = r * 2.2, bh = 5;
            const bx = re.x - bw / 2, by = re.y - r - 12;
            const pct = Math.max(0, re.hp / re.maxHp);
            ctx.save(); ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            ctx.fillStyle = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ff8800' : '#ff003c';
            ctx.fillRect(bx, by, bw * pct, bh);
            ctx.restore();
        }

        // Boss projectiles
        if (re.isBoss && re.projectiles) {
            for (const p of re.projectiles) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius || 6, 0, Math.PI * 2);
                ctx.fillStyle = p.color || re.color;
                ctx.shadowBlur = 10; ctx.shadowColor = p.color || re.color;
                ctx.fill();
                ctx.restore();
            }
        }
    }
}

// ==========================
// CHAT LOGIC
// ==========================
const chatToggleBtn = document.getElementById("chat-toggle-btn");
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatMessages = document.getElementById("chat-messages");

function toggleChat(forceOpen) {
    if (!chatContainer) return;
    const isHidden = chatContainer.classList.contains("hidden");
    const shouldOpen = forceOpen !== undefined ? forceOpen : isHidden;
    if (shouldOpen) {
        chatContainer.classList.remove("hidden");
        if (chatInput) chatInput.focus();
        if (chatToggleBtn) chatToggleBtn.style.background = 'rgba(57,255,20,0.25)';
    } else {
        chatContainer.classList.add("hidden");
        if (chatInput) chatInput.blur();
        if (chatToggleBtn) chatToggleBtn.style.background = 'rgba(0,0,0,0.7)';
    }
}

if (chatToggleBtn && chatContainer) {
    chatToggleBtn.addEventListener("click", () => toggleChat());
}

// Close chat on ESC (when chat-input is focused)
if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            toggleChat(false);
        }
    });
}

function appendChatMessage(sender, text, type) {
    if (!chatMessages) return;
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("chat-msg");
    if (type) msgDiv.classList.add(type);
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    msgDiv.innerHTML = `<span style="color:#555;font-size:0.75rem;">${time}</span> <span style="color:${type === 'self' ? '#39ff14' : '#ff6688'};">[${sender}]:</span> ${text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatSendBtn && chatInput) {
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (text && socket) {
            socket.emit("chatMessage", text);
            appendChatMessage("You", text, "self");
            chatInput.value = "";
        }
    };
    chatSendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
}

function showLoadingScreen(text, duration, callback) {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingText = document.getElementById('loading-text');
    if (loadingScreen && loadingText) {
        loadingText.innerText = text;
        loadingScreen.classList.remove('hidden');
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            if (callback) callback();
        }, duration);
    } else {
        if (callback) callback();
    }
}

function showCountdownScreen(callback) {
    const screen = document.getElementById('countdown-screen');
    const textEl = document.getElementById('countdown-text');
    if (!screen || !textEl) {
        if (callback) callback();
        return;
    }
    screen.classList.remove('hidden');
    screen.classList.remove('fade-out');
    let count = 3;
    textEl.innerText = count;
    textEl.style.color = '#ff00ff';

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            textEl.innerText = count;
        } else if (count === 0) {
            textEl.innerText = 'START!';
            textEl.style.color = '#00f3ff';
        } else {
            clearInterval(interval);
            screen.classList.add('fade-out');
            setTimeout(() => {
                screen.classList.add('hidden');
                if (callback) callback();
            }, 500);
        }
    }, 1000);
}