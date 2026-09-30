import { ArrowLeft, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="px-3 py-2.5 border-b border-base-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back to the contact list (small screens) */}
          <button
            className="btn btn-ghost btn-sm btn-circle md:hidden"
            onClick={() => setSelectedUser(null)}
            aria-label="Back to contacts"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={selectedUser.profilePic || "/avatar.webp"}
              alt={selectedUser.fullName}
              className="size-10 rounded-full object-cover"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 size-2.5 bg-success rounded-full ring-2 ring-base-100" />
            )}
          </div>

          {/* User info */}
          <div className="min-w-0">
            <h3 className="font-medium truncate">{selectedUser.fullName}</h3>
            <p className={`text-xs ${isOnline ? "text-success" : "text-base-content/60"}`}>
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Close button (larger screens) */}
        <button
          className="btn btn-ghost btn-sm btn-circle hidden md:inline-flex"
          onClick={() => setSelectedUser(null)}
          aria-label="Close chat"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
