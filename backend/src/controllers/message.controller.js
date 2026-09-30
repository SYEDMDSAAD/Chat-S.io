import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { isImageDataUrl } from "../lib/utils.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("fullName profilePic");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Count unseen messages sent to the logged-in user, grouped by sender
export const getUnreadCounts = async (req, res) => {
  try {
    const myId = req.user._id;

    const counts = await Message.aggregate([
      { $match: { receiverId: myId, seenBy: { $ne: myId } } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const unreadCounts = Object.fromEntries(counts.map(({ _id, count }) => [_id.toString(), count]));

    res.status(200).json(unreadCounts);
  } catch (error) {
    console.error("Error in getUnreadCounts: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    if (!mongoose.isValidObjectId(userToChatId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const filter = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };
    if (before && !isNaN(before)) filter.createdAt = { $lt: before };

    // Fetch the newest page, then return it oldest-first for display
    const messages = (await Message.find(filter).sort({ createdAt: -1 }).limit(limit)).reverse();

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { image } = req.body;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ message: "Message must contain text or an image" });
    }

    if (image && !isImageDataUrl(image)) {
      return res.status(400).json({ message: "Attachment must be an image" });
    }

    if (!mongoose.isValidObjectId(receiverId) || !(await User.exists({ _id: receiverId }))) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark a specific message as seen by the recipient
export const markMessageAsSeen = async (req, res) => {
  const { id: messageId } = req.params; // Message ID to mark as seen
  const userId = req.user._id; // ID of the user viewing the message

  try {
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    // Update the 'seenBy' field of the message to include the current user
    // Only the receiver of the message may mark it as seen
    const updatedMessage = await Message.findOneAndUpdate(
      { _id: messageId, receiverId: userId },
      { $addToSet: { seenBy: userId } }, // Add userId to 'seenBy' without duplicates
      { new: true } // Return the updated document
    );

    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found." });
    }

    res.status(200).json({ message: "Message marked as seen." });

    // Notify the sender in real-time about the seen update
    const senderSocketId = getReceiverSocketId(updatedMessage.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("seenNotification", {
        messageId,
        seenBy: userId.toString(),
      });
    }
  } catch (error) {
    console.error("Error in markMessageAsSeen: ", error.message);
    res.status(500).json({ message: "Error marking message as seen." });
  }
};