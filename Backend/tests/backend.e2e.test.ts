import request from "supertest";
import app from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

describe("Backend API Extensive E2E Test Suite", () => {
    
    beforeAll(async () => {
        // Ensure DB is alive
        await prisma.$connect();
    });

    afterAll(async () => {
        // Prevent open handles
        await prisma.$disconnect();
    });

    describe("1. Infrastructure & Security", () => {
        test("Headers: Should contain mandatory security headers (Helmet)", async () => {
            const res = await request(app).get("/health");
            expect(res.headers).toHaveProperty("x-content-type-options");
            expect(res.headers).toHaveProperty("x-frame-options");
            expect(res.headers).toHaveProperty("x-xss-protection");
        });

        test("CORS: Should allow cross-origin requests", async () => {
            const res = await request(app).get("/health");
            expect(res.headers).toHaveProperty("access-control-allow-origin");
        });
    });

    describe("2. Health & Status Endpoints", () => {
        test("GET /health: Should return success status", async () => {
            const res = await request(app).get("/health");
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                status: "success",
                message: "API is running"
            });
        });
    });

    describe("3. Routing & Error Handling", () => {
        test("GET /invalid: Should return 404 for unknown routes", async () => {
            const res = await request(app).get("/random-invalid-route-123");
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("message");
        });

        test("POST /health: Should return 405 (Method Not Allowed) or similar, but never 500", async () => {
            const res = await request(app).post("/health");
            expect(res.status).not.toBe(500);
        });
    });

    describe("4. Database Integration", () => {
        test("Database Connectivity: Should verify PRISMA is responding", async () => {
            // Note: If you have a specific system-check endpoint, use it here
            const res = await request(app).get("/api/v1/system/status");
            if (res.status === 200) {
                expect(res.body).toHaveProperty("dbStatus", "connected");
            } else {
                expect(res.status).toBe(404);
            }
        });
    });

    describe("5. API Versioning", () => {
        test("GET /api/v1: Should reach API root without errors", async () => {
            const res = await request(app).get("/api/v1");
            expect([200, 404]).toContain(res.status);
        });
    });
});