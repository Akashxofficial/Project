export class ResponseCache {
    constructor(maxSize = 50, ttlMs = 3600000) {
        this.cache = new Map();
        this.maxSize = maxSize; // Max 50 cached responses
        this.ttlMs = ttlMs; // Cache expires after 1 hour (3600000 ms)
    }

    getCacheKey(prompt) {
        // Normalize prompt: lowercase + trim whitespace
        return prompt.toLowerCase().trim();
    }

    get(prompt) {
        const key = this.getCacheKey(prompt);
        const cached = this.cache.get(key);

        if (!cached) return null;

        // Check if cache has expired
        if (Date.now() - cached.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        // Track how many times this cached response was used
        cached.hits++;
        return cached.response;
    }

    set(prompt, response) {
        // If cache is full, remove the oldest entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        const key = this.getCacheKey(prompt);
        this.cache.set(key, {
            response,
            timestamp: Date.now(),
            hits: 0
        });
    }

    // Show cache statistics (useful for debugging)
    stats() {
        let totalHits = 0;
        this.cache.forEach(v => totalHits += v.hits);

        return {
            cached: this.cache.size,
            totalHits,
            efficiency: this.cache.size > 0
                ? ((totalHits / this.cache.size) * 100).toFixed(1) + '%'
                : '0%'
        };
    }

    // Clear all cached data
    clear() {
        this.cache.clear();
    }
}

// Create a singleton instance
export const cache = new ResponseCache();
