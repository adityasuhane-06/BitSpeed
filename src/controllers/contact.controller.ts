import { Request, Response, NextFunction } from "express";
import { identifySchema } from "../validators/identify.validator";
import { identifyContact } from "../services/contact.service";
import { ValidationError } from "../utils/errors";

/**
 * Controller for the /identify endpoint.
 * Handles request validation, delegates to the service layer,
 * and formats the response.
 */
export async function identify(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Validate request body with Zod
        const parsed = identifySchema.safeParse(req.body);

        if (!parsed.success) {
            const errorMessage = parsed.error.issues
                .map((e: { message: string }) => e.message)
                .join(", ");
            throw new ValidationError(errorMessage);
        }

        const { email, phoneNumber } = parsed.data;

        const result = await identifyContact({
            email: email || null,
            phoneNumber: phoneNumber ? String(phoneNumber) : null,
        });

        res.status(200).json(result);
    } catch (error) {
        next(error); // Pass to global error handler
    }
}
