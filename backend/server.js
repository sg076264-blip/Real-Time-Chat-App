const roomRoutes = require("./routes/roomRoutes");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const Room = require("./models/Room");
const Message = require("./models/message");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");
const onlineUsers = new Map();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5174",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", preferenceRoutes);
app.use("/api/rooms", roomRoutes);

// Health Check API
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Real-Time Chat API is running!",
    timestamp: new Date()
  });
});

// Socket.IO Authentication
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Authentication error: Token missing"));
        }

        const jwt = require("jsonwebtoken");

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.userId = decoded.id;

        next();

    } catch (error) {
        next(new Error("Authentication error: Invalid or expired token"));
    }
});

// Socket.IO Connection
io.on("connection", (socket) => {
    console.log("Authenticated user connected:", socket.userId);
    // Track online user
const userId = socket.userId.toString();

if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
}

onlineUsers.get(userId).add(socket.id);

// Notify everyone that user is online
io.emit("userOnline", {
    userId
});
    socket.on("joinRoom", async (roomId) => {
    try {
        const room = await Room.findOne({
            _id: roomId,
            members: socket.userId
        });

        if (!room) {
            socket.emit("roomError", {
                message: "Room not found or you are not a member"
            });
            return;
        }

        socket.join(roomId);

        socket.emit("roomJoined", {
            roomId,
            message: "Successfully joined room"
        });

        console.log(`${socket.userId} joined room: ${roomId}`);

    } catch (error) {
        socket.emit("roomError", {
            message: "Unable to join room"
        });
    }
});
    socket.on("sendMessage", async ({ roomId, text }) => {
    try {
        if (!roomId || !text || !text.trim()) {
            return socket.emit("messageError", {
                message: "Room ID and message text are required"
            });
        }

        const room = await Room.findOne({
            _id: roomId,
            members: socket.userId
        });

        if (!room) {
            return socket.emit("messageError", {
                message: "You are not a member of this room"
            });
        }

        const newMessage = await Message.create({
            room: roomId,
            sender: socket.userId,
            text: text.trim()
        });

        const populatedMessage = await Message.findById(newMessage._id)
            .populate("sender", "name");
        console.log("Broadcasting message to room:", roomId);
console.log("Connected sockets in room:", io.sockets.adapter.rooms.get(roomId)?.size);
        io.to(roomId).emit("newMessage", populatedMessage);

        console.log("Message sent in room:", roomId);

    } catch (error) {
        console.error("Message error:", error.message);

        socket.emit("messageError", {
            message: "Failed to send message"
        });
    }
});
    socket.on("getMessageHistory", async (roomId) => {
    try {
        const room = await Room.findOne({
            _id: roomId,
            members: socket.userId
        });

        if (!room) {
            return socket.emit("messageError", {
                message: "You are not a member of this room"
            });
        }

        const messages = await Message.find({
            room: roomId
        })
            .populate("sender", "name")
            .sort({ createdAt: 1 })
            .limit(100);

        socket.emit("messageHistory", messages);

    } catch (error) {
        console.error("Message history error:", error.message);

        socket.emit("messageError", {
            message: "Failed to load message history"
        });
    }
});
    // Typing Indicator
socket.on("typing", async (roomId) => {
    try {
        const room = await Room.findOne({
            _id: roomId,
            members: socket.userId
        });

        if (!room || !socket.rooms.has(roomId)) return;

        socket.to(roomId).emit("userTyping", {
            userId: socket.userId
        });

    } catch (error) {
        console.error("Typing error:", error.message);
    }
});

// Stop Typing Indicator
socket.on("stopTyping", async (roomId) => {
    try {
        const room = await Room.findOne({
            _id: roomId,
            members: socket.userId
        });

        if (!room || !socket.rooms.has(roomId)) return;

        socket.to(roomId).emit("userStoppedTyping", {
            userId: socket.userId
        });

    } catch (error) {
        console.error("Stop typing error:", error.message);
    }
});
    socket.on("disconnect", () => {
    const userId = socket.userId.toString();

    if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);

        // Mark offline only if no other connections exist
        if (onlineUsers.get(userId).size === 0) {
            onlineUsers.delete(userId);
            console.log("User went offline:", userId);;

            io.emit("userOffline", {
                userId
            });
        }
    }

    console.log("User disconnected:", userId);
});
});
// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();