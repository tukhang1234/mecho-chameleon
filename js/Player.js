// --- Player.js: Mecho Chameleon, Robot Arms, and TITAN SHELLS ---

// ==========================================
// TẢI TÀI NGUYÊN HÌNH ẢNH (TITAN ASSETS)
// ==========================================
const titanAssets = {
    body: new Image(),
    gunArm: new Image(),
    hammerIdle: new Image(),
    hammerRaised: new Image(),
    hammerSmash: new Image()
};
titanAssets.body.src = 'pictuer/Screenshot_2026-07-30_081826-removebg-preview.png';
titanAssets.gunArm.src = 'pictuer/Screenshot_2026-07-30_083128-removebg-preview.png';
titanAssets.hammerIdle.src = 'pictuer/Screenshot_2026-07-30_082036-removebg-preview.png';
titanAssets.hammerRaised.src = 'pictuer/Screenshot_2026-07-30_082218-removebg-preview.png';
titanAssets.hammerSmash.src = 'pictuer/Screenshot_2026-07-30_082157-removebg-preview.png';

// Đạn thường
class Bullet {
    constructor(x, y, vx, vy, color, damage, radius = 5) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.color = color; this.damage = damage; this.radius = radius; this.life = 80; this.hit = false;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; }
    draw(ctx) {
        const alpha = Math.min(1, this.life / 20);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowBlur = 12; ctx.shadowColor = this.color; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.globalAlpha = alpha * 0.4; ctx.fill();
        ctx.restore();
    }
}

// SIÊU ĐẠN NỔ CỦA TITAN (Gây Dame Lan)
class ExplosiveBullet extends Bullet {
    constructor(x, y, vx, vy, color, damage, radius) {
        super(x, y, vx, vy, color, damage, radius);
        this.exploded = false;
        this.isExplosive = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
        if ((this.life <= 0 || this.hit) && !this.exploded) {
            this.explode();
        }
    }
    explode() {
        this.exploded = true;
        if (typeof particles !== 'undefined') {
            for (let i = 0; i < 25; i++) {
                const a = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 2;
                particles.particles.push({ x: this.x, y: this.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, color: '#00f3ff', life: 30, maxLife: 30, size: Math.random() * 6 + 4, trail: [] });
            }
        }
        if (typeof enemies !== 'undefined') {
            for (const e of enemies) {
                if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 160) {
                    if (e.takeDamage && e.takeDamage(this.damage * 0.7, e.x, e.y).dead) {
                        let idx = enemies.indexOf(e); if (idx > -1) onEnemyDeath(e, idx);
                    }
                }
            }
        }
        if (typeof screenShake !== 'undefined') screenShake.trigger(6, 6);
    }
}

class Laser {
    constructor(x, y, angle, color, damage, widthMult = 1) {
        this.x = x; this.y = y; this.angle = angle; this.color = color; this.damage = damage; this.life = 18; this.maxLife = 18; this.length = 800; this.widthMult = widthMult;
    }
    update() { this.life--; }
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const w = (3 + (1 - alpha) * 8) * this.widthMult;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.angle) * this.length, this.y + Math.sin(this.angle) * this.length);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * this.widthMult; ctx.shadowBlur = 0; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.angle) * this.length, this.y + Math.sin(this.angle) * this.length);
        ctx.strokeStyle = this.color; ctx.lineWidth = w; ctx.shadowBlur = 25 * this.widthMult; ctx.shadowColor = this.color; ctx.stroke();
        ctx.restore();
    }
}

