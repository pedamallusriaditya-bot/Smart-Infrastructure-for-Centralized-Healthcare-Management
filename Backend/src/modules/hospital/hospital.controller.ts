import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { hashPassword } from '../../utils/password.util.js';
import { LocationService } from '../../services/location.service.js';

/**
 * PATH: GET /api/v1/hospitals
 */
export const getHospitals = async (_req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      select: { id: true, name: true, address: true, phone: true }
    });
    return successResponse(res, "Hospitals list fetched", hospitals, 200);
  } catch (error) {
    return errorResponse(res, "Failed to load hospitals", 500);
  }
};

/**
 * PATH: GET /api/v1/hospitals/:hospitalId/departments
 */
export const getDepartmentsByHospital = async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  try {
    const departments = await prisma.department.findMany({
      where: { hospitalId: hospitalId },
      select: { id: true, name: true, status: true }
    });
    
    console.log(`🔍 Found ${departments.length} departments for Hospital: ${hospitalId}`);
    return successResponse(res, "Departments list fetched", departments, 200);
  } catch (error) {
    return errorResponse(res, "Invalid Hospital ID or Database Error", 400);
  }
};

/**
 * PATH: GET /api/v1/hospitals/:hospitalId/rooms
 * Security: If the caller is an ADMIN, they may only access their own hospital's rooms.
 * The district.middleware.ts `requireAdminOwnHospital` guard handles this on the route level.
 * This handler applies a secondary in-controller check for defence-in-depth.
 */
export const getHospitalRoomsAndBeds = async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  try {
    // Defence-in-depth: If ADMIN, double-check hospital ownership at handler level
    if (req.user?.role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { userId: req.user.id } });
      if (!admin || admin.hospitalId !== hospitalId) {
        return errorResponse(res, "Access Denied: You can only view your own hospital's rooms.", 403, "CROSS_HOSPITAL_ACCESS");
      }
    }

    const rooms = await prisma.room.findMany({
      where: { hospitalId },
      include: {
        beds: {
          where: { status: 'AVAILABLE' }
        }
      }
    });
    return successResponse(res, "Hospital rooms and beds fetched", rooms, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load rooms and beds: " + error.message, 500);
  }
};

/**
 * PATH: GET /api/v1/hospitals/all-detail (Super Admin only)
 */
export const getAllHospitalsFull = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const hospitals = await prisma.hospital.findMany({
      include: {
        departments: { select: { id: true, name: true, status: true } },
        admins: { select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } } },
        _count: { select: { rooms: true, emergencies: true } }
      }
    });
    return successResponse(res, "Detailed hospitals list retrieved.", hospitals, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load hospital directories: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/hospitals (Super Admin only)
 */
export const createHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const { name, address, phone } = req.body;
    if (!name || !address) {
      return errorResponse(res, "Hospital name and address are required.", 400);
    }

    let latitude = null;
    let longitude = null;
    try {
      const coords = await LocationService.geocode(address);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (err: any) {
      console.error("Hospital Geocoding failed:", err.message);
    }

    const hospital = await prisma.hospital.create({
      data: { name, address, phone, latitude, longitude }
    });
    return successResponse(res, "Hospital successfully registered.", hospital, 201);
  } catch (error: any) {
    return errorResponse(res, "Creation failed: " + error.message, 500);
  }
};

/**
 * PATH: DELETE /api/v1/hospitals/:id (Super Admin only)
 */
