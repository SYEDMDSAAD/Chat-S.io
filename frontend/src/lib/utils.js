export function formatMessageTime(date) {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

const isSameDay = (a, b) => a.toDateString() === b.toDateString();

const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

// "Today", "Yesterday", or a date like "Mon, 12 Jan" (with the year if it isn't this year)
export function formatDateSeparator(value) {
  const date = new Date(value);
  if (isSameDay(date, new Date())) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
}

// Compact time for the contact list: "14:05" today, "Yesterday", or "12 Jan"
export function formatSidebarTime(value) {
  const date = new Date(value);
  if (isSameDay(date, new Date())) return formatMessageTime(date);
  if (isYesterday(date)) return "Yesterday";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function isDifferentDay(a, b) {
  return !b || !isSameDay(new Date(a), new Date(b));
}

export function getErrorMessage(error) {
  return error.response?.data?.message || error.message || "Something went wrong";
}
