// --- Collectible.js: Gears + Buff Power-ups ---

class Gear {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 9;
        this.color  = '#fdf500';
        this.angle  = Math.random() * Math.PI * 2;
        this.rotationSpeed = 0.05;
        this.value  = 100;
        this.baseY  = y;
        this.time   = Math.random() * 100;
        this.isPowerup = false;
    }

    update() {
        this.angle += this.rotationSpeed;
        this.time  += 0.1;
        this.y = this.baseY + Math.sin(this.time) * 5;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = this.color;
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 10;
        ctx.shadowColor = this.color;

        const teeth = 8;
        const inner = this.radius * 0.5;
        const outer = this.radius;
        ctx.beginPath();
        for (let i = 0; i < teeth; i++) {
            const a    = (i / teeth) * Math.PI * 2;
            const aNext = ((i + 1) / teeth) * Math.PI * 2;
            const aMid  = (a + aNext) / 2;
            if (i === 0) ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
            ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
            ctx.lineTo(Math.cos(aMid) * outer, Math.sin(aMid) * outer);
            ctx.lineTo(Math.cos(aMid) * inner, Math.sin(aMid) * inner);
            ctx.lineTo(Math.cos(aNext) * inner, Math.sin(aNext) * inner);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, inner * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ============================
// POWER UP: Buff item dropped by bosses
// ============================
const BUFF_TYPES = [
    { type: 'gun',     label: '🔫 GUN',     color: '#00f3ff', desc: 'Auto Gun' },
    { type: 'laser',   label: '⚡ LASER',   color: '#ff00ff', desc: 'Laser Orb' },
    { type: 'missile', label: '🚀 MISSILE', color: '#ff7700', desc: 'Missile Pod' },
    { type: 'tongue',  label: '↔ RANGE',   color: '#fdf500', desc: '+Tongue Range' },
    { type: 'speed',   label: '▶ SPEED',   color: '#39ff14', desc: '+Move Speed' },
    { type: 'stealth', label: '👁 STEALTH', color: '#888fff', desc: '-Stealth CD' },
];

class PowerUp {
    constructor(x, y) {
        this.x    = x;
        this.y    = y;
        this.baseY = y;
        this.radius = 18;
        this.time  = Math.random() * 100;
        this.angle = 0;

        const chosen = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];
        this.buffType = chosen.type;
        this.label    = chosen.label;
        this.color    = chosen.color;
        this.desc     = chosen.desc;
    }

    update() {
        this.time  += 0.06;
        this.angle += 0.04;
        this.y = this.baseY + Math.sin(this.time) * 6;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotating aura
        ctx.rotate(this.angle);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 4, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10; ctx.shadowColor = this.color;
            ctx.fill();
        }
        ctx.rotate(-this.angle);

        // Core gem
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 20; ctx.shadowColor = this.color;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.fillText(this.desc, 0, 0);

        ctx.restore();

        // Floating label above
        ctx.save();
        ctx.globalAlpha = 0.8 + Math.sin(this.time * 2) * 0.2;
        ctx.font = '10px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6; ctx.shadowColor = this.color;
        ctx.fillText('BUFF', this.x, this.y - this.radius - 8);
        ctx.restore();
    }
}

// ============================
// HEALTH PILL: Dropped by large red enemies
// ============================
class HealthPill {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.baseY = y;
        this.radius = 12;
        this.time = Math.random() * 100;
        this.color = '#ff003c';
        this.isHealthPill = true;
    }
    update() {
        this.time += 0.1;
        this.y = this.baseY + Math.sin(this.time) * 4;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15; ctx.shadowColor = this.color;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.color;
        ctx.stroke();
        // Cross
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 0;
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillRect(-2, -6, 4, 12);
        ctx.restore();
    }
}
