import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUnreadCounts, getUsersForSidebar, sendMessage, markMessageAsSeen } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/unread", protectRoute, getUnreadCounts);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.patch("/:id/messages/seen", protectRoute, markMessageAsSeen);

export default router;
