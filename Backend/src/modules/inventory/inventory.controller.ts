import { Request, Response } from 'express';
import { z } from 'zod';
import { InventoryService } from './inventory.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';

const inventoryService = new InventoryService();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const ItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['MEDICINE', 'BLOOD_UNIT', 'EQUIPMENT', 'CONSUMABLE', 'VACCINE', 'OXYGEN']),
  quantity: z.number().int().min(0),
  minQuantity: z.number().int().min(0),
  maxQuantity: z.number().int().min(0),
  unit: z.string().min(1).default('units'),
  supplier: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  unitCost: z.number().min(0).default(0),
  usagePerDay: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
});

const UpdateItemSchema = ItemSchema.partial();

function zodMessage(error: z.ZodError): string {
  return error.issues.map((e: z.ZodIssue) => e.message).join(', ');
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getInventory = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const category = req.query.category as string | undefined;
    const items = await inventoryService.getInventory(req.user!.id, category, req.requestId);
    return successResponse(res, 'Inventory items retrieved.', items, 200);
  } catch (error: any) {
    if (error.message === 'ADMIN_NOT_ASSIGNED_TO_HOSPITAL') {
      return errorResponse(res, 'Your admin account is not linked to a hospital.', 403, 'FORBIDDEN');
    }
    logger.error('Inventory list error', { error: error.message });
    return errorResponse(res, 'Failed to load inventory.', 500);
  }
});

export const getInventorySummary = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const summary = await inventoryService.getDashboardSummary(req.user!.id, req.requestId);
    return successResponse(res, 'Inventory summary retrieved.', summary, 200);
  } catch (error: any) {
    if (error.message === 'ADMIN_NOT_ASSIGNED_TO_HOSPITAL') {
      return errorResponse(res, 'Your admin account is not linked to a hospital.', 403, 'FORBIDDEN');
    }
    return errorResponse(res, 'Failed to load inventory summary.', 500);
  }
});

export const getInventoryAlerts = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const onlyUnresolved = req.query.resolved !== 'true';
    const alerts = await inventoryService.getAlerts(req.user!.id, onlyUnresolved, req.requestId);
    return successResponse(res, 'Inventory alerts retrieved.', alerts, 200);
  } catch (error: any) {
    if (error.message === 'ADMIN_NOT_ASSIGNED_TO_HOSPITAL') {
      return errorResponse(res, 'Your admin account is not linked to a hospital.', 403, 'FORBIDDEN');
    }
    return errorResponse(res, 'Failed to load inventory alerts.', 500);
  }
});

export const resolveInventoryAlert = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { alertId } = req.params;
    const result = await inventoryService.resolveAlert(req.user!.id, alertId, req.requestId);
    return successResponse(res, 'Alert resolved.', result, 200);
  } catch (error: any) {
    if (error.message === 'ALERT_NOT_FOUND') {
      return errorResponse(res, 'Alert not found or does not belong to your hospital.', 404);
    }
    return errorResponse(res, 'Failed to resolve alert.', 500);
  }
});

export const getInventoryItem = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const item = await inventoryService.getInventoryItem(req.user!.id, id);
    return successResponse(res, 'Inventory item retrieved.', item, 200);
  } catch (error: any) {
    if (error.message === 'INVENTORY_ITEM_NOT_FOUND') {
      return errorResponse(res, 'Item not found or does not belong to your hospital.', 404);
    }
    return errorResponse(res, 'Failed to load item.', 500);
  }
});

export const createInventoryItem = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const data = ItemSchema.parse(req.body);
    const item = await inventoryService.createItem(req.user!.id, data, req.requestId);
    return successResponse(res, 'Inventory item created successfully.', item, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, 'Validation failed: ' + zodMessage(error), 400);
    }
    if (error.message === 'ADMIN_NOT_ASSIGNED_TO_HOSPITAL') {
      return errorResponse(res, 'Your admin account is not linked to a hospital.', 403, 'FORBIDDEN');
    }
    logger.error('Create inventory item error', { error: error.message });
    return errorResponse(res, 'Failed to create inventory item: ' + error.message, 500);
  }
});

export const updateInventoryItem = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const data = UpdateItemSchema.parse(req.body);
    const item = await inventoryService.updateItem(req.user!.id, id, data, req.requestId);
    return successResponse(res, 'Inventory item updated successfully.', item, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, 'Validation failed: ' + zodMessage(error), 400);
    }
    if (error.message === 'INVENTORY_ITEM_NOT_FOUND') {
      return errorResponse(res, 'Item not found or does not belong to your hospital.', 404);
    }
    return errorResponse(res, 'Failed to update inventory item.', 500);
  }
});

export const deleteInventoryItem = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await inventoryService.deleteItem(req.user!.id, id, req.requestId);
    return successResponse(res, 'Inventory item deleted.', null, 200);
  } catch (error: any) {
    if (error.message === 'INVENTORY_ITEM_NOT_FOUND') {
      return errorResponse(res, 'Item not found or does not belong to your hospital.', 404);
    }
    return errorResponse(res, 'Failed to delete inventory item.', 500);
  }
});
