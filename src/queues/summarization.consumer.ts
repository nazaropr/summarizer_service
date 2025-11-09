import { Worker, Job } from "bullmq";
import redis from "../config/redis";
import * as summarizationService from "../services/summarizationService";
import logger from "../utils/logger";
import Article from "../models/Article";

interface SummarizationJobPayload {
    articleId: string;
    content: string;
    language: string;
}

const QUEUE_NAME = "summarizationQueue";

const worker = new Worker<SummarizationJobPayload>(
    QUEUE_NAME,
    async (job: Job<SummarizationJobPayload>) => {
        const { articleId, content, language } = job.data;

        logger.info(`Processing job ${job.id} for article ${articleId}`, {
            jobId: job.id,
            articleId,
            language,
            contentLength: content.length,
        });

        try {
            logger.info(`Calling summarizationService.processArticle() for article ${articleId}`, {
                jobId: job.id,
                articleId,
            });
            
            await summarizationService.processArticle(articleId, content, language);

            logger.info(`Successfully processed job ${job.id} for article ${articleId}`, {
                jobId: job.id,
                articleId,
            });
            
            return { success: true, articleId };
        } catch (error) {
            logger.error(`Error processing job ${job.id} for article ${articleId}`, {
                jobId: job.id,
                articleId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    },
    {
        connection: redis,
        concurrency: 5,
        removeOnComplete: {
            count: 100,
            age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
            count: 1000,
        },
        limiter: {
            max: 10,
            duration: 1000, // 1 second
        },
    }
);

// Retry configuration
worker.on("completed", (job: Job) => {
    logger.info(`Job ${job.id} completed successfully`, { jobId: job.id });
});

worker.on("failed", async (job: Job | undefined, error: Error) => {
    if (job) {
        const attemptsMade = job.attemptsMade || 0;
        const maxRetries = 3;
        const { articleId } = job.data as SummarizationJobPayload;

        logger.error(`Job ${job.id} failed (attempt ${attemptsMade + 1})`, {
            jobId: job.id,
            articleId,
            attemptsMade: attemptsMade + 1,
            maxRetries,
            error: error.message,
        });

        if (attemptsMade < maxRetries) {
            logger.info(`Job ${job.id} will be automatically retried (${attemptsMade + 1}/${maxRetries} attempts)`, {
                jobId: job.id,
                articleId,
                attemptsMade: attemptsMade + 1,
                maxRetries,
            });
            // BullMQ will automatically retry the job based on job options
        } else {
            // Max retries exceeded - update MongoDB article status to "failed"
            logger.error(`Job ${job.id} exceeded max retries (${attemptsMade + 1}/${maxRetries}). Updating article status to "failed"`, {
                jobId: job.id,
                articleId,
                attemptsMade: attemptsMade + 1,
                maxRetries,
            });

            try {
                await Article.findOneAndUpdate(
                    { articleId },
                    {
                        status: "failed",
                        updatedAt: new Date(),
                    },
                    { upsert: false }
                );
                logger.info(`Article ${articleId} status updated to "failed" after max retries exceeded`, {
                    articleId,
                    jobId: job.id,
                });
            } catch (updateError) {
                logger.error(`Failed to update article ${articleId} status to "failed"`, {
                    articleId,
                    jobId: job.id,
                    error: updateError instanceof Error ? updateError.message : String(updateError),
                });
            }
        }
    } else {
        logger.error("Job failed without job data", { error: error.message });
    }
});

worker.on("error", (error: Error) => {
    logger.error("Worker error", {
        error: error.message,
        stack: error.stack,
    });
});

// Configure retry policy: max 3 retries with 10s delay
worker.on("active", (job: Job) => {
    logger.info(`Job ${job.id} is now active`, {
        jobId: job.id,
        attempt: (job.attemptsMade || 0) + 1,
    });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
    logger.info("SIGTERM signal received, closing worker...");
    await worker.close();
    process.exit(0);
});

process.on("SIGINT", async () => {
    logger.info("SIGINT signal received, closing worker...");
    await worker.close();
    process.exit(0);
});

logger.info(`Worker started and listening to queue: ${QUEUE_NAME}`, { queueName: QUEUE_NAME });

export default worker;

