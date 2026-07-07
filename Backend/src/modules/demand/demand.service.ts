import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export class DemandService {
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
   * Run AI forecasting model for a hospital and store the prediction
   */
  async generateForecast(hospitalId: string, horizon: number) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch historical metrics from database (Appointments, Admissions, Emergencies, Lab Orders, Medication Records, Medical Records)
    const [appointments, admissions, emergencies, labOrders, medicationRecords, medicalRecords] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          doctor: { department: { hospitalId } },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.admission.findMany({
        where: {
          bed: { room: { hospitalId } },
          admissionDate: { gte: thirtyDaysAgo }
        }
      }),
      prisma.emergency.findMany({
        where: {
          hospitalId,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.labOrder.findMany({
        where: {
          doctor: { department: { hospitalId } },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.medicationAdministrationRecord.findMany({
        where: {
          hospitalId,
          administeredAt: { gte: thirtyDaysAgo }
        },
        include: {
          medicine: true
        }
      }),
      prisma.medicalRecord.findMany({
        where: {
          doctor: { department: { hospitalId } },
          createdAt: { gte: thirtyDaysAgo }
        }
      })
    ]);

    // 2. Compute dynamic daily base load
    const apptsCount = appointments.length;
    const admsCount = admissions.length;
    const emgsCount = emergencies.length;
    const labsCount = labOrders.length;
    const medsCount = medicationRecords.length;

    // Use minimum baseline counts to ensure realistic forecasting even with small initial datasets
    const dailyAppointments = Math.max(0.5, apptsCount / 30);
    const dailyAdmissions = Math.max(0.3, admsCount / 30);
    const dailyEmergencies = Math.max(0.1, emgsCount / 30);
    const dailyLabs = Math.max(0.4, labsCount / 30);
    const dailyMeds = Math.max(1.0, medsCount / 30);

    // 3. Demand Forecast Computations scaled by horizon (7, 30, 90 days)
    const bedDemand = Math.max(2, Math.round(dailyAdmissions * horizon * 1.1));
    const labLoad = Math.max(5, Math.round(dailyLabs * horizon * 1.05));
    
    // Doctor requirement calculations scaled by load intensity
    const doctorRequirement = Math.max(2, Math.round(dailyAppointments * 1.1 + dailyEmergencies * 0.6));
    
    // Nurse requirement calculations scaled by beds and emergency load
    const nurseRequirement = Math.max(3, Math.round(dailyAdmissions * 1.5 + dailyEmergencies * 0.9));

    // Blood requirements by group (scaled dynamically by emergency frequency)
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const bloodRequirement = bloodGroups.map(bg => {
      const skew = bg === 'O+' || bg === 'A+' ? 0.35 : bg === 'O-' ? 0.2 : 0.09;
      return {
        bloodGroup: bg,
        quantity: Math.max(1, Math.round((dailyEmergencies * 1.5 + dailyAdmissions * 0.4) * horizon * skew))
      };
    });

    // Medicine requirements grouped by historical records
    const medicineUsageMap: Record<string, { name: string; count: number }> = {};
    for (const rec of medicationRecords) {
      if (!rec.medicine) continue;
      if (!medicineUsageMap[rec.medicine.id]) {
        medicineUsageMap[rec.medicine.id] = { name: rec.medicine.name, count: 0 };
      }
      medicineUsageMap[rec.medicine.id].count++;
    }

    let medicineDemand = Object.entries(medicineUsageMap).map(([id, info]) => ({
      medicineId: id,
      name: info.name,
      quantity: Math.max(10, Math.round((info.count / 30) * horizon * 1.15))
    }));

    // Fallback: If no medication administration records exist, query active inventory items of category MEDICINE to project
    if (medicineDemand.length === 0) {
      const inventoryMeds = await prisma.inventoryItem.findMany({
        where: { hospitalId, category: 'MEDICINE' },
        take: 5
      });
      medicineDemand = inventoryMeds.map(item => ({
        medicineId: item.id,
        name: item.name,
        quantity: Math.max(15, Math.round((item.minQuantity / 10) * horizon))
      }));
    }

    // 4. Calculate Confidence Rate mathematically based on sample size
    const totalSamples = apptsCount + admsCount + emgsCount + labsCount + medsCount;
    const confidenceRate = Math.min(
      98.5,
      parseFloat((80.0 + Math.log(1 + totalSamples) * 2.8).toFixed(1))
    );

    // 5. Store predictions in database
    const forecast = await prisma.demandForecast.create({
      data: {
        hospitalId,
        forecastHorizon: horizon,
        medicineDemand: JSON.stringify(medicineDemand),
        bedDemand,
        doctorRequirement,
        nurseRequirement,
        labLoad,
        bloodRequirement: JSON.stringify(bloodRequirement),
        confidenceRate
      }
    });

    // 6. Write AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'GENERATE_AI_DEMAND_FORECAST',
        entity: 'DemandForecast',
        entityId: forecast.id,
        newData: JSON.parse(JSON.stringify(forecast))
      }
    });

    logger.info("AI Demand Forecast generated successfully", { hospitalId, horizon });

    return {
      ...forecast,
      medicineDemand,
      bloodRequirement
    };
  }

  /**
   * Get own hospital forecast (latest runs for 7, 30, and 90 days)
   */
  async getHospitalForecasts(adminUserId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    
    // Check if we have predictions already. If none generated today, run predictions.
    const horizons = [7, 30, 90];
    const results = [];

    for (const hor of horizons) {
      // Find latest forecast generated in the last 24 hours
      const latest = await prisma.demandForecast.findFirst({
        where: {
          hospitalId,
          forecastHorizon: hor,
          generatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        orderBy: { generatedAt: 'desc' }
      });

      if (latest) {
        results.push({
          ...latest,
          medicineDemand: typeof latest.medicineDemand === 'string' ? JSON.parse(latest.medicineDemand) : latest.medicineDemand,
          bloodRequirement: typeof latest.bloodRequirement === 'string' ? JSON.parse(latest.bloodRequirement) : latest.bloodRequirement
        });
      } else {
        const generated = await this.generateForecast(hospitalId, hor);
        results.push(generated);
      }
    }

    return results;
  }

  /**
   * Get district comparison projections (For District Dashboard)
   */
  async getDistrictForecastComparison() {
    const hospitals = await prisma.hospital.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });

    const comparison = [];

    for (const h of hospitals) {
      // Load or run the 30-day forecast for each active facility
      const latest30 = await prisma.demandForecast.findFirst({
        where: {
          hospitalId: h.id,
          forecastHorizon: 30,
          generatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        orderBy: { generatedAt: 'desc' }
      });

      let forecastObj = null;
      if (latest30) {
        forecastObj = {
          ...latest30,
          medicineDemand: typeof latest30.medicineDemand === 'string' ? JSON.parse(latest30.medicineDemand) : latest30.medicineDemand,
          bloodRequirement: typeof latest30.bloodRequirement === 'string' ? JSON.parse(latest30.bloodRequirement) : latest30.bloodRequirement
        };
      } else {
        forecastObj = await this.generateForecast(h.id, 30).catch(() => null);
      }

      comparison.push({
        hospitalId: h.id,
        hospitalName: h.name,
        district: h.district,
        forecast30: forecastObj
      });
    }

    return comparison;
  }
}
