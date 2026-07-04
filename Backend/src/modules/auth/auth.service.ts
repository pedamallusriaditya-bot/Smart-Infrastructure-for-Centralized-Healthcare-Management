import { prisma } from '../../lib/prisma.js';
import { hashPassword, comparePassword } from '../../utils/password.util.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.util.js';
import { Prisma, Gender, ApprovalStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import crypto from 'crypto';

export class AuthService {
  /**
   * Securely hashes the plain refresh token before storing it in the DB.
   * This ensures that if the database is leaked, attackers cannot hijack sessions.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * [PIPELINE] Comprehensive User Registration
   * Includes uniqueness checks for Email AND Phone (Patients).
   * Atomically creates User, Profile, and initial session.
   */
  async registerUser(userData: any, requestId: string) {
    const { email, password, role, firstName, lastName, extraField } = userData;

    if (role === "ADMIN") throw new Error("ADMIN_REGISTRATION_NOT_ALLOWED");

    // 1. UNIQUE INTEGRITY CHECK: Email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error("USER_ALREADY_EXISTS");

    // 2. UNIQUE INTEGRITY CHECK: Phone (Specific to Patients)
    if (role === 'PATIENT' && extraField?.phone) {
      const existingPhone = await prisma.patient.findUnique({ 
        where: { phone: extraField.phone } 
      });
      if (existingPhone) throw new Error("PHONE_ALREADY_REGISTERED");
    }

    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw new Error("INVALID_ROLE");

    const hashedPassword = await hashPassword(password);

    // ATOMIC TRANSACTION: Ensuring All-or-Nothing database integrity
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Create Login Identity
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          role: { connect: { id: roleRecord.id } }
        }
      });

      // Step B: Create Role-Specific Metadata
      if (role === "PATIENT") {
        await tx.patient.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            dateOfBirth: new Date(extraField?.dateOfBirth ?? "2000-01-01"),
            gender: (extraField?.gender as Gender) ?? Gender.PREFER_NOT_TO_SAY,
            phone: extraField?.phone || null,
            bloodGroup: extraField?.bloodGroup || null
          }
        });
      } else if (role === "DOCTOR") {
        if (!extraField?.departmentId || !extraField?.licenseNumber) {
           throw new Error("DEPARTMENT_REQUIRED");
        }
        await tx.doctor.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            specialization: extraField.specialization || "GENERAL_MEDICINE",
            licenseNumber: extraField.licenseNumber,
            departmentId: extraField.departmentId,
            approvalStatus: ApprovalStatus.PENDING // Standard hospital policy
          }
        });
      }

      // Step C: Initialize Session Tokens
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

    logger.info("Auth Pipeline: Registration Successful", { requestId, userId: result.newUser.id, role });
    
    return {
      user: { id: result.newUser.id, email: result.newUser.email, role },
      accessToken: generateAccessToken({ userId: result.newUser.id }),
      refreshToken: result.refreshToken
    };
  }

  /**
   * [PIPELINE] Secure Login
   * Includes account lockout logic and doctor credentialing gate.
   */
  async loginUser(credentials: any, ipAddress: string | undefined, userAgent: string | undefined, requestId: string) {
    const { email, password } = credentials;
    const user = await prisma.user.findUnique({ 
      where: { email }, 
      include: { role: true } 
    });

    if (!user) {
        logger.warn("Login failed: Unknown user", { requestId, email });
        throw new Error("INVALID_CREDENTIALS");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      logger.error("Login attempt blocked: Account locked", { requestId, email });
      throw new Error("ACCOUNT_LOCKED");
    }

    if (!(await comparePassword(password, user.passwordHash))) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
        }
      });
      throw new Error("INVALID_CREDENTIALS");
    }

    // --- DOCTOR CREDENTIALING GATE (Enterprise Check) ---
    if (user.role.name === 'DOCTOR') {
      const docProfile = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (docProfile?.approvalStatus === 'PENDING') {
        logger.warn("Gate access denied: Doctor pending verification", { requestId, userId: user.id });
        throw new Error("DOCTOR_PENDING_APPROVAL");
      }
      if (docProfile?.approvalStatus === 'REJECTED') {
        logger.error("Gate access denied: Doctor credential rejected", { requestId, userId: user.id });
        throw new Error("DOCTOR_ACCOUNT_REJECTED");
      }
    }

    // Success Path: Clear failures and update logs
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });

    await prisma.loginHistory.create({ data: { userId: user.id, ipAddress, userAgent } });

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    logger.info("Auth Pipeline: Access granted", { requestId, userId: user.id });
    return {
      user: { id: user.id, email: user.email, role: user.role.name },
      accessToken,
      refreshToken
    };
  }

  /**
   * [PIPELINE] Controlled Logout
   * Prevents IDOR by validating token ownership before revocation.
   */
  async logoutCurrentDevice(token: string, userId: string): Promise<void> {
    const hashedToLookup = this.hashToken(token);
    
    const result = await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashedToLookup,
        userId: userId, // CRITICAL IDENTITY SHIELD
        isUsed: false
      },
      data: {
        isUsed: true,
        revokedAt: new Date()
      }
    });

    if (result.count === 0) {
      throw new Error("TOKEN_INVALID_OR_ALREADY_REVOKED");
    }

    logger.info("Auth Pipeline: Session safely terminated", { userId });
  }
}