import mongoose from "mongoose";

/**
 * Connect with retries so Docker/IDX don't crash if Mongo is still booting.
 * Compose no longer blocks forever on "mongo healthy" — we retry here instead.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set");
    process.exit(1);
  }

  const maxAttempts = Number(process.env.MONGO_RETRY_ATTEMPTS || 30);
  const delayMs = Number(process.env.MONGO_RETRY_MS || 2000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        maxPoolSize: 50,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      });
      console.log(
        `✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`
      );
      return conn;
    } catch (error) {
      console.warn(
        `⏳ MongoDB not ready (try ${attempt}/${maxAttempts}): ${error.message}`
      );
      if (attempt === maxAttempts) {
        console.error("❌ MongoDB Error: gave up waiting");
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
};

export default connectDB;
