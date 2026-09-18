import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    const db = mongoose.connection.db;
    const collection = db.collection("attendances");

    const indexes = await collection.indexes();

    console.log("Current indexes:");
    console.log(indexes);

    // Drop old index from previous schema
    const oldIndex = indexes.find(
      (i) => i.name === "lectureSessionId_1_studentEnrollmentNo_1"
    );

    if (oldIndex) {
      await collection.dropIndex("lectureSessionId_1_studentEnrollmentNo_1");
      console.log("Old index dropped: lectureSessionId_1_studentEnrollmentNo_1");
    } else {
      console.log("Old studentEnrollmentNo index not found");
    }

    // Drop wrong lecture-only unique index if exists
    const wrongLectureIndex = indexes.find(
      (i) =>
        i.name === "lectureSessionId_1" &&
        i.unique === true
    );

    if (wrongLectureIndex) {
      await collection.dropIndex("lectureSessionId_1");
      console.log("Wrong lectureSessionId unique index dropped");
    } else {
      console.log("Wrong lecture-only unique index not found");
    }

    // Create correct index
    await collection.createIndex(
      { lectureSessionId: 1, studentId: 1 },
      { unique: true }
    );

    console.log("Correct index created: lectureSessionId + studentId");

    const updatedIndexes = await collection.indexes();

    console.log("Updated indexes:");
    console.log(updatedIndexes);

    await mongoose.disconnect();

    console.log("Done");
  } catch (error) {
    console.error("Index fix error:", error);
    process.exit(1);
  }
};

fixIndexes();