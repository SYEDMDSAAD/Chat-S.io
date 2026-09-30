import { useChatStore } from "../store/useChatStore";
import { Fragment, useEffect, useRef } from "react";
import { Check, CheckCheck } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatDateSeparator, formatMessageTime, isDifferentDay } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    setSelectedUser,
    updateMessageSeenStatus,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  useEffect(() => {
    lastMessageIdRef.current = null; // jump (not animate) to the bottom when a chat opens
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  // Escape closes the open chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedUser]);

  // Scroll to the bottom only when a newer message arrives, not when older ones are prepended
  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?._id;
    if (messageEndRef.current && lastMessageId !== lastMessageIdRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: lastMessageIdRef.current ? "smooth" : "auto" });
    }
    lastMessageIdRef.current = lastMessageId;
  }, [messages, isMessagesLoading]);

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
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        {hasMoreMessages && (
          <div className="text-center mb-4">
            <button className="btn btn-xs btn-ghost" onClick={loadOlderMessages} disabled={isLoadingOlderMessages}>
              {isLoadingOlderMessages ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-base-content/60">
            <img
              src={selectedUser.profilePic || "/avatar.webp"}
              alt={selectedUser.fullName}
              className="size-16 rounded-full object-cover"
            />
            <p>
              No messages yet. Say hi to <span className="font-medium text-base-content">{selectedUser.fullName}</span> 👋
            </p>
          </div>
        )}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const isOwn = message.senderId === authUser._id;
          const startsNewDay = isDifferentDay(message.createdAt, previous?.createdAt);
          // Group consecutive messages from the same sender on the same day
          const startsGroup = startsNewDay || previous.senderId !== message.senderId;
          const isSeen = message.seenBy.includes(selectedUser._id);

          return (
            <Fragment key={message._id}>
              {startsNewDay && (
                <div className="flex justify-center my-4">
                  <span className="text-xs px-3 py-1 rounded-full bg-base-200 text-base-content/70">
                    {formatDateSeparator(message.createdAt)}
                  </span>
                </div>
              )}

              <div className={`chat ${isOwn ? "chat-end" : "chat-start"} py-0 ${startsGroup ? "mt-3" : "mt-0.5"}`}>
                <div
                  className={`chat-bubble min-h-0 max-w-[85%] sm:max-w-[70%] px-3 py-2 ${
                    isOwn ? "chat-bubble-primary" : "bg-base-300 text-base-content"
                  } ${startsGroup ? "" : "before:hidden"}`}
                >
                  {message.image && (
                    <a href={message.image} target="_blank" rel="noreferrer">
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="max-w-full sm:max-w-[240px] max-h-72 object-cover rounded-lg mb-1"
                      />
                    </a>
                  )}
                  {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}

                  <div className={`flex items-center justify-end gap-1 text-[10px] leading-none mt-1 ${isOwn ? "opacity-80" : "opacity-60"}`}>
                    <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                    {isOwn &&
                      (isSeen ? (
                        <CheckCheck className="size-3.5" aria-label="Seen" />
                      ) : (
                        <Check className="size-3.5" aria-label="Delivered" />
                      ))}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
