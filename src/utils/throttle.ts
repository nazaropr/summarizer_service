import logger from "./logger";

/**
 * Simple token bucket implementation for rate limiting
 * Allows up to maxRequestsPerSecond requests per second
 */
class TokenBucket {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number; // tokens per second
    private lastRefill: number;

    constructor(maxRequestsPerSecond: number) {
        this.maxTokens = maxRequestsPerSecond;
        this.tokens = maxRequestsPerSecond;
        this.refillRate = maxRequestsPerSecond;
        this.lastRefill = Date.now();
    }

    /**
     * Try to consume a token
     * @returns Promise that resolves when a token is available
     */
    async consume(): Promise<void> {
        this.refill();

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return;
        }

        // Calculate wait time until next token is available
        const waitTime = (1 - this.tokens) / this.refillRate * 1000;
        
        if (waitTime > 0) {
            logger.info("Rate limit: waiting for token bucket", {
                waitTimeMs: Math.round(waitTime),
                maxRequestsPerSecond: this.maxTokens,
            });
        }
        
        await this.sleep(waitTime);
        
        this.refill();
        this.tokens -= 1;
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000; // elapsed time in seconds
        const tokensToAdd = elapsed * this.refillRate;
        
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// Global token bucket instance: max 3 requests per second
const tokenBucket = new TokenBucket(3);

/**
 * Wait for a token to be available in the token bucket
 */
export async function waitForToken(): Promise<void> {
    await tokenBucket.consume();
}

