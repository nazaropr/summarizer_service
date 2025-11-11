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
        content: `The Future of Artificial Intelligence and Its Impact on Society

Artificial Intelligence (AI) has evolved from a speculative idea in science fiction to one of the most transformative forces of the 21st century. In less than a decade, AI has moved from research labs to mainstream use, influencing how people work, communicate, travel, and even think. From healthcare diagnostics to autonomous vehicles, AI systems are reshaping every industry, prompting both excitement and concern about what the future holds.

1. The Rise of Intelligent Machines

AI’s development began with simple algorithms capable of recognizing patterns. Today, advanced machine learning models—especially deep neural networks—can process enormous volumes of data, identify subtle correlations, and make predictions with remarkable accuracy. Systems like ChatGPT, image recognition tools, and generative models are capable of creating human-like text, realistic images, and even original music.

As computing power increases and data becomes more accessible, AI will continue to grow in complexity and capability. This growth, however, raises a critical question: what happens when machines begin to think and act more autonomously than humans can monitor or control?

2. Transforming the Workforce

AI’s influence on employment is one of the most debated aspects of the technological revolution. Automation is replacing repetitive and predictable tasks across manufacturing, logistics, and customer service. Self-checkout systems, robotic warehouse pickers, and AI-driven call centers demonstrate how quickly machines can outperform humans in speed and consistency.

Yet, rather than eliminating all jobs, AI is reshaping the nature of work. While some professions become obsolete, others emerge—AI engineers, data analysts, and ethicists are now in high demand. Furthermore, AI tools can augment human workers, allowing them to focus on creative, strategic, and interpersonal aspects of their roles.

The challenge for society lies in reskilling and education. Governments and organizations must invest in training programs that prepare workers for a digital-first world, ensuring that technological progress does not leave large populations behind.

3. AI in Healthcare

Few sectors demonstrate AI’s potential more clearly than healthcare. Machine learning models can analyze medical images to detect early signs of diseases such as cancer or Alzheimer’s with greater accuracy than human specialists. Predictive analytics helps hospitals manage patient flow, while personalized treatment plans improve outcomes based on individual genetics and lifestyle data.

However, the integration of AI in healthcare also raises ethical and regulatory questions. Who is responsible if an AI system makes a medical error? How should patient data be protected while still enabling innovation? These issues highlight the need for transparent governance and human oversight.

4. Ethics, Privacy, and Control

As AI becomes more powerful, concerns about privacy, bias, and accountability intensify. Algorithms trained on biased datasets can perpetuate discrimination in hiring, lending, or law enforcement. Surveillance systems powered by facial recognition technology can erode civil liberties. And deepfake content blurs the line between reality and fabrication.

Ethical AI development requires transparency, inclusivity, and accountability. Leading organizations are establishing frameworks for responsible AI, emphasizing fairness, explainability, and human-centered design. Yet implementing these principles globally is challenging, as cultural norms and regulations vary widely.

5. The Role of AI in Creativity and Education

Interestingly, AI is not limited to technical or analytical domains—it is also revolutionizing creative industries. Artists, musicians, and writers use AI tools to generate ideas, compose music, or design visuals. These collaborations blur the line between human and machine creativity, raising philosophical questions about authorship and originality.

In education, AI-driven tutors and adaptive learning platforms personalize instruction for each student’s pace and style. They can identify weaknesses, provide targeted exercises, and even offer emotional support through conversational interfaces. However, educators emphasize that AI should enhance, not replace, human connection in learning.

6. Geopolitical and Economic Implications

AI is also a strategic asset on the global stage. Nations are competing to lead in AI research, data infrastructure, and policy frameworks. Those who dominate AI technologies could gain economic, military, and political advantages. This “AI race” mirrors the nuclear and space races of the past century, but with broader implications for everyday life.

To prevent misuse, international cooperation is essential. Establishing global AI governance standards could ensure that technological progress benefits humanity as a whole, rather than exacerbating inequality or fueling conflict.

7. The Path Forward

Looking ahead, the future of AI will depend on how humans choose to shape it. If guided by ethical principles, collaboration, and responsible innovation, AI could help solve major global challenges—climate change, disease, poverty, and education inequality.

However, if left unchecked, it could amplify existing problems, such as misinformation, surveillance, and social division. The key lies in human stewardship: ensuring that AI serves humanity’s collective interests rather than a select few.

8. Conclusion

Artificial Intelligence is neither inherently good nor evil—it is a reflection of human values, intentions, and creativity. As we stand at the threshold of a new technological era, society must balance progress with prudence. The choices made today about regulation, ethics, and design will determine whether AI becomes a tool for empowerment or a source of division.

In the coming decades, AI will not just change the world—it will redefine what it means to be human.`,
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

