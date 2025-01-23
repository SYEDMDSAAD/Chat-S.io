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

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle "messageSeen" event
  socket.on("messageSeen", async ({ messageId, userId }) => {
    try {
      // Update the message's seenBy field
      await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { seenBy: userId } } // Ensure no duplicates
      );

      // Fetch the message and notify the sender
      const message = await Message.findById(messageId).populate("senderId");
      if (message) {
        const senderSocketId = userSocketMap[message.senderId._id.toString()];
        if (senderSocketId) {
          io.to(senderSocketId).emit("seenNotification", {
            messageId,
            seenBy: userId,
          });
        }
      }
    } catch (error) {
      console.error("Error handling messageSeen event:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
