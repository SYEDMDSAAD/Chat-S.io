import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Loader2, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();

  // Focus the message box whenever a chat is opened
  useEffect(() => {
    textInputRef.current?.focus();
  }, [selectedUser?._id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // base64 grows the upload by ~33%, and the server accepts up to 10mb
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !imagePreview) || isSending) return;

    setIsSending(true);
    const sent = await sendMessage({
      text: text.trim(),
      image: imagePreview,
    });
    setIsSending(false);

    // Keep the draft if sending failed so nothing is lost
    if (sent) {
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    textInputRef.current?.focus();
  };

  return (
    <div className="p-3 sm:p-4 w-full border-t border-base-300">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-base-300"
            />
            <button
              onClick={removeImage}
              aria-label="Remove image"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            ref={textInputRef}
            type="text"
            className="w-full input input-bordered rounded-full input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`btn btn-ghost btn-circle btn-sm sm:btn-md ${imagePreview ? "text-success" : "text-base-content/60"}`}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-circle btn-sm sm:btn-md"
          disabled={(!text.trim() && !imagePreview) || isSending}
          aria-label="Send message"
        >
          {isSending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
