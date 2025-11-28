import { Queue } from "bullmq";
import redis from "../config/redis";
import { SummarizationJobPayload } from "../utils/jobValidation";

export const QUEUE_NAME = "summarizationQueue";
// export const QUEUE_NAME = summarizer_test
/**
 * BullMQ Queue instance for summarization jobs
 * Used by both the worker and Bull Board dashboard
 */
export const summarizationQueue = new Queue<SummarizationJobPayload>(QUEUE_NAME, {
    connection: redis,
});

