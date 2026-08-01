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
const rooms = {}; // { roomId: { mode, host, players: [{id, team}] } }
const roomRestarts = {}; // { roomId: Set<socketId> }

// ─── Socket.IO Events ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
    socket.data.roomId      = null;
    socket.data.playerIndex = null;
    socket.data.mode        = null;
    socket.data.team        = null;

    console.log(`🟢 Connected: ${socket.id}`);

    // ── Find / create match ────────────────────────────────────────
    socket.on('find_match', ({ mode, maxPlayers }) => {
        let joinedRoomId = null;
        let assignedTeam = null;
        let playerIndex = null;
        const requestedMax = maxPlayers || 2; // default to 2 if not provided

        // Find available room
        for (const roomId in rooms) {
            const room = rooms[roomId];
            // Only join rooms with the same mode and same maxPlayers configuration
            if (room.mode === mode && room.maxPlayers === requestedMax && room.players.length < room.maxPlayers) {
                if (mode === 'pvp') {
                    let team1Count = room.players.filter(p => p.team === 1).length;
                    let team2Count = room.players.filter(p => p.team === 2).length;
                    assignedTeam = team1Count <= team2Count ? 1 : 2;
                } else {
                    assignedTeam = 1;
                }
                room.players.push({ id: socket.id, team: assignedTeam });
                joinedRoomId = roomId;
                playerIndex = room.players.length;
                break;
            }
        }

        // Create new room if none found
        if (!joinedRoomId) {
            joinedRoomId = `room_${Date.now()}`;
            assignedTeam = 1;
            rooms[joinedRoomId] = { 
                mode, 
                maxPlayers: requestedMax, 
                host: socket.id, 
                players: [{ id: socket.id, team: assignedTeam }] 
            };
            playerIndex = 1;
        }

        socket.join(joinedRoomId);
        socket.data.roomId      = joinedRoomId;
        socket.data.playerIndex = playerIndex;
        socket.data.mode        = mode;
        socket.data.team        = assignedTeam;

        // Send match found to player
        socket.emit('match_found', { 
            roomId: joinedRoomId, 
            mode, 
            playerIndex, 
            team: assignedTeam,
            isHost: rooms[joinedRoomId].host === socket.id
        });

        // Broadcast to others that a player joined
        socket.to(joinedRoomId).emit('player_joined', { 
            id: socket.id, 
            team: assignedTeam, 
            playerIndex 
        });

        console.log(`🎮 Match [${mode.toUpperCase()}] — Room: ${joinedRoomId}, Player: ${socket.id}, Team: ${assignedTeam}`);
    });

    // ── Cancel matchmaking ─────────────────────────────────────────
    socket.on('cancel_search', () => {
        // Since we join instantly now, cancel_search is mostly if they leave before match loads,
        // but disconnect handles that.
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
        const { roomId, team } = socket.data;
        if (roomId) socket.to(roomId).emit('opponent_died', { id: socket.id, team });
    });
    
    // ── Relay: kill confirmed (give coins) ────────────────────────
    socket.on('kill_confirmed', (killerId) => {
        const { roomId } = socket.data;
        if (roomId) {
            // Send to the killer so they get coins
            io.to(killerId).emit('reward_coins', 50);
        }
    });

    // ── Relay: restart request ─────────────────────────────────────
    socket.on('request_restart', () => {
        const { roomId } = socket.data;
        if (roomId) {
            if (!roomRestarts[roomId]) roomRestarts[roomId] = new Set();
            roomRestarts[roomId].add(socket.id);
            const votes = roomRestarts[roomId].size;
            io.to(roomId).emit('restart_vote_status', { votes });
            if (votes >= 2) {
                io.to(roomId).emit('restart_game');
                roomRestarts[roomId].clear();
            }
        }
    });

    // ── Relay: chat message ────────────────────────────────────────
    socket.on('chatMessage', (text) => {
        const { roomId } = socket.data;
        if (roomId) socket.to(roomId).emit('chatMessage', text);
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
        const { roomId } = socket.data;
        if (roomId && rooms[roomId]) {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);
            
            if (room.players.length === 0) {
                delete rooms[roomId];
                if (roomRestarts[roomId]) delete roomRestarts[roomId];
            } else {
                if (room.host === socket.id) {
                    room.host = room.players[0].id; // Reassign host
                    io.to(room.host).emit('host_migrated');
                }
                socket.to(roomId).emit('opponent_disconnected', { id: socket.id });
                
                if (roomRestarts[roomId]) {
                    roomRestarts[roomId].delete(socket.id);
                    if (roomRestarts[roomId].size === 0) delete roomRestarts[roomId];
                }
            }
        }
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
