import { AuthService } from "../src/modules/auth/auth.service.js";
import { prisma } from "../src/lib/prisma.js";
import * as passwordUtils from "../src/utils/password.util.js";
import * as tokenUtils from "../src/utils/token.util.js";
import { logger } from "../src/lib/logger.js";

jest.mock("../src/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        role: { findUnique: jest.fn() },
        patient: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        doctor: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        refreshToken: {
            create: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        loginHistory: { create: jest.fn() },
        $transaction: jest.fn(),
    },
}));

jest.mock("../src/utils/password.util", () => ({
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
}));

jest.mock("../src/utils/token.util", () => ({
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
}));

jest.mock("../src/lib/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

describe("AuthService", () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
        jest.clearAllMocks();

        (tokenUtils.generateAccessToken as jest.Mock).mockReturnValue("mock-access-token");
        (tokenUtils.generateRefreshToken as jest.Mock).mockReturnValue("mock-refresh-token");
        (passwordUtils.hashPassword as jest.Mock).mockResolvedValue("hashed-password");
        (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("registerUser", () => {
        const requestId = "req-123";
        const patientData = {
            email: "patient@test.com",
            password: "Password123",
            role: "PATIENT",
            firstName: "John",
            lastName: "Doe",
            extraField: { dateOfBirth: "2000-01-01", gender: "MALE" }
        };

        test("should register a patient successfully", async () => {
            (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: "role-patient", name: "PATIENT" });
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                const tx = {
                    user: { create: jest.fn().mockResolvedValue({ id: "user-1", email: patientData.email }) },
                    patient: { create: jest.fn().mockResolvedValue({}) }
                };
                return callback(tx);
            });
            (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

            const result = await authService.registerUser(patientData, requestId);

            expect(passwordUtils.hashPassword).toHaveBeenCalledWith("Password123");
            expect(result.user.email).toBe(patientData.email);
            // Verify logger call to satisfy dependency requirement
            expect(logger.info).toHaveBeenCalled();
        });
    });

    describe("loginUser", () => {
        const requestId = "req-001";
        const mockUser = {
            id: "user-1",
            email: "user@test.com",
            passwordHash: "hashed-password",
            failedLoginAttempts: 0,
            lockedUntil: null,
            role: { id: "role-1", name: "PATIENT" }
        };

        test("should login successfully", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.user.update as jest.Mock).mockResolvedValue({});
            (prisma.loginHistory.create as jest.Mock).mockResolvedValue({});
            (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

            const result = await authService.loginUser({ email: "user@test.com", password: "Password123" }, "127.0.0.1", "Jest", requestId);

            expect(result.accessToken).toBe("mock-access-token");
            expect(logger.info).toHaveBeenCalled();
        });
    });

    describe("logoutCurrentDevice", () => {
        test("should revoke refresh token successfully", async () => {
            (prisma.refreshToken.update as jest.Mock).mockResolvedValue({});
            await expect(authService.logoutCurrentDevice("mock-refresh-token")).resolves.not.toThrow();
        });
    });

    describe("logoutAllDevices", () => {
        test("should revoke all refresh tokens", async () => {
            (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
            await expect(authService.logoutAllDevices("user-1")).resolves.not.toThrow();
            expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
        });
    });
});