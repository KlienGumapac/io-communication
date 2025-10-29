const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // Serve uploaded files

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB');
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Store all connected players
const players = new Map(); // socket.id -> player data

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Player joins the game
    socket.on('joinGame', (playerData) => {
        // Store player data
        players.set(socket.id, {
            id: socket.id,
            userId: playerData.id,
            username: playerData.username,
            x: playerData.x || 0,
            y: playerData.y || 0,
            color: playerData.color || '#6366f1',
            avatar: playerData.avatar || null,
            radius: playerData.radius || 30
        });
        
        // Send all current players to the newly joined player
        socket.emit('playersUpdate', Array.from(players.values()));
        
        // Notify other players about the new player
        socket.broadcast.emit('playerUpdate', players.get(socket.id));
        
        console.log(`Player ${playerData.username} joined (${socket.id}). Total players: ${players.size}`);
    });
    
    // Player movement update
    socket.on('playerMove', (moveData) => {
        const player = players.get(socket.id);
        if (player) {
            // Update player position
            player.x = moveData.x;
            player.y = moveData.y;
            
            // Broadcast updated position to all other players (including timestamp)
            const updateData = {
                ...player,
                timestamp: Date.now()
            };
            socket.broadcast.emit('playerUpdate', updateData);
        }
    });
    
    // Handle chat messages
    socket.on('chatMessage', (data) => {
        const player = players.get(socket.id);
        if (player && data.message && data.message.trim()) {
            const chatData = {
                playerId: socket.id,
                username: player.username,
                message: data.message.trim(),
                x: player.x,
                y: player.y,
                timestamp: Date.now()
            };
            
            // Broadcast to all players (global chat)
            io.emit('chatMessage', chatData);
            
            console.log(`Chat [${player.username}]: ${data.message}`);
        }
    });
    
    // Player disconnect
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        if (player) {
            console.log(`Player ${player.username} disconnected (${socket.id})`);
        }
        
        players.delete(socket.id);
        
        // Notify all clients about player disconnect
        io.emit('playerDisconnect', socket.id);
        
        console.log(`Total players: ${players.size}`);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = { app, io };

