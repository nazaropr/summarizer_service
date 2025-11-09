import express from "express";
import Article from "./models/Article";
import logger from "./utils/logger";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req: express.Request, res: express.Response) => {
    return res.json({ status: "ok" });
});

// Stats endpoint - returns count of jobs processed
app.get("/stats", async (req: express.Request, res: express.Response) => {
    try {
        const totalArticles = await Article.countDocuments();
        const doneArticles = await Article.countDocuments({ status: "done" });
        const processingArticles = await Article.countDocuments({ status: "processing" });
        const failedArticles = await Article.countDocuments({ status: "failed" });
        const pendingArticles = await Article.countDocuments({ status: "pending" });

        return res.json({
            total: totalArticles,
            done: doneArticles,
            processing: processingArticles,
            failed: failedArticles,
            pending: pendingArticles,
        });
    } catch (error) {
        logger.error("Error fetching stats", {
            error: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            error: "Failed to fetch stats",
            message: error instanceof Error ? error.message : String(error),
        });
    }
});

export default app;
