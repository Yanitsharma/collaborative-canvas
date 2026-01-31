const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let drawingHistory = []; 
let redoStack = []; 
let users = {}; 

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // 1. Assign User Data
    users[socket.id] = {
        id: socket.id,
        name: `User ${socket.id.substr(0, 4)}`,
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    };

    // 2. Send Initial State
    socket.emit('initial-history', drawingHistory);
    io.emit('update-users', Object.values(users));

    // 3. Handle Drawing Broadcast
    socket.on('draw-line', (data) => {
        const lineData = { ...data, id: socket.id };
        drawingHistory.push(lineData);
        redoStack = []; 
        // BROADCAST: Send to everyone ELSE
        socket.broadcast.emit('draw-line', lineData);
    });

    socket.on('undo', () => {
        let indexToRemove = -1;
        for (let i = drawingHistory.length - 1; i >= 0; i--) {
            if (drawingHistory[i].id === socket.id) {
                indexToRemove = i;
                break;
            }
        }
        if (indexToRemove !== -1) {
            const removed = drawingHistory.splice(indexToRemove, 1)[0];
            redoStack.push(removed);
            io.emit('clear-canvas');
            io.emit('initial-history', drawingHistory);
        }
    });

    socket.on('redo', () => {
        let indexToRestore = -1;
        for (let i = redoStack.length - 1; i >= 0; i--) {
            if (redoStack[i].id === socket.id) {
                indexToRestore = i;
                break;
            }
        }
        if (indexToRestore !== -1) {
            const restored = redoStack.splice(indexToRestore, 1)[0];
            drawingHistory.push(restored);
            io.emit('draw-line', restored);
        }
    });

    socket.on('cursor-move', (data) => {
        socket.broadcast.emit('cursor-update', { 
            ...data, 
            id: socket.id,
            name: users[socket.id]?.name,
            color: users[socket.id]?.color 
        });
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('update-users', Object.values(users));
        io.emit('user-disconnected', socket.id);
    });
});

server.listen(3001, () => {
    console.log('✅ Server running on port 3001');
});