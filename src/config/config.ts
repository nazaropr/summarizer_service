import { config } from "dotenv";
import * as path from "node:path";

config({ path: path.resolve(__dirname, "../../.env") });

function getEnvValue(key: string): string {
    console.log(key);
    console.log(process.env[key]);
    if (!process.env[key]) {
        throw new Error(`Expected environment variable: ${key}`);
    }
    return process.env[key];
}

export const configs = {
    PORT: getEnvValue("PORT"),
    REDIS_HOST: getEnvValue("REDIS_HOST"),
    REDIS_PORT: getEnvValue("REDIS_PORT"),
    REDIS_PASSWORD: getEnvValue("REDIS_PASSWORD"),
    MONGO_URL: getEnvValue("MONGODB_URI"),
    OPENAI_API_KEY: getEnvValue("OPENAI_API_KEY"),
};
