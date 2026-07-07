import { prisma } from '../../lib/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../lib/logger.js';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface PerformanceMetric {
  hospitalId: string;
  hospitalName: string;
  district: string;
  medicineAvailability: number; // 0-100%
  doctorAttendance: number;      // 0-100%
  waitingTime: number;           // minutes
  emergencyResponse: number;     // 0-100%
  bedOccupancy: number;          // 0-100%
  labAvailability: number;       // 0-100%
  patientFootfall: number;       // total visits
  inventoryHealth: number;       // 0-100%
}

export interface PerformanceResult extends PerformanceMetric {
  score: number;
  category: 'Excellent' | 'Good' | 'Average' | 'Needs Attention' | 'Critical';
  aiSummary: string;
  recommendations: string[];
}

export class PerformanceService {
  /**
   * Computes mathematical scores and categories in pure TS as a fallback.
   */
  private calculateFallback(metric: PerformanceMetric): {
    score: number;
    category: 'Excellent' | 'Good' | 'Average' | 'Needs Attention' | 'Critical';
    aiSummary: string;
    recommendations: string[];
  } {
    // 15% Meds, 20% Docs, 15% Waiting, 15% Emergency, 10% Bed, 10% Lab, 15% Inventory
    const medScore = metric.medicineAvailability;
    const docScore = metric.doctorAttendance;
    const waitScore = Math.max(0, 100 - ((metric.waitingTime - 15) / 105) * 100);
    const emgScore = metric.emergencyResponse;
    
    // Bed occupancy scoring: 60-80% is optimal (100 score). Below 50% or above 85% drops score.
    const bedRate = metric.bedOccupancy;
    let bedScore = 100;
    if (bedRate < 50) {
      bedScore = Math.max(50, 100 - (50 - bedRate) * 2);
    } else if (bedRate > 85) {
      bedScore = Math.max(50, 100 - (bedRate - 85) * 3);
    }

    const labScore = metric.labAvailability;
    const invScore = metric.inventoryHealth;

    const score = Math.round(
      medScore * 0.15 +
      docScore * 0.20 +
      waitScore * 0.15 +
      emgScore * 0.15 +
      bedScore * 0.10 +
      labScore * 0.10 +
      invScore * 0.15
    );

    let category: 'Excellent' | 'Good' | 'Average' | 'Needs Attention' | 'Critical';
    if (score >= 90) category = 'Excellent';
    else if (score >= 75) category = 'Good';
    else if (score >= 55) category = 'Average';
    else if (score >= 35) category = 'Needs Attention';
    else category = 'Critical';

    // Build intelligent fallback summaries and recommendations based on bottlenecks
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    if (metric.doctorAttendance < 70) {
      bottlenecks.push(`low clinician attendance (${metric.doctorAttendance.toFixed(0)}%)`);
      recommendations.push('Deploy remote consultations or redistribute roster schedules to cover deficient clinical slots.');
    }
    if (metric.medicineAvailability < 70) {
      bottlenecks.push(`critically low essential medicine availability (${metric.medicineAvailability.toFixed(0)}%)`);
      recommendations.push('Initiate medicine redistribution requests from well-stocked facility hubs in the district.');
    }
    if (metric.waitingTime > 45) {
      bottlenecks.push(`extended patient queue wait times averaging ${metric.waitingTime} minutes`);
      recommendations.push('Implement secondary screening triage or queue management protocols to offload main consultation waiting lists.');
    }
    if (metric.emergencyResponse < 75) {
      bottlenecks.push(`sluggish emergency incident resolution times (${metric.emergencyResponse.toFixed(0)}% resolved)`);
      recommendations.push('Reallocate emergency ambulance fleets and ER clinicians to optimize immediate resuscitation cover.');
    }
    if (metric.inventoryHealth < 75) {
      bottlenecks.push(`compromised inventory safety stock levels (${metric.inventoryHealth.toFixed(0)}% healthy)`);
      recommendations.push('Verify supplier lead times and run automated stock reconciliation scripts to check for discrepancies.');
    }

    let aiSummary = `Hospital is operating at ${category.toLowerCase()} performance with a computed efficiency index of ${score}/100. `;
    if (bottlenecks.length > 0) {
      aiSummary += `Operations are currently bottlenecked by ${bottlenecks.join(', ')}.`;
    } else {
      aiSummary += 'All performance categories demonstrate stable, healthy, and compliant regional metrics.';
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue typical operational audits and maintain current resource distribution patterns.');
      recommendations.push('Schedule quarterly diagnostic reviews to ensure equipment calibration is optimal.');
    }

    return { score, category, aiSummary, recommendations };
  }

