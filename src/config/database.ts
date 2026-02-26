import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "./index";

/**
 * Creates and exports a configured Prisma client instance.
 * Uses pg.Pool with SSL for Render PostgreSQL compatibility.
 */
const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
