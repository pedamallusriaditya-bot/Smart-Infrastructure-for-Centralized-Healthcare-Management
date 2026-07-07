import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { TestType, AvailabilityStatus, BedStatus, RoomType } from '@prisma/client';

export interface SuggestionInput {
  hospitalId: string;
  lacks: string[]; // DOCTORS, BEDS, DIAGNOSTICS, MEDICINES, ICU
  testType?: TestType;
  medicineName?: string;
  specialization?: string;
}

export class ReferralService {
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Suggests nearby hospitals based on resource deficit.
   */
  async suggestNearbyHospitals(input: SuggestionInput) {
    const { hospitalId, lacks, testType, medicineName, specialization } = input;

    // 1. Fetch current hospital details
    const sourceHospital = await prisma.hospital.findUnique({
      where: { id: hospitalId }
    });

    if (!sourceHospital) throw new Error("Source hospital facility not found.");

    // 2. Fetch all other active hospitals
    const candidateHospitals = await prisma.hospital.findMany({
      where: {
        id: { not: hospitalId },
        status: 'ACTIVE'
      },
      include: {
        departments: {
          include: {
            doctors: {
              where: { status: 'ACTIVE' }
            }
          }
        },
        rooms: {
          include: {
            beds: true
          }
        },
        diagnosticAvailabilities: true,
        inventoryItems: true
      }
    });

    const suggestions = [];

    // 3. For each candidate hospital, compile resources and calculate distance/ETA
    for (const hosp of candidateHospitals) {
      // Beds stats
      const allBeds = hosp.rooms.flatMap(r => r.beds);
      const availableBeds = allBeds.filter(b => b.status === BedStatus.AVAILABLE).length;

      // ICU Beds stats
      const icuRooms = hosp.rooms.filter(r => r.type === RoomType.ICU);
      const availableIcuBeds = icuRooms.flatMap(r => r.beds).filter(b => b.status === BedStatus.AVAILABLE).length;

      // Doctors stats
      const activeDoctors = hosp.departments.flatMap(d => d.doctors);
      const doctorsCount = activeDoctors.length;
      
      // If a specific specialization is requested, check if a doctor of that specialization is active
      let specializationAvailable = true;
      if (specialization) {
        specializationAvailable = activeDoctors.some(doc => doc.specialization === specialization);
      }

      // Diagnostics stats
      let testAvailable = true;
      if (testType) {
        const testRecord = hosp.diagnosticAvailabilities.find(d => d.testType === testType);
        testAvailable = testRecord ? testRecord.status === AvailabilityStatus.AVAILABLE : false;
      }
      const availableTests = hosp.diagnosticAvailabilities
        .filter(d => d.status === AvailabilityStatus.AVAILABLE)
        .map(d => d.testType);

      // Medicines stats
      let medicineAvailable = true;
      if (medicineName) {
        const medStock = hosp.inventoryItems.find(
          i => i.category === 'MEDICINE' && i.name.toLowerCase().includes(medicineName.toLowerCase())
        );
        medicineAvailable = medStock ? medStock.quantity > 0 : false;
      }

      // Check if hospital meets all requested "lacks" criteria
      let meetsCriteria = true;

      for (const lack of lacks) {
        if (lack === 'BEDS' && availableBeds === 0) meetsCriteria = false;
        if (lack === 'ICU' && availableIcuBeds === 0) meetsCriteria = false;
        if (lack === 'DOCTORS' && (doctorsCount === 0 || !specializationAvailable)) meetsCriteria = false;
        if (lack === 'DIAGNOSTICS' && !testAvailable) meetsCriteria = false;
        if (lack === 'MEDICINES' && !medicineAvailable) meetsCriteria = false;
      }

      if (!meetsCriteria) continue;

      // Distance & ETA calculation
      let distanceKm = null;
      let etaMinutes = null;

      if (
        sourceHospital.latitude != null &&
        sourceHospital.longitude != null &&
        hosp.latitude != null &&
        hosp.longitude != null
      ) {
        distanceKm = this.calculateDistance(
          sourceHospital.latitude,
          sourceHospital.longitude,
          hosp.latitude,
          hosp.longitude
        );
        // Base dispatch delay is 5 minutes, travel time estimated at 2 minutes per km
        etaMinutes = Math.round(5 + distanceKm * 2);
      } else {
        // Fallback if coordinates are missing (estimate based on same district)
        const isSameDistrict = hosp.district === sourceHospital.district;
        distanceKm = isSameDistrict ? 5.0 : 15.0;
        etaMinutes = isSameDistrict ? 15 : 35;
      }

      suggestions.push({
        id: hosp.id,
        name: hosp.name,
        type: hosp.type,
        address: hosp.address,
        phone: hosp.phone,
        distanceKm: Number(distanceKm.toFixed(2)),
        etaMinutes,
        availableBeds,
        availableIcuBeds,
        doctorsCount,
        availableTests,
        specializationAvailable,
        medicineAvailable
      });
    }

    // Sort by distance ascending
    suggestions.sort((a, b) => a.distanceKm - b.distanceKm);

    return suggestions;
  }

