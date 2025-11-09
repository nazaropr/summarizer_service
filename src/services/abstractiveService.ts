import OpenAI from "openai";
import { configs } from "../config/config";
import logger from "../utils/logger"; 

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: configs.OPENAI_API_KEY,
});

/**
 * Generates an abstractive summary using GPT-4o-mini
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
        logger.info("Generating summary with GPT-4o-mini", { promptLength: prompt.length });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 400,
        });

        const summary = response.choices[0]?.message?.content;

        if (!summary) {
            throw new Error("No summary generated from OpenAI API");
        }

        logger.info(`Summary generated successfully`, { summaryLength: summary.length });
        return summary.trim();
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            logger.error("OpenAI API Error", {
                status: error.status,
                message: error.message,
                code: error.code,
                type: error.type,
            });
            throw new Error(`OpenAI API Error: ${error.message}`);
        } else if (error instanceof Error) {
            logger.error("Error generating summary", {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        } else {
            logger.error("Unknown error occurred while generating summary", { error });
            throw new Error("Unknown error occurred while generating summary");
        }
    }
}