export const deleteHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const { id } = req.params;
    await prisma.hospital.delete({ where: { id } });
    return successResponse(res, "Hospital facility removed successfully.", null, 200);
  } catch (error: any) {
    return errorResponse(res, "Deletion failed: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/hospitals/:hospitalId/admin (Super Admin only)
 */
export const assignHospitalAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const { hospitalId } = req.params;
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return errorResponse(res, "Missing administrator credentials or name.", 400);
    }

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      return errorResponse(res, "System Configuration Error: ADMIN role missing.", 500);
    }

    const hashedPassword = await hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          roleId: adminRole.id
        }
      });
      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          hospitalId,
          firstName,
          lastName
        }
      });
      return admin;
    });

    return successResponse(res, "Hospital administrator successfully assigned.", result, 201);
  } catch (error: any) {
    if (error.message.includes("Unique constraint")) {
      return errorResponse(res, "An account with this email address already exists.", 400);
    }
    return errorResponse(res, "Assignment failed: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/hospitals/register-public
 */
export const registerPublicHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    const { 
      hospitalName, 
      hospitalType, 
      address, 
      district, 
      state, 
      pincode, 
      phone, 
      email, // Hospital Email
      firstName, 
      lastName, 
      adminEmail, 
      mobileNumber, 
      password 
    } = req.body;
    
    if (!hospitalName || !hospitalType || !address || !district || !state || !pincode || !email || !firstName || !lastName || !adminEmail || !mobileNumber || !password) {
      return errorResponse(res, "Missing hospital details or administrator credentials.", 400);
    }

    // 1. Check duplicate Hospital Name
    const existingHospitalName = await prisma.hospital.findFirst({
      where: { name: { equals: hospitalName, mode: 'insensitive' } }
    });
    if (existingHospitalName) {
      return errorResponse(res, "A hospital facility with this name is already registered.", 409);
    }

    // 2. Check duplicate Hospital Email
    const existingHospitalEmail = await prisma.hospital.findUnique({
      where: { email }
    });
    if (existingHospitalEmail) {
      return errorResponse(res, "A hospital facility with this email is already registered.", 409);
    }

    // 3. Check duplicate Admin Email
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return errorResponse(res, "The administrator email address is already in use.", 409);
    }

    // 4. Check duplicate Admin Mobile/Phone
    const existingAdminPhone = await prisma.admin.findUnique({
      where: { mobileNumber }
    });
    if (existingAdminPhone) {
      return errorResponse(res, "This mobile number is already in use by another administrator.", 409);
    }

    // Geocode coordinates
    let latitude = null;
    let longitude = null;
    try {
      const coords = await LocationService.geocode(address);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (err: any) {
      console.error("Public Hospital self-registration geocoding failed:", err.message);
    }

    // Find admin role
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      return errorResponse(res, "System Configuration Error: ADMIN role missing.", 500);
    }

    const hashedPassword = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Hospital in PENDING_APPROVAL status
      const hospital = await tx.hospital.create({
        data: {
          name: hospitalName,
          type: hospitalType,
          address,
          district,
          state,
          pincode,
          phone,
          email,
          latitude,
          longitude,
          status: 'PENDING_APPROVAL'
        }
      });

      // 2. Create User in INACTIVE status
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          roleId: adminRole.id,
          status: 'INACTIVE'
        }
      });

      // 3. Create Admin record linked to user & hospital
      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          hospitalId: hospital.id,
          firstName,
          lastName,
          mobileNumber
        }
      });

      return { hospital, user, admin };
    });

    // Send notifications to Application Admins
    const appAdmins = await prisma.user.findMany({
      where: { role: { name: 'APPLICATION_ADMIN' } }
    });

    await Promise.all(
      appAdmins.map(adminUser => 
        prisma.notification.create({
          data: {
            userId: adminUser.id,
            title: 'New Hospital Registration',
            message: `A new hospital "${hospitalName}" (${hospitalType}) in ${district}, ${state} is pending approval.`,
            type: 'SYSTEM'
          }
        }).catch(err => console.error("Notification fail for App Admin:", err.message))
      )
    );

    // Send notification to the newly registered Hospital Admin user
    await prisma.notification.create({
      data: {
        userId: result.user.id,
        title: 'Registration Submitted',
        message: `Your hospital registration for "${hospitalName}" has been successfully submitted and is under review.`,
        type: 'SYSTEM'
      }
    }).catch(err => console.error("Notification fail for Hospital Admin:", err.message));

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: 'REGISTER_HOSPITAL_PUBLIC',
        entity: 'Hospital',
        entityId: result.hospital.id,
        newData: result.hospital,
        details: { status: 'PENDING_APPROVAL', reason: 'Hospital Registered' }
      }
    });

    return successResponse(res, "Hospital registered successfully and is awaiting review.", {
      hospital: result.hospital,
      adminEmail: result.user.email
    }, 201);
  } catch (error: any) {
    return errorResponse(res, "Public hospital registration failed: " + error.message, 500);
  }
};