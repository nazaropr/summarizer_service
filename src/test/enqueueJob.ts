import { Queue } from "bullmq";
import redis from "../config/redis";
import logger from "../utils/logger";

const QUEUE_NAME = "summarizationQueue";

interface SummarizationJobPayload {
    articleId: string;
    content: string;
    language: string;
}

async function enqueueTestJob() {
    const queue = new Queue<SummarizationJobPayload>(QUEUE_NAME, {
        connection: redis,
    });

    const sampleJob: SummarizationJobPayload = {
        articleId: "test123",
        content: `Україна продовжує боротьбу за свою незалежність та суверенітет. 
        Збройні сили України демонструють мужність та професіоналізм у захисті країни. 
        Міжнародна спільнота надає підтримку Україні в різних форматах. 
        Економіка країни адаптується до воєнних умов та продовжує функціонувати. 
        Український народ показує неймовірну стійкість та єдність перед обличчям агресії. 
        Реформи в країні продовжуються незважаючи на складні обставини. 
        Освіта та культура залишаються важливими пріоритетами для українського суспільства.`,
        language: "uk",
    };

    try {
        logger.info("Adding test job to queue", {
            queueName: QUEUE_NAME,
            articleId: sampleJob.articleId,
        });

        const job = await queue.add("summarization", sampleJob, {
            attempts: 3,
            backoff: {
                type: "fixed",
                delay: 10000, // 10 seconds
            },
            removeOnComplete: {
                count: 100,
                age: 24 * 3600, // 24 hours
            },
            removeOnFail: {
                count: 1000,
            },
        });

        logger.info("Test job added successfully", {
            jobId: job.id,
            articleId: sampleJob.articleId,
            queueName: QUEUE_NAME,
        });

        console.log(`\n✅ Job enqueued successfully!`);
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Article ID: ${sampleJob.articleId}`);
        console.log(`   Queue: ${QUEUE_NAME}`);
        console.log(`\n📋 The worker should now process this job automatically.\n`);

        // Close the queue connection
        await queue.close();
        process.exit(0);
    } catch (error) {
        logger.error("Failed to enqueue test job", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        console.error("\n❌ Failed to enqueue job:", error);
        await queue.close();
        process.exit(1);
    }
}

// Run the script
enqueueTestJob();

