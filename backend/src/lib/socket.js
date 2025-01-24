import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

// Store online users: { userId: socketId }
const userSocketMap = {};

// Get the socket ID for a specific user
export function getReceiverSocketId(userId) {
  return userSocketMap[userId] || null; // Return null if user is not online
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
   // Validate and store the user's socket ID
   if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} is online with socket ID ${socket.id}`);

    // Notify all clients of the updated online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  } else {
    console.warn("Connection attempt without userId");
  }

  // Handle "messageSeen" event
  socket.on("messageSeen", async ({ messageId, userId }) => {
    if (!messageId || !userId) {
      console.warn("Invalid data for messageSeen event");
      return;
    }

    try {
      // Mark the message as seen in the database
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { seenBy: userId } }, // Add userId to 'seenBy', ensuring no duplicates
        { new: true } // Return the updated document
      );

      if (!updatedMessage) {
        console.warn(`Message with ID ${messageId} not found`);
        return;
      }

      // Notify the sender in real-time about the seen event
      const senderId = updatedMessage.senderId.toString();
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("seenNotification", {
          messageId,
          seenBy: userId,
        });
        console.log(`Seen notification sent to user ${senderId}`);
      }
    } catch (error) {
      console.error("Error handling messageSeen event:", error);
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);

    // Remove the disconnected user from the userSocketMap
    const disconnectedUserId = Object.keys(userSocketMap).find(
      (key) => userSocketMap[key] === socket.id
    );
    if (disconnectedUserId) {
      delete userSocketMap[disconnectedUserId];
      console.log(`User ${disconnectedUserId} went offline`);
    }

    // Notify all clients of the updated online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
