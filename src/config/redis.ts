import Redis from "ioredis";
import { configs } from "./config";

const redisPort = parseInt(configs.REDIS_PORT as string, 10);
const redis = new Redis({
    host: configs.REDIS_HOST,
    port: redisPort,
    password: configs.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on("connect", () => {
    console.log("Redis connection established successfully");
});

redis.on("ready", () => {
    console.log("Redis client is ready to receive commands");
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});

redis.on("close", () => {
    console.log("Redis connection closed");
});

export default redis;