  /**
   * Completes patient referral: saves history, appends timeline, updates medical record.
   */
  async createReferral(data: {
    doctorUserId: string;
    patientId: string;
    destinationHospitalId: string;
    reason: string;
    notes?: string;
  }) {
    const { doctorUserId, patientId, destinationHospitalId, reason, notes } = data;

    // 1. Verify doctor and resolve hospital details
    const doctor = await prisma.doctor.findUnique({
      where: { userId: doctorUserId },
      include: { department: { include: { hospital: true } } }
    });

    if (!doctor) throw new Error("Referring physician profile not found.");
    const sourceHospital = doctor.department?.hospital;
    if (!sourceHospital) throw new Error("Referring physician is not assigned to a hospital facility.");

    // 2. Fetch patient and destination hospital
    const [patient, destinationHospital] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.hospital.findUnique({ where: { id: destinationHospitalId } })
    ]);

    if (!patient) throw new Error("Patient record not found.");
    if (!destinationHospital) throw new Error("Destination hospital facility not found.");

    // 3. Compute distance/ETA for final logging
    let distanceKm = 5.0;
    let etaMinutes = 15;

    if (
      sourceHospital.latitude != null &&
      sourceHospital.longitude != null &&
      destinationHospital.latitude != null &&
      destinationHospital.longitude != null
    ) {
      distanceKm = this.calculateDistance(
        sourceHospital.latitude,
        sourceHospital.longitude,
        destinationHospital.latitude,
        destinationHospital.longitude
      );
      etaMinutes = Math.round(5 + distanceKm * 2);
    }

    // 4. Perform database updates in a single transaction (referral history, timeline, medical records)
    return await prisma.$transaction(async (tx) => {
      // A. Create PatientReferral
      const referral = await tx.patientReferral.create({
        data: {
          patientId,
          sourceHospitalId: sourceHospital.id,
          destinationHospitalId,
          reason,
          status: 'PENDING',
          distanceKm: Number(distanceKm.toFixed(2)),
          etaMinutes,
          referredById: doctor.id,
          notes
        }
      });

      // B. Create PatientTimeline Event
      await tx.patientTimeline.create({
        data: {
          patientId,
          eventType: 'REFERRAL',
          description: `Patient referred from ${sourceHospital.name} to ${destinationHospital.name}. Reason: Lack of ${reason}.`,
          metadata: {
            referralId: referral.id,
            distanceKm: Number(distanceKm.toFixed(2)),
            etaMinutes
          }
        }
      });

      // C. Create MedicalRecord Entry
      await tx.medicalRecord.create({
        data: {
          patientId,
          doctorId: doctor.id,
          diagnosis: `Referred to ${destinationHospital.name}`,
          notes: `Referral authorized due to deficiency in: ${reason}. Clinician Referral Remarks: ${notes || 'None'}.`
        }
      });

      logger.info(`Referral logged successfully: Patient ID ${patientId} referred to ${destinationHospital.name}.`);
      return referral;
    });
  }

  /**
   * Retrieves referral history for a patient.
   */
  async getReferralHistory(patientId: string) {
    return await prisma.patientReferral.findMany({
      where: { patientId },
      include: {
        sourceHospital: { select: { id: true, name: true, type: true } },
        destinationHospital: { select: { id: true, name: true, type: true } },
        referredBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieves all referrals created by a doctor.
   */
  async getDoctorReferrals(doctorUserId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: doctorUserId }
    });

    if (!doctor) throw new Error("Clinician profile not found.");

    return await prisma.patientReferral.findMany({
      where: { referredById: doctor.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        sourceHospital: { select: { id: true, name: true } },
        destinationHospital: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
