import mongoose from "mongoose";
import { configs } from "./config";


// const MONGODB_URI = getEnvValue("MONGODB_URI", "mongodb://localhost:27017/summarizer");

const connectMongo = async (): Promise<void> => {
    try {
        await mongoose.connect(configs.MONGO_URL);
        console.log("MongoDB connection established successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};

mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
    console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.log("Mongoose disconnected from MongoDB");
});

process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed due to application termination");
    process.exit(0);
});

export default connectMongo;

