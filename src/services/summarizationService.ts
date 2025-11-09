import Article from "../models/Article";
import { getImportantSentences } from "./extractiveService";
import { generateSummary } from "./abstractiveService";
import logger from "../utils/logger";

/**
 * Extracts top keywords from text using frequency analysis
 */
function extractKeywords(text: string, count: number = 5): string[] {
    if (!text || text.trim().length === 0) {
        return [];
    }

    // Normalize text: lowercase and remove punctuation
    const normalized = text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Split into words
    const words = normalized.split(/\s+/).filter((word) => word.length > 3); // Only words longer than 3 characters

    // Count frequency
    const frequency = new Map<string, number>();
    const stopWords = new Set([
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "with",
        "by",
        "from",
        "as",
        "is",
        "was",
        "are",
        "were",
        "been",
        "be",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "should",
        "could",
        "may",
        "might",
        "must",
        "can",
        "this",
        "that",
        "these",
        "those",
        "it",
        "its",
        "they",
        "them",
        "their",
        "there",
        "then",
        "than",
        "what",
        "which",
        "who",
        "when",
        "where",
        "why",
        "how",
    ]);

    for (const word of words) {
        if (!stopWords.has(word)) {
            frequency.set(word, (frequency.get(word) || 0) + 1);
        }
    }

    // Sort by frequency and get top keywords
    const sortedWords = Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([word]) => word);

    return sortedWords;
}

/**
 * Builds a dynamic prompt for summarization based on language
 */
function buildPrompt(reducedText: string, language: string, summaryType: "short" | "long"): string {
    const languageNames: Record<string, string> = {
        uk: "Ukrainian",
        en: "English",
        ru: "Russian",
        pl: "Polish",
        de: "German",
        fr: "French",
        es: "Spanish",
    };

    const languageName = languageNames[language.toLowerCase()] || language;

    const sentenceCount = summaryType === "short" ? "2–3 sentences" : "5–7 sentences";
    const summaryTypeText = summaryType === "short" ? "short" : "extended";

    return `Summarize the following news article in ${languageName}.
Provide a ${summaryTypeText} summary (${sentenceCount}).

Text: ${reducedText}`;
}

/**
 * Processes an article: generates summaries and extracts keywords
 */
export async function processArticle(
    articleId: string,
    content: string,
    language: string
): Promise<void> {
    logger.info(`Starting processing for article ${articleId}`, { articleId });

    try {
        // Step 1: Set article status to "processing"
        await Article.findOneAndUpdate(
            { articleId },
            {
                articleId,
                content,
                status: "processing",
                updatedAt: new Date(),
            },
            { upsert: true, new: true }
        );
        logger.info(`Article ${articleId} status set to "processing"`, { articleId });

        // Step 2: Reduce text size using extractive service
        logger.info(`Extracting important sentences`, { articleId });
        const reducedText = getImportantSentences(content);
        logger.info(`Reduced text from ${content.length} to ${reducedText.length} characters`, {
            articleId,
            originalLength: content.length,
            reducedLength: reducedText.length,
        });

        if (!reducedText || reducedText.trim().length === 0) {
            throw new Error("Failed to extract important sentences from content");
        }

        // Step 3: Build prompts for short and long summaries
        const shortPrompt = buildPrompt(reducedText, language, "short");
        const longPrompt = buildPrompt(reducedText, language, "long");

        logger.info(`Generating short summary`, { articleId });
        // Step 4: Generate short summary
        const summaryShort = await generateSummary(shortPrompt);
        logger.info(`Short summary generated`, {
            articleId,
            summaryLength: summaryShort.length,
        });

        logger.info(`Generating long summary`, { articleId });
        // Step 5: Generate long summary
        const summaryLong = await generateSummary(longPrompt);
        logger.info(`Long summary generated`, {
            articleId,
            summaryLength: summaryLong.length,
        });

        // Step 6: Extract top 5 keywords
        logger.info(`Extracting keywords`, { articleId });
        const keywords = extractKeywords(content, 5);
        logger.info(`Extracted keywords`, { articleId, keywords });

        // Step 7: Save results in MongoDB
        logger.info(`Saving results to MongoDB`, { articleId });
        await Article.findOneAndUpdate(
            { articleId },
            {
                articleId,
                content,
                summaryShort,
                summaryLong,
                keywords,
                status: "done",
                updatedAt: new Date(),
            },
            { upsert: true, new: true }
        );
        logger.info(`Article ${articleId} successfully processed and saved`, { articleId });
    } catch (error) {
        logger.error(`Error processing article ${articleId}`, {
            articleId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        // Update status to "failed" on error
        try {
            await Article.findOneAndUpdate(
                { articleId },
                {
                    status: "failed",
                    updatedAt: new Date(),
                },
                { upsert: true }
            );
            logger.info(`Article ${articleId} status set to "failed"`, { articleId });
        } catch (updateError) {
            logger.error(`Failed to update article ${articleId} status to "failed"`, {
                articleId,
                error: updateError instanceof Error ? updateError.message : String(updateError),
            });
        }

        throw error;
    }
}

