import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    updateMessageSeenStatus,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  // Scroll to the bottom only when a newer message arrives, not when older ones are prepended
  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?._id;
    if (messageEndRef.current && lastMessageId !== lastMessageIdRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    lastMessageIdRef.current = lastMessageId;
  }, [messages]);

  // Emit "messageSeen" event for unread messages
  useEffect(() => {
    if (socket && messages.length > 0) {
      messages.forEach((message) => {
        if (
          message.receiverId === authUser._id && // Check if the current user is the recipient
          !message.seenBy.includes(authUser._id) // Check if the message has not been marked as seen by the current user
        ) {
          socket.emit("messageSeen", { messageId: message._id });
          updateMessageSeenStatus(message._id, authUser._id); // Update local state
        }
      });
    }
  }, [messages, authUser._id, socket, updateMessageSeenStatus]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMoreMessages && (
          <div className="text-center">
            <button className="btn btn-xs btn-ghost" onClick={loadOlderMessages} disabled={isLoadingOlderMessages}>
              {isLoadingOlderMessages ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.webp"
                      : selectedUser.profilePic || "/avatar.webp"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
            {/* Seen indicator */}
            {message.senderId === authUser._id && (
              <span className="text-xs opacity-50 mt-1">
                {message.seenBy.length > 0 ? `Seen by ${message.seenBy.length}` : "Delivered"}
              </span>
            )}
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
