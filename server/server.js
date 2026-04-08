const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// Body parser - 5mb limit for base64 avatar images
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Enable CORS
app.use(cors());

// Share io with routes
app.set('io', io);

// Socket Logic
io.on('connection', (socket) => {
    socket.on('join_group', (groupId) => {
        socket.join(groupId);
        console.log(`User joined group room: ${groupId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
