import axiosInstance from './axiosInstance';

export type InventoryCategory = 'MEDICINE' | 'BLOOD_UNIT' | 'EQUIPMENT' | 'CONSUMABLE' | 'VACCINE' | 'OXYGEN';
export type InventoryStatus = 'ADEQUATE' | 'LOW_STOCK' | 'CRITICAL' | 'OUT_OF_STOCK' | 'EXPIRED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertType = 'LOW_STOCK' | 'CRITICAL_STOCK' | 'EXPIRED' | 'EXPIRING_SOON' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  hospitalId: string;
  category: InventoryCategory;
  name: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  supplier: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  unitCost: number;
  status: InventoryStatus;
  usagePerDay: number | null;
  lastRestockedAt: string | null;
  notes: string | null;
  // Computed by service
  daysRemaining: number | null;
  trend: 'STABLE' | 'LOW' | 'CRITICAL';
  stockPercent: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAlert {
  id: string;
  inventoryItemId: string;
  hospitalId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  inventoryItem?: {
    name: string;
    category: InventoryCategory;
    quantity: number;
    unit: string;
  };
}

export interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  criticalCount: number;
  outOfStockCount: number;
  expiredCount: number;
  expiringCount: number;
  activeAlertCount: number;
  categoryBreakdown: { category: InventoryCategory; count: number; totalQuantity: number }[];
}

export interface CreateInventoryItemPayload {
  name: string;
  category: InventoryCategory;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  supplier?: string | null;
  expiryDate?: string | null;
  batchNumber?: string | null;
  unitCost: number;
  usagePerDay?: number | null;
  notes?: string | null;
}

// ─── API Functions ─────────────────────────────────────────────────────────

export const getInventory = async (category?: InventoryCategory): Promise<InventoryItem[]> => {
  const params = category ? { category } : {};
  const res = await axiosInstance.get('/inventory', { params });
  return res.data.data;
};

export const getInventorySummary = async (): Promise<InventorySummary> => {
  const res = await axiosInstance.get('/inventory/summary');
  return res.data.data;
};

export const getInventoryAlerts = async (resolved?: boolean): Promise<InventoryAlert[]> => {
  const params = resolved !== undefined ? { resolved: String(resolved) } : {};
  const res = await axiosInstance.get('/inventory/alerts', { params });
  return res.data.data;
};

export const resolveInventoryAlert = async (alertId: string): Promise<void> => {
  await axiosInstance.post(`/inventory/alerts/${alertId}/resolve`);
};

export const getInventoryItem = async (id: string): Promise<InventoryItem> => {
  const res = await axiosInstance.get(`/inventory/${id}`);
  return res.data.data;
};

export const createInventoryItem = async (payload: CreateInventoryItemPayload): Promise<InventoryItem> => {
  const res = await axiosInstance.post('/inventory', payload);
  return res.data.data;
};

export const updateInventoryItem = async (id: string, payload: Partial<CreateInventoryItemPayload>): Promise<InventoryItem> => {
  const res = await axiosInstance.put(`/inventory/${id}`, payload);
  return res.data.data;
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/inventory/${id}`);
};
