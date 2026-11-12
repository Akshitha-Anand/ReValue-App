/**
 * Socket Manager Utility
 * Holds references to Socket.io and active connected users for cross-controller notification delivery.
 */

let ioInstance = null;
const onlineUsers = {};

function initSocket(io) {
    ioInstance = io;

    io.on("connection", (socket) => {
        console.log("[Socket] User connected:", socket.id);

        socket.on("registerUser", (userId) => {
            if (userId) {
                onlineUsers[userId] = socket.id;
                console.log(`[Socket] Registered user ${userId} -> ${socket.id}`);
            }
        });

        socket.on("disconnect", () => {
            for (const userId in onlineUsers) {
                if (onlineUsers[userId] === socket.id) {
                    delete onlineUsers[userId];
                    console.log(`[Socket] Disconnected user ${userId}`);
                    break;
                }
            }
        });
    });

    return io;
}

function getIO() {
    return ioInstance;
}

function sendNotificationToUser(userId, event, payload) {
    if (!ioInstance) return false;
    const socketId = onlineUsers[userId?.toString()];
    if (socketId) {
        ioInstance.to(socketId).emit(event, payload);
        return true; // Successfully delivered via real-time WebSocket
    }
    return false; // User not currently online in websocket
}

module.exports = {
    initSocket,
    getIO,
    onlineUsers,
    sendNotificationToUser
};
