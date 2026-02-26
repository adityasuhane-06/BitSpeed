import { prisma } from "../config/database";
import { Contact } from "../generated/prisma/client";

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

/**
 * Core identity reconciliation service.
 *
 * Given an email and/or phone number, this function:
 * 1. Searches for existing contacts matching either field
 * 2. If no match: creates a new primary contact
 * 3. If matched to one group: creates a secondary contact if new info is present
 * 4. If matched to multiple groups: merges them — oldest stays primary, others become secondary
 *
 * All merge operations are wrapped in a Prisma transaction to ensure
 * data consistency and prevent race conditions.
 *
 * @param data - Object containing optional email and/or phoneNumber
 * @returns Consolidated contact response with primary ID, all emails, phones, and secondary IDs
 */
export async function identifyContact(
    data: IdentifyRequest
): Promise<IdentifyResponse> {
    const { email, phoneNumber } = data;

    // Build OR conditions for finding matching contacts
    const orConditions: Array<{ email?: string; phoneNumber?: string }> = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });

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

        return formatResponse(newContact, []);
    }

    // Resolve all primary contact IDs from matched contacts
    const primaryIds = new Set<number>();
    for (const contact of matchingContacts) {
        if (contact.linkPrecedence === "primary") {
            primaryIds.add(contact.id);
        } else if (contact.linkedId) {
            primaryIds.add(contact.linkedId);
        }
    }

    // Fetch all primary contacts, ordered by creation date
    const primaryContacts = await prisma.contact.findMany({
        where: {
            id: { in: Array.from(primaryIds) },
            deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
    });

    let truePrimary = primaryContacts[0];

    // CASE 2: Multiple primaries found — merge them in a transaction
    // The oldest primary stays, newer ones become secondary
    if (primaryContacts.length > 1) {
        const [oldest, ...others] = primaryContacts;
        truePrimary = oldest;

        await prisma.$transaction(async (tx) => {
            for (const otherPrimary of others) {
                // Demote the newer primary to secondary
                await tx.contact.update({
                    where: { id: otherPrimary.id },
                    data: {
                        linkedId: truePrimary.id,
                        linkPrecedence: "secondary",
                    },
                });

                // Re-link all its secondaries to the true primary
                await tx.contact.updateMany({
                    where: {
                        linkedId: otherPrimary.id,
                        deletedAt: null,
                    },
                    data: {
                        linkedId: truePrimary.id,
                    },
                });
            }
        });
    }

    // CASE 3: Check if we need to create a new secondary contact
    // (incoming request has info not yet in the contact group)
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

    const secondaries = allContacts.filter((c) => c.id !== truePrimary.id);
    return formatResponse(truePrimary, secondaries);
}

/**
 * Formats the consolidated contact response.
 * Ensures primary contact's email and phone appear first in their arrays,
 * and de-duplicates values.
 */
function formatResponse(
    primary: Contact,
    secondaries: Contact[]
): IdentifyResponse {
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

    // Primary first
    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

    // Then secondaries
    for (const contact of secondaries) {
        if (contact.email && !emails.includes(contact.email)) {
            emails.push(contact.email);
        }
        if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
            phoneNumbers.push(contact.phoneNumber);
        }
        secondaryContactIds.push(contact.id);
    }

    return {
        contact: {
            primaryContatctId: primary.id,
            emails,
            phoneNumbers,
            secondaryContactIds,
        },
    };
}
