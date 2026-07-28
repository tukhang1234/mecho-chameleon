// --- Player.js: Mecho Chameleon with Damage System and Weapon Accessories ---

class Bullet {
    constructor(x, y, vx, vy, color, damage, radius = 5) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.color = color;
        this.damage = damage;
        this.radius = radius;
        this.life = 80;
        this.hit = false;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
    }
    draw(ctx) {
        const alpha = Math.min(1, this.life / 20);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.fill();
        ctx.restore();
    }
}

class Laser {
    constructor(x, y, angle, color, damage) {
        this.x = x; this.y = y;
        this.angle = angle;
        this.color = color;
        this.damage = damage;
        this.life = 18;
        this.maxLife = 18;
        this.length = 500;
    }
    update() { this.life--; }
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const w = 3 + (1 - alpha) * 6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.angle) * this.length,
            this.y + Math.sin(this.angle) * this.length
        );
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.angle) * this.length,
            this.y + Math.sin(this.angle) * this.length
        );
        ctx.strokeStyle = this.color;
        ctx.lineWidth = w;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.restore();
    }
}

class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 18;
        this.speed  = 4;
        this.angle  = 0;

        // Stealth
        this.stealthLevel = 0;
        this.isMoving = false;
        this.stealthCooldown = 0;
        this.maxStealthCooldown = 300;
        this.emergencyStealthActive = false;

        // Tongue
        this.tongueState    = 'idle'; // idle, extending, holding, retracting
        this.tongueTargetX  = 0;
        this.tongueTargetY  = 0;
        this.tongueProgress = 0;
        this.tongueSpeed    = 0.12; // faster extend
        this.tongueRange    = 280;
        this.tongueDamage   = 40;   // base damage
        this.tongueCooldown = 0;
        this.tongueHoldTime = 0;
        this.tongueMaxHold  = 40; // max frames to hold it out
        this.tongueHitList  = new Set(); // store enemies hit in current sweep

        // Weapons (acquired via buffs)
        this.hasGun    = false;
        this.hasLaser  = false;
        this.hasMissile = false;

        this.bullets   = [];
        this.lasers    = [];

        this.gunCooldown   = 0;
        this.laserCooldown = 0;
        this.missileCooldown = 0;

        // Upgrade stats
        this.buffCount = 0;   // total buffs received
        this.damageMultiplier = 1.0;

        // Visual
        this.bodyPulse   = 0;
        this.hue         = 180;
        this.eyeX        = 0;
        this.eyeY        = 0;

        this.isGrappling  = false;
        this.grappleTarget = null;
    }

    applyBuff(type) {
        this.buffCount++;
        this.damageMultiplier += 0.15; // every buff boosts damage 15%
        switch (type) {
            case 'gun':    this.hasGun    = true; break;
            case 'laser':  this.hasLaser  = true; break;
            case 'missile': this.hasMissile = true; break;
            case 'tongue': this.tongueRange  += 40; break;
            case 'speed':  this.speed  = Math.min(7.5, this.speed + 0.4); break;
            case 'stealth': this.maxStealthCooldown = Math.max(80, this.maxStealthCooldown - 30); break;
        }
    }

    get finalDamage() {
        return Math.round(this.tongueDamage * this.damageMultiplier);
    }

    update(keys, mouse, canvas) {
        let dx = 0, dy = 0;
        this.isMoving = false;

        if (keys['w'] || keys['ArrowUp'])    { dy -= 1; this.isMoving = true; }
        if (keys['s'] || keys['ArrowDown'])  { dy += 1; this.isMoving = true; }
        if (keys['a'] || keys['ArrowLeft'])  { dx -= 1; this.isMoving = true; }
        if (keys['d'] || keys['ArrowRight']) { dx += 1; this.isMoving = true; }

        if (dx !== 0 && dy !== 0) { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
        this.x = Math.max(this.radius, Math.min(canvas.width  - this.radius, this.x + dx * this.speed));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y + dy * this.speed));

        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        this.eyeX  = Math.cos(this.angle) * this.radius * 0.4;
        this.eyeY  = Math.sin(this.angle) * this.radius * 0.4;

        // Stealth
        if (keys[' '] && this.stealthCooldown <= 0) {
            this.emergencyStealthActive = true;
            this.stealthCooldown = this.maxStealthCooldown;
        }
        if (this.stealthCooldown > 0) {
            this.stealthCooldown--;
        }
        if (this.stealthCooldown <= Math.max(0, this.maxStealthCooldown - 90)) {
            this.emergencyStealthActive = false;
        }
        if (this.emergencyStealthActive)    this.stealthLevel = Math.min(1, this.stealthLevel + 0.12);
        else if (!this.isMoving)            this.stealthLevel = Math.min(0.35, this.stealthLevel + 0.012); // passive stealth: max 35% fade
        else                                this.stealthLevel = Math.max(0, this.stealthLevel - 0.08); // fade out quickly when moving

        // Tongue Logic
        if (this.tongueCooldown > 0) this.tongueCooldown--;

        if (mouse.rightDown && this.tongueState === 'idle' && this.tongueCooldown <= 0) {
            this.shootTongue(mouse.x, mouse.y);
        }

        if (this.tongueState === 'extending') {
            this.tongueProgress += this.tongueSpeed;
            if (this.tongueProgress >= 1) {
                this.tongueProgress = 1;
                this.tongueState = 'holding';
                this.tongueHoldTime = 0;
            }
        } else if (this.tongueState === 'holding') {
            this.tongueHoldTime++;
            
            // Allow sweeping the tongue slightly towards mouse!
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            const targetX = this.x + (dx / dist) * Math.min(dist, this.tongueRange);
            const targetY = this.y + (dy / dist) * Math.min(dist, this.tongueRange);
            this.tongueTargetX += (targetX - this.tongueTargetX) * 0.15; // Smooth sweep
            this.tongueTargetY += (targetY - this.tongueTargetY) * 0.15;

            if (!mouse.rightDown || this.tongueHoldTime >= this.tongueMaxHold) {
                this.tongueState = 'retracting';
            }
        } else if (this.tongueState === 'retracting') {
            this.tongueProgress -= this.tongueSpeed * 1.5; // retract faster
            if (this.tongueProgress <= 0) {
                this.retractTongue();
            }
        }
        
        this.tongueActive = this.tongueState !== 'idle';

        // Auto-fire gun
        if (this.hasGun && this.gunCooldown <= 0) {
            this.gunCooldown = 25;
            const spd = 9;
            this.bullets.push(new Bullet(
                this.x, this.y,
                Math.cos(this.angle) * spd, Math.sin(this.angle) * spd,
                '#00f3ff', Math.round(this.finalDamage * 0.4), 4
            ));
        }
        if (this.gunCooldown > 0) this.gunCooldown--;

        
        // Auto-fire laser
        if (this.hasLaser && this.laserCooldown <= 0) {
            this.laserCooldown = 60;
            this.lasers.push(new Laser(this.x, this.y, this.angle, '#ff00ff', Math.round(this.finalDamage * 0.7)));
        }
        if (this.hasGun) this.gunCooldown--;
        if (this.hasLaser) this.laserCooldown--;
        if (this.hasMissile) this.missileCooldown--;
        
        // Robot arms auto-attack & manual attack
        if (this.equipped) {
            const hasM1 = this.equipped.arms_m1;
            const hasM2 = this.equipped.arms_m2;
            const hasM3 = this.equipped.arms_m3;
            const hasM4 = this.equipped.arms_m4;
            
            if (hasM1 || hasM2 || hasM3 || hasM4) {
                if (!this.armsCooldown) this.armsCooldown = 0;
                
                let targetLeft = null;
                let targetRight = null;
                
                if (typeof enemies !== 'undefined' && enemies.length > 0) {
                    let minDistL = hasM1 ? 240 : (hasM2 ? 180 : 350); 
                    let minDistR = minDistL;
                    for (const e of enemies) {
                        if (e.dead) continue;
                        const dist = Math.hypot(e.x - this.x, e.y - this.y);
                        if (e.x < this.x) {
                            if (dist < minDistL) { minDistL = dist; targetLeft = e; }
                        } else {
                            if (dist < minDistR) { minDistR = dist; targetRight = e; }
                        }
                    }
                }
                
                // Add opponent targeting in PvP
                if (typeof mpMode !== 'undefined' && mpMode === 'pvp' && typeof opponentState !== 'undefined' && opponentState) {
                    let minDistL = hasM1 ? 240 : (hasM2 ? 180 : 350); 
                    let minDistR = minDistL;
                    const dist = Math.hypot(opponentState.x - this.x, opponentState.y - this.y);
                    const e = { x: opponentState.x, y: opponentState.y, isOpponent: true };
                    if (opponentState.x < this.x) {
                        if (dist < minDistL && (!targetLeft || dist < Math.hypot(targetLeft.x - this.x, targetLeft.y - this.y))) { targetLeft = e; }
                    } else {
                        if (dist < minDistR && (!targetRight || dist < Math.hypot(targetRight.x - this.x, targetRight.y - this.y))) { targetRight = e; }
                    }
                }
                
                // Fire logic
                if (this.armsCooldown <= 0) {
                    let didPunch = false;
                    
                    if (hasM1) {
                        if (targetLeft) { 
                            if (targetLeft.isOpponent && typeof socket !== 'undefined') socket.emit('pvp_hit', { damage: 35 });
                            else if (targetLeft.takeDamage) { if (targetLeft.takeDamage(35, targetLeft.x, targetLeft.y).dead && typeof onEnemyDeath !== 'undefined') { let idx = enemies.indexOf(targetLeft); if (idx > -1) onEnemyDeath(targetLeft, idx); } }
                            didPunch = true; this.armsPunchAnimL = 10; 
                        }
                        if (targetRight) { 
                            if (targetRight.isOpponent && typeof socket !== 'undefined') socket.emit('pvp_hit', { damage: 35 });
                            else if (targetRight.takeDamage) { if (targetRight.takeDamage(35, targetRight.x, targetRight.y).dead && typeof onEnemyDeath !== 'undefined') { let idx = enemies.indexOf(targetRight); if (idx > -1) onEnemyDeath(targetRight, idx); } }
                            didPunch = true; this.armsPunchAnimR = 10; 
                        }
                        if (didPunch) {
                            if (typeof audio !== 'undefined' && audio) audio.playSound('shoot'); 
                            this.armsCooldown = 40;
                        }
                    } 
                    else if (hasM2 || hasM3 || hasM4) {
                        const modePvP = typeof mpMode !== 'undefined' && mpMode === 'pvp';
                        const isAuto = modePvP ? false : (typeof autoAimEnabled !== 'undefined' ? autoAimEnabled : true);
                        const wantsManualFire = !isAuto && typeof mouse !== 'undefined' && mouse.down;
                        
                        // Dagger stab for M2 if close
                        if (hasM2) {
                            if (targetLeft && Math.hypot(targetLeft.x - this.x, targetLeft.y - this.y) < 180) {
                                if (targetLeft.isOpponent && typeof socket !== 'undefined') socket.emit('pvp_hit', { damage: 40 });
                                else if (targetLeft.takeDamage) { if (targetLeft.takeDamage(40, targetLeft.x, targetLeft.y).dead && typeof onEnemyDeath !== 'undefined') { let idx = enemies.indexOf(targetLeft); if (idx > -1) onEnemyDeath(targetLeft, idx); } }
                                didPunch = true; this.armsPunchAnimL = 10;
                            }
                            if (targetRight && Math.hypot(targetRight.x - this.x, targetRight.y - this.y) < 180) {
                                if (targetRight.isOpponent && typeof socket !== 'undefined') socket.emit('pvp_hit', { damage: 40 });
                                else if (targetRight.takeDamage) { if (targetRight.takeDamage(40, targetRight.x, targetRight.y).dead && typeof onEnemyDeath !== 'undefined') { let idx = enemies.indexOf(targetRight); if (idx > -1) onEnemyDeath(targetRight, idx); } }
                                didPunch = true; this.armsPunchAnimR = 10;
                            }
                            if (didPunch) {
                                if (typeof audio !== 'undefined' && audio) audio.playSound('shoot');
                                this.armsCooldown = 35;
                            }
                        }

                        // Shooting
                        let anyTarget = targetLeft || targetRight;
                        if ((isAuto && anyTarget) || wantsManualFire) {
                            const aimAngle = anyTarget ? Math.atan2(anyTarget.y - this.y, anyTarget.x - this.x) : Math.atan2(mouse.y - this.y, mouse.x - this.x);
                            const fireAngle = isAuto && anyTarget ? aimAngle : Math.atan2(mouse.y - this.y, mouse.x - this.x);
                            
                            const bulletColor = hasM4 ? '#ffaa00' : (hasM3 ? '#ff003c' : '#39ff14');
                            
                            if (hasM4) {
                                // M4: 2 lasers + bullets
                                this.lasers.push(new Laser(this.x, this.y, fireAngle - 0.2, '#ffaa00', 10));
                                this.lasers.push(new Laser(this.x, this.y, fireAngle + 0.2, '#ffaa00', 10));
                                this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle)*12, Math.sin(fireAngle)*12, bulletColor, 20, 6));
                                this.armsCooldown = 15;
                            } else {
                                this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle)*10, Math.sin(fireAngle)*10, bulletColor, hasM3 ? 12 : 15, 6));
                                if (hasM3) {
                                    this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle+0.2)*10, Math.sin(fireAngle+0.2)*10, bulletColor, 12, 6));
                                    this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle-0.2)*10, Math.sin(fireAngle-0.2)*10, bulletColor, 12, 6));
                                }
                                this.armsCooldown = hasM3 ? 20 : 25;
                            }
                            
                            if (typeof audio !== 'undefined' && audio) audio.playSound('shoot');
                            this.armsAngle = fireAngle;
                            if (hasM3 || hasM4) {
                                this.armsPunchAnimL = 5;
                                this.armsPunchAnimR = 5;
                            }
                        } else {
                            this.armsAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
                        }
                    }
                }
            }
        }
        if (this.armsCooldown > 0) this.armsCooldown--;
        if (this.armsPunchAnimL > 0) this.armsPunchAnimL--;
        if (this.armsPunchAnimR > 0) this.armsPunchAnimR--;
        if (this.armsPunchAnim > 0) this.armsPunchAnim--;

        // Missile (homing)
        if (this.hasMissile && this.missileCooldown <= 0) {
            this.missileCooldown = 90;
            this.bullets.push(new Bullet(
                this.x, this.y,
                Math.cos(this.angle) * 6, Math.sin(this.angle) * 6,
                '#ff7700', Math.round(this.finalDamage * 0.8), 7
            ));
        }

        // Update bullets / lasers
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update();
            if (this.bullets[i].life <= 0 || this.bullets[i].hit) this.bullets.splice(i, 1);
        }
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update();
            if (this.lasers[i].life <= 0) this.lasers.splice(i, 1);
        }

        this.bodyPulse += 0.07;
        this.hue += (this.stealthLevel > 0.5 ? 120 - this.hue : 180 - this.hue) * 0.05;
    }

    shootTongue(mx, my) {
        const dx   = mx - this.x;
        const dy   = my - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.tongueTargetX  = this.x + (dx / dist) * Math.min(dist, this.tongueRange);
        this.tongueTargetY  = this.y + (dy / dist) * Math.min(dist, this.tongueRange);
        this.tongueState    = 'extending';
        this.tongueProgress = 0;
        this.tongueHitList.clear();
        this.stealthLevel   = 0;
        this.emergencyStealthActive = false;
    }

    retractTongue() {
        this.tongueState = 'idle';
        this.tongueProgress = 0;
        this.tongueCooldown = 15;
    }

    getTipPosition() {
        return {
            x: this.x + (this.tongueTargetX - this.x) * this.tongueProgress,
            y: this.y + (this.tongueTargetY - this.y) * this.tongueProgress
        };
    }

    draw(ctx) {
        const pulse = Math.sin(this.bodyPulse) * 0.12 + 0.88;
        const glow  = 12 + Math.sin(this.bodyPulse * 2) * 5;
        
        let hueToUse = this.hue;
        if (this.equipped && this.equipped.core) {
            hueToUse = 0; // Red plasma core
        }
        
        const col   = `hsl(${hueToUse}, 100%, 55%)`;
        const alpha = Math.max(0.25, 1 - this.stealthLevel); // minimum 25% so player always visible

        // Draw bullets first (behind body)
        this.bullets.forEach(b => b.draw(ctx));
        this.lasers.forEach(l  => l.draw(ctx));

        // Weapon accessories
        if (this.hasGun) this._drawGun(ctx, alpha, col);
        if (this.hasLaser) this._drawLaserOrb(ctx, alpha);
        if (this.hasMissile) this._drawMissilePod(ctx, alpha);

        // Tongue
        if (this.tongueActive) {
            const tip = this.getTipPosition();
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tip.x, tip.y);
            ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 8; ctx.shadowBlur = 18; ctx.shadowColor = '#ff00ff';
            ctx.globalAlpha = alpha * 0.25; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tip.x, tip.y);
            ctx.strokeStyle = '#ff88ff'; ctx.lineWidth = 3; ctx.shadowBlur = 8;
            ctx.globalAlpha = alpha; ctx.stroke();
            ctx.beginPath(); ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 14; ctx.shadowColor = '#ff00ff'; ctx.fill();
            ctx.restore();
        }

        // Body
        ctx.save();
        ctx.globalAlpha = alpha;

        // Shadow
        ctx.beginPath();
        ctx.ellipse(this.x + 3, this.y + 6, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 0; ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.shadowBlur = glow * 2; ctx.shadowColor = col;
        ctx.globalAlpha = alpha * 0.25; ctx.stroke();
        ctx.globalAlpha = alpha;

        // Body hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a  = (i / 6) * Math.PI * 2;
            const px = this.x + Math.cos(a) * this.radius * pulse;
            const py = this.y + Math.sin(a) * this.radius * pulse;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `hsl(${this.hue}, 80%, 75%)`);
        grad.addColorStop(1, `hsl(${this.hue}, 100%, 28%)`);
        ctx.fillStyle = grad; ctx.shadowBlur = glow; ctx.shadowColor = col;
        ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.shadowBlur = 4; ctx.stroke();

        // Circuit lines
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = `hsl(${this.hue + 40}, 100%, 80%)`;
        ctx.lineWidth = 1; ctx.shadowBlur = 3; ctx.shadowColor = 'transparent';
        for (let i = 0; i < 3; i++) {
            const a = this.angle + (i - 1) * 0.55;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(a) * this.radius * 0.68, this.y + Math.sin(a) * this.radius * 0.68);
            ctx.stroke();
        }

        // Eye
        ctx.globalAlpha = Math.max(0.15, alpha);
        ctx.beginPath();
        ctx.arc(this.x + this.eyeX, this.y + this.eyeY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff'; ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.eyeX, this.y + this.eyeY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff00ff'; ctx.fill();

        // Stealth shimmer
        if (this.stealthLevel > 0.2) {
            ctx.globalAlpha = this.stealthLevel * 0.35;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8 + Math.sin(this.bodyPulse * 3) * 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
            ctx.shadowBlur = 8; ctx.shadowColor = '#00ff88';
            ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        // Buff indicator (show buff level)
        if (this.buffCount > 0) {
            ctx.globalAlpha = 0.85;
            ctx.font = `bold 9px Orbitron, monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fdf500'; ctx.shadowBlur = 6; ctx.shadowColor = '#fdf500';
            ctx.fillText(`x${this.damageMultiplier.toFixed(1)}`, this.x, this.y + this.radius + 12);
        }

        ctx.restore();

        // Draw Shop Armors & Core effects
        if (this.equipped && this.equipped.armor && this.stealthLevel < 0.5) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#39ff14';
            ctx.stroke();
            ctx.restore();
        }

        // Draw Weapons
        if (this.hasGun) this._drawGun(ctx, alpha, col);
        if (this.hasLaser) this._drawLaserOrb(ctx, alpha);
        if (this.hasMissile) this._drawMissilePod(ctx, alpha);
        
        // Draw Robot Arms
        if (this.equipped && (this.equipped.arms_m1 || this.equipped.arms_m2 || this.equipped.arms_m3 || this.equipped.arms_m4) && this.stealthLevel < 0.8) {
            this._drawRobotArms(ctx, alpha, col);
        }
    }

    _drawGun(ctx, alpha, col) {
        // Small gun barrel on the side
        const a = this.angle;
        const bx = this.x + Math.cos(a) * this.radius;
        const by = this.y + Math.sin(a) * this.radius;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(bx, by); ctx.rotate(a);
        ctx.fillStyle = '#888';
        ctx.shadowBlur = 6; ctx.shadowColor = '#00f3ff';
        ctx.fillRect(0, -3, 14, 6);
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(12, -2, 6, 4);
        ctx.restore();
    }

    _drawLaserOrb(ctx, alpha) {
        // Orbiting laser gem
        const a  = this.bodyPulse * 1.5;
        const ox = this.x + Math.cos(a) * (this.radius + 10);
        const oy = this.y + Math.sin(a) * (this.radius + 10);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 14; ctx.shadowColor = '#ff00ff';
        ctx.fill();
        ctx.restore();
    }

    _drawMissilePod(ctx, alpha) {
        // Missile pod on opposite side
        const a  = this.angle + Math.PI;
        const bx = this.x + Math.cos(a) * this.radius;
        const by = this.y + Math.sin(a) * this.radius;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(bx, by); ctx.rotate(a + Math.PI);
        ctx.fillStyle = '#555';
        ctx.shadowBlur = 6; ctx.shadowColor = '#ff7700';
        ctx.fillRect(0, -6, 10, 12);
        ctx.fillStyle = '#ff7700';
        ctx.fillRect(10, -4, 4, 8);
        ctx.restore();
    }

    _drawRobotArms(ctx, alpha, col) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const time = Date.now() * 0.003;
        
        const hasM1 = this.equipped.arms_m1;
        const hasM2 = this.equipped.arms_m2;
        const hasM3 = this.equipped.arms_m3;
        const hasM4 = this.equipped.arms_m4;
        
        let themeColor = hasM4 ? '#ffaa00' : (hasM3 ? '#ff003c' : '#39ff14');
        
        // Base Shoulder positions
        let slx = this.x + Math.cos(this.angle - Math.PI/1.5) * (this.radius + 5);
        let sly = this.y + Math.sin(this.angle - Math.PI/1.5) * (this.radius + 5);
        let srx = this.x + Math.cos(this.angle + Math.PI/1.5) * (this.radius + 5);
        let sry = this.y + Math.sin(this.angle + Math.PI/1.5) * (this.radius + 5);

        // Hand positions (default floating)
        let lx = slx + Math.cos(this.angle - Math.PI/2) * 20 + Math.cos(time) * 4;
        let ly = sly + Math.sin(this.angle - Math.PI/2) * 20 + Math.sin(time) * 4;
        
        let rx = srx + Math.cos(this.angle + Math.PI/2) * 20 + Math.cos(time + Math.PI) * 4;
        let ry = sry + Math.sin(this.angle + Math.PI/2) * 20 + Math.sin(time + Math.PI) * 4;

        let leftArmAngle = Math.atan2(ly - sly, lx - slx);
        let rightArmAngle = Math.atan2(ry - sry, rx - srx);

        // Punch animation overrides position if active
        if (this.armsPunchAnimL > 0) {
            const ext = (10 - this.armsPunchAnimL) * 3;
            const a = this.armsAngle || this.angle;
            lx = slx + Math.cos(a - 0.3) * (18 + ext);
            ly = sly + Math.sin(a - 0.3) * (18 + ext);
            leftArmAngle = Math.atan2(ly - sly, lx - slx);
        }
        if (this.armsPunchAnimR > 0) {
            const ext = (10 - this.armsPunchAnimR) * 3;
            const a = this.armsAngle || this.angle;
            rx = srx + Math.cos(a + 0.3) * (18 + ext);
            ry = sry + Math.sin(a + 0.3) * (18 + ext);
            rightArmAngle = Math.atan2(ry - sry, rx - srx);
        }

        // Draw articulated arms (2 segments)
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Left arm joints
        let elx = slx + Math.cos(leftArmAngle + 0.5) * 12;
        let ely = sly + Math.sin(leftArmAngle + 0.5) * 12;
        ctx.beginPath(); ctx.moveTo(slx, sly); ctx.lineTo(elx, ely); ctx.lineTo(lx, ly); ctx.stroke();
        // Inner mechanical wire left
        ctx.strokeStyle = themeColor; ctx.lineWidth = 1; ctx.shadowBlur = 5; ctx.shadowColor = themeColor;
        ctx.beginPath(); ctx.moveTo(slx, sly); ctx.lineTo(elx, ely); ctx.lineTo(lx, ly); ctx.stroke();
        
        // Right arm joints
        ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.shadowBlur = 0;
        let erx = srx + Math.cos(rightArmAngle - 0.5) * 12;
        let ery = sry + Math.sin(rightArmAngle - 0.5) * 12;
        ctx.beginPath(); ctx.moveTo(srx, sry); ctx.lineTo(erx, ery); ctx.lineTo(rx, ry); ctx.stroke();
        // Inner mechanical wire right
        ctx.strokeStyle = themeColor; ctx.lineWidth = 1; ctx.shadowBlur = 5; ctx.shadowColor = themeColor;
        ctx.beginPath(); ctx.moveTo(srx, sry); ctx.lineTo(erx, ery); ctx.lineTo(rx, ry); ctx.stroke();

        ctx.shadowBlur = 0;
        
        // Shoulders (sockets)
        ctx.fillStyle = '#222'; ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(slx, sly, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(srx, sry, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = themeColor; ctx.shadowBlur = 10; ctx.shadowColor = themeColor;
        ctx.beginPath(); ctx.arc(slx, sly, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(srx, sry, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Draw hands and weapons
        ctx.fillStyle = '#222';
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10; ctx.shadowColor = themeColor;
        
        if (hasM1) {
            // M1: Big boxing gloves (High Quality)
            ctx.fillStyle = '#b22222'; // Dark red gloves
            ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.arc(lx+2, ly-2, 3, 0, Math.PI * 2); ctx.fill(); // highlight
            
            ctx.fillStyle = '#b22222';
            ctx.beginPath(); ctx.arc(rx, ry, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.arc(rx+2, ry-2, 3, 0, Math.PI * 2); ctx.fill(); // highlight
        } 
        else if (hasM2) {
            // M2: Left hand Dagger, Right hand Gun
            // Left (Dagger)
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.save();
            ctx.translate(lx, ly); ctx.rotate(leftArmAngle);
            ctx.fillStyle = '#eee'; ctx.shadowBlur = 5; ctx.shadowColor = '#fff';
            ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(22, 0); ctx.lineTo(0, 3); ctx.fill();
            // blood groove
            ctx.fillStyle = '#f00'; ctx.beginPath(); ctx.moveTo(2, -0.5); ctx.lineTo(15, -0.5); ctx.lineTo(15, 0.5); ctx.lineTo(2, 0.5); ctx.fill();
            ctx.restore();
            
            // Right (Gun)
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.save();
            ctx.translate(rx, ry); ctx.rotate(rightArmAngle);
            ctx.fillStyle = '#444'; ctx.shadowBlur = 0;
            ctx.fillRect(0, -4, 16, 8); // Gun barrel
            ctx.fillStyle = themeColor; ctx.shadowBlur = 10;
            ctx.fillRect(16, -3, 5, 6); // Energy nozzle
            ctx.restore();
        }
        else if (hasM3 || hasM4) {
            // M3 & M4 shared lower hands logic (Pistols / Rifles)
            ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.save();
            ctx.translate(lx, ly); ctx.rotate(leftArmAngle);
            ctx.fillStyle = '#444'; ctx.shadowBlur = 0;
            ctx.fillRect(0, -3, 14, 6);
            ctx.fillStyle = themeColor; ctx.shadowBlur = 10;
            ctx.fillRect(14, -2, 4, 4);
            ctx.restore();
            
            ctx.beginPath(); ctx.arc(rx, ry, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.save();
            ctx.translate(rx, ry); ctx.rotate(rightArmAngle);
            ctx.fillStyle = '#444'; ctx.shadowBlur = 0;
            ctx.fillRect(0, -3, 14, 6);
            ctx.fillStyle = themeColor; ctx.shadowBlur = 10;
            ctx.fillRect(14, -2, 4, 4);
            ctx.restore();

            // Upper arms for M3 (Forearm guns)
            if (hasM3) {
                ctx.save();
                ctx.translate(elx, ely); ctx.rotate(leftArmAngle);
                ctx.fillStyle = '#333'; ctx.shadowBlur = 0;
                ctx.fillRect(0, -7, 18, 5);
                ctx.fillStyle = themeColor; ctx.shadowBlur = 8;
                ctx.fillRect(18, -6, 6, 3);
                ctx.restore();

                ctx.save();
                ctx.translate(erx, ery); ctx.rotate(rightArmAngle);
                ctx.fillStyle = '#333'; ctx.shadowBlur = 0;
                ctx.fillRect(0, 2, 18, 5);
                ctx.fillStyle = themeColor; ctx.shadowBlur = 8;
                ctx.fillRect(18, 3, 6, 3);
                ctx.restore();
            }
            
            // Supreme 4-Arms (M4) extra shoulders
            if (hasM4) {
                // Draw 2 extra laser arms popping from the back
                let xt1 = this.x + Math.cos(this.angle - Math.PI*0.8) * (this.radius + 2);
                let yt1 = this.y + Math.sin(this.angle - Math.PI*0.8) * (this.radius + 2);
                let xt2 = this.x + Math.cos(this.angle + Math.PI*0.8) * (this.radius + 2);
                let yt2 = this.y + Math.sin(this.angle + Math.PI*0.8) * (this.radius + 2);

                let a = this.armsAngle || this.angle;
                let tx1 = xt1 + Math.cos(a - 0.2) * 15;
                let ty1 = yt1 + Math.sin(a - 0.2) * 15;
                let tx2 = xt2 + Math.cos(a + 0.2) * 15;
                let ty2 = yt2 + Math.sin(a + 0.2) * 15;

                ctx.strokeStyle = '#222'; ctx.lineWidth = 5; ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.moveTo(xt1, yt1); ctx.lineTo(tx1, ty1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(xt2, yt2); ctx.lineTo(tx2, ty2); ctx.stroke();
                
                ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 2; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.moveTo(xt1, yt1); ctx.lineTo(tx1, ty1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(xt2, yt2); ctx.lineTo(tx2, ty2); ctx.stroke();

                // Laser cannons
                ctx.save();
                ctx.translate(tx1, ty1); ctx.rotate(a - 0.2);
                ctx.fillStyle = '#222'; ctx.shadowBlur = 0;
                ctx.fillRect(-4, -4, 20, 8);
                ctx.fillStyle = '#ffaa00'; ctx.shadowBlur = 15;
                ctx.fillRect(16, -2, 8, 4);
                ctx.restore();

                ctx.save();
                ctx.translate(tx2, ty2); ctx.rotate(a + 0.2);
                ctx.fillStyle = '#222'; ctx.shadowBlur = 0;
                ctx.fillRect(-4, -4, 20, 8);
                ctx.fillStyle = '#ffaa00'; ctx.shadowBlur = 15;
                ctx.fillRect(16, -2, 8, 4);
                ctx.restore();
            }
        }

        ctx.restore();
    }
}
