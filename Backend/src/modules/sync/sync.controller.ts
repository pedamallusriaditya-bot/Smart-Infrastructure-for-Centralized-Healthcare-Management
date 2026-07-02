import { Request, Response } from 'express';
import { z } from 'zod';
import { SyncService } from './sync.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';
const syncService = new SyncService();

// ---------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------
// Define the expected arrays your offline DB will send. 
// Note: We use .passthrough() so Zod doesn't strip out unknown tables.
const SyncPayloadSchema = z.object({
  newPatients: z.array(z.any()).optional(),
  newEmergencies: z.array(z.any()).optional(),
  newVitals: z.array(z.any()).optional(),
  lastSyncTimestamp: z.string().datetime().optional(), // Safe to keep for audit logging
}).passthrough();

// ---------------------------------------------------------
// Controller HTTP Interface
// ---------------------------------------------------------

export const handleOfflineSync = async (req: Request, res: Response) => {
  try {
    // 1. Quick empty check
    if (!req.body || Object.keys(req.body).length === 0) {
      return errorResponse(res, "Empty sync payload provided", 400);
    }

    // 2. Validate the structural integrity of the payload
    const syncPayload = SyncPayloadSchema.parse(req.body);

    console.log(`[SYNC] Processing offline payload...`);

    // 3. Execute synchronization via the service layer
    const results = await syncService.processOfflineSync(syncPayload);

    // 4. Return standardized success wrapper
    return successResponse(res, "Offline data synchronized successfully", results, 200);

  } catch (error: any) {
    logger.error("Database sync failed", {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack
    });
    return errorResponse(res, "Database synchronization failed", 500, 'SYNC_FAILED');
  }
};