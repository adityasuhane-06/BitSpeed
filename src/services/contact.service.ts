import "dotenv/config";
import { PrismaClient, Contact } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Create a pg Pool with SSL support for Render PostgreSQL
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Create the PostgreSQL adapter using the Pool
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface IdentifyRequest {
    email?: string | null;
    phoneNumber?: string | null;
}

interface IdentifyResponse {
    contact: {
        primaryContatctId: number;
        emails: string[];
        phoneNumbers: string[];
        secondaryContactIds: number[];
    };
}

export async function identifyContact(
    data: IdentifyRequest
): Promise<IdentifyResponse> {
    const { email, phoneNumber } = data;

    // Build OR conditions for finding matching contacts
    const orConditions: Array<{ email?: string; phoneNumber?: string }> = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });

    // If no valid input, throw
    if (orConditions.length === 0) {
        throw new Error("At least one of email or phoneNumber must be provided");
    }

    // Find all contacts matching email OR phoneNumber
    const matchingContacts = await prisma.contact.findMany({
        where: {
            OR: orConditions,
            deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
    });

    // CASE 1: No matches — create a new primary contact
    if (matchingContacts.length === 0) {
        const newContact = await prisma.contact.create({
            data: {
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkPrecedence: "primary",
            },
        });

        return {
            contact: {
                primaryContatctId: newContact.id,
                emails: newContact.email ? [newContact.email] : [],
                phoneNumbers: newContact.phoneNumber
                    ? [newContact.phoneNumber]
                    : [],
                secondaryContactIds: [],
            },
        };
    }

    // Find all primary contact IDs (resolve linkedId chains)
    const primaryIds = new Set<number>();
    for (const contact of matchingContacts) {
        if (contact.linkPrecedence === "primary") {
            primaryIds.add(contact.id);
        } else if (contact.linkedId) {
            primaryIds.add(contact.linkedId);
        }
    }

    // Fetch all primary contacts
    const primaryContacts = await prisma.contact.findMany({
        where: {
            id: { in: Array.from(primaryIds) },
            deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
    });

    // The oldest primary is the true primary
    let truePrimary = primaryContacts[0];

    // CASE 2: Multiple primaries need to be merged — older stays primary, newer becomes secondary
    if (primaryContacts.length > 1) {
        const [oldest, ...others] = primaryContacts;
        truePrimary = oldest;

        for (const otherPrimary of others) {
            // Turn the newer primary into a secondary
            await prisma.contact.update({
                where: { id: otherPrimary.id },
                data: {
                    linkedId: truePrimary.id,
                    linkPrecedence: "secondary",
                },
            });

            // Re-link all secondaries of the newer primary to the true primary
            await prisma.contact.updateMany({
                where: {
                    linkedId: otherPrimary.id,
                    deletedAt: null,
                },
                data: {
                    linkedId: truePrimary.id,
                },
            });
        }
    }

    // Check if we need to create a new secondary contact
    // (incoming request has new info not in any existing contact)
    if (email && phoneNumber) {
        const allLinkedContacts = await prisma.contact.findMany({
            where: {
                OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
                deletedAt: null,
            },
        });

        const existingEmails = new Set(
            allLinkedContacts
                .map((c: Contact) => c.email)
                .filter((e): e is string => e !== null)
        );
        const existingPhones = new Set(
            allLinkedContacts
                .map((c: Contact) => c.phoneNumber)
                .filter((p): p is string => p !== null)
        );

        const hasNewInfo =
            !existingEmails.has(email) || !existingPhones.has(phoneNumber);

        // Only create secondary if the exact combination doesn't already exist
        const exactMatch = allLinkedContacts.find(
            (c: Contact) => c.email === email && c.phoneNumber === phoneNumber
        );

        if (hasNewInfo && !exactMatch) {
            await prisma.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkedId: truePrimary.id,
                    linkPrecedence: "secondary",
                },
            });
        }
    }

    // Fetch the final consolidated state
    const allContacts = await prisma.contact.findMany({
        where: {
            OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
            deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
    });

    // Build the response
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

    for (const contact of allContacts) {
        if (contact.email && !emails.includes(contact.email)) {
            emails.push(contact.email);
        }
        if (
            contact.phoneNumber &&
            !phoneNumbers.includes(contact.phoneNumber)
        ) {
            phoneNumbers.push(contact.phoneNumber);
        }
        if (contact.id !== truePrimary.id) {
            secondaryContactIds.push(contact.id);
        }
    }

    return {
        contact: {
            primaryContatctId: truePrimary.id,
            emails,
            phoneNumbers,
            secondaryContactIds,
        },
    };
}

export { prisma };
