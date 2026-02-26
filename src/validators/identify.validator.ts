import { z } from "zod";

/**
 * Zod schema for validating the /identify request body.
 * Ensures at least one of email or phoneNumber is provided,
 * and validates email format when present.
 */
export const identifySchema = z
    .object({
        email: z.string().email("Invalid email format").nullable().optional(),
        phoneNumber: z
            .union([z.string(), z.number()])
            .transform((val) => (val !== null && val !== undefined ? String(val) : null))
            .nullable()
            .optional(),
    })
    .refine((data) => data.email || data.phoneNumber, {
        message: "At least one of email or phoneNumber must be provided",
    });

export type IdentifyInput = z.infer<typeof identifySchema>;