  /**
   * Fetches metrics and generates performance evaluation for all active hospitals.
   */
  async getPerformanceScoring(): Promise<PerformanceResult[]> {
    // 1. Fetch active hospitals
    const hospitals = await prisma.hospital.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, district: true }
    });

    const metricsList: PerformanceMetric[] = [];

    // 2. Query metrics for each hospital
    for (const hosp of hospitals) {
      // A. Medicine Availability & Inventory Health
      const inventory = await prisma.inventoryItem.findMany({
        where: { hospitalId: hosp.id }
      });
      const medicines = inventory.filter(i => i.category === 'MEDICINE');
      
      const totalMedicines = medicines.length;
      const adequateMedicines = medicines.filter(i => i.status === 'ADEQUATE' || i.quantity > i.minQuantity).length;
      const medicineAvailability = totalMedicines > 0 ? (adequateMedicines / totalMedicines) * 100 : 100.0;

      const totalInventory = inventory.length;
      const adequateInventory = inventory.filter(i => i.status === 'ADEQUATE').length;
      const inventoryHealth = totalInventory > 0 ? (adequateInventory / totalInventory) * 100 : 100.0;

      // B. Doctor Attendance
      const totalActiveDoctors = await prisma.doctor.count({
        where: { department: { hospitalId: hosp.id }, status: 'ACTIVE' }
      });

      // Find attendance logs from the last 7 days to compile a reliable rate
      const recentAttendance = await prisma.doctorAttendance.findMany({
        where: { hospitalId: hosp.id },
        orderBy: { date: 'desc' },
        take: Math.max(10, totalActiveDoctors * 2)
      });
      const presentCount = recentAttendance.filter(a => a.status === 'PRESENT' || a.status === 'EMERGENCY_DUTY').length;
      const doctorAttendance = recentAttendance.length > 0 ? (presentCount / recentAttendance.length) * 100 : 85.0;

      // C. Patient Waiting Time & Footfall
      const activeAppts = await prisma.appointment.count({
        where: { doctor: { department: { hospitalId: hosp.id } }, status: 'SCHEDULED' }
      });
      const doctorsCount = await prisma.doctor.count({
        where: { department: { hospitalId: hosp.id }, status: 'ACTIVE' }
      });

      // Base waiting time is 15 minutes, plus 8 minutes per active appointment per doctor
      const waitingTime = doctorsCount > 0 
        ? Math.min(15 + Math.round((activeAppts / doctorsCount) * 8), 120)
        : 120;

      const appointmentsCount = await prisma.appointment.count({
        where: { doctor: { department: { hospitalId: hosp.id } } }
      });
      const admissionsCount = await prisma.admission.count({
        where: { bed: { room: { hospitalId: hosp.id } } }
      });
      const emergenciesCount = await prisma.emergency.count({
        where: { hospitalId: hosp.id }
      });
      const patientFootfall = appointmentsCount + admissionsCount + emergenciesCount;

      // D. Emergency Response
      const totalEmergencies = await prisma.emergency.count({
        where: { hospitalId: hosp.id }
      });
      const resolvedEmergencies = await prisma.emergency.count({
        where: { hospitalId: hosp.id, status: 'RESOLVED' }
      });
      const emergencyResponse = totalEmergencies > 0 ? (resolvedEmergencies / totalEmergencies) * 100 : 100.0;

      // E. Bed Occupancy
      const totalBeds = await prisma.bed.count({
        where: { room: { hospitalId: hosp.id } }
      });
      const occupiedBeds = await prisma.bed.count({
        where: { room: { hospitalId: hosp.id }, status: 'OCCUPIED' }
      });
      const bedOccupancy = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0.0;

      // F. Lab Availability
      const totalLabs = await prisma.diagnosticAvailability.count({
        where: { hospitalId: hosp.id }
      });
      const availableLabs = await prisma.diagnosticAvailability.count({
        where: { hospitalId: hosp.id, status: 'AVAILABLE' }
      });
      const labAvailability = totalLabs > 0 ? (availableLabs / totalLabs) * 100 : 100.0;

      metricsList.push({
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        district: hosp.district || 'Unassigned District',
        medicineAvailability,
        doctorAttendance,
        waitingTime,
        emergencyResponse,
        bedOccupancy,
        labAvailability,
        patientFootfall,
        inventoryHealth
      });
    }

    const results: PerformanceResult[] = [];

    // 3. Try evaluating via Gemini AI in a single batch call to reduce latency
    let aiScoredList: Array<{
      hospitalId: string;
      score: number;
      category: 'Excellent' | 'Good' | 'Average' | 'Needs Attention' | 'Critical';
      aiSummary: string;
      recommendations: string[];
    }> | null = null;

    if (genAI && metricsList.length > 0) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
