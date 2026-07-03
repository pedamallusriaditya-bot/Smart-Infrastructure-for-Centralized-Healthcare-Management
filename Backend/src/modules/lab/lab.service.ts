import { prisma } from '../../lib/prisma.js';
import { LabTestStatus, LabPriority } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { AILabService } from './ai.lab.service.js';

const aiService = new AILabService();

export class LabService {
  /**
   * [LAB_01, LAB_02, LAB_03, LAB_04, LAB_24]
   * Order placement with validation and duplicate prevention.
   */
  async createOrder(doctorId: string, data: any, requestId: string) {
    const { patientId, appointmentId, testName, category, priority, clinicalNotes } = data;

    // 1. Verify existence of Clinical entities (LAB_02, LAB_03, LAB_04)
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error("Patient not found");

    if (appointmentId) {
      const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appt) throw new Error("Appointment not found");
    }

    // 2. Prevent active duplicate orders (LAB_24)
    const activeOrder = await prisma.labOrder.findFirst({
      where: {
        patientId,
        testName,
        status: { in: ['ORDERED', 'COLLECTING', 'SAMPLE_RECEIVED', 'PROCESSING'] }
      }
    });
    if (activeOrder) throw new Error("ACTIVE_ORDER_EXISTS");

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

    logger.info("LIS: Lab Order created", { requestId, orderId: order.id });
    return order;
  }

  /**
   * [LAB_13, LAB_14, LAB_23]
   * State-machine transition handler.
   */
  async updateWorkflowStatus(orderId: string, nextStatus: LabTestStatus, requestId: string) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("LAB_ORDER_NOT_FOUND");

    const transitions: Record<string, LabTestStatus[]> = {
      'ORDERED': [LabTestStatus.SAMPLE_RECEIVED, LabTestStatus.CANCELLED],
      'SAMPLE_RECEIVED': [LabTestStatus.PROCESSING, LabTestStatus.CANCELLED],
      'PROCESSING': [LabTestStatus.COMPLETED],
    };

    if (!transitions[order.status]?.includes(nextStatus)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    logger.info("LIS: Status transition", { requestId, from: order.status, to: nextStatus });
    return prisma.labOrder.update({ where: { id: orderId }, data: { status: nextStatus } });
  }

  /**
   * [LAB_15, LAB_25, LAB_27, LAB_28, LAB_30]
   * Transactional fulfillment with AI integration.
   */
  async fulfillOrder(userUuid: string, orderId: string, payload: any, requestId: string) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'PROCESSING') {
        throw new Error("ORDER_MUST_BE_PROCESSING_TO_FULFILL");
    }

    const tech = await prisma.labTechnician.findUnique({ where: { userId: userUuid } });
    if (!tech) throw new Error("TECHNICIAN_NOT_FOUND");

    // LAB_27 & LAB_28: AI Processing
    const aiInsights = await aiService.analyzeReport(order.testName, payload.resultsData, requestId);

    // LAB_30: Transaction rollback protection
    return prisma.$transaction(async (tx) => {
      const report = await tx.labReport.create({
        data: {
          labOrderId: orderId,
          technicianId: tech.id,
          resultsData: payload.resultsData,
          sampleId: payload.sampleId,
          fileUrl: payload.fileUrl,
          attachments: payload.attachments,
          aiSummary: aiInsights.summary,
          isAbnormal: aiInsights.isAbnormal,
          flaggedValues: aiInsights.flaggedFields,
          aiRecommendations: aiInsights.recommendations
        }
      });

      await tx.labOrder.update({ where: { id: orderId }, data: { status: LabTestStatus.COMPLETED } });

      // LAB_25: Record Integration
      await tx.medicalRecord.create({
        data: {
          patientId: order.patientId,
          doctorId: order.doctorId,
          diagnosis: `Laboratory Findings: ${order.testName}`,
          notes: `Results uploaded by LIS. AI Warning: ${aiInsights.isAbnormal ? 'ABNORMAL' : 'NORMAL'}`
        }
      });

      return report;
    });
  }

  /**
   * [LAB_16] Verification sign-off
   */
  async verifyReport(reportId: string, userId: string, remarks: string, requestId: string) {
    const report = await prisma.labReport.findUnique({ where: { id: reportId }, include: { labOrder: true } });
    if (!report) throw new Error("LAB_REPORT_NOT_FOUND");

    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor || report.labOrder.doctorId !== doctor.id) throw new Error("UNAUTHORIZED_ACCESS");

    return prisma.$transaction(async (tx) => {
      await tx.labOrder.update({ where: { id: report.labOrderId }, data: { status: LabTestStatus.VERIFIED } });
      return tx.labReport.update({ where: { id: reportId }, data: { doctorRemarks: remarks, verifiedAt: new Date() } });
    });
  }

  /**
   * [LAB_17 to LAB_22, LAB_31, LAB_32]
   * RBAC Search and History view.
   */
  async getReports(filter: any, requestor: any, requestId: string) {
    const { status, category, page, limit, patientId } = filter;
    const skip = (page - 1) * limit;

    const where: any = { labOrder: { status, category, patientId } };

    // IDOR Protection Logic
    if (requestor.role === 'PATIENT') {
      const p = await prisma.patient.findUnique({ where: { userId: requestor.id } });
      if (!p) throw new Error("Patient not found");
      where.labOrder.patientId = p.id;
      // Patients only see finalized reports
      where.labOrder.status = { in: [LabTestStatus.COMPLETED, LabTestStatus.VERIFIED] };
    }

    if (requestor.role === 'DOCTOR') {
        const d = await prisma.doctor.findUnique({ where: { userId: requestor.id } });
        where.labOrder.doctorId = d?.id; // Standardize so they only see their cases
    }

    const [reports, total] = await prisma.$transaction([
      prisma.labReport.findMany({ where, include: { labOrder: true }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.labReport.count({ where })
    ]);

    logger.info("LIS Search", { requestId, user: requestor.id });
    return { reports, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }
}