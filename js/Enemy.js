// --- Enemy.js: Full HP System, Health Bars, Boss Variants, Damage Numbers ---

// Floating damage number manager (global pool)
const damageNumbers = [];

function spawnDamageNumber(x, y, amount, isCrit = false) {
    damageNumbers.push({
        x, y: y - 10,
        vy: -2.5, life: 55, maxLife: 55,
        text: Math.ceil(amount).toString(),
        color: isCrit ? '#fdf500' : '#fff',
        scale: isCrit ? 1.6 : 1
    });
}

function updateDamageNumbers() {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.y  += d.vy;
        d.vy *= 0.93;
        d.life--;
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }
}

function drawDamageNumbers(ctx) {
    for (const d of damageNumbers) {
        const alpha = Math.min(1, d.life / 20);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.round(14 * d.scale)}px Orbitron, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = d.color;
        ctx.shadowBlur = d.scale > 1 ? 10 : 0;
        ctx.shadowColor = d.color;
        ctx.fillText(d.text, d.x, d.y);
        ctx.restore();
    }
}

// ==============================
// ENEMY CLASS
// ==============================
class Enemy {
    constructor(x, y, speed, type = 'seeker', radius = null) {
        this.x = x;
        this.y = y;

        if (radius === null) {
            const sizes = [12, 12, 24, 24, 36];
            this.radius = sizes[Math.floor(Math.random() * sizes.length)];
        } else {
            this.radius = radius;
        }

        // HP scales with size
        const hpTable = { 12: 25, 24: 70, 36: 150 };
        this.maxHp = hpTable[this.radius] || 25;
        this.hp    = this.maxHp;

        this.speed    = speed * (14 / this.radius);
        this.type     = type;
        this.vx       = (Math.random() - 0.5) * 2;
        this.vy       = (Math.random() - 0.5) * 2;
        this.damage   = Math.floor(8 * (this.radius / 12));
        this.knockback = 4 * (this.radius / 12);

        // Visuals
        this.angle     = 0;
        this.rotSpeed  = (Math.random() - 0.5) * 0.06;
        this.pulse     = Math.random() * Math.PI * 2;
        this.hitFlash  = 0;
        this.dead      = false;

        // Color by size
        if (this.radius === 36)      this.color = '#ff003c';
        else if (this.radius === 24) this.color = '#ff7700';
        else                          this.color = '#ffee00';
    }

    takeDamage(amount, x, y) {
        const isCrit = Math.random() < 0.15;
        const dmg = isCrit ? amount * 2 : amount;
        this.hp -= dmg;
        this.hitFlash = 8;
        spawnDamageNumber(this.x, this.y - this.radius, dmg, isCrit);
        if (this.hp <= 0) { this.dead = true; }
        return { dead: this.dead, dmg, isCrit };
    }

