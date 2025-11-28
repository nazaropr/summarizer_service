import { Request, Response, NextFunction } from "express";
import { configs } from "../config/config";

/**
 * Basic Authentication middleware for protecting admin routes
 * Uses ADMIN_USER and ADMIN_PASSWORD from environment variables
 */
export function basicAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Admin Dashboard"');
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    // Extract credentials from Basic Auth header
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [username, password] = credentials.split(":");

    // Validate credentials
    if (username === configs.ADMIN_USER && password === configs.ADMIN_PASSWORD) {
        next();
    } else {
        res.setHeader("WWW-Authenticate", 'Basic realm="Admin Dashboard"');
        res.status(401).json({ error: "Unauthorized" });
    }
}

