import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  // Subscribe to real-time socket events
  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!selectedUser) return;

    // Ensure no duplicate listeners are attached
    socket.off("newMessage");
    socket.off("seenNotification");

    // Handle new messages
    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    // Handle seen notifications
    socket.on("seenNotification", ({ messageId, seenBy }) => {
      set({
        messages: get().messages.map((message) =>
          message._id === messageId
            ? { ...message, seenBy: [...new Set([...message.seenBy, seenBy])] }
            : message
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("seenNotification");
  },

  // Update local message seen status
  updateMessageSeenStatus: (messageId, userId) => {
    set({
      messages: get().messages.map((message) =>
        message._id === messageId
          ? { ...message, seenBy: [...new Set([...message.seenBy, userId])] }
          : message
      ),
    });
  },

  getUnreadMessagesCount: (userId) => {
      const { messages } = get();
      return messages.filter((message) => message.senderId === userId && !message.seenBy.includes(userId)).length;
    },
  
  

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