class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.radius = 18;
        this.speed = 4;
        this.angle = 0;

        // Stealth & Tongue (Base Chameleon)
        this.stealthLevel = 0;
        this.stealthCooldown = 0;
        this.maxStealthCooldown = 300;
        this.emergencyStealthActive = false;
        this.tongueState = 'idle';
        this.tongueTargetX = 0; this.tongueTargetY = 0;
        this.tongueProgress = 0; this.tongueSpeed = 0.12;
        this.tongueRange = 280; this.tongueDamage = 40;
        this.tongueCooldown = 0; this.tongueHoldTime = 0;
        this.tongueMaxHold = 40; this.tongueHitList = new Set();

        // Base Weapons
        this.hasGun = false; this.hasLaser = false; this.hasMissile = false;
        this.bullets = []; this.lasers = [];
        this.gunCooldown = 0; this.laserCooldown = 0; this.missileCooldown = 0;

        // Robot Arms
        this.armsCooldown = 0;
        this.armsPunchAnimL = 0; this.armsPunchAnimR = 0;
        this.armsAngle = 0;

        // Titan Features
        this.shockwaves = [];
        this.energy = 100;
        this.maxEnergy = 100;
        this.titanBreathActive = false;
        this.railgunRecoil = 0;
        this.hammerAnim = 0;

        // Hồi chiêu vũ khí
        this.titanGunCd = 0;
        this.titanHammerCd = 0;

        // Stats & Visuals
        this.damageMultiplier = 1.0;
        this.buffCount = 0;
        this.bodyPulse = 0; this.hue = 180;
        this.eyeX = 0; this.eyeY = 0;
    }

    applyBuff(type) {
        this.buffCount++;
        this.damageMultiplier += 0.15;
        switch (type) {
            case 'gun': this.hasGun = true; break;
            case 'laser': this.hasLaser = true; break;
            case 'missile': this.hasMissile = true; break;
            case 'tongue': this.tongueRange += 40; break;
            case 'speed': this.speed = Math.min(7.5, this.speed + 0.4); break;
            case 'stealth': this.maxStealthCooldown = Math.max(80, this.maxStealthCooldown - 30); break;
        }
    }

    get finalDamage() { return Math.round(this.tongueDamage * this.damageMultiplier); }

    update(keys, mouse, canvas) {
        let dx = 0, dy = 0;
        const isTitan = this.equipped && this.equipped.titan_blue;

        if (keys['w'] || keys['ArrowUp']) { dy -= 1; }
        if (keys['s'] || keys['ArrowDown']) { dy += 1; }
        if (keys['a'] || keys['ArrowLeft']) { dx -= 1; }
        if (keys['d'] || keys['ArrowRight']) { dx += 1; }

        if (dx !== 0 && dy !== 0) { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }

        if (isTitan) {
            this.vx += dx * 0.9;
            this.vy += dy * 0.9;
            this.vx *= 0.88;
            this.vy *= 0.88;
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x + this.vx));
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y + this.vy));
            this.isMoving = (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5);
        } else {
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x + dx * this.speed));
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y + dy * this.speed));
            this.isMoving = (dx !== 0 || dy !== 0);
        }

        // Toàn thân luôn nhìn theo chuột
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        this.eyeX = Math.cos(this.angle) * this.radius * 0.4;
        this.eyeY = Math.sin(this.angle) * this.radius * 0.4;
        this.bodyPulse += isTitan ? 0.08 : 0.05;

        if (isTitan) {
            this.updateTitanLogic(keys, mouse);
        } else {
            this.updateChameleonLogic(keys, mouse);
        }

        // Cập nhật Sóng Xung Kích
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            let sw = this.shockwaves[i];
            sw.radius += 20;
            sw.life -= 0.04;
            if (sw.life <= 0) this.shockwaves.splice(i, 1);
        }

        // Cập nhật Đạn
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update();
            if (this.bullets[i].life <= 0 || (this.bullets[i].hit && !this.bullets[i].isExplosive)) {
                if (this.bullets[i].isExplosive && !this.bullets[i].exploded) this.bullets[i].explode();
                this.bullets.splice(i, 1);
            }
        }
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update();
            if (this.lasers[i].life <= 0) this.lasers.splice(i, 1);
        }
    }

    updateTitanLogic(keys, mouse) {
        this.energy = Math.min(this.maxEnergy, this.energy + 0.05);

        // LÕI PHUN LỬA (Nhấn giữ Chuột Phải)
        if (mouse.rightDown && this.energy > 2) {
            this.titanBreathActive = true;
            this.energy -= 1.5;

            if (typeof enemies !== 'undefined') {
                for (const e of enemies) {
                    if (e.dead) continue;
                    const dist = Math.hypot(e.x - this.x, e.y - this.y);
                    if (dist < 800) {
                        const angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                        let eDiff = angleToEnemy - this.angle;
                        while (eDiff <= -Math.PI) eDiff += Math.PI * 2;
                        while (eDiff > Math.PI) eDiff -= Math.PI * 2;

                        if (Math.abs(eDiff) < 0.85) {
                            if (e.takeDamage && e.takeDamage(35, e.x, e.y).dead) {
                                let idx = enemies.indexOf(e); if (idx > -1) onEnemyDeath(e, idx);
                            }
                        }
                    }
                }
            }

            for (let i = 0; i < 4; i++) {
                const spread = (Math.random() - 0.5) * 0.8;
                const pAngle = this.angle + spread;
                const pSpeed = 16 + Math.random() * 12;
                particles.particles.push({
                    x: this.x + Math.cos(this.angle) * 25, y: this.y + Math.sin(this.angle) * 25,
                    vx: Math.cos(pAngle) * pSpeed, vy: Math.sin(pAngle) * pSpeed,
                    color: Math.random() > 0.3 ? '#00f3ff' : '#ffffff',
                    life: 50, maxLife: 50, size: Math.random() * 18 + 8, trail: []
                });
            }
        } else {
            this.titanBreathActive = false;
        }

        // BẮN SÚNG TỪ NÒNG (Nhấp Chuột Trái)
        if (mouse.down && this.titanGunCd <= 0) {
            // CÔNG THỨC CHUẨN XÁC TÍNH TỌA ĐỘ NÒNG SÚNG BÊN TAY TRÁI
            const scale = 0.8;
            const gunX_local = 99;   // Tọa độ sang trái (+99 theo trục ngang)
            const gunY_local = 140;  // Vươn tới mũi nòng súng

            // Tính toán Matrix 2D chuyển đổi Local sang World (Tính luôn góc xoay của thân)
            const barrelX = this.x + scale * (gunX_local * Math.sin(this.angle) + gunY_local * Math.cos(this.angle));
            const barrelY = this.y + scale * (-gunX_local * Math.cos(this.angle) + gunY_local * Math.sin(this.angle));
            
            // Tính toán hướng ngắm về phía chuột
            const aimAngle = Math.atan2(mouse.y - barrelY, mouse.x - barrelX);

            this.bullets.push(new ExplosiveBullet(barrelX, barrelY, Math.cos(aimAngle) * 24, Math.sin(aimAngle) * 24, '#00f3ff', 100, 16));
            this.railgunRecoil = 35;
            if (typeof screenShake !== 'undefined') screenShake.trigger(5, 5);
            this.titanGunCd = 12;
        }

        // ĐẬP BÚA (Nhấn phím F hoặc phím E)
        if ((keys['f'] || keys['F'] || keys['e'] || keys['E']) && this.titanHammerCd <= 0) {
            this.hammerAnim = 1.0;

            // CÔNG THỨC CHUẨN XÁC TÍNH TỌA ĐỘ ĐẦU BÚA BÊN TAY PHẢI
            const scale = 0.8;
            const hammerX_local = -78;  // Tọa độ sang phải (-78)
            const hammerY_local = 130;  // Vươn tới đầu búa

            const hx = this.x + scale * (hammerX_local * Math.sin(this.angle) + hammerY_local * Math.cos(this.angle));
            const hy = this.y + scale * (-hammerX_local * Math.cos(this.angle) + hammerY_local * Math.sin(this.angle));

            // Phát sóng xung kích lan ra đúng từ vị trí đầu búa đập xuống
            this.shockwaves.push({ x: hx, y: hy, radius: 0, life: 1.0 });

            if (typeof enemies !== 'undefined') {
                for (const e of enemies) {
                    if (!e.dead && Math.hypot(e.x - hx, e.y - hy) < 200) {
                        const dx = e.x - hx;
                        const dy = e.y - hy;
                        const distToCenter = Math.hypot(dx, dy) || 1;

                        e.x += (dx / distToCenter) * 90; // Hất văng
                        e.y += (dy / distToCenter) * 90;

                        if (e.takeDamage && e.takeDamage(200, e.x, e.y).dead) {
                            let idx = enemies.indexOf(e); if (idx > -1) onEnemyDeath(e, idx);
                        }
                    }
                }
            }
            if (typeof screenShake !== 'undefined') screenShake.trigger(15, 15);
            this.titanHammerCd = 45;
        }

        // Giảm hồi chiêu
        if (this.titanGunCd > 0) this.titanGunCd--;
        if (this.titanHammerCd > 0) this.titanHammerCd--;

        // Phục hồi Animation
        if (this.railgunRecoil > 0) this.railgunRecoil -= 2.0;
        if (this.hammerAnim > 0) this.hammerAnim -= 0.05;
    }

    updateChameleonLogic(keys, mouse) {
        if (keys[' '] && this.stealthCooldown <= 0) {
            this.emergencyStealthActive = true;
            this.stealthCooldown = this.maxStealthCooldown;
        }
        if (this.stealthCooldown > 0) this.stealthCooldown--;
        if (this.stealthCooldown <= Math.max(0, this.maxStealthCooldown - 90)) {
            this.emergencyStealthActive = false;
        }
        if (this.emergencyStealthActive) this.stealthLevel = Math.min(1, this.stealthLevel + 0.12);
        else if (!this.isMoving) this.stealthLevel = Math.min(0.35, this.stealthLevel + 0.012);
        else this.stealthLevel = Math.max(0, this.stealthLevel - 0.08);

        if (this.tongueCooldown > 0) this.tongueCooldown--;
        if (mouse.rightDown && this.tongueState === 'idle' && this.tongueCooldown <= 0) this.shootTongue(mouse.x, mouse.y);

        if (this.tongueState === 'extending') {
            this.tongueProgress += this.tongueSpeed;
            if (this.tongueProgress >= 1) { this.tongueProgress = 1; this.tongueState = 'holding'; this.tongueHoldTime = 0; }
        } else if (this.tongueState === 'holding') {
            this.tongueHoldTime++;
            const dx = mouse.x - this.x, dy = mouse.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.tongueTargetX += (this.x + (dx / dist) * Math.min(dist, this.tongueRange) - this.tongueTargetX) * 0.15;
            this.tongueTargetY += (this.y + (dy / dist) * Math.min(dist, this.tongueRange) - this.tongueTargetY) * 0.15;
            if (!mouse.rightDown || this.tongueHoldTime >= this.tongueMaxHold) this.tongueState = 'retracting';
        } else if (this.tongueState === 'retracting') {
            this.tongueProgress -= this.tongueSpeed * 1.5;
            if (this.tongueProgress <= 0) this.retractTongue();
        }
        this.tongueActive = this.tongueState !== 'idle';

        if (this.hasGun && this.gunCooldown <= 0) {
            this.gunCooldown = 25;
            this.bullets.push(new Bullet(this.x, this.y, Math.cos(this.angle) * 9, Math.sin(this.angle) * 9, '#00f3ff', Math.round(this.finalDamage * 0.4), 4));
        }
        if (this.hasLaser && this.laserCooldown <= 0) {
            this.laserCooldown = 60;
            this.lasers.push(new Laser(this.x, this.y, this.angle, '#ff00ff', Math.round(this.finalDamage * 0.7)));
        }
        if (this.hasMissile && this.missileCooldown <= 0) {
            this.missileCooldown = 90;
            this.bullets.push(new Bullet(this.x, this.y, Math.cos(this.angle) * 6, Math.sin(this.angle) * 6, '#ff7700', Math.round(this.finalDamage * 0.8), 7));
        }
        if (this.hasGun) this.gunCooldown--;
        if (this.hasLaser) this.laserCooldown--;
        if (this.hasMissile) this.missileCooldown--;

        if (this.equipped) {
            const hasM1 = this.equipped.arms_m1, hasM2 = this.equipped.arms_m2;
            const hasM3 = this.equipped.arms_m3, hasM4 = this.equipped.arms_m4;
            const hasM5 = this.equipped.arms_m5, hasM6 = this.equipped.arms_m6;

            if (hasM1 || hasM2 || hasM3 || hasM4 || hasM5 || hasM6) {
                let targetLeft = null, targetRight = null;
                let rangeLeft = hasM6 ? 600 : (hasM5 ? 450 : (hasM1 ? 240 : (hasM2 ? 180 : 350)));
                let rangeRight = rangeLeft;

                if (typeof enemies !== 'undefined' && enemies.length > 0) {
                    for (const e of enemies) {
                        if (e.dead) continue;
                        const dist = Math.hypot(e.x - this.x, e.y - this.y);
                        if (e.x < this.x) { if (dist < rangeLeft) { rangeLeft = dist; targetLeft = e; } }
                        else { if (dist < rangeRight) { rangeRight = dist; targetRight = e; } }
                    }
                }

                if (this.armsCooldown <= 0) {
                    let didPunch = false;
                    const isAuto = typeof autoAimEnabled !== 'undefined' ? autoAimEnabled : true;
                    const wantsManualFire = !isAuto && typeof mouse !== 'undefined' && mouse.down;
                    let anyTarget = targetLeft || targetRight;

                    if (hasM6) {
                        if (typeof enemies !== 'undefined' && Math.random() < 0.15) {
                            for (const e of enemies) {
                                if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 350) {
                                    if (e.takeDamage && e.takeDamage(60, e.x, e.y).dead) { let idx = enemies.indexOf(e); if (idx > -1) onEnemyDeath(e, idx); }
                                    this.lasers.push(new Laser(this.x, this.y, Math.atan2(e.y - this.y, e.x - this.x), '#00f3ff', 0, 0.5));
                                }
                            }
                        }
                        if ((isAuto && anyTarget) || wantsManualFire) {
                            const aimAngle = anyTarget ? Math.atan2(anyTarget.y - this.y, anyTarget.x - this.x) : Math.atan2(mouse.y - this.y, mouse.x - this.x);
                            const fireAngle = isAuto && anyTarget ? aimAngle : Math.atan2(mouse.y - this.y, mouse.x - this.x);

                            this.lasers.push(new Laser(this.x, this.y, fireAngle, '#ffffff', 120, 4.5));
                            this.lasers.push(new Laser(this.x, this.y, fireAngle, '#00f3ff', 60, 9.0));
                            this.lasers.push(new Laser(this.x, this.y, fireAngle, '#4169e1', 30, 16.0));

                            for (let i = -3; i <= 3; i++) {
                                if (i === 0) continue;
                                this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle + i * 0.15) * 18, Math.sin(fireAngle + i * 0.15) * 18, '#ffffff', 40, 5));
                            }

                            this.armsAngle = fireAngle; this.armsCooldown = 45; this.armsPunchAnimL = 15; this.armsPunchAnimR = 15;
                            if (typeof audio !== 'undefined' && audio) audio.playSound('split');
                            if (typeof screenShake !== 'undefined') screenShake.trigger(10, 15);
                        } else { this.armsAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x); }
                    }
                    else if (hasM5) {
                        let slashed = false;
                        if (typeof enemies !== 'undefined') {
                            for (const e of enemies) {
                                if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 220) {
                                    if (e.takeDamage && e.takeDamage(100, e.x, e.y).dead) { let idx = enemies.indexOf(e); if (idx > -1) onEnemyDeath(e, idx); }
                                    slashed = true;
                                }
                            }
                        }

                        if (slashed) {
                            this.armsPunchAnimL = 12; this.armsPunchAnimR = 12; this.armsCooldown = 15; this.armsAngle = this.angle;
                            if (typeof audio !== 'undefined' && audio) audio.playSound('shoot');
                        }
                        else if ((isAuto && anyTarget) || wantsManualFire) {
                            const aimAngle = anyTarget ? Math.atan2(anyTarget.y - this.y, anyTarget.x - this.x) : Math.atan2(mouse.y - this.y, mouse.x - this.x);
                            const fireAngle = isAuto && anyTarget ? aimAngle : Math.atan2(mouse.y - this.y, mouse.x - this.x);

                            this.lasers.push(new Laser(this.x, this.y, fireAngle, '#ffd700', 40, 2.5));
                            this.lasers.push(new Laser(this.x, this.y, fireAngle - 0.25, '#00f3ff', 25, 1.5));
                            this.lasers.push(new Laser(this.x, this.y, fireAngle + 0.25, '#ff00ff', 25, 1.5));

                            this.armsAngle = fireAngle; this.armsCooldown = 25; this.armsPunchAnimL = 8; this.armsPunchAnimR = 8;
                            if (typeof audio !== 'undefined' && audio) audio.playSound('shoot');
                        } else { this.armsAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x); }
                    }
                    else if (hasM1) {
                        if (targetLeft) {
                            if (targetLeft.takeDamage && targetLeft.takeDamage(35, targetLeft.x, targetLeft.y).dead) { let idx = enemies.indexOf(targetLeft); if (idx > -1) onEnemyDeath(targetLeft, idx); }
                            didPunch = true; this.armsPunchAnimL = 10;
                        }
                        if (targetRight) {
                            if (targetRight.takeDamage && targetRight.takeDamage(35, targetRight.x, targetRight.y).dead) { let idx = enemies.indexOf(targetRight); if (idx > -1) onEnemyDeath(targetRight, idx); }
                            didPunch = true; this.armsPunchAnimR = 10;
                        }
                        if (didPunch) { if (typeof audio !== 'undefined' && audio) audio.playSound('shoot'); this.armsCooldown = 40; }
                    }
                    else if (hasM2 || hasM3 || hasM4) {
                        if (hasM2) {
                            if (targetLeft && Math.hypot(targetLeft.x - this.x, targetLeft.y - this.y) < 180) {
                                if (targetLeft.takeDamage && targetLeft.takeDamage(40, targetLeft.x, targetLeft.y).dead) { let idx = enemies.indexOf(targetLeft); if (idx > -1) onEnemyDeath(targetLeft, idx); }
                                didPunch = true; this.armsPunchAnimL = 10;
                            }
                            if (targetRight && Math.hypot(targetRight.x - this.x, targetRight.y - this.y) < 180) {
                                if (targetRight.takeDamage && targetRight.takeDamage(40, targetRight.x, targetRight.y).dead) { let idx = enemies.indexOf(targetRight); if (idx > -1) onEnemyDeath(targetRight, idx); }
                                didPunch = true; this.armsPunchAnimR = 10;
                            }
                            if (didPunch) { if (typeof audio !== 'undefined' && audio) audio.playSound('shoot'); this.armsCooldown = 35; }
                        }

                        if ((isAuto && anyTarget) || wantsManualFire) {
                            const aimAngle = anyTarget ? Math.atan2(anyTarget.y - this.y, anyTarget.x - this.x) : Math.atan2(mouse.y - this.y, mouse.x - this.x);
                            const fireAngle = isAuto && anyTarget ? aimAngle : Math.atan2(mouse.y - this.y, mouse.x - this.x);
                            const bulletColor = hasM4 ? '#ffaa00' : (hasM3 ? '#ff003c' : '#00f3ff');

                            if (hasM4) {
                                this.lasers.push(new Laser(this.x, this.y, fireAngle - 0.2, '#ffaa00', 10));
                                this.lasers.push(new Laser(this.x, this.y, fireAngle + 0.2, '#ffaa00', 10));
                                this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle) * 12, Math.sin(fireAngle) * 12, bulletColor, 20, 6));
                                this.armsCooldown = 15;
                            } else {
                                this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle) * 10, Math.sin(fireAngle) * 10, bulletColor, hasM3 ? 12 : 15, 6));
                                if (hasM3) {
                                    this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle + 0.2) * 10, Math.sin(fireAngle + 0.2) * 10, bulletColor, 12, 6));
                                    this.bullets.push(new Bullet(this.x, this.y, Math.cos(fireAngle - 0.2) * 10, Math.sin(fireAngle - 0.2) * 10, bulletColor, 12, 6));
                                }
                                this.armsCooldown = hasM3 ? 20 : 25;
                            }

                            if (typeof audio !== 'undefined' && audio) audio.playSound('shoot');
                            this.armsAngle = fireAngle;
                            if (hasM3 || hasM4 || hasM2) { this.armsPunchAnimL = 5; this.armsPunchAnimR = 5; }
                        } else { this.armsAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x); }
                    }
                }
            }
        }
        if (this.armsCooldown > 0) this.armsCooldown--;
        if (this.armsPunchAnimL > 0) this.armsPunchAnimL--;
        if (this.armsPunchAnimR > 0) this.armsPunchAnimR--;

        this.hue += (this.stealthLevel > 0.5 ? 120 - this.hue : 180 - this.hue) * 0.05;
    }

    shootTongue(mx, my) {
        const dx = mx - this.x, dy = my - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.tongueTargetX = this.x + (dx / dist) * Math.min(dist, this.tongueRange);
        this.tongueTargetY = this.y + (dy / dist) * Math.min(dist, this.tongueRange);
        this.tongueState = 'extending'; this.tongueProgress = 0; this.tongueHitList.clear();
        this.stealthLevel = 0; this.emergencyStealthActive = false;
    }

    retractTongue() { this.tongueState = 'idle'; this.tongueProgress = 0; this.tongueCooldown = 15; }
    getTipPosition() { return { x: this.x + (this.tongueTargetX - this.x) * this.tongueProgress, y: this.y + (this.tongueTargetY - this.y) * this.tongueProgress }; }

    draw(ctx) {
        // Vẽ Sóng Xung Kích (Nằm sâu dưới nhân vật và đạn)
        ctx.save();
        for (const sw of this.shockwaves) {
            ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 221, 0, ${sw.life})`;
            ctx.lineWidth = 15 * sw.life; ctx.shadowBlur = 30; ctx.shadowColor = '#ffdd00'; ctx.stroke();
        }
        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
        this.lasers.forEach(l => l.draw(ctx));

        if (this.equipped && this.equipped.titan_blue) {
            this._drawTitan(ctx);
            this._drawTitanHUD(ctx);
        } else {
            this._drawChameleonBody(ctx);
        }
    }

    _drawTitanHUD(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';

        ctx.fillStyle = '#00f3ff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#000';
        ctx.fillText("🛠️ TITAN MANUAL CONTROL 🛠️", this.x, this.y + 110);

        ctx.fillStyle = '#fff';
        ctx.font = '11px "Segoe UI", Arial, sans-serif';
        ctx.fillText("[Chuột Trái]: Bắn Súng  |  [Phím F]: Đập Búa  |  [Chuột Phải]: Phun Lửa", this.x, this.y + 128);
        ctx.restore();
    }

    _drawTitan(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle - Math.PI / 2);
        ctx.scale(0.8, 0.8);

        const breath = Math.sin(this.bodyPulse * 2.5) * 5;

        // --- 1. LỬA JETPACK TRÊN LƯNG ---
        const jetLength = this.isMoving ? 90 + Math.random() * 40 : 40 + Math.random() * 15;
        const drawJet = (jx, jy) => {
            const jgrad = ctx.createLinearGradient(0, jy, 0, jy - jetLength);
            jgrad.addColorStop(0, '#ffffff'); jgrad.addColorStop(0.2, '#00f3ff'); jgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = jgrad;
            ctx.beginPath(); ctx.moveTo(jx - 15, jy); ctx.lineTo(jx + 15, jy); ctx.lineTo(jx, jy - jetLength); ctx.fill();
        };
        ctx.save();
        ctx.translate(0, breath);
        drawJet(-45, -120);
        drawJet(45, -120);
        ctx.restore();

        // --- 2. LỬA HỦY DIỆT (Vẽ ở lớp DƯỚI CÙNG để chìm xuống dưới lớp giáp) ---
        ctx.save();
        ctx.translate(0, breath);
        if (this.titanBreathActive) {
            const grad = ctx.createLinearGradient(0, 10, 0, 800);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.15, 'rgba(0, 243, 255, 0.9)');
            grad.addColorStop(0.6, 'rgba(0, 100, 255, 0.5)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 10);
            const spread = 280 + Math.random() * 80;
            ctx.lineTo(-spread, 800);
            ctx.lineTo(spread, 800);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // --- 3. VẼ SÚNG TAY TRÁI ---
        ctx.save();
        ctx.translate(99, 53 + breath - this.railgunRecoil);
        ctx.rotate(0);
        ctx.drawImage(titanAssets.gunArm, -46, -74, 92, 147);
        ctx.restore();

        // --- 4. VẼ BÚA TAY PHẢI ---
        ctx.save();
        ctx.translate(-78, 65 + breath);
        ctx.rotate(0);

        let hammerImg = titanAssets.hammerIdle;
        let w = 92, h = 143, ox = -46, oy = -72;

        if (this.hammerAnim > 0.8) {
            hammerImg = titanAssets.hammerRaised;
            ctx.translate(0, -25);
        } else if (this.hammerAnim > 0) {
            hammerImg = titanAssets.hammerSmash;
            w = 166; h = 193; ox = -83; oy = -114;
            ctx.translate(0, 45);
        }
        ctx.drawImage(hammerImg, ox, oy, w, h);
        ctx.restore();

        // --- 5. VẼ THÂN (BODY đè lên ngọn lửa) ---
        ctx.save();
        ctx.translate(0, breath);
        ctx.drawImage(titanAssets.body, -127, -150, 254, 254);
        ctx.restore();

        // --- 6. VẼ LÕI SÁNG ĐÈ LÊN MỌI THỨ ---
        ctx.save();
        ctx.translate(0, breath);
        ctx.fillStyle = '#00f3ff';
        ctx.globalAlpha = 0.6 + Math.sin(this.bodyPulse * 5) * 0.4;
        ctx.shadowBlur = 25; ctx.shadowColor = '#00f3ff';
        ctx.beginPath(); ctx.arc(0, 10, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    _drawChameleonBody(ctx) {
        const pulse = Math.sin(this.bodyPulse) * 0.12 + 0.88;
        const glow = 12 + Math.sin(this.bodyPulse * 2) * 5;
        let hueToUse = this.hue;
        if (this.equipped && this.equipped.core) hueToUse = 0;

        const col = `hsl(${hueToUse}, 100%, 55%)`;
        const alpha = Math.max(0.25, 1 - this.stealthLevel);

        if (this.hasGun) this._drawGun(ctx, alpha, col);
        if (this.hasLaser) this._drawLaserOrb(ctx, alpha);
        if (this.hasMissile) this._drawMissilePod(ctx, alpha);

        if (this.tongueActive) {
            const tip = this.getTipPosition();
            ctx.save(); ctx.globalAlpha = alpha;
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tip.x, tip.y);
            ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 8; ctx.shadowBlur = 18; ctx.shadowColor = '#ff00ff'; ctx.globalAlpha = alpha * 0.25; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tip.x, tip.y);
            ctx.strokeStyle = '#ff88ff'; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.globalAlpha = alpha; ctx.stroke();
            ctx.beginPath(); ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 14; ctx.shadowColor = '#ff00ff'; ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.ellipse(this.x + 3, this.y + 6, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 0; ctx.fill();

        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowBlur = glow * 2; ctx.shadowColor = col;
        ctx.globalAlpha = alpha * 0.25; ctx.stroke(); ctx.globalAlpha = alpha;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const px = this.x + Math.cos(a) * this.radius * pulse;
            const py = this.y + Math.sin(a) * this.radius * pulse;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `hsl(${this.hue}, 80%, 75%)`);
        grad.addColorStop(1, `hsl(${this.hue}, 100%, 28%)`);
        ctx.fillStyle = grad; ctx.shadowBlur = glow; ctx.shadowColor = col; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.shadowBlur = 4; ctx.stroke();

        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = `hsl(${this.hue + 40}, 100%, 80%)`;
        ctx.lineWidth = 1; ctx.shadowBlur = 3; ctx.shadowColor = 'transparent';
        for (let i = 0; i < 3; i++) {
            const a = this.angle + (i - 1) * 0.55;
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a) * this.radius * 0.68, this.y + Math.sin(a) * this.radius * 0.68); ctx.stroke();
        }

        ctx.globalAlpha = Math.max(0.15, alpha);
        ctx.beginPath(); ctx.arc(this.x + this.eyeX, this.y + this.eyeY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff'; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x + this.eyeX, this.y + this.eyeY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff00ff'; ctx.fill();

        if (this.stealthLevel > 0.2) {
            ctx.globalAlpha = this.stealthLevel * 0.35;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 8 + Math.sin(this.bodyPulse * 3) * 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.shadowBlur = 8; ctx.shadowColor = '#00ff88';
            ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        if (this.buffCount > 0) {
            ctx.globalAlpha = 0.85;
            ctx.font = `bold 9px Orbitron, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fdf500'; ctx.shadowBlur = 6; ctx.shadowColor = '#fdf500';
            ctx.fillText(`x${this.damageMultiplier.toFixed(1)}`, this.x, this.y + this.radius + 12);
        }
        ctx.restore();

        if (this.equipped && this.equipped.armor && this.stealthLevel < 0.5) {
            ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#39ff14'; ctx.stroke(); ctx.restore();
        }

        if (this.equipped && (this.equipped.arms_m1 || this.equipped.arms_m2 || this.equipped.arms_m3 || this.equipped.arms_m4 || this.equipped.arms_m5 || this.equipped.arms_m6) && this.stealthLevel < 0.8) {
            this._drawRobotArms(ctx, alpha, col);
        }
    }

    _drawGun(ctx, alpha, col) {
        const a = this.angle; const bx = this.x + Math.cos(a) * this.radius; const by = this.y + Math.sin(a) * this.radius;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(bx, by); ctx.rotate(a);
        ctx.fillStyle = '#888'; ctx.shadowBlur = 6; ctx.shadowColor = '#00f3ff'; ctx.fillRect(0, -3, 14, 6);
        ctx.fillStyle = '#00f3ff'; ctx.fillRect(12, -2, 6, 4); ctx.restore();
    }
    _drawLaserOrb(ctx, alpha) {
        const a = this.bodyPulse * 1.5; const ox = this.x + Math.cos(a) * (this.radius + 10); const oy = this.y + Math.sin(a) * (this.radius + 10);
        ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 14; ctx.shadowColor = '#ff00ff'; ctx.fill(); ctx.restore();
    }
    _drawMissilePod(ctx, alpha) {
        const a = this.angle + Math.PI; const bx = this.x + Math.cos(a) * this.radius; const by = this.y + Math.sin(a) * this.radius;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(bx, by); ctx.rotate(a + Math.PI);
        ctx.fillStyle = '#555'; ctx.shadowBlur = 6; ctx.shadowColor = '#ff7700'; ctx.fillRect(0, -6, 10, 12);
        ctx.fillStyle = '#ff7700'; ctx.fillRect(10, -4, 4, 8); ctx.restore();
    }

    _drawRobotArms(ctx, alpha, col) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const time = Date.now() * 0.003;

        const hasM1 = this.equipped.arms_m1, hasM2 = this.equipped.arms_m2;
        const hasM3 = this.equipped.arms_m3, hasM4 = this.equipped.arms_m4;
        const hasM5 = this.equipped.arms_m5, hasM6 = this.equipped.arms_m6;

        let themeColor = hasM6 ? '#00f3ff' : (hasM5 ? '#ffd700' : (hasM4 ? '#ffaa00' : (hasM3 ? '#ff003c' : (hasM2 ? '#00f3ff' : '#ff003c'))));

        if (hasM6) {
            ctx.save(); ctx.translate(this.x, this.y);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius + 60);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); grad.addColorStop(0.3, 'rgba(0, 243, 255, 0.6)'); grad.addColorStop(0.6, 'rgba(65, 105, 225, 0.3)'); grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.radius + 60, 0, Math.PI * 2); ctx.fill();

            const drawSeraphWing = (index, isLeft) => {
                ctx.save();
                let spreadAngle = (isLeft ? -1 : 1) * (Math.PI / 2.2 + (index * 0.35));
                let floatOffset = Math.sin(time * 3 + index) * 8;

                let attackProgress = 0;
                if (isLeft && this.armsPunchAnimL > 0) attackProgress = this.armsPunchAnimL / 15;
                if (!isLeft && this.armsPunchAnimR > 0) attackProgress = this.armsPunchAnimR / 15;

                let currentAngle;
                if (attackProgress > 0) {
                    let targetFold = (this.armsAngle - this.angle) + (isLeft ? -0.05 : 0.05) * (index + 1);
                    currentAngle = spreadAngle * (1 - attackProgress) + targetFold * attackProgress;
                } else { currentAngle = spreadAngle; }

                ctx.rotate(currentAngle); ctx.translate(this.radius + 15 + floatOffset, 0);

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowBlur = 15; ctx.shadowColor = '#00f3ff';
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.stroke();

                ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(20, -1); ctx.lineTo(30, 0); ctx.lineTo(20, 1); ctx.lineTo(-5, 3); ctx.fill();

                ctx.fillStyle = '#00f3ff'; ctx.globalAlpha = 0.9; ctx.shadowBlur = 20; ctx.shadowColor = '#00f3ff';
                ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(55, -8); ctx.lineTo(45, 0); ctx.lineTo(55, 8); ctx.fill();

                ctx.fillStyle = '#fff'; ctx.shadowBlur = 25; ctx.shadowColor = '#fff';
                ctx.beginPath(); ctx.arc(20, 0, 4, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            };

            ctx.rotate(this.angle);
            for (let i = 0; i < 4; i++) { drawSeraphWing(i, true); drawSeraphWing(i, false); }
            ctx.restore(); return;
        }

        if (hasM5) {
            ctx.save(); ctx.translate(this.x, this.y);
            ctx.rotate(time * 0.5); ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#ffd700';
            ctx.setLineDash([20, 15, 5, 15]); ctx.beginPath(); ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
            ctx.rotate(-time * 1.2); ctx.strokeStyle = '#b000ff'; ctx.lineWidth = 2; ctx.shadowBlur = 15; ctx.shadowColor = '#b000ff';
            ctx.setLineDash([40, 10]); ctx.beginPath(); ctx.arc(0, 0, this.radius + 28, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

            const leftArmAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x) - Math.PI / 2.5;
            const rightArmAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x) + Math.PI / 2.5;

            const drawPhantomArm = (baseX, baseY, targetAngle, index, isLeft) => {
                const spread = (index - 1) * 0.5; const floatAmp = 35 + Math.sin(time * 3 + index) * 8;
                let punchExt = 0;
                if (isLeft && this.armsPunchAnimL > 0) punchExt = (12 - this.armsPunchAnimL) * 6;
                if (!isLeft && this.armsPunchAnimR > 0) punchExt = (12 - this.armsPunchAnimR) * 6;
                const a = (this.armsPunchAnimL > 0 || this.armsPunchAnimR > 0) ? (this.armsAngle + spread * 0.3) : (targetAngle + spread);
                const armX = baseX + Math.cos(a) * (floatAmp + punchExt); const armY = baseY + Math.sin(a) * (floatAmp + punchExt);

                ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.quadraticCurveTo(baseX + Math.cos(a) * floatAmp * 0.5, baseY + Math.sin(a) * floatAmp * 0.5, armX, armY);
                ctx.strokeStyle = isLeft ? '#00f3ff' : '#ff00ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.shadowBlur = 15; ctx.shadowColor = ctx.strokeStyle; ctx.stroke();

                ctx.save(); ctx.translate(armX, armY); ctx.rotate(a); ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#111'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(14, -3); ctx.lineTo(14, 3); ctx.lineTo(-5, 6); ctx.fill();
                ctx.fillStyle = '#ffd700'; ctx.shadowBlur = 20; ctx.shadowColor = '#ffd700'; ctx.beginPath(); ctx.roundRect(-4, -4, 10, 8, 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.shadowBlur = 25; ctx.shadowColor = '#fff'; ctx.beginPath(); ctx.arc(2, 0, 2.5, 0, Math.PI * 2); ctx.fill();

                if ((isLeft && this.armsPunchAnimL > 0) || (!isLeft && this.armsPunchAnimR > 0)) {
                    ctx.fillStyle = isLeft ? '#00f3ff' : '#ff00ff'; ctx.shadowBlur = 30;
                    ctx.beginPath(); ctx.moveTo(14, -10); ctx.quadraticCurveTo(50, 0, 14, 10); ctx.lineTo(10, 5); ctx.quadraticCurveTo(30, 0, 10, -5); ctx.fill();
                }
                ctx.restore();
            };

            for (let i = 0; i < 3; i++) { drawPhantomArm(this.x, this.y, leftArmAngle, i, true); drawPhantomArm(this.x, this.y, rightArmAngle, i, false); }
            ctx.restore(); return;
        }

        let slx = this.x + Math.cos(this.angle - Math.PI / 1.5) * (this.radius + 5);
        let sly = this.y + Math.sin(this.angle - Math.PI / 1.5) * (this.radius + 5);
        let srx = this.x + Math.cos(this.angle + Math.PI / 1.5) * (this.radius + 5);
        let sry = this.y + Math.sin(this.angle + Math.PI / 1.5) * (this.radius + 5);

        let lx = slx + Math.cos(this.angle - Math.PI / 2) * 22 + Math.cos(time) * 4;
        let ly = sly + Math.sin(this.angle - Math.PI / 2) * 22 + Math.sin(time) * 4;
        let rx = srx + Math.cos(this.angle + Math.PI / 2) * 22 + Math.cos(time + Math.PI) * 4;
        let ry = sry + Math.sin(this.angle + Math.PI / 2) * 22 + Math.sin(time + Math.PI) * 4;

        let leftArmAngle = Math.atan2(ly - sly, lx - slx);
        let rightArmAngle = Math.atan2(ry - sry, rx - srx);

        if (this.armsPunchAnimL > 0) {
            const ext = (10 - this.armsPunchAnimL) * 4; const a = this.armsAngle || this.angle;
            lx = slx + Math.cos(a - 0.3) * (20 + ext); ly = sly + Math.sin(a - 0.3) * (20 + ext); leftArmAngle = Math.atan2(ly - sly, lx - slx);
        }
        if (this.armsPunchAnimR > 0) {
            const ext = (10 - this.armsPunchAnimR) * 4; const a = this.armsAngle || this.angle;
            rx = srx + Math.cos(a + 0.3) * (20 + ext); ry = sry + Math.sin(a + 0.3) * (20 + ext); rightArmAngle = Math.atan2(ry - sry, rx - srx);
        }

        let elx = slx + Math.cos(leftArmAngle + 0.5) * 14; let ely = sly + Math.sin(leftArmAngle + 0.5) * 14;
        let erx = srx + Math.cos(rightArmAngle - 0.5) * 14; let ery = sry + Math.sin(rightArmAngle - 0.5) * 14;

        const drawCyberArm = (startX, startY, midX, midY, endX, endY, color) => {
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.shadowBlur = 5; ctx.shadowColor = '#000';
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.shadowBlur = 8; ctx.shadowColor = color;
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.fillStyle = '#222'; ctx.strokeStyle = '#777'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
            [[startX, startY, 6], [midX, midY, 5], [endX, endY, 5]].forEach(([jx, jy, jr]) => {
                ctx.beginPath(); ctx.arc(jx, jy, jr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = color; ctx.shadowBlur = 6; ctx.shadowColor = color;
                ctx.beginPath(); ctx.arc(jx, jy, 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            });
        };

        drawCyberArm(slx, sly, elx, ely, lx, ly, themeColor); drawCyberArm(srx, sry, erx, ery, rx, ry, themeColor);

        ctx.fillStyle = '#222'; ctx.strokeStyle = themeColor; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = themeColor;

        if (hasM1) {
            const drawFist = (fx, fy, fAngle) => {
                ctx.save(); ctx.translate(fx, fy); ctx.rotate(fAngle);
                ctx.fillStyle = '#2b2b2b'; ctx.shadowBlur = 5; ctx.shadowColor = '#000'; ctx.beginPath(); ctx.roundRect(-8, -10, 20, 20, 4); ctx.fill();
                ctx.fillStyle = '#ff003c'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff003c'; ctx.beginPath(); ctx.roundRect(4, -8, 10, 16, 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(9, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            };
            drawFist(lx, ly, leftArmAngle); drawFist(rx, ry, rightArmAngle);
        }
        else if (hasM2) {
            ctx.save(); ctx.translate(lx, ly); ctx.rotate(leftArmAngle);
            ctx.fillStyle = '#333'; ctx.shadowBlur = 0; ctx.fillRect(0, -4, 12, 8);
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f3ff'; ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(35, 0); ctx.lineTo(10, 2); ctx.fill();
            ctx.fillStyle = '#00f3ff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(38, 0); ctx.lineTo(10, 4); ctx.fill(); ctx.restore();

            ctx.save(); ctx.translate(rx, ry); ctx.rotate(rightArmAngle);
            ctx.fillStyle = '#444'; ctx.shadowBlur = 2; ctx.shadowColor = '#000'; ctx.fillRect(-2, -5, 18, 10);
            ctx.fillStyle = '#00f3ff'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f3ff'; ctx.fillRect(16, -3, 6, 6);
            ctx.fillStyle = '#fff'; ctx.fillRect(18, -1, 4, 2); ctx.restore();
        }
        else if (hasM3 || hasM4) {
            const drawBlaster = (gx, gy, gAngle, color) => {
                ctx.save(); ctx.translate(gx, gy); ctx.rotate(gAngle);
                ctx.fillStyle = '#333'; ctx.shadowBlur = 3; ctx.shadowColor = '#000'; ctx.fillRect(-4, -4, 16, 8);
                ctx.fillStyle = color; ctx.shadowBlur = 12; ctx.shadowColor = color; ctx.fillRect(12, -3, 5, 2); ctx.fillRect(12, 1, 5, 2); ctx.restore();
            };
            drawBlaster(lx, ly, leftArmAngle, themeColor); drawBlaster(rx, ry, rightArmAngle, themeColor);

            if (hasM3) {
                ctx.save(); ctx.translate(elx, ely); ctx.rotate(leftArmAngle); ctx.fillStyle = '#222'; ctx.shadowBlur = 0; ctx.fillRect(-6, -8, 20, 6); ctx.fillStyle = themeColor; ctx.shadowBlur = 8; ctx.shadowColor = themeColor; ctx.fillRect(8, -7, 6, 4); ctx.restore();
                ctx.save(); ctx.translate(erx, ery); ctx.rotate(rightArmAngle); ctx.fillStyle = '#222'; ctx.shadowBlur = 0; ctx.fillRect(-6, 2, 20, 6); ctx.fillStyle = themeColor; ctx.shadowBlur = 8; ctx.shadowColor = themeColor; ctx.fillRect(8, 3, 6, 4); ctx.restore();
            }
            if (hasM4) {
                let xt1 = this.x + Math.cos(this.angle - Math.PI * 0.8) * (this.radius - 2); let yt1 = this.y + Math.sin(this.angle - Math.PI * 0.8) * (this.radius - 2);
                let xt2 = this.x + Math.cos(this.angle + Math.PI * 0.8) * (this.radius - 2); let yt2 = this.y + Math.sin(this.angle + Math.PI * 0.8) * (this.radius - 2);
                let a = this.armsAngle || this.angle;
                let midTx1 = xt1 + Math.cos(a - 0.8) * 12; let midTy1 = yt1 + Math.sin(a - 0.8) * 12; let tx1 = midTx1 + Math.cos(a - 0.1) * 18; let ty1 = midTy1 + Math.sin(a - 0.1) * 18;
                let midTx2 = xt2 + Math.cos(a + 0.8) * 12; let midTy2 = yt2 + Math.sin(a + 0.8) * 12; let tx2 = midTx2 + Math.cos(a + 0.1) * 18; let ty2 = midTy2 + Math.sin(a + 0.1) * 18;

                drawCyberArm(xt1, yt1, midTx1, midTy1, tx1, ty1, '#ffaa00'); drawCyberArm(xt2, yt2, midTx2, midTy2, tx2, ty2, '#ffaa00');

                const drawCannon = (cx, cy, cAngle) => {
                    ctx.save(); ctx.translate(cx, cy); ctx.rotate(cAngle);
                    ctx.fillStyle = '#222'; ctx.shadowBlur = 5; ctx.shadowColor = '#000'; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(16, -4); ctx.lineTo(16, 4); ctx.lineTo(-6, 6); ctx.fill();
                    ctx.fillStyle = '#ffaa00'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffaa00'; for (let i = 0; i < 3; i++) ctx.fillRect(2 + i * 4, -3, 2, 6);
                    ctx.fillStyle = '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = '#ffaa00'; ctx.fillRect(16, -2, 6, 4); ctx.restore();
                };
                drawCannon(tx1, ty1, a - 0.1); drawCannon(tx2, ty2, a + 0.1);
            }
        }
        ctx.restore();
    }
}