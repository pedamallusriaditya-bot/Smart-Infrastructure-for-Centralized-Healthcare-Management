import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { DoctorService } from "@/modules/doctor/doctor.service.js";
import { prisma } from "@/lib/prisma.js";

// Mock the prisma client using the exact path your service uses
jest.mock("@/lib/prisma.js", () => ({
    prisma: {
        doctor: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
    },
}));

describe("DoctorService", () => {
    let doctorService: DoctorService;

    beforeEach(() => {
        doctorService = new DoctorService();
        jest.clearAllMocks();
    });

    describe("getDoctorProfileByUserId", () => {
        test("should return doctor profile", async () => {
            const doctor = {
                id: "doctor1",
                userId: "user1",
                firstName: "John",
                lastName: "Doe",
                specialization: "Cardiology",
                user: { email: "john@test.com", createdAt: new Date() },
                appointments: []
            };

            // Explicit cast to jest.Mock to satisfy TS type checking
            (prisma.doctor.findUnique as jest.Mock).mockResolvedValue(doctor); 

            const result = await doctorService.getDoctorProfileByUserId("user1");
            expect(result).toEqual(doctor);
            expect(prisma.doctor.findUnique).toHaveBeenCalled();
        });

        test("should throw if doctor not found", async () => {
            (prisma.doctor.findUnique as jest.Mock).mockResolvedValue(null);
            await expect(doctorService.getDoctorProfileByUserId("user1"))
                .rejects.toThrow("Doctor profile not found");
        });
    });

    describe("getAllDoctors", () => {
        test("should return all doctors", async () => {
            const doctors = [{
                id: "1",
                firstName: "John",
                lastName: "Doe",
                specialization: "Cardiology",
                licenseNumber: "LIC100"
            }];

            (prisma.doctor.findMany as jest.Mock).mockResolvedValue(doctors);
            const result = await doctorService.getAllDoctors();
            expect(result).toEqual(doctors);
        });
    });
});