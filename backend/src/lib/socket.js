import { Server } from "socket.io";
import http from "http";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Parse cookies on the handshake request so the jwt cookie can be verified
io.engine.use(cookieParser());

// Authenticate every socket connection with the same jwt cookie used by the REST API
io.use((socket, next) => {
  try {
    const token = socket.request.cookies?.jwt;
    if (!token) return next(new Error("Unauthorized - No Token Provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId.toString();
    next();
  } catch (error) {
    next(new Error("Unauthorized - Invalid Token"));
  }
});

// Store online users: { userId: Set of socketIds } (a user can have several tabs open)
const userSocketMap = {};

// Get the socket IDs for a specific user
export function getReceiverSocketId(userId) {
  const socketIds = userSocketMap[userId];
  return socketIds ? [...socketIds] : null; // Return null if user is not online
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  // userId comes from the verified jwt, never from the client
  const userId = socket.userId;
  if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
  userSocketMap[userId].add(socket.id);
  console.log(`User ${userId} is online with socket ID ${socket.id}`);

  // Notify all clients of the updated online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle "messageSeen" event
  socket.on("messageSeen", async ({ messageId } = {}) => {
    if (!messageId) {
      console.warn("Invalid data for messageSeen event");
      return;
    }

    try {
      // Mark the message as seen in the database (only the receiver may do this)
      const updatedMessage = await Message.findOneAndUpdate(
        { _id: messageId, receiverId: userId },
        { $addToSet: { seenBy: userId } }, // Add userId to 'seenBy', ensuring no duplicates
        { new: true } // Return the updated document
      );

      if (!updatedMessage) {
        console.warn(`Message with ID ${messageId} not found`);
        return;
      }

      // Notify the sender in real-time about the seen event
      const senderId = updatedMessage.senderId.toString();
      const senderSocketIds = getReceiverSocketId(senderId);
      if (senderSocketIds) {
        io.to(senderSocketIds).emit("seenNotification", {
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

    // Remove this socket; the user is offline once their last socket disconnects
    const socketIds = userSocketMap[userId];
    if (socketIds) {
      socketIds.delete(socket.id);
      if (socketIds.size === 0) {
        delete userSocketMap[userId];
        console.log(`User ${userId} went offline`);
      }
    }

    // Notify all clients of the updated online users
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
