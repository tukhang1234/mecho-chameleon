class Planet {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.radius = 200 + Math.random() * 150;
        this.x = Math.random() * window.WORLD_WIDTH;
        this.y = Math.random() * window.WORLD_HEIGHT;
        this.hp = 1500 + this.radius * 15;
        this.maxHp = this.hp;
        
        // Random planet color
        const hues = [0, 45, 120, 200, 280, 320];
        this.hue = hues[Math.floor(Math.random() * hues.length)];
        this.color = `hsl(${this.hue}, 70%, 40%)`;
        this.craterColor = `hsl(${this.hue}, 80%, 25%)`;
        this.glow = `hsl(${this.hue}, 100%, 60%)`;
        this.dead = false;
        
        // Generate craters
        this.craters = [];
        const numCraters = 4 + Math.random() * 6;
        for (let i = 0; i < numCraters; i++) {
            const a = Math.random() * Math.PI * 2;
            const dist = Math.random() * (this.radius * 0.7);
            this.craters.push({
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist,
                r: 15 + Math.random() * 35
            });
        }
    }
    
    takeDamage(dmg, hitX, hitY) {
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.dead = true;
            return true;
        }
        return false;
    }
    
    draw(ctx) {
        if (this.dead) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Glow
        if (!window.isLowEndDevice) {
            ctx.shadowBlur = 40;
            ctx.shadowColor = this.glow;
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Craters
        ctx.fillStyle = this.craterColor;
        for (const c of this.craters) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // HP Bar
        if (this.hp < this.maxHp) {
            const pct = this.hp / this.maxHp;
            const w = this.radius * 1.5;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-w/2, -this.radius - 30, w, 10);
            ctx.fillStyle = `hsl(${this.hue}, 100%, 60%)`;
            ctx.fillRect(-w/2, -this.radius - 30, w * pct, 10);
        }
        
        ctx.restore();
    }
}
