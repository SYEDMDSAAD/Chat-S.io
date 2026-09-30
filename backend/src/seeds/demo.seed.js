// Creates two demo accounts with a conversation between them, for showing the app.
// Safe to re-run: it resets the demo conversation and refreshes its timestamps
// (so it always reads as "Yesterday" / "Today"). Other users and chats are untouched.
//
// Usage: set DEMO_PASSWORD in .env, then run `npm run seed:demo`
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../lib/db.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

config();

const DEMO_USERS = {
  aisha: {
    email: "aisha.demo@chatty.app",
    fullName: "Aisha Khan",
    profilePic: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  rohan: {
    email: "rohan.demo@chatty.app",
    fullName: "Rohan Mehta",
    profilePic: "https://randomuser.me/api/portraits/men/32.jpg",
  },
};

// [sender, text, image?] — marker objects start a new block: yesterday evening, then
// "recent" (ending a few minutes before the script runs, so it's never in the future)
const CONVERSATION = [
  { day: -1, at: "18:40" },
  ["rohan", "Hey Aisha! Did you get a chance to look at the new chat app?"],
  ["aisha", "Yes! Just signed up. The real-time updates are really smooth 🔥"],
  ["rohan", "Right? Messages show up instantly, no refresh needed"],
  ["aisha", "And I can see when you're online — the green dot next to your name"],
  ["rohan", "Try sending a photo too, it uploads straight to the cloud"],
  ["aisha", "", "https://picsum.photos/id/1015/800/533"],
  ["aisha", "From my trip last month 🏔️"],
  ["rohan", "Wow, that view is unreal! Where was this?"],
  ["aisha", "Norway! I'll tell you all about it tomorrow"],
  { at: "recent" },
  ["rohan", "Hey! Are we still on for lunch tomorrow? 🍜"],
  ["aisha", "Yes! 1pm at the usual place?"],
  ["rohan", "Perfect. Also notice the ✓✓ ticks — that's how I know you read my messages 😄"],
  ["aisha", "Haha, no more pretending I didn't see them"],
  ["rohan", "See you at 1! Bring the Norway photos 📸"],
];

const seedDemo = async () => {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 6) {
    throw new Error("Set DEMO_PASSWORD (at least 6 characters) in .env before running this script");
  }

  await connectDB();

  // Create or update the two demo accounts
  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
  const users = {};
  for (const [key, data] of Object.entries(DEMO_USERS)) {
    users[key] = await User.findOneAndUpdate(
      { email: data.email },
      { ...data, password: hashedPassword },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Replace the conversation between them
  const ids = [users.aisha._id, users.rohan._id];
  await Message.deleteMany({ senderId: { $in: ids }, receiverId: { $in: ids } });

  const MINUTES_BETWEEN = 2;
  let time;
  const messages = [];
  CONVERSATION.forEach((entry, index) => {
    if (Array.isArray(entry)) return;

    if (entry.at === "recent") {
      const remaining = CONVERSATION.slice(index + 1).filter(Array.isArray).length;
      time = new Date(Date.now() - (remaining * MINUTES_BETWEEN + 5) * 60 * 1000);
    } else {
      const [hours, minutes] = entry.at.split(":").map(Number);
      time = new Date();
      time.setDate(time.getDate() + entry.day);
      time.setHours(hours, minutes, 0, 0);
    }
    entry.startsAt = time;
  });

  for (const entry of CONVERSATION) {
    if (!Array.isArray(entry)) {
      time = entry.startsAt;
      continue;
    }

    const [senderKey, text, image] = entry;
    const sender = users[senderKey];
    const receiver = senderKey === "aisha" ? users.rohan : users.aisha;
    time = new Date(time.getTime() + MINUTES_BETWEEN * 60 * 1000);
    messages.push({
      senderId: sender._id,
      receiverId: receiver._id,
      text: text || undefined,
      image,
      seenBy: [receiver._id],
      createdAt: time,
      updatedAt: time,
    });
  }

  // Leave Rohan's last message unread so Aisha sees an unread badge in the demo
  messages[messages.length - 1].seenBy = [];

  await Message.insertMany(messages, { timestamps: false });
  console.log(`Demo ready: ${DEMO_USERS.aisha.email} and ${DEMO_USERS.rohan.email} (${messages.length} messages)`);
};

seedDemo()
  .catch((error) => {
    console.error("Error seeding demo:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
