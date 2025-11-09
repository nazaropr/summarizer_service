/**
 * Extracts the most important sentences from text using frequency-based scoring
 * @param text - The input text to analyze
 * @returns A string containing 3-5 most informative sentences
 */
export function getImportantSentences(text: string): string {
    if (!text || text.trim().length === 0) {
        return "";
    }

    // Split text into sentences
    const sentences = splitIntoSentences(text);

    if (sentences.length === 0) {
        return "";
    }

    // If we have 5 or fewer sentences, return all of them
    if (sentences.length <= 5) {
        return sentences.join(" ");
    }

    // Count word frequency across the entire text
    const wordFrequency = countWordFrequency(text);

    // Score each sentence based on word frequencies
    const scoredSentences = sentences.map((sentence, index) => ({
        sentence,
        score: calculateSentenceScore(sentence, wordFrequency),
        index,
    }));

    // Sort by score (descending) and take top 3-5 sentences
    // We'll aim for 3-5 sentences, prioritizing higher scores
    scoredSentences.sort((a, b) => b.score - a.score);

    // Select top sentences (3-5, but prefer more if scores are similar)
    const topSentences = selectTopSentences(scoredSentences, 3, 5);

    // Return sentences in original order
    topSentences.sort((a, b) => a.index - b.index);

    return topSentences.map((item) => item.sentence).join(" ");
}

/**
 * Splits text into sentences
 */
function splitIntoSentences(text: string): string[] {
    // Remove extra whitespace
    const cleaned = text.replace(/\s+/g, " ").trim();

    // Split by sentence-ending punctuation followed by space or end of string
    // This regex handles: . ! ? followed by space or end of string
    const sentences = cleaned
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    return sentences;
}

/**
 * Counts word frequency in the text
 */
function countWordFrequency(text: string): Map<string, number> {
    const frequency = new Map<string, number>();

    // Normalize text: lowercase and remove punctuation
    const normalized = text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Split into words
    const words = normalized.split(/\s+/).filter((word) => word.length > 0);

    // Count frequency (excluding common stop words)
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
    ]);

    for (const word of words) {
        if (!stopWords.has(word) && word.length > 2) {
            // Only count words longer than 2 characters
            frequency.set(word, (frequency.get(word) || 0) + 1);
        }
    }

    return frequency;
}

/**
 * Calculates a score for a sentence based on word frequencies
 */
function calculateSentenceScore(
    sentence: string,
    wordFrequency: Map<string, number>
): number {
    // Normalize sentence
    const normalized = sentence
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const words = normalized.split(/\s+/).filter((word) => word.length > 2);

    if (words.length === 0) {
        return 0;
    }

    // Calculate average word frequency score
    let totalScore = 0;
    let wordCount = 0;

    for (const word of words) {
        const frequency = wordFrequency.get(word) || 0;
        totalScore += frequency;
        wordCount++;
    }

    // Return average score (normalized by sentence length to avoid bias toward longer sentences)
    return totalScore / wordCount;
}

/**
 * Selects top sentences (between min and max count)
 * Prefers higher scores but ensures we get at least min sentences
 */
function selectTopSentences(
    scoredSentences: Array<{ sentence: string; score: number; index: number }>,
    minCount: number,
    maxCount: number
): Array<{ sentence: string; score: number; index: number }> {
    if (scoredSentences.length <= maxCount) {
        return scoredSentences;
    }

    // Take top maxCount sentences
    const topSentences = scoredSentences.slice(0, maxCount);

    // If we have at least minCount sentences with non-zero scores, return them
    const nonZeroScores = topSentences.filter((s) => s.score > 0);

    if (nonZeroScores.length >= minCount) {
        return topSentences;
    }

    // Otherwise, return at least minCount sentences (even if scores are low)
    return scoredSentences.slice(0, Math.max(minCount, nonZeroScores.length));
}

