import mongoose, { Schema, Document } from "mongoose";

export interface IArticle extends Document {
    articleId: string;
    content: string;
    summaryShort?: string;
    summaryLong?: string;
    keywords?: string[];
    status: "pending" | "processing" | "done" | "failed";
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
        },
        updatedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure updatedAt is set on save
ArticleSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

const Article = mongoose.model<IArticle>("Article", ArticleSchema);

export default Article;

