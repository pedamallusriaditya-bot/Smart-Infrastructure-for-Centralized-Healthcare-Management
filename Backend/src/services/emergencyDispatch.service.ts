/**
 * EmergencyDispatchService
 * Determines the nearest hospital for an emergency incident based on patient
 * coordinates and updates the emergency record accordingly.
 *
 * This service is deliberately lightweight – it only performs the nearest
 * hospital lookup and updates the `nearestHospitalId` (and `hospitalId` for
 * backward compatibility). Notification handling will be added in a later
 * phase.
 */
import { prisma } from '../lib/prisma.js';
import { DistanceService } from './distance.service.js';
import { Hospital, Emergency } from '@prisma/client';

export class EmergencyDispatchService {
  /**
   * Dispatch an emergency to the nearest hospital.
   * @param emergencyId The ID of the emergency incident.
   */
  static async dispatch(emergencyId: string): Promise<Emergency> {
    // Load the emergency including patient coordinates
    const emergency = await prisma.emergency.findUnique({
      where: { id: emergencyId },
    });
    if (!emergency) throw new Error('EMERGENCY_NOT_FOUND');

    // If we already have a nearest hospital assigned, do nothing
    if (emergency.nearestHospitalId) return emergency;

    // If the emergency does not contain patient coordinates, we cannot compute distance.
    // In that case we keep the hospitalId that may have been set earlier (fallback to default).
    if (emergency.patientLatitude == null || emergency.patientLongitude == null) {
      return emergency;
    }

    // Fetch all hospitals that have stored latitude/longitude.
    const hospitals = await prisma.hospital.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: { id: true, latitude: true, longitude: true },
    });

    if (!hospitals.length) {
      // No hospitals with coordinates – nothing to assign.
      return emergency;
    }

    // Compute distances and find the nearest.
    let nearest = hospitals[0];
    let minDist = DistanceService.haversineDistance(
      emergency.patientLatitude as number,
      emergency.patientLongitude as number,
      nearest.latitude as number,
      nearest.longitude as number,
    );
    for (const hosp of hospitals) {
      const dist = DistanceService.haversineDistance(
        emergency.patientLatitude as number,
        emergency.patientLongitude as number,
        hosp.latitude as number,
        hosp.longitude as number,
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = hosp;
      }
    }

    // Update the emergency with the nearest hospital reference.
    return prisma.emergency.update({
      where: { id: emergencyId },
      data: {
        nearestHospitalId: nearest.id,
        // Also keep hospitalId in sync for legacy queries.
        hospitalId: nearest.id,
      },
    });
  }
}
