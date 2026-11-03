// deactivate-lectures.js
// Run: node deactivate-lectures.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

// 📁 Fixed based on your Mongoose Model
const COLLECTION_NAME = 'lecturesessions'; 
const TARGET_FIELD = 'status';

async function deactivateAllLectures() {
    if (!MONGO_URI) {
        console.error("❌ Error: MONGODB_URI is undefined. Check your .env file.");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection(COLLECTION_NAME);

        // Count how many are currently "ACTIVE"
        const totalBefore = await collection.countDocuments();
        const activeBefore = await collection.countDocuments({ [TARGET_FIELD]: "ACTIVE" });
        
        console.log(`📊 Total documents in '${COLLECTION_NAME}': ${totalBefore}`);
        console.log(`📊 Currently ACTIVE lectures: ${activeBefore}`);

        if (activeBefore === 0) {
            console.log("⚠️ No active lectures found to deactivate.");
        }

        // Update status from "ACTIVE" to "COMPLETED"
        const result = await collection.updateMany(
            { [TARGET_FIELD]: "ACTIVE" }, // Only target sessions that are currently open/active
            { $set: { [TARGET_FIELD]: "COMPLETED" } } // Switch them to COMPLETED
        );

        console.log('\n✅ Deactivation complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   📁 Collection:  ${COLLECTION_NAME}`);
        console.log(`   🔍 Matched:     ${result.matchedCount} active documents`);
        console.log(`   ✏️  Modified:    ${result.modifiedCount} documents closed`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Show a quick snapshot of data remaining
        const sample = await collection.find({}).limit(2).toArray();
        console.log('\n📝 Live Database Sample (First 2 Docs):');
        sample.forEach((doc, i) => {
            console.log(`   [${i + 1}] _id: ${doc._id} | Topic: "${doc.topic}" | Status: ${doc.status}`);
        });

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

deactivateAllLectures();