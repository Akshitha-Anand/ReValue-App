const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { sendNotificationToUser } = require("../utils/socketManager");

// 1. Send Message via REST API (guarantees DB persistence + real-time socket alert)
router.post("/send", authMiddleware, async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId, message } = req.body;

        if (!receiverId || !message || !message.trim()) {
            return res.status(400).json({ message: "receiverId and message are required." });
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver ID format." });
        }

        const sender = await User.findById(senderId).select("name role email");
        const receiver = await User.findById(receiverId).select("name role email");

        if (!sender || !receiver) {
            return res.status(404).json({ message: "User not found." });
        }

        const chat = new Chat({
            sender: senderId,
            receiver: receiverId,
            message: message.trim()
        });

        await chat.save();

        // Real-time dispatch via Socket.io
        sendNotificationToUser(receiverId, "receiveMessage", chat);
        sendNotificationToUser(senderId, "messageSent", chat);

        res.status(201).json({
            success: true,
            chat
        });
    } catch (err) {
        console.error("Error in POST /api/chat/send:", err);
        res.status(500).json({ message: "Error sending message", error: err.message });
    }
});

// 2. Get All Conversations for a User (with automatic role-based contact discovery)
router.get("/conversations/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const currentUser = await User.findById(userId).select("role name");

        // Find all unique senders/receivers this user has exchanged messages with
        const messages = await Chat.find({
            $or: [{ sender: userId }, { receiver: userId }]
        }).sort({ createdAt: -1 });

        const contactsMap = {};

        for (const msg of messages) {
            const otherId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
            if (!contactsMap[otherId] && mongoose.Types.ObjectId.isValid(otherId)) {
                const otherUser = await User.findById(otherId).select("name role");
                if (otherUser) {
                    contactsMap[otherId] = {
                        id: otherId,
                        name: otherUser.name,
                        role: otherUser.role,
                        lastMsg: msg.message,
                        time: msg.createdAt,
                        avatar: otherUser.name.charAt(0).toUpperCase()
                    };
                }
            }
        }

        // If the user has few or no conversations yet, populate active contacts based on their role
        // Individual -> Connect with Collectors
        // Collector -> Connect with Individuals & Industries
        // Industry -> Connect with Collectors
        if (currentUser) {
            let roleFilter = {};
            if (currentUser.role === "individual") {
                roleFilter = { role: "collector" };
            } else if (currentUser.role === "industry") {
                roleFilter = { role: "collector" };
            } else if (currentUser.role === "collector") {
                roleFilter = { role: { $in: ["individual", "industry"] } };
            }

            const recommendedUsers = await User.find({
                _id: { $ne: userId, $nin: Object.keys(contactsMap) },
                ...roleFilter
            })
            .select("name role")
            .limit(10);

            for (const rec of recommendedUsers) {
                const recId = rec._id.toString();
                contactsMap[recId] = {
                    id: recId,
                    name: rec.name,
                    role: rec.role,
                    lastMsg: `Connect with ${rec.name} (${rec.role})`,
                    time: new Date().toISOString(),
                    avatar: rec.name.charAt(0).toUpperCase(),
                    isRecommended: true
                };
            }
        }

        res.json(Object.values(contactsMap));
    } catch (err) {
        console.error("Error in GET /api/chat/conversations:", err);
        res.status(500).json({ message: "Error fetching conversations", error: err.message });
    }
});

// 3. Get Available Directory Contacts for New Chat
router.get("/contacts/available", authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const currentUser = await User.findById(currentUserId).select("role");

        let query = { _id: { $ne: currentUserId } };
        const requestedRole = req.query.role;

        if (requestedRole && ["individual", "collector", "industry"].includes(requestedRole.toLowerCase())) {
            query.role = requestedRole.toLowerCase();
        } else {
            const role = currentUser?.role?.toLowerCase();
            if (role === "individual") {
                query.role = { $in: ["collector", "industry"] };
            } else if (role === "industry") {
                query.role = { $in: ["collector", "individual"] };
            } else if (role === "collector") {
                query.role = { $in: ["individual", "industry"] };
            }
        }

        const contacts = await User.find(query)
            .select("name email role phone hubLocation materialsAccepted materialsRequired industryType rating")
            .limit(50);

        res.json(contacts);
    } catch (err) {
        res.status(500).json({ message: "Error fetching available contacts", error: err.message });
    }
});

// 4. Get Message History Between Two Users
router.get("/messages/:userId/:contactId", async (req, res) => {
    try {
        const { userId, contactId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(contactId)) {
            return res.json([]);
        }

        const messages = await Chat.find({
            $or: [
                { sender: userId, receiver: contactId },
                { sender: contactId, receiver: userId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        console.error("Error in GET /api/chat/messages:", err);
        res.status(500).json({ message: "Error fetching messages", error: err.message });
    }
});

module.exports = router;
