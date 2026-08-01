// --- System.js: Particles, Screen Shake, and Advanced Audio/Music ---

// ===========================
// PARTICLE SYSTEM
// ===========================
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count, speed = 2, life = 40) {
        if (this.particles.length > (window.MAX_PARTICLES || 150)) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * speed + 0.5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                life,
                maxLife: life,
                size: Math.random() * 4 + 1,
                trail: [] // trail for fancy streak effect
            });
        }
    }



    // Emit directional burst (for tongue impact)
    burst(x, y, color, count, dirX, dirY) {
        if (this.particles.length > (window.MAX_PARTICLES || 150)) return;

        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * Math.PI;
            const angle = Math.atan2(dirY, dirX) + spread;
            const velocity = Math.random() * 5 + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                life: 25,
                maxLife: 25,
                size: Math.random() * 3 + 1,
                trail: []
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.shift();
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;

            // Draw trail
            if (p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                ctx.lineTo(p.x, p.y);
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = alpha * 0.4;
                ctx.lineWidth = p.size * 0.5;
                if (!window.isLowEndDevice) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = p.color;
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.stroke();
            }

            // Draw core dot
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#fff';
            if (!window.isLowEndDevice) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = p.color;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }
}

// ===========================
// SCREEN SHAKE
// ===========================
class ScreenShake {
    constructor() { this.intensity = 0; this.duration = 0; this.offsetX = 0; this.offsetY = 0; }
    trigger(intensity, duration) { this.intensity = intensity; this.duration = duration; }
    update() {
        if (this.duration > 0) {
            this.offsetX = (Math.random() - 0.5) * this.intensity;
            this.offsetY = (Math.random() - 0.5) * this.intensity;
            this.duration--;
            this.intensity *= 0.88;
        } else { this.offsetX = 0; this.offsetY = 0; }
    }
    apply(ctx) { if (this.duration > 0) ctx.translate(this.offsetX, this.offsetY); }
    reset(ctx) { if (this.duration > 0) ctx.translate(-this.offsetX, -this.offsetY); }
}

