import mongoose, { Schema, Document } from "mongoose";

export interface IArticle extends Document {
    articleId: string;
    content: string;
    summaryShort?: string;
    summaryLong?: string;
    keywords?: string[];
    status: "pending" | "processing" | "done" | "failed";
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ArticleSchema: Schema = new Schema(
    {
        articleId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        content: {
            type: String,
            required: true,
        },
        summaryShort: {
            type: String,
            required: false,
        },
        summaryLong: {
            type: String,
            required: false,
        },
        keywords: {
            type: [String],
            required: false,
        },
        status: {
            type: String,
            enum: ["pending", "processing", "done", "failed"],
            required: true,
            default: "pending",
            index: true,
        },
        errorMessage: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

const Article = mongoose.model<IArticle>("Article", ArticleSchema);

export default Article;

