class RateLimiter {
    constructor(maxRequests = 5, windowMs = 60000) {
        this.maxRequests = maxRequests; // 5 requests per minute
        this.windowMs = windowMs; // 60 seconds
        this.requests = [];
    }

    isAllowed() {
        const now = Date.now();

        // Remove old requests outside the time window
        this.requests = this.requests.filter(time => now - time < this.windowMs);

        // Check if we've exceeded the limit
        if (this.requests.length >= this.maxRequests) {
            return false;
        }

        // Add current request to tracking
        this.requests.push(now);
        return true;
    }

    getRetryAfter() {
        if (this.requests.length === 0) return 0;
        const oldestRequest = this.requests[0];
        const now = Date.now();
        const waitTime = Math.ceil((oldestRequest + this.windowMs - now) / 1000);
        return Math.max(0, waitTime);
    }

    getQueuedCount() {
        return this.requests.length;
    }

    reset() {
        this.requests = [];
    }
}

export const limiter = new RateLimiter(20, 60000);
