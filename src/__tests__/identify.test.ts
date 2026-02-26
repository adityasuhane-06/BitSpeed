import request from "supertest";
import app from "../index";
import { prisma } from "../config/database";

/**
 * Integration tests for the /identify endpoint.
 * Tests all scenarios from the Bitespeed task spec:
 * - New contact creation
 * - Secondary contact creation
 * - Primary turnover (merging two primary groups)
 * - Email-only and phone-only lookups
 * - Input validation
 */
describe("POST /identify", () => {
    // Clean the database before each test suite run
    beforeAll(async () => {
        await prisma.contact.deleteMany({});
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe("New Contact Creation", () => {
        it("should create a new primary contact when no match exists", async () => {
            const res = await request(app)
                .post("/identify")
                .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" })
                .expect(200);

            expect(res.body.contact).toBeDefined();
            expect(res.body.contact.primaryContatctId).toBeDefined();
            expect(res.body.contact.emails).toEqual(["lorraine@hillvalley.edu"]);
            expect(res.body.contact.phoneNumbers).toEqual(["123456"]);
            expect(res.body.contact.secondaryContactIds).toEqual([]);
        });
    });

    describe("Secondary Contact Creation", () => {
        it("should create a secondary contact when phone matches but email is new", async () => {
            const res = await request(app)
                .post("/identify")
                .send({ email: "mcfly@hillvalley.edu", phoneNumber: "123456" })
                .expect(200);

            expect(res.body.contact.emails).toContain("lorraine@hillvalley.edu");
            expect(res.body.contact.emails).toContain("mcfly@hillvalley.edu");
            expect(res.body.contact.phoneNumbers).toEqual(["123456"]);
            expect(res.body.contact.secondaryContactIds.length).toBe(1);
        });

        it("should not create duplicate secondary for same info", async () => {
            const res = await request(app)
                .post("/identify")
                .send({ email: "mcfly@hillvalley.edu", phoneNumber: "123456" })
                .expect(200);

            // Should still be 1 secondary, not 2
            expect(res.body.contact.secondaryContactIds.length).toBe(1);
        });
    });

    describe("Lookup (No New Contact)", () => {
        it("should return consolidated contact for email-only lookup", async () => {
            const res = await request(app)
                .post("/identify")
                .send({ email: "lorraine@hillvalley.edu" })
                .expect(200);

            expect(res.body.contact.emails).toContain("lorraine@hillvalley.edu");
            expect(res.body.contact.emails).toContain("mcfly@hillvalley.edu");
            expect(res.body.contact.phoneNumbers).toEqual(["123456"]);
        });

        it("should return consolidated contact for phone-only lookup", async () => {
            const res = await request(app)
                .post("/identify")
                .send({ phoneNumber: "123456" })
                .expect(200);

            expect(res.body.contact.emails).toContain("lorraine@hillvalley.edu");
            expect(res.body.contact.emails).toContain("mcfly@hillvalley.edu");
        });
    });

    describe("Primary Turnover", () => {
        it("should merge two separate primaries when linked by a new request", async () => {
            // Create two separate primary contacts
            await request(app)
                .post("/identify")
                .send({ email: "george@hillvalley.edu", phoneNumber: "919191" })
                .expect(200);

            await request(app)
                .post("/identify")
                .send({ email: "biffsucks@hillvalley.edu", phoneNumber: "717171" })
                .expect(200);

            // Link them — george's email + biff's phone
            const res = await request(app)
                .post("/identify")
                .send({ email: "george@hillvalley.edu", phoneNumber: "717171" })
                .expect(200);

            // Oldest primary should stay
            expect(res.body.contact.emails).toContain("george@hillvalley.edu");
            expect(res.body.contact.emails).toContain("biffsucks@hillvalley.edu");
            expect(res.body.contact.phoneNumbers).toContain("919191");
            expect(res.body.contact.phoneNumbers).toContain("717171");
            expect(res.body.contact.secondaryContactIds.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Input Validation", () => {
        it("should return 400 when neither email nor phoneNumber is provided", async () => {
            const res = await request(app)
                .post("/identify")
                .send({})
                .expect(400);

            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });

        it("should return 400 for invalid email format", async () => {
            const res = await request(app)
                .post("/identify")
                .send({ email: "not-an-email" })
                .expect(400);

            expect(res.body.success).toBe(false);
        });

        it("should handle numeric phoneNumber by converting to string", async () => {
            const res = await request(app)
                .post("/identify")
                .send({ email: "numeric@test.com", phoneNumber: 555555 })
                .expect(200);

            expect(res.body.contact.phoneNumbers).toContain("555555");
        });
    });

    describe("Health Check", () => {
        it("GET / should return status ok", async () => {
            const res = await request(app).get("/").expect(200);
            expect(res.body.status).toBe("ok");
        });
    });
});
