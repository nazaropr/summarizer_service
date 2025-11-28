import OpenAI from "openai";
import { configs } from "../config/config";
import logger from "../utils/logger";
import { throttledOpenAIRequest } from "../utils/openaiThrottle";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: configs.OPENAI_API_KEY,
});

const MODEL_NAME = "gpt-4o-mini";

/**
 * Generates an abstractive summary using GPT-4o-mini with throttling and retry logic
 * @param prompt - The prompt/text to summarize
 * @returns A promise that resolves to the generated summary
 */
export async function generateSummary(prompt: string): Promise<string> {
    if (!prompt || prompt.trim().length === 0) {
        throw new Error("Prompt cannot be empty");
    }

    if (!configs.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    try {
        logger.info("Generating summary with OpenAI", {
            model: MODEL_NAME,
            promptLength: prompt.length,
        });

        // Use throttled request with exponential backoff and retry logic
        const response = await throttledOpenAIRequest(
            () =>
                openai.chat.completions.create({
                    model: MODEL_NAME,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                    max_tokens: 400,
                }),
            MODEL_NAME
        );

        const summary = response.choices[0]?.message?.content;

        if (!summary) {
            throw new Error("No summary generated from OpenAI API");
        }

        // Extract token usage information if available
        const usage = response.usage;
        const logData: Record<string, unknown> = {
            model: MODEL_NAME,
            summaryLength: summary.length,
        };

        if (usage) {
            logData.promptTokens = usage.prompt_tokens;
            logData.completionTokens = usage.completion_tokens;
            logData.totalTokens = usage.total_tokens;
        }

        logger.info("Summary generated successfully", logData);
        return summary.trim();
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            logger.error("OpenAI API Error", {
                model: MODEL_NAME,
                status: error.status,
                message: error.message,
                code: error.code,
                type: error.type,
            });
            throw new Error(`OpenAI API Error: ${error.message}`);
        } else if (error instanceof Error) {
            logger.error("Error generating summary", {
                model: MODEL_NAME,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        } else {
            logger.error("Unknown error occurred while generating summary", {
                model: MODEL_NAME,
                error,
            });
            throw new Error("Unknown error occurred while generating summary");
        }
    }
}

