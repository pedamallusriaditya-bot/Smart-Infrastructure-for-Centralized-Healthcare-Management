import { prisma } from '../../lib/prisma.js';
import { 
  BedStatus, 
  AdmissionStatus, 
  AdministrationStatus, 
  MedicationRoute, 
  MedFrequency, 
  InventoryStatus,
  InventoryCategory
} from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../utils/auditHelper.js';

export class NurseService {
  /**
   * Get Nurse profile by User ID
   */
  async getNurseProfile(userId: string) {
    const nurse = await prisma.nurse.findUnique({
      where: { userId },
      include: {
        hospital: {
          select: {
            name: true
          }
        },
        ward: {
          select: {
            name: true
          }
        }
      }
    });
    if (!nurse) throw new Error("NURSE_NOT_FOUND");
    return nurse;
  }

  /**
   * Get admitted patients in the nurse's hospital
   */
  async getAdmittedPatients(nurseUserId: string) {
    const nurse = await this.getNurseProfile(nurseUserId);

    return prisma.admission.findMany({
      where: {
        status: AdmissionStatus.ADMITTED,
        bed: {
          room: {
            hospitalId: nurse.hospitalId
          }
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true
          }
        },
        bed: {
          include: {
            room: true
          }
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        admissionDate: 'desc'
      }
    });
  }

