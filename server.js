/**
 * server.js — Mecho Chameleon Multiplayer Server
 * Node.js + Socket.IO + Express
 *
 * Modes supported:
 *   coop  — 2 players fight enemies together (host manages wave/enemy logic)
 *   pvp   — 2 players fight each other, no enemies
 *
 * Usage:
 *   node server.js
 *   Then run: ngrok http 3000
 *   Share the ngrok URL with your friend!
 */

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling']
});

// Serve game files as static
app.use(express.static(path.join(__dirname)));

// Fallback: always serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Matchmaking ────────────────────────────────────────────────────────────
// Simple single-slot queue per mode: first player waits, second joins them.
const waitingQueue = {}; // { mode: socketId }

// ─── Socket.IO Events ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
    socket.data.roomId      = null;
    socket.data.playerIndex = null;
    socket.data.mode        = null;

    console.log(`🟢 Connected: ${socket.id}`);

    // ── Find / create match ────────────────────────────────────────
    socket.on('find_match', ({ mode }) => {
        if (waitingQueue[mode]) {
            const hostId     = waitingQueue[mode];
            delete waitingQueue[mode];

            const hostSocket = io.sockets.sockets.get(hostId);

            if (!hostSocket || !hostSocket.connected) {
                // Host disconnected while waiting, re-queue this player
                waitingQueue[mode] = socket.id;
                socket.emit('waiting');
                return;
            }

            const roomId = `room_${Date.now()}`;

            // Join both into the room
            hostSocket.join(roomId);
            socket.join(roomId);

            // Store metadata
            hostSocket.data.roomId      = roomId;
            hostSocket.data.playerIndex = 1;
            hostSocket.data.mode        = mode;
            socket.data.roomId          = roomId;
            socket.data.playerIndex     = 2;
            socket.data.mode            = mode;

            // Notify both with their assigned index
            hostSocket.emit('match_found', { roomId, mode, playerIndex: 1 });
            socket.emit('match_found',     { roomId, mode, playerIndex: 2 });

            console.log(`🎮 Match [${mode.toUpperCase()}] — Room: ${roomId}`);
        } else {
            // No one waiting — add to queue
            waitingQueue[mode] = socket.id;
            socket.emit('waiting');
            console.log(`⏳ Waiting [${mode}]: ${socket.id}`);
        }
    });

    // ── Cancel matchmaking ─────────────────────────────────────────
    socket.on('cancel_search', () => {
        for (const m in waitingQueue) {
            if (waitingQueue[m] === socket.id) {
                delete waitingQueue[m];
                console.log(`❌ Cancelled search [${m}]: ${socket.id}`);
                break;
            }
        }
    });

    // ── Relay: player position / visual state ──────────────────────
    socket.on('player_state', (data) => {
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('opponent_state', data);
    });

    // ── Relay: host → client enemy positions (co-op) ───────────────
    socket.on('enemy_sync', (data) => {
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('enemy_sync', data);
    });

    // ── Relay: client hits enemy on host (co-op) ───────────────────
    socket.on('client_hit', (data) => {
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('client_hit', data);
    });

    // ── Relay: PvP damage ──────────────────────────────────────────
    socket.on('pvp_hit', (data) => {
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('pvp_hit', data);
    });

    // ── Relay: player died notification ───────────────────────────
    socket.on('player_died', () => {
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('opponent_died');
    });

    // ── Relay: restart request ─────────────────────────────────────
    socket.on('request_restart', () => {
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('opponent_restart');
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
        // Remove from waiting queue if present
        for (const m in waitingQueue) {
            if (waitingQueue[m] === socket.id) {
                delete waitingQueue[m];
                break;
            }
        }
        // Notify room partner
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('opponent_disconnected');

        console.log(`🔴 Disconnected: ${socket.id}`);
    });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🦎 ══════════════════════════════════════════════════');
    console.log('       Mecho Chameleon — Multiplayer Server');
    console.log('   ──────────────────────────────────────────────');
    console.log(`   ✅  Server running at  http://localhost:${PORT}`);
    console.log('   ──────────────────────────────────────────────');
    console.log('   📡  Next: run   ngrok http ' + PORT);
    console.log('   🔗  Share the ngrok URL with your friend!');
    console.log('══════════════════════════════════════════════════\n');
});
