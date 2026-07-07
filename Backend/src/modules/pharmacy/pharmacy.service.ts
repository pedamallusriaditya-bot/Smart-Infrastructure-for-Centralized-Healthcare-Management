import { prisma } from '../../lib/prisma.js';
import { 
  PrescriptionStatus, 
  InventoryStatus,
  InventoryCategory,
  StaffStatus
} from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../utils/auditHelper.js';

export class PharmacyService {
  /**
   * Get Pharmacist profile by User ID
   */
  async getPharmacistProfile(userId: string) {
    const pharmacist = await prisma.pharmacist.findUnique({
      where: { userId },
      include: {
        hospital: {
          select: {
            name: true
          }
        }
      }
    });
    if (!pharmacist) throw new Error("PHARMACIST_NOT_FOUND");
    return pharmacist;
  }

  /**
   * Get Pharmacy Inventory (Medicine & Vaccine items)
   */
  async getPharmacyInventory(hospitalId: string) {
    return prisma.inventoryItem.findMany({
      where: {
        hospitalId,
        category: {
          in: [InventoryCategory.MEDICINE, InventoryCategory.VACCINE]
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Get Dashboard Summary Stats for Pharmacy
   */
  async getDashboardSummary(hospitalId: string) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const items = await prisma.inventoryItem.findMany({
      where: {
        hospitalId,
        category: {
          in: [InventoryCategory.MEDICINE, InventoryCategory.VACCINE]
        }
      }
    });

    let totalMedicines = items.length;
    let lowStock = 0;
    let critical = 0;
    let outOfStock = 0;
    let expiringSoon = 0;
    let expired = 0;

    for (const item of items) {
      if (item.quantity <= 0) {
        outOfStock++;
      } else if (item.status === InventoryStatus.CRITICAL) {
        critical++;
      } else if (item.status === InventoryStatus.LOW_STOCK) {
        lowStock++;
      }

      if (item.expiryDate) {
        const expDate = new Date(item.expiryDate);
        if (expDate < now) {
          expired++;
        } else if (expDate <= thirtyDaysFromNow) {
          expiringSoon++;
        }
      }
    }

    const pendingPrescriptionsCount = await prisma.prescription.count({
      where: {
        hospitalId,
        status: {
          in: [PrescriptionStatus.PENDING, PrescriptionStatus.PARTIALLY_DISPENSED]
        }
      }
    });

    return {
      totalMedicines,
      lowStock,
      critical,
      outOfStock,
      expiringSoon,
      expired,
      pendingPrescriptionsCount
    };
  }

  /**
   * Get Pending/Active Prescriptions queue for Hospital
   */
  async getPrescriptionsQueue(hospitalId: string, status?: PrescriptionStatus) {
    const statusFilter = status ? { status } : {
      status: {
        in: [PrescriptionStatus.PENDING, PrescriptionStatus.PARTIALLY_DISPENSED, PrescriptionStatus.DISPENSED]
      }
    };

    return prisma.prescription.findMany({
      where: {
        hospitalId,
        ...statusFilter
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true
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
   * Dispense Prescription medications and decrement Inventory
   */
  async dispensePrescription(
    pharmacistUserId: string,
    prescriptionId: string,
    dispenseItems?: { medicineId: string; quantity: number }[]
  ) {
    const pharmacist = await this.getPharmacistProfile(pharmacistUserId);
    if (!pharmacist.hospitalId) {
      throw new Error("PHARMACIST_NOT_ASSIGNED_TO_HOSPITAL");
    }

    // Verify Prescription
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        medicines: {
          include: {
            medicine: true
          }
        }
      }
    });

    if (!prescription) {
      throw new Error("PRESCRIPTION_NOT_FOUND");
    }

    if (prescription.status === PrescriptionStatus.DISPENSED || prescription.status === PrescriptionStatus.COMPLETED) {
      throw new Error("PRESCRIPTION_ALREADY_DISPENSED");
    }

    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new Error("PRESCRIPTION_IS_CANCELLED");
    }

    // Decide items to dispense
    const itemsToDispense = dispenseItems || prescription.medicines.map(pm => ({
      medicineId: pm.medicineId,
      quantity: pm.quantity
    }));

    return await prisma.$transaction(async (tx) => {
      for (const item of itemsToDispense) {
        // Resolve Medicine Name
        const med = await tx.medicine.findUnique({
          where: { id: item.medicineId }
        });
        if (!med) throw new Error(`MEDICINE_ID_${item.medicineId}_NOT_FOUND`);

        // Find Inventory Item
        const inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            hospitalId: pharmacist.hospitalId!,
            category: InventoryCategory.MEDICINE,
            name: {
              equals: med.name,
              mode: 'insensitive'
            }
          }
        });

        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK_FOR_${med.name}_WANTED_${item.quantity}_HAVE_${inventoryItem?.quantity || 0}`);
        }

        // Decrement Quantity
        const newQty = inventoryItem.quantity - item.quantity;
        let newStatus: InventoryStatus = InventoryStatus.ADEQUATE;

        if (newQty <= 0) {
          newStatus = InventoryStatus.OUT_OF_STOCK;
        } else if (newQty <= inventoryItem.minQuantity) {
          newStatus = InventoryStatus.CRITICAL;
        } else if (newQty <= inventoryItem.minQuantity * 1.5) {
          newStatus = InventoryStatus.LOW_STOCK;
        }

        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            quantity: newQty,
            status: newStatus
          }
        });

        // Register Alerts if necessary
        if (newStatus === InventoryStatus.CRITICAL || newStatus === InventoryStatus.OUT_OF_STOCK) {
          await tx.inventoryAlert.create({
            data: {
              hospitalId: pharmacist.hospitalId!,
              inventoryItemId: inventoryItem.id,
              alertType: newStatus === InventoryStatus.OUT_OF_STOCK ? 'OUT_OF_STOCK' : 'CRITICAL_STOCK',
              severity: 'CRITICAL',
              message: `Alert: Pharmacy inventory ${inventoryItem.name} is ${newStatus.replace('_', ' ').toLowerCase()} (${newQty} left)`
            }
          });
        }
      }

      // Update Prescription Status
      const updatedPrescription = await tx.prescription.update({
        where: { id: prescriptionId },
        data: {
          status: PrescriptionStatus.DISPENSED,
          dispensedAt: new Date(),
          dispensedById: pharmacist.id
        }
      });

      // Add Patient Timeline Event
      await tx.patientTimeline.create({
        data: {
          patientId: prescription.patientId,
          eventType: 'DISPENSING',
          description: `Prescription dispensed by Pharmacist ${pharmacist.firstName} ${pharmacist.lastName}. Status: DISPENSED`
        }
      });

      // Write Audit Log
      await writeAuditLog(
        pharmacistUserId,
        'DISPENSE_PRESCRIPTION',
        'Prescription',
        prescriptionId,
        prescription,
        updatedPrescription
      );

      return updatedPrescription;
    });
  }

  /**
   * Cancel a Prescription
   */
  async cancelPrescription(pharmacistUserId: string, prescriptionId: string) {
    const pharmacist = await this.getPharmacistProfile(pharmacistUserId);

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId }
    });

    if (!prescription) {
      throw new Error("PRESCRIPTION_NOT_FOUND");
    }

    const updated = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: PrescriptionStatus.CANCELLED
      }
    });

    // Add Timeline Event
    await prisma.patientTimeline.create({
      data: {
        patientId: prescription.patientId,
        eventType: 'PRESCRIPTION_CANCELLED',
        description: `Prescription cancelled by Pharmacist ${pharmacist.firstName} ${pharmacist.lastName}.`
      }
    });

    // Write Audit Log
    await writeAuditLog(
      pharmacistUserId,
      'CANCEL_PRESCRIPTION',
      'Prescription',
      prescriptionId,
      prescription,
      updated
    );

    return updated;
  }

  /**
   * Receive/Restock medicine item in inventory
   */
  async receiveMedicineStock(
    pharmacistUserId: string,
    itemId: string,
    quantity: number,
    batchNumber?: string,
    expiryDate?: Date
  ) {
    const pharmacist = await this.getPharmacistProfile(pharmacistUserId);
    if (!pharmacist.hospitalId) {
      throw new Error("PHARMACIST_NOT_ASSIGNED_TO_HOSPITAL");
    }

    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        hospitalId: pharmacist.hospitalId
      }
    });

    if (!inventoryItem) {
      throw new Error("INVENTORY_ITEM_NOT_FOUND");
    }

    const newQty = inventoryItem.quantity + quantity;
    let newStatus: InventoryStatus = InventoryStatus.ADEQUATE;

    if (newQty <= 0) {
      newStatus = InventoryStatus.OUT_OF_STOCK;
    } else if (newQty <= inventoryItem.minQuantity) {
      newStatus = InventoryStatus.CRITICAL;
    } else if (newQty <= inventoryItem.minQuantity * 1.5) {
      newStatus = InventoryStatus.LOW_STOCK;
    }

    const updateData: any = {
      quantity: newQty,
      status: newStatus,
      lastRestockedAt: new Date()
    };

    if (batchNumber) updateData.batchNumber = batchNumber;
    if (expiryDate) updateData.expiryDate = expiryDate;

    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData
    });

    // Write Audit Log
    await writeAuditLog(
      pharmacistUserId,
      'RESTOCK_INVENTORY',
      'InventoryItem',
      itemId,
      inventoryItem,
      updated
    );

    return updated;
  }
}
