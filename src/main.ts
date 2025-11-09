import app from "./app";
import { configs } from "./config/config";
import connectMongo from "./config/mongo";
import logger from "./utils/logger";
import "./queues/summarization.consumer";

async function startServer() {
    try {
        // Connect to MongoDB
        await connectMongo();

        // Start Express server
        app.listen(configs.PORT, () => {
            logger.info(`Server started and listening on port ${configs.PORT}`, {
                port: configs.PORT,
            });
        });
    } catch (error) {
        logger.error("Failed to start server", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received, shutting down gracefully...");
    process.exit(0);
});

process.on("SIGINT", () => {
    logger.info("SIGINT signal received, shutting down gracefully...");
    process.exit(0);
});

startServer();

