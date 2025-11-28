import Joi from "joi";
import logger from "./logger";

/**
 * Shared interface for validated job payloads
 */
export interface SummarizationJobPayload {
    articleId: string;
    content: string;
    language: string;
}

/**
 * Joi schema for validating summarization job payloads
 */
const jobPayloadSchema = Joi.object({
    articleId: Joi.string().min(3).required().messages({
        "string.base": "articleId must be a string",
        "string.min": "articleId must be at least 3 characters long",
        "any.required": "articleId is required",
        "string.empty": "articleId cannot be empty",
    }),
    content: Joi.string().min(50).required().messages({
        "string.base": "content must be a string",
        "string.min": "content must be at least 50 characters long",
        "any.required": "content is required",
        "string.empty": "content cannot be empty",
    }),
    language: Joi.string()
        .valid("uk", "en", "pl", "de", "fr", "es")
        .required()
        .messages({
            "string.base": "language must be a string",
            "any.only": "language must be one of: uk, en, pl, de, fr, es",
            "any.required": "language is required",
            "string.empty": "language cannot be empty",
        }),
});

/**
 * Validates a job payload using Joi schema
 * @param payload - The job payload to validate
 * @param jobId - Optional job ID for error logging
 * @returns The validated payload
 * @throws Error with formatted validation errors if validation fails
 */
export function validateJobPayload(
    payload: unknown,
    jobId?: string | number
): SummarizationJobPayload {
    const { error, value } = jobPayloadSchema.validate(payload, {
        abortEarly: false, // Collect all errors, not just the first one
        stripUnknown: true, // Remove unknown fields
    });

    if (error) {
        // Format all validation errors into a single readable message
        const errorMessages = error.details.map((detail) => detail.message).join("; ");
        const errorMessage = `Job validation failed: ${errorMessages}`;

        // Log error with structured logging
        const articleIdValue = (payload as any)?.articleId || "unknown";
        logger.error(`Validation error for job ${jobId || "unknown"} (articleId: ${articleIdValue}): ${errorMessages}`, {
            jobId,
            articleId: articleIdValue,
            validationErrors: error.details.map((detail) => ({
                field: detail.path.join("."),
                message: detail.message,
            })),
        });

        throw new Error(errorMessage);
    }

    return value as SummarizationJobPayload;
}

