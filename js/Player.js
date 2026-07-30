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
// Liên kết đúng với các file ảnh bạn đã cung cấp
titanAssets.body.src = 'pictuer/Screenshot_2026-07-30_081826-removebg-preview.png';
titanAssets.gunArm.src = 'pictuer/Screenshot_2026-07-30_083128-removebg-preview.png';
titanAssets.hammerIdle.src = 'pictuer/Screenshot_2026-07-30_082036-removebg-preview.png';
titanAssets.hammerRaised.src = 'pictuer/Screenshot_2026-07-30_082218-removebg-preview.png';
titanAssets.hammerSmash.src = 'pictuer/Screenshot_2026-07-30_082157-removebg-preview.png';


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

class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 18;
        this.speed  = 4;
        this.angle  = 0;
        this.invulnTimer = 0;

        // Stealth & Chameleon
        this.stealthLevel = 0;
        this.stealthCooldown = 0;
        this.maxStealthCooldown = 300;
        this.tongueState = 'idle';

        // Titan States
        this.energy = 100;
        this.maxEnergy = 100;
        this.titanBreathActive = false;
        this.railgunRecoil = 0;
        this.hammerAnim = 0;
        this.titanAttackCd = 0;

        this.bullets = [];
        this.bodyPulse = 0;
    }

    update(keys, mouse, canvas) {
        let dx = 0, dy = 0;
        const isTitan = this.equipped && this.equipped.titan_blue;
        // Titan di chuyển rất chậm và đầm
        const currentSpeed = isTitan ? 1.8 : this.speed; 

        if (keys['w'] || keys['ArrowUp'])    { dy -= 1; }
        if (keys['s'] || keys['ArrowDown'])  { dy += 1; }
        if (keys['a'] || keys['ArrowLeft'])  { dx -= 1; }
        if (keys['d'] || keys['ArrowRight']) { dx += 1; }

        if (dx !== 0 && dy !== 0) { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
        this.x = Math.max(this.radius, Math.min(canvas.width  - this.radius, this.x + dx * currentSpeed));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y + dy * currentSpeed));

        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        this.bodyPulse += 0.05;

        if (isTitan) {
            this.updateTitanLogic(mouse);
        } else {
            if (keys[' '] && this.stealthCooldown <= 0) this.stealthCooldown = this.maxStealthCooldown;
            if (this.stealthCooldown > 0) this.stealthCooldown--;
            this.stealthLevel = (this.stealthCooldown > this.maxStealthCooldown - 50) ? 0.8 : 0;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update();
            if (this.bullets[i].life <= 0 || this.bullets[i].hit) this.bullets.splice(i, 1);
        }
    }

    updateTitanLogic(mouse) {
        // 1. Phục hồi năng lượng
        this.energy = Math.min(this.maxEnergy, this.energy + 0.05);

        // 2. Phun lửa xanh (Chuột phải)
        if (mouse.rightDown && this.energy > 2) {
            this.titanBreathActive = true;
            this.energy -= 1.5; 
            
            if (Math.random() < 0.6) {
                const spread = (Math.random() - 0.5) * 1.0; 
                const pAngle = this.angle + spread;
                const pSpeed = 8 + Math.random() * 5;
                particles.particles.push({
                    x: this.x + Math.cos(this.angle)*25, 
                    y: this.y + Math.sin(this.angle)*25,
                    vx: Math.cos(pAngle) * pSpeed, vy: Math.sin(pAngle) * pSpeed,
                    color: Math.random() > 0.4 ? '#00f3ff' : '#ffffff',
                    life: 35, maxLife: 35, size: Math.random() * 10 + 6, trail: []
                });
            }
        } else {
            this.titanBreathActive = false;
        }

        // 3. Auto Attacks (Súng & Búa)
        if (this.titanAttackCd <= 0 && typeof enemies !== 'undefined') {
            let target = null, minDist = 450; // Tầm nhìn xa
            for (const e of enemies) {
                if(e.dead) continue;
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist < minDist) { minDist = dist; target = e; }
            }

            if (target || mouse.down) {
                const aimAngle = target ? Math.atan2(target.y - this.y, target.x - this.x) : this.angle;
                
                if (Math.random() > 0.5) {
                    // BẮN SÚNG (Kích hoạt giật lùi)
                    this.bullets.push(new Bullet(this.x, this.y, Math.cos(aimAngle)*18, Math.sin(aimAngle)*18, '#00f3ff', 80, 8));
                    this.railgunRecoil = 25; // Súng lùi cực mạnh về sau
                    if(typeof screenShake !== 'undefined') screenShake.trigger(6, 6);
                } else {
                    // ĐẬP BÚA (Kích hoạt animation)
                    this.hammerAnim = 1.0; // Biến chạy từ 1.0 -> 0.0
                    
                    const hx = this.x + Math.cos(aimAngle)*70;
                    const hy = this.y + Math.sin(aimAngle)*70;
                    
                    // Tia lửa văng ra khi búa chạm đất
                    for(let i=0; i<20; i++) {
                        const a = (i/20) * Math.PI * 2;
                        particles.particles.push({ x: hx, y: hy, vx: Math.cos(a)*12, vy: Math.sin(a)*12, color: '#ffdd00', life: 25, maxLife: 25, size: 5, trail: [] });
                    }
                    
                    for (const e of enemies) {
                        if (!e.dead && Math.hypot(e.x - hx, e.y - hy) < 120) {
                            if(e.takeDamage) {
                                if(e.takeDamage(150, e.x, e.y).dead) {
                                    let idx = enemies.indexOf(e); if(idx>-1) onEnemyDeath(e, idx);
                                }
                            }
                        }
                    }
                    if(typeof screenShake !== 'undefined') screenShake.trigger(10, 10);
                }
                this.titanAttackCd = 50; 
            }
        }

        if (this.titanAttackCd > 0) this.titanAttackCd--;
        if (this.railgunRecoil > 0) this.railgunRecoil -= 1.5; // Súng trượt lại vị trí cũ
        if (this.hammerAnim > 0) this.hammerAnim -= 0.05; // Tốc độ vung búa
    }

    draw(ctx) {
        this.bullets.forEach(b => b.draw(ctx));

        if (this.equipped && this.equipped.titan_blue) {
            this._drawTitan(ctx);
        } else {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
            ctx.fillStyle = '#00f3ff'; ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }

    // ==========================================
    // RENDER HÌNH ẢNH CỦA BẠN TỪNG LỚP (LAYERS)
    // ==========================================
    _drawTitan(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Vì hình vẽ của bạn có mũi tàu hướng LÊN (UP/North), 
        // trong khi hướng súng của game là PHẢI (RIGHT/East).
        // Ta cần cộng thêm góc 90 độ (Math.PI / 2) để robot quay đúng ngón trỏ chuột.
        ctx.rotate(this.angle + Math.PI / 2);

        // Nhịp thở của máy móc (Lên xuống nhẹ nhàng theo trục Y)
        const breath = Math.sin(this.bodyPulse * 1.5) * 2;

        // 1. VẼ TAY TRÁI (SÚNG NĂNG LƯỢNG)
        ctx.save();
        // Đưa tọa độ về vai trái. 
        // Trục +Y hiện đang hướng về PHÍA SAU lưng robot, nên +recoil sẽ đẩy súng về sau.
        ctx.translate(-45, 10 + breath + this.railgunRecoil);
        // Vẽ ảnh súng (Kích thước tùy chỉnh theo tỷ lệ)
        ctx.drawImage(titanAssets.gunArm, -20, -70, 45, 100);
        ctx.restore();

        // 2. VẼ TAY PHẢI (BÚA) KÈM THEO ANIMATION 3 TRẠNG THÁI
        ctx.save();
        // Đưa tọa độ về vai phải
        ctx.translate(50, 10 + breath);
        
        let hammerImg = titanAssets.hammerIdle;
        // Các thông số width, height, offsetX, offsetY
        let w = 45, h = 100, ox = -20, oy = -75;

        // Biến hammerAnim chạy từ 1.0 về 0.0
        if (this.hammerAnim > 0.8) {
            // Đang giơ búa lên cao (Dùng ảnh 4)
            hammerImg = titanAssets.hammerRaised;
            ctx.rotate(0.2); // Hơi nghiêng tay ra sau lấy đà
        } else if (this.hammerAnim > 0) {
            // Đang nện búa xuống, có vụ nổ điện vàng (Dùng ảnh 5)
            hammerImg = titanAssets.hammerSmash;
            // Vì ảnh này có thêm khối nổ xung quanh nên ta phóng to kích thước vẽ 
            // để cán búa vẫn khớp với vai.
            w = 85; h = 135; ox = -42; oy = -85;
            ctx.rotate(-0.15); // Nghiêng tay chúi về trước
        }

        ctx.drawImage(hammerImg, ox, oy, w, h);
        ctx.restore();

        // 3. VẼ PHẦN THÂN (BODY)
        ctx.save();
        ctx.translate(0, breath);
        // Canh giữa ảnh body (kích thước 130x130, tọa độ vẽ dời về -65, -65)
        ctx.drawImage(titanAssets.body, -65, -65, 130, 130);
        
        // Vẽ đè thêm ánh sáng chớp nháy ở lõi ngực cho sống động
        ctx.fillStyle = '#00f3ff'; 
        ctx.globalAlpha = 0.4 + Math.sin(this.bodyPulse * 4) * 0.4;
        ctx.shadowBlur = 20; ctx.shadowColor = '#00f3ff';
        // Tọa độ ngực (x=0, y=5) nằm ở ngay rãnh phát sáng của ảnh 1
        ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // 4. VẼ HIỆU ỨNG PHUN LỬA TỪ LÕI (TRÙM LÊN BODY)
        if (this.titanBreathActive) {
            // Trục -Y là hướng thẳng về phía trước đầu robot
            const grad = ctx.createLinearGradient(0, -20, 0, -280); 
            grad.addColorStop(0, 'rgba(0, 243, 255, 0.95)');
            grad.addColorStop(0.5, 'rgba(0, 100, 255, 0.6)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -20); // Bắt đầu từ đầu robot
            const spread = 90 + Math.random() * 40; // Độ xòe của lửa
            ctx.lineTo(-spread, -280);
            ctx.lineTo(spread, -280);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}