// ===========================
// AUDIO + MUSIC SYSTEM (Full Synthwave via Web Audio API)
// ===========================
class AudioSystem {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.audioCtx.destination);

        this.musicNodes = []; // currently playing music oscillators
        this.musicMode = null; // 'menu' or 'game' or 'boss'
        this.musicGeneration = 0; // Incremented on every music change to orphan old intervals
        this.beatInterval = null;
        this.beatStep = 0;

        // Custom sounds
        this.customSounds = {
            laser: new Audio('sound/Laser sound.wav'),
            lightning: new Audio('sound/lightning.wav')
        };
        this.customSounds.laser.volume = 0.5;
        this.customSounds.lightning.volume = 0.5;
    }

    resume() {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    }

    // --- Sound Effects ---
    playSound(type) {
        this.resume();
        
        if (type === 'laser') {
            const sound = this.customSounds.laser.cloneNode();
            sound.volume = this.masterGain.gain.value;
            sound.play().catch(e => {});
            return;
        }
        if (type === 'lightning') {
            const sound = this.customSounds.lightning.cloneNode();
            sound.volume = this.masterGain.gain.value;
            sound.play().catch(e => {});
            return;
        }

        const gain = this.audioCtx.createGain();
        gain.connect(this.masterGain);
        const now = this.audioCtx.currentTime;

        if (type === 'shoot') {
            const osc = this.audioCtx.createOscillator();
            osc.connect(gain);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now); osc.stop(now + 0.12);
        } else if (type === 'fire') {
            const bufferSize = this.audioCtx.sampleRate * 0.5;
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const source = this.audioCtx.createBufferSource();
            source.buffer = buffer;
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 300;
            source.connect(filter); filter.connect(gain);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            source.start(now); source.stop(now + 0.5);
        } else if (type === 'hit') {
            // Noise burst for impact
            const bufferSize = this.audioCtx.sampleRate * 0.15;
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const source = this.audioCtx.createBufferSource();
            source.buffer = buffer;
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 300;
            source.connect(filter); filter.connect(gain);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            source.start(now); source.stop(now + 0.15);
        } else if (type === 'pickup') {
            [600, 900, 1200].forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.connect(g); g.connect(this.masterGain);
                osc.type = 'sine';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0, now + i * 0.07);
                g.gain.linearRampToValueAtTime(0.1, now + i * 0.07 + 0.02);
                g.gain.linearRampToValueAtTime(0, now + i * 0.07 + 0.12);
                osc.start(now + i * 0.07);
                osc.stop(now + i * 0.07 + 0.12);
            });
        } else if (type === 'stealth') {
            const osc = this.audioCtx.createOscillator();
            osc.connect(gain);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
        } else if (type === 'split') {
            // Enemy split boom
            [180, 220, 160].forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.connect(g); g.connect(this.masterGain);
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, now + i * 0.03);
                osc.frequency.exponentialRampToValueAtTime(40, now + i * 0.03 + 0.2);
                g.gain.setValueAtTime(0.15, now + i * 0.03);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.25);
                osc.start(now + i * 0.03);
                osc.stop(now + i * 0.03 + 0.25);
            });
        } else if (type === 'death') {
            // Game over horn
            [220, 196, 174, 146].forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.connect(g); g.connect(this.masterGain);
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.2, now + i * 0.25);
                g.gain.linearRampToValueAtTime(0, now + i * 0.25 + 0.3);
                osc.start(now + i * 0.25);
                osc.stop(now + i * 0.25 + 0.35);
            });
        }
    }

    // --- Music Engine ---
    stopMusic() {
        if (this.beatInterval) { clearInterval(this.beatInterval); this.beatInterval = null; }
        this.musicNodes.forEach(n => { try { n.stop(); } catch (e) { } });
        this.musicNodes = [];
        this.musicMode = null;
        this.musicGeneration++;
        this.beatStep = 0;
    }

    startMenuMusic() {
        if (this.musicMode === 'menu') return;
        this.stopMusic();
        this.musicMode = 'menu';
        this.resume();
        this._startMenuDrone();
        this._startMenuArpeggio();
    }

    startGameMusic() {
        if (this.musicMode === 'game') return;
        this.stopMusic();
        this.musicMode = 'game';
        this.resume();
        this._startGameDrums();
        this._startGameBassline();
        this._startGameLead();
    }

    startBossMusic() {
        if (this.musicMode === 'boss') return;
        this.stopMusic();
        this.musicMode = 'boss';
        this.resume();
        this._startBossDrums();
        this._startBossBassline();
        this._startBossLead();
    }

    // --- MENU MUSIC: Ambient Drone + Slow Arpeggio ---
    _startMenuDrone() {
        const now = this.audioCtx.currentTime;
        [55, 110, 165].forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400 + i * 100;
            osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
            osc.type = i === 0 ? 'sawtooth' : 'sine';
            osc.frequency.value = freq + i * 0.5; // slight detune for chorus
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.04 - i * 0.005, now + 2);
            osc.start(now);
            this.musicNodes.push(osc);
        });
    }

    _startMenuArpeggio() {
        // Slow ambient arpeggio on pentatonic notes
        const notes = [220, 262, 330, 392, 523, 392, 330, 262];
        let step = 0;
        const currentGen = this.musicGeneration;
        this.beatInterval = setInterval(() => {
            if (this.musicGeneration !== currentGen) return;
            this.resume();
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const reverb = this.audioCtx.createGain();
            osc.connect(gain); gain.connect(this.masterGain);
            osc.type = 'triangle';
            osc.frequency.value = notes[step % notes.length];
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.start(now); osc.stop(now + 0.7);
            step++;
        }, 400);
    }

    // --- GAME MUSIC: Full Synthwave with Drums, Bass, Lead ---
    _startGameDrums() {
        const BPM = 128;
        const interval = (60 / BPM / 4) * 1000; // 16th note interval
        const pattern = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0]; // kick pattern
        const snare = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]; // snare on 2 and 4
        let step = 0;
        const currentGen = this.musicGeneration;

        const drumInterval = setInterval(() => {
            if (this.musicGeneration !== currentGen) { clearInterval(drumInterval); return; }
            this.resume();
            const now = this.audioCtx.currentTime;

            if (pattern[step % 16]) {
                // KICK: pitched down noise + low sine
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.connect(g); g.connect(this.masterGain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
                g.gain.setValueAtTime(0.5, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            }

            if (snare[step % 16]) {
                // SNARE: noise burst
                const bufferSize = this.audioCtx.sampleRate * 0.1;
                const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
                const source = this.audioCtx.createBufferSource();
                source.buffer = buffer;
                const f = this.audioCtx.createBiquadFilter();
                f.type = 'highpass'; f.frequency.value = 1500;
                const g = this.audioCtx.createGain();
                source.connect(f); f.connect(g); g.connect(this.masterGain);
                g.gain.setValueAtTime(0.18, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                source.start(now); source.stop(now + 0.12);
            }

            // Hi-hat every 8th note
            if (step % 2 === 0) {
                const bufferSize = this.audioCtx.sampleRate * 0.05;
                const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
                const source = this.audioCtx.createBufferSource();
                source.buffer = buffer;
                const f = this.audioCtx.createBiquadFilter();
                f.type = 'highpass'; f.frequency.value = 8000;
                const g = this.audioCtx.createGain();
                source.connect(f); f.connect(g); g.connect(this.masterGain);
                g.gain.setValueAtTime(0.04, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                source.start(now); source.stop(now + 0.05);
            }

            step++;
        }, interval);
    }

    _startGameBassline() {
        // Repeated bass riff in A minor
        const BPM = 128;
        const interval = (60 / BPM) * 1000;
        const bassNotes = [110, 110, 130.8, 110, 98, 110, 87.3, 98];
        let step = 0;
        const currentGen = this.musicGeneration;

        const bassInterval = setInterval(() => {
            if (this.musicGeneration !== currentGen) { clearInterval(bassInterval); return; }
            this.resume();
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            const f = this.audioCtx.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = 600;
            osc.connect(f); f.connect(g); g.connect(this.masterGain);
            osc.type = 'sawtooth';
            osc.frequency.value = bassNotes[step % bassNotes.length];
            g.gain.setValueAtTime(0.18, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now); osc.stop(now + 0.45);
            step++;
        }, interval);
    }

    _startGameLead() {
        // Synthwave lead melody
        const BPM = 128;
        const beat = 60 / BPM;
        const leadPattern = [
            { note: 440, dur: beat * 2 }, { note: 0, dur: beat },
            { note: 523, dur: beat * 2 }, { note: 0, dur: beat },
            { note: 587, dur: beat * 1 }, { note: 523, dur: beat * 1 },
            { note: 440, dur: beat * 4 }, { note: 0, dur: beat * 2 },
            { note: 392, dur: beat * 2 }, { note: 0, dur: beat },
            { note: 440, dur: beat * 2 }, { note: 0, dur: beat },
            { note: 349, dur: beat * 2 }, { note: 392, dur: beat * 2 },
            { note: 329, dur: beat * 4 }, { note: 0, dur: beat * 4 },
        ];

        let t = this.audioCtx.currentTime + 1; // slight delay before lead starts
        const currentGen = this.musicGeneration;

        const scheduleNext = () => {
            if (this.musicGeneration !== currentGen) return;
            leadPattern.forEach(event => {
                if (event.note > 0) {
                    const osc = this.audioCtx.createOscillator();
                    const g = this.audioCtx.createGain();
                    const f = this.audioCtx.createBiquadFilter();
                    f.type = 'lowpass'; f.frequency.value = 3000;
                    osc.connect(f); f.connect(g); g.connect(this.masterGain);
                    osc.type = 'sawtooth';
                    osc.frequency.value = event.note;
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(0.08, t + 0.02);
                    g.gain.linearRampToValueAtTime(0, t + event.dur * 0.9);
                    osc.start(t); osc.stop(t + event.dur);
                    this.musicNodes.push(osc);
                }
                t += event.dur;
            });
            // Schedule loop
            const loopDur = leadPattern.reduce((s, e) => s + e.dur, 0);
            const remaining = t - this.audioCtx.currentTime;
            setTimeout(() => {
                if (this.musicGeneration === currentGen) scheduleNext();
            }, (remaining - 1) * 1000);
        };
        scheduleNext();
    }

    // --- BOSS MUSIC: Heavier, Faster, Intense ---
    _startBossDrums() {
        const BPM = 160;
        const interval = (60 / BPM / 4) * 1000;
        const pattern = [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
        const snare = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
        let step = 0;
        const currentGen = this.musicGeneration;

        const drumInterval = setInterval(() => {
            if (this.musicGeneration !== currentGen) { clearInterval(drumInterval); return; }
            this.resume();
            const now = this.audioCtx.currentTime;

            if (pattern[step % 16]) {
                const osc = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                osc.connect(g); g.connect(this.masterGain);
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
                g.gain.setValueAtTime(0.6, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            }
            if (snare[step % 16]) {
                const bufferSize = this.audioCtx.sampleRate * 0.1;
                const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
                const source = this.audioCtx.createBufferSource();
                source.buffer = buffer;
                const f = this.audioCtx.createBiquadFilter();
                f.type = 'bandpass'; f.frequency.value = 1000;
                const g = this.audioCtx.createGain();
                source.connect(f); f.connect(g); g.connect(this.masterGain);
                g.gain.setValueAtTime(0.2, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                source.start(now); source.stop(now + 0.15);
            }
            if (step % 2 === 0) {
                const bufferSize = this.audioCtx.sampleRate * 0.05;
                const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
                const source = this.audioCtx.createBufferSource();
                source.buffer = buffer;
                const f = this.audioCtx.createBiquadFilter();
                f.type = 'highpass'; f.frequency.value = 6000;
                const g = this.audioCtx.createGain();
                source.connect(f); f.connect(g); g.connect(this.masterGain);
                g.gain.setValueAtTime(0.06, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                source.start(now); source.stop(now + 0.05);
            }
            step++;
        }, interval);
    }

    _startBossBassline() {
        const BPM = 160;
        const interval = (60 / BPM / 2) * 1000; // 8th notes
        const bassNotes = [55, 55, 55, 55, 65.4, 65.4, 49, 49];
        let step = 0;
        const currentGen = this.musicGeneration;

        const bassInterval = setInterval(() => {
            if (this.musicGeneration !== currentGen) { clearInterval(bassInterval); return; }
            this.resume();
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            const f = this.audioCtx.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = 800 + Math.sin(step) * 200;
            osc.connect(f); f.connect(g); g.connect(this.masterGain);
            osc.type = 'sawtooth';
            osc.frequency.value = bassNotes[step % bassNotes.length];
            g.gain.setValueAtTime(0.25, now);
            g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now); osc.stop(now + 0.25);
            step++;
        }, interval);
    }

    _startBossLead() {
        const BPM = 160;
        const beat = 60 / BPM;
        const leadPattern = [
            { note: 440, dur: beat * 1 }, { note: 523, dur: beat * 1 }, { note: 659, dur: beat * 2 },
            { note: 523, dur: beat * 1 }, { note: 587, dur: beat * 1 }, { note: 783, dur: beat * 2 },
            { note: 440, dur: beat * 1 }, { note: 523, dur: beat * 1 }, { note: 880, dur: beat * 2 },
            { note: 783, dur: beat * 2 }, { note: 659, dur: beat * 2 }
        ];

        let t = this.audioCtx.currentTime + 1;
        const currentGen = this.musicGeneration;

        const scheduleNext = () => {
            if (this.musicGeneration !== currentGen) return;
            leadPattern.forEach(event => {
                if (event.note > 0) {
                    const osc = this.audioCtx.createOscillator();
                    const g = this.audioCtx.createGain();
                    const f = this.audioCtx.createBiquadFilter();
                    f.type = 'lowpass'; f.frequency.value = 4000;
                    osc.connect(f); f.connect(g); g.connect(this.masterGain);
                    osc.type = 'square';
                    osc.frequency.value = event.note;
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(0.12, t + 0.05);
                    g.gain.linearRampToValueAtTime(0, t + event.dur * 0.95);
                    osc.start(t); osc.stop(t + event.dur);
                    this.musicNodes.push(osc);
                }
                t += event.dur;
            });
            const remaining = t - this.audioCtx.currentTime;
            setTimeout(() => {
                if (this.musicGeneration === currentGen) scheduleNext();
            }, (remaining - 1) * 1000);
        };
        scheduleNext();
    }
}

// ==========================
// VIRTUAL JOYSTICK (MOBILE)
// ==========================
class VirtualJoystick {
    constructor(elementId) {
        this.container = document.getElementById(elementId);
        this.stick = this.container.querySelector('.joystick-stick');
        this.active = false;
        this.dx = 0;
        this.dy = 0;
        this.distance = 0;
        this.angle = 0;
        this.maxDist = 50; // max radius for the stick
        
        this.centerX = 0;
        this.centerY = 0;
        this.touchId = null;

        this._bindEvents();
    }

    _bindEvents() {
        this.container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchId = touch.identifier;
            this.active = true;
            
            const rect = this.container.getBoundingClientRect();
            this.centerX = rect.left + rect.width / 2;
            this.centerY = rect.top + rect.height / 2;
            
            this._updateStick(touch.clientX, touch.clientY);
        }, {passive: false});

        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.active) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchId) {
                    this._updateStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                    break;
                }
            }
        }, {passive: false});

        const handleEnd = (e) => {
            if (!this.active) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchId) {
                    this._resetStick();
                    break;
                }
            }
        };

        this.container.addEventListener('touchend', handleEnd);
        this.container.addEventListener('touchcancel', handleEnd);
    }

    _updateStick(x, y) {
        let diffX = x - this.centerX;
        let diffY = y - this.centerY;
        
        this.distance = Math.hypot(diffX, diffY);
        this.angle = Math.atan2(diffY, diffX);
        
        if (this.distance > this.maxDist) {
            diffX = Math.cos(this.angle) * this.maxDist;
            diffY = Math.sin(this.angle) * this.maxDist;
            this.distance = this.maxDist;
        }

        // dx and dy normalized from -1 to 1
        this.dx = diffX / this.maxDist;
        this.dy = diffY / this.maxDist;

        this.stick.style.transform = `translate(calc(-50% + ${diffX}px), calc(-50% + ${diffY}px))`;
    }

    _resetStick() {
        this.active = false;
        this.dx = 0;
        this.dy = 0;
        this.distance = 0;
        this.touchId = null;
        this.stick.style.transform = `translate(-50%, -50%)`;
    }
}
