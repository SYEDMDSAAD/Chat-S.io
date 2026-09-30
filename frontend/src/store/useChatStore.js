import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { getErrorMessage } from "../lib/utils";
import { useAuthStore } from "./useAuthStore";

const MESSAGES_PAGE_SIZE = 50;

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  unreadCounts: {}, // { userId: number of unseen messages from that user }
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  hasMoreMessages: false,
  isLoadingOlderMessages: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getUnreadCounts: async () => {
    try {
      const res = await axiosInstance.get("/messages/unread");
      const { selectedUser } = get();
      // The open chat marks its messages as seen, so it has no unread count
      if (selectedUser) delete res.data[selectedUser._id];
      set({ unreadCounts: res.data });
    } catch (error) {
      console.error("Failed to load unread counts:", error);
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`, { params: { limit: MESSAGES_PAGE_SIZE } });
      set({ messages: res.data, hasMoreMessages: res.data.length === MESSAGES_PAGE_SIZE });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  loadOlderMessages: async () => {
    const { selectedUser, messages, isLoadingOlderMessages } = get();
    if (!selectedUser || isLoadingOlderMessages || messages.length === 0) return;

    set({ isLoadingOlderMessages: true });
    try {
      const res = await axiosInstance.get(`/messages/${selectedUser._id}`, {
        params: { limit: MESSAGES_PAGE_SIZE, before: messages[0].createdAt },
      });
      set({
        messages: [...res.data, ...get().messages],
        hasMoreMessages: res.data.length === MESSAGES_PAGE_SIZE,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      set({ isLoadingOlderMessages: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
      get().updateLastMessage(selectedUser._id, res.data);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  },

  // Subscribe to real-time socket events
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Ensure no duplicate listeners are attached
    socket.off("newMessage");
    socket.off("seenNotification");

    // Handle new messages
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      get().updateLastMessage(newMessage.senderId, newMessage);

      if (newMessage.senderId === selectedUser?._id) {
        set({ messages: [...get().messages, newMessage] });
        return;
      }

      // Message from a chat that isn't open: count it as unread
      const { unreadCounts } = get();
      set({
        unreadCounts: {
          ...unreadCounts,
          [newMessage.senderId]: (unreadCounts[newMessage.senderId] || 0) + 1,
        },
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
    if (!socket) return;
    socket.off("newMessage");
    socket.off("seenNotification");
  },

  // Show a message as the contact's latest and move that conversation to the top of the list
  updateLastMessage: (contactId, message) => {
    const { users } = get();
    const contact = users.find((user) => user._id === contactId);
    if (!contact) return;

    const { text, image, senderId, createdAt } = message;
    set({
      users: [
        { ...contact, lastMessage: { text, image, senderId, createdAt } },
        ...users.filter((user) => user._id !== contactId),
      ],
    });
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

  // Clear everything from the previous session (called on logout)
  reset: () => set({ messages: [], users: [], unreadCounts: {}, selectedUser: null, hasMoreMessages: false }),

  setSelectedUser: (selectedUser) => {
    if (!selectedUser) return set({ selectedUser });

    // Opening a chat marks its messages as seen, so clear its unread count
    const unreadCounts = { ...get().unreadCounts };
    delete unreadCounts[selectedUser._id];
    set({ selectedUser, unreadCounts });
  },
}));
