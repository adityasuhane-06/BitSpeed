import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { config } from "../config";

/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers and sends
 * a consistent JSON error response.
 *
 * - Operational errors (AppError): returns the error message and status code
 * - Unexpected errors: returns 500 with a generic message in production
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Unexpected errors — log full details, return generic message
    console.error("Unexpected error:", err);
    res.status(500).json({
        success: false,
        error: config.isProduction
            ? "Internal server error"
            : err.message || "Internal server error",
    });
}