    update(player) {
        this.pulse     += 0.07;
        this.angle     += this.rotSpeed;
        if (this.hitFlash > 0) this.hitFlash--;

        if (player.stealthLevel < 0.75) {
            const dx   = player.x - this.x;
            const dy   = player.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.vx += ((dx / dist) * this.speed - this.vx) * 0.08;
            this.vy += ((dy / dist) * this.speed - this.vy) * 0.08;
        } else {
            if (Math.random() < 0.03) {
                const a = Math.random() * Math.PI * 2;
                this.vx += Math.cos(a) * 0.5;
                this.vy += Math.sin(a) * 0.5;
            }
            const spd = Math.hypot(this.vx, this.vy);
            if (spd > this.speed * 0.5) {
                this.vx = (this.vx / spd) * this.speed * 0.5;
                this.vy = (this.vy / spd) * this.speed * 0.5;
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -60) this.x = window.innerWidth + 60;
        if (this.x > window.innerWidth + 60) this.x = -60;
        if (this.y < -60) this.y = window.innerHeight + 60;
        if (this.y > window.innerHeight + 60) this.y = -60;
    }

    draw(ctx) {
        const glow   = 10 + Math.sin(this.pulse) * 4;
        const col    = this.hitFlash > 0 ? '#ffffff' : this.color;
        const r      = this.radius;
        const spikes = r === 36 ? 8 : (r === 24 ? 6 : 5);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Body
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const a   = (i / (spikes * 2)) * Math.PI * 2;
            const rad = i % 2 === 0 ? r : r * 0.5;
            const px  = Math.cos(a) * rad;
            const py  = Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        if      (r === 36) { grad.addColorStop(0, '#ff6688'); grad.addColorStop(1, '#880022'); }
        else if (r === 24) { grad.addColorStop(0, '#ffaa44'); grad.addColorStop(1, '#883300'); }
        else               { grad.addColorStop(0, '#ffff66'); grad.addColorStop(1, '#886600'); }
        ctx.fillStyle = grad;
        ctx.shadowBlur = glow;
        ctx.shadowColor = col;
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Eye
        ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#000'; ctx.shadowBlur = 0; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.shadowBlur = 6; ctx.shadowColor = col; ctx.fill();

        ctx.restore();

        // HP Bar (only if damaged)
        if (this.hp < this.maxHp) {
            this._drawHPBar(ctx);
        }
    }

    _drawHPBar(ctx) {
        const bw  = this.radius * 2.2;
        const bh  = 5;
        const bx  = this.x - bw / 2;
        const by  = this.y - this.radius - 12;
        const pct = Math.max(0, this.hp / this.maxHp);

        ctx.save();
        ctx.shadowBlur = 0;
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        // HP fill
        const barColor = pct > 0.5 ? '#39ff14' : pct > 0.25 ? '#ff8800' : '#ff003c';
        ctx.fillStyle = barColor;
        ctx.fillRect(bx, by, bw * pct, bh);
        ctx.restore();
    }
}

// ==============================
// BOSS CLASS
// ==============================
class Boss extends Enemy {
    constructor(x, y, bossType = 1) {
        super(x, y, 0.8, 'boss', 60);
        this.isBoss  = true;
        this.bossType = bossType;  // 1, 2, 3 = different appearances/attacks
        this.maxHp   = 800 + bossType * 300;
        this.hp      = this.maxHp;
        this.damage  = 25;
        this.knockback = 10;
        this.speed   = 1.2 + bossType * 0.2;
        this.radius  = 55 + bossType * 5;
        this.pulse   = 0;
        this.angle   = 0;
        this.rotSpeed = 0.025;
        this.hitFlash = 0;
        this.dead    = false;
        this.attackTimer = 0;
        this.projectiles = [];
        this.shieldAngle  = 0;
        this.phase   = 1; // enters phase 2 at 50% HP

        // Colors per type
        const bossColors = ['#ff00ff', '#00f3ff', '#ff7700', '#ff003c', '#b000ff'];
        this.color = bossColors[(bossType - 1) % bossColors.length];
    }

    update(player, particles, audio) {
        this.pulse    += 0.05;
        this.angle    += this.rotSpeed;
        this.shieldAngle += 0.04;
        this.attackTimer++;
        if (this.hitFlash > 0) this.hitFlash--;

        // Phase 2 at 50%
        if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
            this.phase = 2;
            this.speed *= 1.4;
            this.rotSpeed *= 2;
            if (particles) particles.emit(this.x, this.y, this.color, 30, 5);
        }

        // Chase player
        const dx   = player.x - this.x;
        const dy   = player.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (player.stealthLevel < 0.75) {
            this.vx += ((dx / dist) * this.speed - this.vx) * 0.04;
            this.vy += ((dy / dist) * this.speed - this.vy) * 0.04;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Boundary bounce
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -0.5; }
        if (this.x > window.innerWidth  - this.radius) { this.x = window.innerWidth  - this.radius; this.vx *= -0.5; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -0.5; }
        if (this.y > window.innerHeight - this.radius) { this.y = window.innerHeight - this.radius; this.vy *= -0.5; }

        // Boss attack: shoot projectiles based on type
        const shootInterval = Math.max(30, 90 - this.bossType * 10);
        if (this.attackTimer % shootInterval === 0) {
            const bType = ((this.bossType - 1) % 5) + 1;
            if (bType === 1) {
                // Shotgun burst at player
                if (player.stealthLevel < 0.75) {
                    for(let i = -1; i <= 1; i++) {
                        const a = Math.atan2(player.y - this.y, player.x - this.x) + i * 0.2;
                        this.projectiles.push({ x: this.x, y: this.y, vx: Math.cos(a)*4, vy: Math.sin(a)*4, life: 120, radius: 8, color: this.color });
                    }
                }
            } else if (bType === 2) {
                // Radial burst
                for (let i = 0; i < 10; i++) {
                    const a = (i / 10) * Math.PI * 2 + this.angle;
                    this.projectiles.push({ x: this.x, y: this.y, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, life: 120, radius: 6, color: this.color });
                }
            } else {
                // Spiral madness
                const a = this.attackTimer * 0.1;
                this.projectiles.push({ x: this.x, y: this.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5, life: 120, radius: 10, color: '#ffffff' });
                this.projectiles.push({ x: this.x, y: this.y, vx: Math.cos(a + Math.PI)*5, vy: Math.sin(a + Math.PI)*5, life: 120, radius: 10, color: '#ffffff' });
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            if (p.life <= 0) this.projectiles.splice(i, 1);
        }
    }

