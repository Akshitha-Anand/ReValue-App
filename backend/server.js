require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const feedRoutes = require("./routes/feedRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiRoutes = require("./routes/aiRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const matchingRoutes = require("./routes/matchingRoutes");

const Chat = require("./models/Chat");
const User = require("./models/User");
const { initSocket, onlineUsers } = require("./utils/socketManager");

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/matching", matchingRoutes);

// Global error handling middleware (handles JSON parse errors, unhandled exceptions)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: "Malformed JSON payload" });
    }
    console.error("Server error handler caught:", err.message || err);
    res.status(err.status || 500).json({
        error: err.message || "Internal server error"
    });
});

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/revalueDB")
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("MongoDB connection error:", err));

const server = http.createServer(app);

const io = require("socket.io")(server, {
    cors: {
        origin: "*"
    }
});

// Initialize socket manager with shared io instance
initSocket(io);

// Keep existing chat message listener
io.on("connection", socket => {
    socket.on("sendMessage", async data => {
        try {
            const { senderId, receiverId, message } = data;

            const sender = await User.findById(senderId);
            const receiver = await User.findById(receiverId);

            if (!sender || !receiver) return;

            // role restriction
            if (sender.role === "individual" && receiver.role !== "collector") return;
            if (sender.role === "industry" && receiver.role !== "collector") return;

            const chat = new Chat({
                sender: senderId,
                receiver: receiverId,
                message
            });

            await chat.save();

            const receiverSocket = onlineUsers[receiverId];
            if (receiverSocket) {
                io.to(receiverSocket).emit("receiveMessage", chat);
            }
        } catch (err) {
            console.error("Socket chat error:", err);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
