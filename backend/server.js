const conversationRoutes = require("./routes/conversationRoutes");
const roomRoutes = require("./routes/roomRoutes");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const Room = require("./models/Room");
const Message = require("./models/message");
const Conversation = require("./models/conversation");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const preferenceRoutes = require("./routes/preferenceRoutes");

const onlineUsers = new Map();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5174",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", preferenceRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/conversations", conversationRoutes);

// Health Check API
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Real-Time Chat API is running!",
    timestamp: new Date(),
  });
});

// Socket.IO Authentication
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    socket.userId = String(decoded.id);
    next();

  } catch (error) {
    next(new Error("Authentication error: Invalid or expired token"));
  }
});

// Socket.IO Connection
io.on("connection", (socket) => {
  const userId = String(socket.userId);

  console.log("Authenticated user connected:", userId);

  // Track multiple tabs/devices for the same user.
  const wasOffline = !onlineUsers.has(userId);

  if (wasOffline) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId).add(socket.id);

  // Send current online users to newly connected client.
  socket.emit(
    "onlineUsersSnapshot",
    Array.from(onlineUsers.keys())
  );

  // Notify others when user comes online.
  if (wasOffline) {
    socket.broadcast.emit("userOnline", { userId });
  }

  // JOIN ROOM
  socket.on("joinRoom", async (roomId) => {
    try {
      if (!roomId) {
        return socket.emit("roomError", {
          message: "Room ID is required",
        });
      }

      const room = await Room.findOne({
        _id: roomId,
        members: socket.userId,
      });

      if (!room) {
        return socket.emit("roomError", {
          message: "Room not found or you are not a member",
        });
      }

      // Leave previous chat rooms before joining another.
      for (const joinedRoomId of socket.rooms) {
        if (joinedRoomId !== socket.id) {
          await socket.leave(joinedRoomId);
        }
      }

      const normalizedRoomId = String(room._id);

      await socket.join(normalizedRoomId);

      socket.emit("roomJoined", {
        roomId: normalizedRoomId,
        message: "Successfully joined room",
      });

      console.log(`${userId} joined room: ${normalizedRoomId}`);

    } catch (error) {
      console.error("Join room error:", error.message);

      socket.emit("roomError", {
        message: "Unable to join room",
      });
    }
  });

  // LEAVE ROOM
  socket.on("leaveRoom", async (roomId) => {
    try {
      if (!roomId) return;

      await socket.leave(String(roomId));

      socket.emit("roomLeft", {
        roomId: String(roomId),
      });

    } catch (error) {
      console.error("Leave room error:", error.message);
    }
  });

  // SEND MESSAGE
  socket.on("sendMessage", async (payload = {}) => {
    try {
      const { roomId, text } = payload;

      const messageText =
        typeof text === "string" ? text.trim() : "";

      if (!roomId || !messageText) {
        return socket.emit("messageError", {
          message: "Room ID and message text are required",
        });
      }

      if (!socket.rooms.has(String(roomId))) {
        return socket.emit("messageError", {
          message: "Join the room before sending a message",
        });
      }

      const room = await Room.findOne({
        _id: roomId,
        members: socket.userId,
      });

      if (!room) {
        return socket.emit("messageError", {
          message: "You are not a member of this room",
        });
      }

      const newMessage = await Message.create({
        room: roomId,
        sender: socket.userId,
        text: messageText,
      });

      const populatedMessage = await Message.findById(
        newMessage._id
      ).populate("sender", "name");

      console.log("Broadcasting message to room:", String(roomId));

      console.log(
        "Connected sockets in room:",
        io.sockets.adapter.rooms.get(String(roomId))?.size || 0
      );

      io.to(String(roomId)).emit(
        "newMessage",
        populatedMessage
      );

      console.log("Message sent in room:", String(roomId));

    } catch (error) {
      console.error("Message error:", error.message);

      socket.emit("messageError", {
        message: "Failed to send message",
      });
    }
  });

  // GET MESSAGE HISTORY
  socket.on("getMessageHistory", async (roomId) => {
    try {
      if (!roomId || !socket.rooms.has(String(roomId))) {
        return socket.emit("messageError", {
          message: "Join the room before loading message history",
        });
      }

      const room = await Room.findOne({
        _id: roomId,
        members: socket.userId,
      });

      if (!room) {
        return socket.emit("messageError", {
          message: "You are not a member of this room",
        });
      }

      const latestMessages = await Message.find({
        room: roomId,
      })
        .populate("sender", "name")
        .sort({ createdAt: -1 })
        .limit(100);

      socket.emit("messageHistory", {
        roomId: String(roomId),
        messages: latestMessages.reverse(),
      });

    } catch (error) {
      console.error("Message history error:", error.message);

      socket.emit("messageError", {
        message: "Failed to load message history",
      });
    }
  });


  // JOIN PRIVATE CONVERSATION
  socket.on("joinPrivateConversation", async (conversationId) => {
    try {
      if (!conversationId) {
        return socket.emit("privateMessageError", {
          message: "Conversation ID is required",
        });
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId,
      });

      if (!conversation) {
        return socket.emit("privateMessageError", {
          message: "Conversation not found or access denied",
        });
      }

      // Leave previous chat rooms before joining private chat.
      for (const joinedRoomId of socket.rooms) {
        if (joinedRoomId !== socket.id) {
          await socket.leave(joinedRoomId);
        }
      }

      const privateRoomId = `private:${conversation._id}`;

      await socket.join(privateRoomId);

      socket.emit("privateConversationJoined", {
        conversationId: String(conversation._id),
        message: "Successfully joined private conversation",
      });

      console.log(`${socket.userId} joined private conversation: ${conversationId}`);

    } catch (error) {
      console.error("Private conversation join error:", error.message);

      socket.emit("privateMessageError", {
        message: "Unable to join private conversation",
      });
    }
  });


  // SEND PRIVATE MESSAGE
  socket.on("sendPrivateMessage", async (payload = {}) => {
    try {
      const { conversationId, text } = payload;

      const messageText =
        typeof text === "string" ? text.trim() : "";

      if (!conversationId || !messageText || messageText.length > 2000) {
        return socket.emit("privateMessageError", {
          message: "Valid conversation ID and message text are required (maximum 2000 characters)",
        });
      }

      const privateRoomId = `private:${conversationId}`;

      if (!socket.rooms.has(privateRoomId)) {
        return socket.emit("privateMessageError", {
          message: "Join the private conversation before sending a message",
        });
      }

      // Verify that sender is a participant.
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId,
      });

      if (!conversation) {
        return socket.emit("privateMessageError", {
          message: "You are not a participant in this conversation",
        });
      }

      const newMessage = await Message.create({
        conversation: conversation._id,
        sender: socket.userId,
        text: messageText,
      });

      const populatedMessage = await Message.findById(
        newMessage._id
      ).populate("sender", "name");

      // Send only to the two participants' private conversation room.
      io.to(privateRoomId).emit(
        "newPrivateMessage",
        populatedMessage
      );

      console.log("Private message sent:", String(conversation._id));

    } catch (error) {
      console.error("Private message error:", error.message);

      socket.emit("privateMessageError", {
        message: "Failed to send private message",
      });
    }
  });


  // GET PRIVATE MESSAGE HISTORY
  socket.on("getPrivateMessageHistory", async (conversationId) => {
    try {
      if (!conversationId) {
        return socket.emit("privateMessageError", {
          message: "Conversation ID is required",
        });
      }

      const privateRoomId = `private:${conversationId}`;

      if (!socket.rooms.has(privateRoomId)) {
        return socket.emit("privateMessageError", {
          message: "Join the private conversation before loading history",
        });
      }

      // Verify participant authorization.
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId,
      });

      if (!conversation) {
        return socket.emit("privateMessageError", {
          message: "You are not authorized to access this conversation",
        });
      }

      const latestMessages = await Message.find({
        conversation: conversation._id,
      })
        .populate("sender", "name")
        .sort({ createdAt: -1 })
        .limit(100);

      socket.emit("privateMessageHistory", {
        conversationId: String(conversation._id),
        messages: latestMessages.reverse(),
      });

    } catch (error) {
      console.error("Private message history error:", error.message);

      socket.emit("privateMessageError", {
        message: "Failed to load private message history",
      });
    }
  });


    // TYPING INDICATOR
  socket.on("typing", async (roomId) => {
    try {
      if (!roomId || !socket.rooms.has(String(roomId))) return;

      const room = await Room.findOne({
        _id: roomId,
        members: socket.userId,
      });

      if (!room) return;

      socket.to(String(roomId)).emit("userTyping", {
        userId,
      });

    } catch (error) {
      console.error("Typing error:", error.message);
    }
  });

  // STOP TYPING INDICATOR
  socket.on("stopTyping", async (roomId) => {
    try {
      if (!roomId || !socket.rooms.has(String(roomId))) return;

      const room = await Room.findOne({
        _id: roomId,
        members: socket.userId,
      });

      if (!room) return;

      socket.to(String(roomId)).emit("userStoppedTyping", {
        userId,
      });

    } catch (error) {
      console.error("Stop typing error:", error.message);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const socketsForUser = onlineUsers.get(userId);

    if (socketsForUser) {
      socketsForUser.delete(socket.id);

      // User goes offline only when their last connection closes.
      if (socketsForUser.size === 0) {
        onlineUsers.delete(userId);

        console.log("User went offline:", userId);

        io.emit("userOffline", {
          userId,
        });
      }
    }

    console.log("User disconnected:", userId);
  });
});

// START SERVER
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