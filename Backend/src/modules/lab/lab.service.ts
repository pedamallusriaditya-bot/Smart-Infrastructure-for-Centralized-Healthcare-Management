import { prisma } from '../../lib/prisma.js';
import { LabTestStatus, LabPriority, Prisma } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { AILabService } from './ai.lab.service.js';

const aiService = new AILabService();

export class LabService {
  /**
   * [LAB_01, LAB_02, LAB_03, LAB_04, LAB_24]
   * Strategic Order placement with entity verification and deduplication.
   */
  async createOrder(doctorId: string, data: any, requestId: string) {
    const { patientId, appointmentId, testName, category, priority, clinicalNotes } = data;

    // 1. Physical Verification of referenced entities (Healthcare Standard)
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error("Patient not found");

    if (appointmentId) {
      const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appt) throw new Error("Appointment not found");
    }

    // 2. Clinical Deduplication: Prevent ordering the same test if one is already in progress
    const activeOrder = await prisma.labOrder.findFirst({
      where: {
        patientId,
        testName,
        status: { in: ['ORDERED', 'COLLECTING', 'SAMPLE_RECEIVED', 'PROCESSING'] }
      }
    });

    if (activeOrder) {
      logger.warn("LIS: Duplicate order blocked", { requestId, patientId, testName });
      throw new Error("ACTIVE_ORDER_EXISTS");
    }

    // 3. Atomically Create Order
    const order = await prisma.labOrder.create({
      data: {
        patientId,
        doctorId,
        appointmentId: appointmentId || null,
        testName,
        category,
        priority: priority || LabPriority.NORMAL,
        clinicalNotes,
        status: LabTestStatus.ORDERED
      }
    });

