/**
 * Custom application error class with HTTP status code support.
 * Extends the native Error class to carry a status code for
 * consistent error responses in the API.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(message, 404);
    }
}