  /**
   * Get active prescriptions for the nurse's hospital, optionally for a specific patient
   */
  async getPrescriptions(nurseUserId: string, patientId?: string) {
    const nurse = await this.getNurseProfile(nurseUserId);

    const whereClause: any = {
      status: {
        in: ['PENDING', 'DISPENSED', 'PARTIALLY_DISPENSED']
      }
    };

    if (patientId) {
      whereClause.patientId = patientId;
    }

    // Filter prescriptions by patient active admissions in the nurse's hospital
    whereClause.patient = {
      admissions: {
        some: {
          status: AdmissionStatus.ADMITTED,
          bed: {
            room: {
              hospitalId: nurse.hospitalId
            }
          }
        }
      }
    };

    return prisma.prescription.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        medicines: {
          include: {
            medicine: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get medication administration records (MAR) history for a patient
   */
  async getMedicationHistory(patientId: string) {
    return prisma.medicationAdministrationRecord.findMany({
      where: { patientId },
      include: {
        medicine: true,
        nurse: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        administeredAt: 'desc'
      }
    });
  }

  /**
   * Record vital signs for a patient
   */
  async recordVitalSigns(
    nurseUserId: string,
    patientId: string,
    data: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      respiratoryRate?: number;
    }
  ) {
    const nurse = await this.getNurseProfile(nurseUserId);

    // Verify patient active admission in nurse's hospital
    const activeAdmission = await prisma.admission.findFirst({
      where: {
        patientId,
        status: AdmissionStatus.ADMITTED,
        bed: {
          room: {
            hospitalId: nurse.hospitalId
          }
        }
      }
    });

    if (!activeAdmission) {
      throw new Error("PATIENT_NOT_ADMITTED_IN_YOUR_HOSPITAL");
    }

    // Find or create a MedicalRecord to associate the VitalSigns with
    let medicalRecord = await prisma.medicalRecord.findFirst({
      where: {
        patientId,
        doctorId: activeAdmission.doctorId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!medicalRecord) {
      medicalRecord = await prisma.medicalRecord.create({
        data: {
          patientId,
          doctorId: activeAdmission.doctorId,
          diagnosis: 'Inpatient Observation',
          notes: 'Automatic record created for vital signs tracking.'
        }
      });
    }

    const vitals = await prisma.vitalSigns.create({
      data: {
        medicalRecordId: medicalRecord.id,
        bloodPressure: data.bloodPressure || null,
        heartRate: data.heartRate || null,
        temperature: data.temperature || null,
        respiratoryRate: data.respiratoryRate || null
      }
    });

    // Add Patient Timeline Event
    const details = [
      data.bloodPressure ? `BP: ${data.bloodPressure}` : null,
      data.heartRate ? `HR: ${data.heartRate} bpm` : null,
      data.temperature ? `Temp: ${data.temperature}°C` : null,
      data.respiratoryRate ? `RR: ${data.respiratoryRate}/min` : null
    ].filter(Boolean).join(', ');

    await prisma.patientTimeline.create({
      data: {
        patientId,
        eventType: 'VITAL_SIGNS',
        description: `Vitals recorded by Nurse ${nurse.firstName} ${nurse.lastName}: ${details}`
      }
    });

    // Write audit log
    await writeAuditLog(
      nurseUserId,
      'RECORD_VITAL_SIGNS',
      'VitalSigns',
      vitals.id,
      null,
      vitals
    );

    return vitals;
  }

  /**
   * Update nursing notes for a patient via the care timeline
   */
  async updateNursingNotes(nurseUserId: string, patientId: string, notes: string) {
    const nurse = await this.getNurseProfile(nurseUserId);

    // Verify patient active admission in nurse's hospital
    const activeAdmission = await prisma.admission.findFirst({
      where: {
        patientId,
        status: AdmissionStatus.ADMITTED,
        bed: {
          room: {
            hospitalId: nurse.hospitalId
          }
        }
      }
    });

    if (!activeAdmission) {
      throw new Error("PATIENT_NOT_ADMITTED_IN_YOUR_HOSPITAL");
    }

    const timelineEvent = await prisma.patientTimeline.create({
      data: {
        patientId,
        eventType: 'NURSING_NOTE',
        description: `Nursing Note by ${nurse.firstName} ${nurse.lastName}: ${notes}`
      }
    });

    // Write audit log
    await writeAuditLog(
      nurseUserId,
      'ADD_NURSING_NOTE',
      'PatientTimeline',
      timelineEvent.id,
      null,
      timelineEvent
    );

    return timelineEvent;
  }

  /**
   * Core workflow: Administer medication and decrement inventory
   */
  async administerMedication(
    nurseUserId: string,
    data: {
      patientId: string;
      prescriptionId: string;
      medicineId: string;
      dose: string;
      route: MedicationRoute;
      remarks?: string;
      reaction?: string;
    }
  ) {
    const nurse = await this.getNurseProfile(nurseUserId);

    // Verify patient active admission in nurse's hospital
    const activeAdmission = await prisma.admission.findFirst({
      where: {
        patientId: data.patientId,
        status: AdmissionStatus.ADMITTED,
        bed: {
          room: {
            hospitalId: nurse.hospitalId
          }
        }
      }
    });

    if (!activeAdmission) {
      throw new Error("PATIENT_NOT_ADMITTED_IN_YOUR_HOSPITAL");
    }

    // Verify prescription
    const prescription = await prisma.prescription.findUnique({
      where: { id: data.prescriptionId },
      include: {
        medicines: true
      }
    });

    if (!prescription) {
      throw new Error("PRESCRIPTION_NOT_FOUND");
    }

    // Resolve Medicine
    const medicine = await prisma.medicine.findUnique({
      where: { id: data.medicineId }
    });

    if (!medicine) {
      throw new Error("MEDICINE_NOT_FOUND");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch matching medicine inventory item in hospital
      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          hospitalId: nurse.hospitalId,
          category: InventoryCategory.MEDICINE,
          name: {
            equals: medicine.name,
            mode: 'insensitive'
          }
        }
      });

      if (!inventoryItem || inventoryItem.quantity <= 0) {
        throw new Error(`MEDICINE_OUT_OF_STOCK_IN_HOSPITAL_INVENTORY`);
      }

      // 2. Decrement inventory
      const newQty = inventoryItem.quantity - 1;
      let newStatus: InventoryStatus = InventoryStatus.ADEQUATE;

      if (newQty <= 0) {
        newStatus = InventoryStatus.OUT_OF_STOCK;
      } else if (newQty <= inventoryItem.minQuantity) {
        newStatus = InventoryStatus.CRITICAL;
      } else if (newQty <= inventoryItem.minQuantity * 1.5) {
        newStatus = InventoryStatus.LOW_STOCK;
      }

      const updatedInventory = await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: newQty,
          status: newStatus
        }
      });