    logger.info("LIS: Lab Order successfully initiated", { requestId, orderId: order.id });
    return order;
  }

  /**
   * [LAB_13, LAB_14, LAB_23]
   * State-machine enforcement for LIS Workflow.
   */
  async updateWorkflowStatus(orderId: string, nextStatus: LabTestStatus, requestId: string) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("LAB_ORDER_NOT_FOUND");

    // Standard Lab Protocol: Order -> Receive Sample -> Process -> Report
    const transitions: Record<string, LabTestStatus[]> = {
      'ORDERED': [LabTestStatus.SAMPLE_RECEIVED, LabTestStatus.CANCELLED],
      'SAMPLE_RECEIVED': [LabTestStatus.PROCESSING, LabTestStatus.CANCELLED],
      'PROCESSING': [LabTestStatus.COMPLETED],
    };

    if (!transitions[order.status]?.includes(nextStatus)) {
      logger.error("LIS: Illegal Status Transition", { requestId, orderId, from: order.status, attempted: nextStatus });
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    const updated = await prisma.labOrder.update({ 
      where: { id: orderId }, 
      data: { status: nextStatus } 
    });

    logger.info("LIS: Order status updated", { requestId, orderId, newStatus: nextStatus });
    return updated;
  }

  /**
   * [LAB_15, LAB_25, LAB_27, LAB_28, LAB_30]
   * Technician Result fulfillment with Automated AI analysis and Medical Record Sync.
   */
  async fulfillOrder(userUuid: string, orderId: string, payload: any, requestId: string) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    
    if (!order || order.status !== LabTestStatus.PROCESSING) {
      logger.error("LIS: Fulfillment attempt on unready order", { requestId, orderId, status: order?.status });
      throw new Error("ORDER_MUST_BE_PROCESSING_TO_FULFILL");
    }

    const tech = await prisma.labTechnician.findUnique({ where: { userId: userUuid } });
    if (!tech) throw new Error("TECHNICIAN_NOT_FOUND");

    // Trigger Clinical Intelligence (Google Gemini flash integration)
    const aiInsights = await aiService.analyzeReport(order.testName, payload.resultsData, requestId);

    // ATOMIC TRANSACTION: Ensuring Result consistency
    return prisma.$transaction(async (tx) => {
      // 1. Create Report
      const report = await tx.labReport.create({
        data: {
          labOrderId: orderId,
          technicianId: tech.id,
          resultsData: payload.resultsData as Prisma.InputJsonValue,
          sampleId: payload.sampleId,
          fileUrl: payload.fileUrl,
          attachments: payload.attachments,
          aiSummary: aiInsights.summary,
          isAbnormal: aiInsights.isAbnormal,
          flaggedValues: aiInsights.flaggedFields as Prisma.InputJsonValue,
          aiRecommendations: aiInsights.recommendations
        }
      });

      // 2. Mark parent Order as COMPLETED
      await tx.labOrder.update({ 
        where: { id: orderId }, 
        data: { status: LabTestStatus.COMPLETED } 
      });

      // 3. Integrate results into Patient Longitudinal Record
      await tx.medicalRecord.create({
        data: {
          patientId: order.patientId,
          doctorId: order.doctorId,
          diagnosis: `Lab Complete: ${order.testName}`,
          notes: `Automated Link: ${payload.fileUrl}. System detected abnormality: ${aiInsights.isAbnormal ? 'YES' : 'NO'}`
        }
      });

      logger.info("LIS: Fulfilling transaction success", { requestId, reportId: report.id });
      return report;
    });
  }

  /**
   * [LAB_16] Verification and Physician sign-off logic.
   */
  async verifyReport(reportId: string, userId: string, remarks: string, requestId: string) {
    const report = await prisma.labReport.findUnique({
      where: { id: reportId },
      include: { labOrder: true }
    });

    if (!report) throw new Error("LAB_REPORT_NOT_FOUND");

    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    
    // Security: Only the physician who ordered the test can sign it off
    if (!doctor || report.labOrder.doctorId !== doctor.id) {
      logger.error("LIS: Unauthorized verify attempt", { requestId, reportId, attemptedBy: userId });
      throw new Error("UNAUTHORIZED_ACCESS");
    }

    return prisma.$transaction(async (tx) => {
      // Move Order to the final archival state
      await tx.labOrder.update({ 
        where: { id: report.labOrderId }, 
        data: { status: LabTestStatus.VERIFIED } 
      });

      const updatedReport = await tx.labReport.update({
        where: { id: reportId },
        data: {
          doctorRemarks: remarks,
          verifiedAt: new Date()
        }
      });

      logger.info("LIS: Sign-off Complete", { requestId, doctorId: doctor.id, reportId });
      return updatedReport;
    });
  }

  /**
   * [LAB_17 to LAB_22, LAB_31, LAB_32]
   * Privacy-aware Reporting Engine (RBAC-Gated search).
   */
  async getReports(filter: any, requestor: any, requestId: string) {
    const { status, category, page, limit, patientId } = filter;
    const skip = (page - 1) * limit;

    // Default WHERE clause building
    const where: any = { 
      labOrder: { 
        status: status || undefined, 
        category: category || undefined, 
        patientId: patientId || undefined 
      } 
    };

    // PRIVACY INTERCEPTORS
    if (requestor.role === 'PATIENT') {
      const p = await prisma.patient.findUnique({ where: { userId: requestor.id } });
      if (!p) throw new Error("Patient record missing");
      
      where.labOrder.patientId = p.id;
      // Clinical Ethics: Patients can ONLY see their results after the Tech/Doctor finishes them.
      where.labOrder.status = { in: [LabTestStatus.COMPLETED, LabTestStatus.VERIFIED] };
    }

    if (requestor.role === 'DOCTOR') {
        const d = await prisma.doctor.findUnique({ where: { userId: requestor.id } });
        // Scoping: Doctors default to seeing their own cases unless it's a Hospital Admin override
        if (requestor.role !== 'ADMIN') {
            where.labOrder.doctorId = d?.id;
        }
    }

    const [reports, total] = await prisma.$transaction([
      prisma.labReport.findMany({ 
        where, 
        include: { labOrder: true }, 
        skip, 
        take: limit, 
        orderBy: { createdAt: 'desc' } 
      }),
      prisma.labReport.count({ where })
    ]);

    logger.info("LIS: Accessing report audit log", { requestId, accessCount: reports.length, totalFound: total });
    return { 
      reports, 
      meta: { 
        total, 
        page, 
        lastPage: Math.ceil(total / limit) 
      } 
    };
  }
}