    draw(ctx) {
        const r   = this.radius;
        const col = this.hitFlash > 0 ? '#ffffff' : this.color;
        const glow = 20 + Math.sin(this.pulse) * 8;
        const type = this.bossType;

        // Draw projectiles first
        for (const p of this.projectiles) {
            ctx.save();
            ctx.globalAlpha = p.life / 120;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Aura ring
        ctx.beginPath();
        ctx.arc(0, 0, r + 15 + Math.sin(this.pulse) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.2 + Math.sin(this.pulse) * 0.1;
        ctx.shadowBlur = glow * 2;
        ctx.shadowColor = col;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Rotating outer ring (type 3: shield)
        if (type === 3 || type >= 4) {
            ctx.rotate(this.shieldAngle);
            const shards = 6;
            for (let i = 0; i < shards; i++) {
                const a = (i / shards) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8), 10, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.shadowBlur = 12;
                ctx.shadowColor = col;
                ctx.fill();
            }
            ctx.rotate(-this.shieldAngle);
        }

        // Main body - shape varies by type
        ctx.rotate(this.angle);
        ctx.beginPath();
        if (type === 1) {
            // Type 1: Large spiked circle
            const spikes = 10;
            for (let i = 0; i < spikes * 2; i++) {
                const a   = (i / (spikes * 2)) * Math.PI * 2;
                const rad = i % 2 === 0 ? r : r * 0.55;
                if (i === 0) ctx.moveTo(Math.cos(a)*rad, Math.sin(a)*rad);
                else ctx.lineTo(Math.cos(a)*rad, Math.sin(a)*rad);
            }
        } else if (type === 2) {
            // Type 2: Hexagon
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                if (i === 0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
        } else {
            // Type 3+: Diamond/star blend
            const pts = 8;
            for (let i = 0; i < pts * 2; i++) {
                const a   = (i / (pts * 2)) * Math.PI * 2;
                const rad = i % 2 === 0 ? r : r * 0.4;
                if (i === 0) ctx.moveTo(Math.cos(a)*rad, Math.sin(a)*rad);
                else ctx.lineTo(Math.cos(a)*rad, Math.sin(a)*rad);
            }
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff88');
        grad.addColorStop(0.4, col + 'cc');
        grad.addColorStop(1, '#00000088');
        ctx.fillStyle = grad;
        ctx.shadowBlur = glow;
        ctx.shadowColor = col;
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Boss face
        ctx.rotate(-this.angle);
        // Eyes
        const eyeOff = r * 0.3;
        [[-eyeOff * 0.5, -eyeOff * 0.3], [eyeOff * 0.5, -eyeOff * 0.3]].forEach(([ex, ey]) => {
            ctx.beginPath(); ctx.arc(ex, ey, r * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = '#000'; ctx.shadowBlur = 0; ctx.fill();
            ctx.beginPath(); ctx.arc(ex, ey, r * 0.05, 0, Math.PI * 2);
            ctx.fillStyle = col; ctx.shadowBlur = 8; ctx.shadowColor = col; ctx.fill();
        });

        // "BOSS" text
        ctx.font = `bold ${Math.round(r * 0.22)}px Orbitron, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.fillText(`BOSS ${this.bossType}`, 0, r * 0.15);

        // Phase indicator
        if (this.phase === 2) {
            ctx.fillStyle = '#ff003c';
            ctx.font = `bold ${Math.round(r * 0.15)}px Orbitron, monospace`;
            ctx.fillText('PHASE 2', 0, r * 0.35);
        }

        ctx.restore();

        // HP Bar (always visible for boss)
        const bw  = r * 3;
        const bh  = 10;
        const bx  = this.x - bw / 2;
        const by  = this.y - r - 22;
        const pct = Math.max(0, this.hp / this.maxHp);

        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);

        // Gradient HP bar
        const hpGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
        hpGrad.addColorStop(0, this.color);
        hpGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(bx, by, bw * pct, bh);

        // HP text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, this.x, by - 4);
        ctx.restore();
    }
}
