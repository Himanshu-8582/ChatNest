import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log(`Final URI = ${process.env.MONGO_URI}/ChatNest`);
    const connectedInstance = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `MongoDB connected || Host:  ${connectedInstance.connection.host}`,
    );
  } catch (e) {
    console.log("MongoDB connection failed: ", e);
    process.exit(1);
  }
};

export default connectDB;
