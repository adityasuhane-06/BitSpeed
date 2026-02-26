import "dotenv/config";
import express, { Request, Response } from "express";
import { identifyContact } from "./services/contact.service";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        message: "Bitespeed Identity Reconciliation Service",
    });
});

// Identity reconciliation endpoint
app.post("/identify", async (req: Request, res: Response) => {
    try {
        const { email, phoneNumber } = req.body;

        // Validate input — at least one must be provided
        if (!email && !phoneNumber) {
            res.status(400).json({
                error: "At least one of email or phoneNumber must be provided",
            });
            return;
        }

        const result = await identifyContact({
            email: email || null,
            phoneNumber: phoneNumber ? String(phoneNumber) : null,
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in /identify:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
