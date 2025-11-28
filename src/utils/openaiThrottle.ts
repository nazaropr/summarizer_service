import OpenAI from "openai";
import logger from "./logger";
import { waitForToken } from "./throttle";

/**
 * Delay sequence for exponential backoff: 500ms → 1000ms → 2000ms → 4000ms → 8000ms
 */
const BACKOFF_DELAYS = [500, 1000, 2000, 4000, 8000];

/**
 * Maximum number of retry attempts
 */
const MAX_RETRIES = 5;

/**
 * Add jitter to a delay value for randomization
 * Jitter is ±20% of the delay
 */
function addJitter(delayMs: number): number {
    const jitterRange = delayMs * 0.2;
    const jitter = (Math.random() * 2 - 1) * jitterRange; // Random value between -jitterRange and +jitterRange
    return Math.max(0, delayMs + jitter);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a retryable error (429 Too Many Requests or timeout)
 */
function isRetryableError(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
        // 429 Too Many Requests
        if (error.status === 429) {
            return true;
        }
        // Other 5xx errors might be retryable
        if (error.status && error.status >= 500 && error.status < 600) {
            return true;
        }
    }
    
    // Check for timeout errors
    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("timeout") || errorMessage.includes("etimedout")) {
            return true;
        }
    }
    
    return false;
}

/**
 * Get delay for a specific retry attempt with exponential backoff and jitter
 */
function getRetryDelay(attempt: number): number {
    const delayIndex = Math.min(attempt, BACKOFF_DELAYS.length - 1);
    const baseDelay = BACKOFF_DELAYS[delayIndex];
    return addJitter(baseDelay);
}

/**
 * Throttled OpenAI request with exponential backoff, retry logic, and rate limiting
 * @param requestFn - Function that makes the OpenAI API call
 * @param modelName - Name of the model being used (for logging)
 * @returns Promise that resolves to the API response
 */
export async function throttledOpenAIRequest<T>(
    requestFn: () => Promise<T>,
    modelName: string
): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Wait for token bucket to allow the request (rate limiting)
            if (attempt === 0) {
                await waitForToken();
            }
            
            // Make the API request
            const startTime = Date.now();
            const response = await requestFn();
            const duration = Date.now() - startTime;
            
            // Log successful request
            if (attempt > 0) {
                logger.info(`OpenAI request succeeded after ${attempt} retry(ies)`, {
                    model: modelName,
                    attempt: attempt + 1,
                    duration,
                });
            } else {
                logger.info(`OpenAI request succeeded`, {
                    model: modelName,
                    duration,
                });
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            // Check if error is retryable
            if (!isRetryableError(error)) {
                logger.error(`OpenAI request failed with non-retryable error`, {
                    model: modelName,
                    attempt: attempt + 1,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
            
            // Check if we've exhausted retries
            if (attempt >= MAX_RETRIES) {
                logger.error(`OpenAI request failed after ${MAX_RETRIES} retries`, {
                    model: modelName,
                    totalAttempts: attempt + 1,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
            
            // Calculate delay for next retry
            const delay = getRetryDelay(attempt);
            
            // Log retry attempt
            logger.warn(`OpenAI request failed, retrying...`, {
                model: modelName,
                attempt: attempt + 1,
                maxRetries: MAX_RETRIES,
                delayMs: Math.round(delay),
                error: error instanceof Error ? error.message : String(error),
                status: error instanceof OpenAI.APIError ? error.status : undefined,
            });
            
            // Wait before retrying
            await sleep(delay);
        }
    }
    
    // This should never be reached, but TypeScript needs it
    throw lastError;
}