You are a Regional Healthcare Systems Evaluator AI.
Analyze the following metrics representing operational performance and resource health for hospitals in the district:
${JSON.stringify(metricsList, null, 2)}

For each hospital:
1. Generate an overall performance score between 0 and 100 based on weighted metrics:
   - Doctor Attendance (20%)
   - Medicine Availability (15%)
   - Waiting Time in minutes (15%, lower waiting time is better, e.g. 15 mins is 100, 120 mins is 0)
   - Emergency Response rate (15%)
   - Inventory Health (15%)
   - Bed Occupancy (10%, optimal at 60-80%, penalty for empty 0% or overfull 100% beds)
   - Lab Test Availability (10%)
2. Categorize the performance:
   - Excellent: 90 - 100
   - Good: 75 - 89
   - Average: 55 - 74
   - Needs Attention: 35 - 54
   - Critical: 0 - 34
3. Generate a concise "aiSummary" (2-3 sentences) explaining the bottlenecks (e.g. low attendance, medicine stockouts, waiting queues) or high points.
4. Provide 2-3 actionable "recommendations" matching their specific operational concerns.

Return JSON ONLY as an array matching this structure. Do not use code blocks or markdown wrappers:
[
  {
    "hospitalId": "UUID",
    "score": 82,
    "category": "Good",
    "aiSummary": "Hospital is performing well, backed by robust medicine availability and inventory health. However, a slight surge in patient footfall has caused waiting times to edge towards 35 minutes.",
    "recommendations": [
      "Consider opening an extra OPD ticket queue during peak hours.",
      "Calibrate critical care beds to accommodate potential overflow."
    ]
  }
]
`;
        const aiResponse = await model.generateContent(prompt);
        const text = aiResponse.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        aiScoredList = JSON.parse(cleaned);
      } catch (err: any) {
        logger.error(`AI scoring failed. Falling back to local calculator. Error: ${err.message}`);
      }
    }

    // 4. Combine metrics with scoring results (AI or local fallback)
    for (const metric of metricsList) {
      const aiScoreObj = aiScoredList?.find(a => a.hospitalId === metric.hospitalId);
      
      if (aiScoreObj) {
        results.push({
          ...metric,
          score: aiScoreObj.score,
          category: aiScoreObj.category,
          aiSummary: aiScoreObj.aiSummary,
          recommendations: aiScoreObj.recommendations
        });
      } else {
        // Fallback computation
        const fallback = this.calculateFallback(metric);
        results.push({
          ...metric,
          ...fallback
        });
      }
    }

    // 5. Sort results descending by score (rankings)
    results.sort((a, b) => b.score - a.score);

    // 6. Automatically alert/notify District Admins for hospitals below threshold (55)
    await this.triggerLowPerformanceAlerts(results);

    return results;
  }

  /**
   * Triggers SYSTEM notifications for hospitals whose score is below 55.
   * Restricts notifications to once per 24 hours per hospital to avoid spamming the database.
   */
  private async triggerLowPerformanceAlerts(results: PerformanceResult[]): Promise<void> {
    const lowPerformers = results.filter(r => r.score < 55);
    if (lowPerformers.length === 0) return;

    try {
      // Find all District Administrators (role = APPLICATION_ADMIN)
      const appAdmins = await prisma.user.findMany({
        where: { role: { name: 'APPLICATION_ADMIN' } }
      });

      if (appAdmins.length === 0) return;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const hosp of lowPerformers) {
        // Verify if a notification was already sent within the past 24 hours for this hospital
        const existingNotification = await prisma.notification.findFirst({
          where: {
            title: 'Low Performance Alert',
            message: { contains: hosp.hospitalName },
            createdAt: { gte: oneDayAgo }
          }
        });

        if (existingNotification) {
          // Already alerted in the last 24h, skip
          continue;
        }

        // Create notification alerts for all app admins
        const message = `Hospital "${hosp.hospitalName}" is scoring at a critical level of ${hosp.score}/100 (${hosp.category}). Key concerns: ${hosp.aiSummary}`;
        
        await Promise.all(
          appAdmins.map(adminUser =>
            prisma.notification.create({
              data: {
                userId: adminUser.id,
                title: 'Low Performance Alert',
                message,
                type: 'SYSTEM'
              }
            })
          )
        );

        logger.warn(`Triggered low performance alerts for hospital ${hosp.hospitalName} (Score: ${hosp.score}) to ${appAdmins.length} administrators.`);
      }
    } catch (err: any) {
      logger.error(`Failed to trigger low performance notifications: ${err.message}`);
    }
  }
}
