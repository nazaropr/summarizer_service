import mongoose from "mongoose";
import { configs } from "./config";
import logger from "../utils/logger";


// const MONGODB_URI = getEnvValue("MONGODB_URI", "mongodb://localhost:27017/summarizer");

const connectMongo = async (): Promise<void> => {
    try {
        const mongoUri = configs.MONGO_URL;
        if (!mongoUri) {
            throw new Error("MONGODB_URI is not defined in .env");
        }
        await mongoose.connect(mongoUri);
        logger.info("✅ Connected to MongoDB successfully");
    } catch (err) {
        logger.error("❌ MongoDB connection failed", { error: err });
        process.exit(1);
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

