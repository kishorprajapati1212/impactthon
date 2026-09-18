import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

const URI = process.env.MONGODB_URI;
if (!URI) { console.error("❌ MONGODB_URI not set"); process.exit(1); }

const DBNAME = new URL(URI).pathname.replace("/", "") || "attendx_db";

async function cleanup() {
  console.log("\n🧹 AttendX DB Cleanup\n");
  await mongoose.connect(URI);

  // DROP the entire database — removes ALL collections AND indexes
  await mongoose.connection.db.dropDatabase();
  console.log("   ✅ Database dropped completely\n");

  await mongoose.disconnect();
  console.log("✅ Ready for fresh seed.\n");
  process.exit(0);
}

cleanup().catch(err => { console.error("❌", err.message); process.exit(1); });
