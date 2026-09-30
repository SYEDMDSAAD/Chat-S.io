import jwt from "jsonwebtoken";

const cookieOptions = () => ({
  httpOnly: true, // prevent XSS attacks cross-site scripting attacks
  sameSite: "strict", // CSRF attacks cross-site request forgery attacks
  secure: process.env.NODE_ENV !== "development",
});

export const clearTokenCookie = (res) => {
  res.clearCookie("jwt", cookieOptions());
};

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    ...cookieOptions(),
  });

  return token;
};

// Uploads must be base64 image data URLs, not remote URLs for cloudinary to fetch
export const isImageDataUrl = (value) =>
  typeof value === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
