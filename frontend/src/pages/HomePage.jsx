import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser, subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const { socket } = useAuthStore();

  // Listen for messages from all chats (not just the open one) so unread counts stay live
  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  return (
    <div className="h-dvh bg-base-200 pt-16 md:pt-20 md:pb-6 md:px-4">
      <div className="flex justify-center h-full">
        <div className="bg-base-100 md:rounded-xl md:shadow-xl w-full max-w-6xl h-full">
          <div className="flex h-full md:rounded-xl overflow-hidden">
            <Sidebar />

            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
