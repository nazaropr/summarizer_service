import { Worker } from "bullmq";
import { Job } from "bullmq";
import redis from "../config/redis";
import * as summarizationService from "../services/summarizationService";
import logger from "../utils/logger";
import Article from "../models/Article";
import { validateJobPayload, SummarizationJobPayload } from "../utils/jobValidation";
import { QUEUE_NAME } from "./summarization.queue";
import mongoose from "mongoose"
const {ObjectId} = mongoose.Types;

const worker = new Worker<SummarizationJobPayload>(
    QUEUE_NAME,
    async (job: Job<SummarizationJobPayload>) => {
        // Validate job payload before processing
        let validatedPayload: SummarizationJobPayload;
        try {
            validatedPayload = validateJobPayload(job.data, job.id);
        } catch (validationError) {
            // Validation error is already logged in validateJobPayload
            // Re-throw to ensure BullMQ moves job to FAILED
            throw validationError;
        }

        const { articleId, content, language } = validatedPayload;

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
        // Try to extract articleId even if validation failed
        const articleId = (job.data as any)?.articleId || "unknown";
        const isValidationError = error.message.startsWith("Job validation failed");

        logger.error(`Job ${job.id} failed (attempt ${attemptsMade + 1})`, {
            jobId: job.id,
            articleId,
            attemptsMade: attemptsMade + 1,
            maxRetries,
            error: error.message,
            isValidationError,
        });

        // If it's a validation error or max retries exceeded, update article status to "failed"
        if (isValidationError || attemptsMade >= maxRetries) {
            if (isValidationError) {
                logger.error(`Job ${job.id} failed due to validation error. Updating article status to "failed"`, {
                    jobId: job.id,
                    articleId,
                    attemptsMade: attemptsMade + 1,
                });
            } else {
                logger.error(`Job ${job.id} exceeded max retries (${attemptsMade + 1}/${maxRetries}). Updating article status to "failed"`, {
                    jobId: job.id,
                    articleId,
                    attemptsMade: attemptsMade + 1,
                    maxRetries,
                });
            }

            // Only update article status if we have a valid articleId
            if (articleId && articleId !== "unknown") {
                try {
                    const errorMessage = error.message || (isValidationError ? "Job validation failed" : "Max retries exceeded");
                    const id = new ObjectId(articleId);
                    await Article.findOneAndUpdate(
                        { _id: id },
                        {
                            status: "failed",
                            errorMessage,
                        },
                        { upsert: false, new: true }
                    );
                    logger.info(`Article ${articleId} status updated to "failed"`, {
                        articleId,
                        jobId: job.id,
                        errorMessage,
                        reason: isValidationError ? "validation_error" : "max_retries_exceeded",
                    });
                } catch (updateError) {
                    logger.error(`Failed to update article ${articleId} status to "failed"`, {
                        articleId,
                        jobId: job.id,
                        error: updateError instanceof Error ? updateError.message : String(updateError),
                    });
                }
            } else {
                logger.warn(`Cannot update article status: invalid articleId (${articleId})`, {
                    jobId: job.id,
                    articleId,
                    error: error.message,
                });
            }
        } else {
            // Will retry - don't update status yet
            logger.info(`Job ${job.id} will be automatically retried (${attemptsMade + 1}/${maxRetries} attempts)`, {
                jobId: job.id,
                articleId,
                attemptsMade: attemptsMade + 1,
                maxRetries,
            });
            // BullMQ will automatically retry the job based on job options
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

