import { prisma } from '../../lib/prisma.js';
import { hashPassword, comparePassword } from '../../utils/password.util.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.util.js';
import { Prisma, Gender } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import crypto from 'crypto';

interface RegisterData {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  extraField?: {
    dateOfBirth?: string;
    gender?: string;
    specialization?: string;
    licenseNumber?: string;
    departmentId?: string;
  };
}

export class AuthService {
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async registerUser(userData: RegisterData, requestId: string) {
    const { email, password, role, firstName, lastName, extraField } = userData;

    if (role === "ADMIN") throw new Error("ADMIN_REGISTRATION_NOT_ALLOWED");

    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw new Error("INVALID_ROLE");

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error("USER_ALREADY_EXISTS");

    const hashedPassword = await hashPassword(password);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            role: { connect: { id: roleRecord.id } }
          }
        });

        switch (role) {
          case "PATIENT":
            await tx.patient.create({
              data: {
                userId: newUser.id,
                firstName,
                lastName,
                dateOfBirth: new Date(extraField?.dateOfBirth ?? "2000-01-01"),
                gender: (extraField?.gender as Gender) ?? Gender.PREFER_NOT_TO_SAY
              }
            });
            break;

          case "DOCTOR":
            if (!extraField?.departmentId) throw new Error("DEPARTMENT_REQUIRED");
            await tx.doctor.create({
              data: {
                userId: newUser.id,
                firstName,
                lastName,
                specialization: extraField.specialization ?? "GENERAL_MEDICINE",
                licenseNumber: extraField.licenseNumber ?? `LIC-${Date.now()}`,
                departmentId: extraField.departmentId
              }
            });
            break;

          default:
            throw new Error("INVALID_ROLE_MAPPING");
        }

        const rt = generateRefreshToken({ userId: newUser.id });
        await tx.refreshToken.create({
          data: {
            tokenHash: this.hashToken(rt),
            userId: newUser.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        });

        return { newUser, refreshToken: rt };
      });

      const accessToken = generateAccessToken({ userId: result.newUser.id });

      logger.info("Registration and Session Success", { requestId, userId: result.newUser.id });

      return {
        user: { id: result.newUser.id, email: result.newUser.email, role },
        accessToken,
        refreshToken: result.refreshToken
      };
    } catch (error: any) {
      logger.error("Auth Service Registration Error", { requestId, error: error.message });
      throw error;
    }
  }

  async loginUser(credentials: any, ip: string | undefined, ua: string | undefined, requestId: string) {
    const { email, password } = credentials;
    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      logger.warn("Login blocked: Account Locked", { requestId, email });
      throw new Error("ACCOUNT_LOCKED");
    }

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      if (user) {
        const attempts = user.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
          }
        });
      }
      logger.warn("Auth Failed: Invalid Credentials", { requestId, email });
      throw new Error("INVALID_CREDENTIALS");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });

    await prisma.loginHistory.create({ data: { userId: user.id, ipAddress: ip, userAgent: ua } });

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    logger.info("Login successful", { requestId, userId: user.id });

    return {
      user: { id: user.id, email: user.email, role: user.role.name },
      accessToken,
      refreshToken
    };
  }

  async logoutCurrentDevice(token: string, userId: string): Promise<void> {
    const result = await prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(token), userId: userId, isUsed: false },
      data: { isUsed: true, revokedAt: new Date() }
    });
    if (result.count === 0) throw new Error("TOKEN_INVALID_OR_UNAUTHORIZED");
  }
}