      // 3. Create Inventory Alert if critical or out of stock
      if (newStatus === InventoryStatus.CRITICAL || newStatus === InventoryStatus.OUT_OF_STOCK) {
        await tx.inventoryAlert.create({
          data: {
            hospitalId: nurse.hospitalId,
            inventoryItemId: inventoryItem.id,
            alertType: newStatus === InventoryStatus.OUT_OF_STOCK ? 'OUT_OF_STOCK' : 'CRITICAL_STOCK',
            severity: 'CRITICAL',
            message: `Alert: ${inventoryItem.name} is ${newStatus.replace('_', ' ').toLowerCase()} (${newQty} left)`
          }
        });
      } else if (newStatus === InventoryStatus.LOW_STOCK) {
        await tx.inventoryAlert.create({
          data: {
            hospitalId: nurse.hospitalId,
            inventoryItemId: inventoryItem.id,
            alertType: 'LOW_STOCK',
            severity: 'WARNING',
            message: `Alert: ${inventoryItem.name} stock level is low (${newQty} left)`
          }
        });
      }

      // Calculate next dose time
      let nextDose: Date | null = null;
      if (prescription.frequency) {
        const now = new Date();
        switch (prescription.frequency) {
          case MedFrequency.ONCE_DAILY:
            nextDose = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case MedFrequency.TWICE_DAILY:
            nextDose = new Date(now.getTime() + 12 * 60 * 60 * 1000);
            break;
          case MedFrequency.THRICE_DAILY:
            nextDose = new Date(now.getTime() + 8 * 60 * 60 * 1000);
            break;
          case MedFrequency.FOUR_TIMES_DAILY:
          case MedFrequency.EVERY_6H:
            nextDose = new Date(now.getTime() + 6 * 60 * 60 * 1000);
            break;
          case MedFrequency.EVERY_8H:
            nextDose = new Date(now.getTime() + 8 * 60 * 60 * 1000);
            break;
          case MedFrequency.EVERY_12H:
            nextDose = new Date(now.getTime() + 12 * 60 * 60 * 1000);
            break;
          case MedFrequency.ONCE_WEEKLY:
            nextDose = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          default:
            nextDose = null;
        }
      }

      // Update prescription's next dose time
      await tx.prescription.update({
        where: { id: prescription.id },
        data: {
          nextDoseTime: nextDose,
          status: 'COMPLETED'
        }
      });

      // 4. Create MAR entry
      const marRecord = await tx.medicationAdministrationRecord.create({
        data: {
          patientId: data.patientId,
          prescriptionId: data.prescriptionId,
          medicineId: data.medicineId,
          inventoryItemId: inventoryItem.id,
          nurseId: nurse.id,
          hospitalId: nurse.hospitalId,
          dose: data.dose,
          route: data.route,
          status: data.reaction ? AdministrationStatus.REACTION_NOTED : AdministrationStatus.ADMINISTERED,
          batchNumber: inventoryItem.batchNumber,
          expirySnapshot: inventoryItem.expiryDate,
          remarks: data.remarks || null,
          reaction: data.reaction || null
        }
      });

      // 5. Add timeline event
      await tx.patientTimeline.create({
        data: {
          patientId: data.patientId,
          eventType: 'MEDICATION_ADMINISTRATION',
          description: `Medication administered: ${medicine.name} (${data.dose} via ${data.route}) by Nurse ${nurse.firstName} ${nurse.lastName}.${data.reaction ? ` [Reaction: ${data.reaction}]` : ''}`
        }
      });

      // Write audit log
      await writeAuditLog(
        nurseUserId,
        'ADMINISTER_MEDICATION',
        'MedicationAdministrationRecord',
        marRecord.id,
        null,
        marRecord
      );

      return marRecord;
    });
  }
}
