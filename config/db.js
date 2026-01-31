import mongoose from "mongoose";
import dotenv from "dotenv";


dotenv.config();

const connectDB = async () => {
  await mongoose
        .connect(process.env.MONGODB_URI)
        .then(() => console.log("✅ Connection is Establish"))
        .catch((error) => console.error("❌ Connection Error"))
};

export default connectDB;


const example = async() =>{
  try{
    // 🔥 DROP OLD INDEX PROGRAMMATICALLY
// await Section.collection.dropIndex("name_1_departmentId_1").catch(() => {});

//   await Section.deleteMany({name:'A'});
//   await Section.deleteMany({name:'B'})
//   await Department.deleteMany({name:"MCA"});

  const mca = await Department.create({ name: "MCA" });
  console.log(mca)
  // Semester 1 sections
  const f = await Section.insertMany([
    { name: "A", semester: 1, departmentId: mca._id },
    { name: "B", semester: 1, departmentId: mca._id },
  ]);

  console.log(f)

  // Semester 2 sections
  const s = await Section.insertMany([
    { name: "A", semester: 2, departmentId: mca._id },
    { name: "B", semester: 2, departmentId: mca._id },
  ]);
  console.log(s)
  }catch(error){

  }
}