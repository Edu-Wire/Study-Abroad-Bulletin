import mongoose from "mongoose";

// In-memory fallback user database if MongoDB is not connected
export const inMemoryUsers = [];

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/studyabroadnews";
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(" Connected to MongoDB successfully.");
    return true;
  } catch (err) {
    console.log(" MongoDB connection bypassed (using in-memory auth store for instant local testing).");
    return false;
  }
}
