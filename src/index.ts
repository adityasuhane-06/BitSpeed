import express, { Request, Response } from "express";
import morgan from "morgan";
import { config } from "./config";
import { prisma } from "./config/database";
import contactRoutes from "./routes/contact.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// ─── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(morgan(config.isProduction ? "combined" : "dev"));

// ─── Routes ────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        message: "Bitespeed Identity Reconciliation Service",
    });
});

app.use(contactRoutes);

// ─── Error Handling ────────────────────────────────────────
app.use(errorHandler);

// ─── Server & Graceful Shutdown ────────────────────────────
const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port} [${config.nodeEnv}]`);
});

/**
 * Graceful shutdown handler.
 * Closes the HTTP server and disconnects Prisma before exiting.
 */
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        console.log("Database connection closed.");
        process.exit(0);
    });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
