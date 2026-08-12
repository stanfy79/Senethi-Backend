import mongoose from "mongoose";
import { env } from "./config.js";

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  await mongoose.connect(env.MONGODB_URI);

  console.log("[MongoDB] Connected");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();

  console.log("[MongoDB] Disconnected");
}