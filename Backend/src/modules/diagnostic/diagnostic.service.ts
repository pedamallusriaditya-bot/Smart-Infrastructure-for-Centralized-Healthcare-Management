import { prisma } from '../../lib/prisma.js';
import { TestType, AvailabilityStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../utils/auditHelper.js';

const ALL_TESTS = Object.values(TestType);

export class DiagnosticService {
  /**
   * Resolve Admin Hospital ID
   */
  private async getAdminHospital(adminUserId: string) {
    const admin = await prisma.admin.findUnique({
      where: { userId: adminUserId }
    });
    if (!admin || !admin.hospitalId) throw new Error("ADMIN_NOT_ASSIGNED_TO_HOSPITAL");
    return admin.hospitalId;
  }

  /**
   * Haversine Distance computation
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Get all diagnostic availabilities for a specific hospital (auto-initializes missing records)
   */
  async getHospitalDiagnostics(hospitalId: string) {
    const existing = await prisma.diagnosticAvailability.findMany({
      where: { hospitalId },
      orderBy: { testType: 'asc' }
    });

    const existingTypes = existing.map(e => e.testType);
    const missing = ALL_TESTS.filter(t => !existingTypes.includes(t));

    if (missing.length > 0) {
      await prisma.diagnosticAvailability.createMany({
        data: missing.map(testType => ({
          hospitalId,
          testType,
          status: AvailabilityStatus.AVAILABLE,
          cost: 0.0
        }))
      });

      return prisma.diagnosticAvailability.findMany({
        where: { hospitalId },
        orderBy: { testType: 'asc' }
      });
    }

    return existing;
  }

  /**
   * Get own hospital diagnostics (for Hospital Admin)
   */
  async getOwnHospitalDiagnostics(adminUserId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    return this.getHospitalDiagnostics(hospitalId);
  }

  /**
   * Update diagnostics availability (for Hospital Admin)
   */
  async updateHospitalDiagnostics(
    adminUserId: string,
    updates: Array<{ testType: TestType; status: AvailabilityStatus; cost?: number }>
  ) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const oldRecords = await prisma.diagnosticAvailability.findMany({
      where: { hospitalId }
    });

    const updatedRecords = [];

    for (const update of updates) {
      const rec = await prisma.diagnosticAvailability.upsert({
        where: {
          hospitalId_testType: {
            hospitalId,
            testType: update.testType
          }
        },
        update: {
          status: update.status,
          cost: update.cost ?? 0.0
        },
        create: {
          hospitalId,
          testType: update.testType,
          status: update.status,
          cost: update.cost ?? 0.0
        }
      });
      updatedRecords.push(rec);
    }

    // Write audit log
    await writeAuditLog(
      adminUserId,
      'UPDATE_DIAGNOSTICS_AVAILABILITY',
      'DiagnosticAvailability',
      hospitalId,
      oldRecords,
      updatedRecords
    );

    logger.info("Diagnostics availability updated successfully", { hospitalId, count: updates.length });
    return updatedRecords;
  }

  /**
   * Compare availability of tests across all approved hospitals (for District Comparison Matrix)
   */
  async getDistrictComparison() {
    const hospitals = await prisma.hospital.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });

    const comparison = [];

    for (const h of hospitals) {
      // Ensure all 12 tests exist / are auto-initialized for consistency
      const diagnostics = await this.getHospitalDiagnostics(h.id);
      comparison.push({
        id: h.id,
        name: h.name,
        type: h.type,
        district: h.district,
        state: h.state,
        latitude: h.latitude,
        longitude: h.longitude,
        diagnostics
      });
    }

    return comparison;
  }

  /**
   * Lookup status of a test at a hospital. 
   * If unavailable/maintenance/referral, automatically recommends the nearest hospital that has it as AVAILABLE.
   */
  async lookupDiagnosticTest(hospitalId: string, testType: TestType) {
    // 1. Resolve target hospital details and requested test status
    const [targetHospital, records] = await Promise.all([
      prisma.hospital.findUnique({ where: { id: hospitalId } }),
      this.getHospitalDiagnostics(hospitalId)
    ]);

    if (!targetHospital) throw new Error("HOSPITAL_NOT_FOUND");

    const targetRecord = records.find(r => r.testType === testType);
    if (!targetRecord) throw new Error("DIAGNOSTIC_RECORD_NOT_FOUND");

    // 2. If available, return status immediately
    if (targetRecord.status === AvailabilityStatus.AVAILABLE) {
      return {
        status: targetRecord.status,
        cost: targetRecord.cost,
        recommendedAlternative: null
      };
    }

    // 3. Look up other active hospitals where this test is AVAILABLE
    const otherAvailableRecords = await prisma.diagnosticAvailability.findMany({
      where: {
        testType,
        status: AvailabilityStatus.AVAILABLE,
        hospitalId: { not: hospitalId },
        hospital: { status: 'ACTIVE' }
      },
      include: {
        hospital: true
      }
    });

    // 4. Compute distances if coordinate metrics are populated
    let nearest: any = null;
    let minDistance = Infinity;

    if (targetHospital.latitude != null && targetHospital.longitude != null) {
      for (const rec of otherAvailableRecords) {
        const h = rec.hospital;
        if (h.latitude != null && h.longitude != null) {
          const dist = this.calculateDistance(
            targetHospital.latitude,
            targetHospital.longitude,
            h.latitude,
            h.longitude
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearest = {
              id: h.id,
              name: h.name,
              type: h.type,
              address: h.address,
              phone: h.phone,
              distance: dist,
              cost: rec.cost
            };
          }
        }
      }
    }

    // 5. Fallback recommendation: same district if coordinates are missing or nearest hospital not resolved
    if (!nearest && otherAvailableRecords.length > 0) {
      // Find first one in same district if matching, or just the first available hospital
      const sameDistrict = otherAvailableRecords.find(
        rec => rec.hospital.district === targetHospital.district
      );
      const chosen = sameDistrict || otherAvailableRecords[0];
      nearest = {
        id: chosen.hospital.id,
        name: chosen.hospital.name,
        type: chosen.hospital.type,
        address: chosen.hospital.address,
        phone: chosen.hospital.phone,
        distance: null, // distance unknown
        cost: chosen.cost
      };
    }

    return {
      status: targetRecord.status,
      cost: targetRecord.cost,
      recommendedAlternative: nearest
    };
  }
}
