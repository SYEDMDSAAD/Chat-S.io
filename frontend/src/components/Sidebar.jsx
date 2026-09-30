import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Image, Search, Users } from "lucide-react";
import { formatSidebarTime } from "../lib/utils";

const Sidebar = () => {
  const { getUsers, getUnreadCounts, users, unreadCounts, selectedUser, setSelectedUser, isUsersLoading } =
    useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getUsers();
    getUnreadCounts();
  }, [getUsers, getUnreadCounts]);

  const query = search.trim().toLowerCase();
  const filteredUsers = users.filter(
    (user) =>
      (!showOnlineOnly || onlineUsers.includes(user._id)) &&
      (!query || user.fullName.toLowerCase().includes(query))
  );

  const onlineContactsCount = onlineUsers.filter((id) => id !== authUser._id).length;

  // On small screens the list takes the full width and is hidden while a chat is open
  const layoutClasses = `${selectedUser ? "hidden md:flex" : "flex"} w-full md:w-72 lg:w-80 shrink-0`;

  if (isUsersLoading) return <SidebarSkeleton className={layoutClasses} />;

  return (
    <aside className={`${layoutClasses} h-full border-r border-base-300 flex-col`}>
      <div className="border-b border-base-300 w-full p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5" />
            <span className="font-semibold">Contacts</span>
          </div>
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="toggle toggle-success toggle-xs"
            />
            <span className="text-xs text-base-content/70">Online only ({onlineContactsCount})</span>
          </label>
        </div>

        <label className="input input-bordered input-sm flex items-center gap-2">
          <Search className="size-4 text-base-content/50" />
          <input
            type="search"
            className="grow"
            placeholder="Search contacts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="overflow-y-auto w-full py-2 flex-1">
        {filteredUsers.map((user) => {
          const isOnline = onlineUsers.includes(user._id);
          const unread = unreadCounts[user._id] || 0;
          const { lastMessage } = user;
          const isOwnLastMessage = lastMessage?.senderId === authUser._id;

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full px-4 py-3 flex items-center gap-3 text-left
                hover:bg-base-200 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-200" : ""}
              `}
            >
              <div className="relative shrink-0">
                <img
                  src={user.profilePic || "/avatar.webp"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-base-100" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>{user.fullName}</span>
                  {lastMessage && (
                    <span className={`text-xs shrink-0 ${unread ? "text-primary font-medium" : "text-base-content/50"}`}>
                      {formatSidebarTime(lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${unread ? "text-base-content" : "text-base-content/60"}`}>
                    {lastMessage ? (
                      <>
                        {isOwnLastMessage && "You: "}
                        {lastMessage.text ||
                          (lastMessage.image && (
                            <span className="inline-flex items-center gap-1 align-middle">
                              <Image className="size-3.5" /> Photo
                            </span>
                          ))}
                      </>
                    ) : isOnline ? (
                      "Online"
                    ) : (
                      "Offline"
                    )}
                  </span>
                  {unread > 0 && <span className="badge badge-primary badge-sm shrink-0">{unread}</span>}
                </div>
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-sm text-base-content/50 py-8 px-4">
            {query ? `No contacts match "${search.trim()}"` : showOnlineOnly ? "No one is online right now" : "No contacts yet"}
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
