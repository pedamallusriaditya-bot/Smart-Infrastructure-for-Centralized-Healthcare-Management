import React, { useState, useEffect, useCallback } from 'react';
import {
  InventoryItem, InventoryAlert, InventoryCategory, CreateInventoryItemPayload,
  getInventory, getInventoryAlerts, resolveInventoryAlert,
  createInventoryItem, updateInventoryItem, deleteInventoryItem
} from '../../api/inventory.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: InventoryCategory | 'ALL'; label: string; icon: string; color: string }[] = [
  { key: 'ALL',        label: 'All Items',   icon: 'inventory_2',     color: '#6366f1' },
  { key: 'MEDICINE',   label: 'Medicine',    icon: 'medication',      color: '#3b82f6' },
  { key: 'BLOOD_UNIT', label: 'Blood Units', icon: 'bloodtype',       color: '#ef4444' },
  { key: 'EQUIPMENT',  label: 'Equipment',   icon: 'medical_services',color: '#8b5cf6' },
  { key: 'CONSUMABLE', label: 'Consumables', icon: 'category',        color: '#f59e0b' },
  { key: 'VACCINE',    label: 'Vaccines',    icon: 'vaccines',        color: '#10b981' },
  { key: 'OXYGEN',     label: 'Oxygen',      icon: 'air',             color: '#06b6d4' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ADEQUATE:     { label: 'Adequate',      bg: 'rgba(16,185,129,0.12)', text: '#065f46', dot: '#10b981' },
  LOW_STOCK:    { label: 'Low Stock',     bg: 'rgba(245,158,11,0.12)', text: '#92400e', dot: '#f59e0b' },
  CRITICAL:     { label: 'Critical',      bg: 'rgba(239,68,68,0.12)',  text: '#991b1b', dot: '#ef4444' },
  OUT_OF_STOCK: { label: 'Out of Stock',  bg: 'rgba(107,114,128,0.12)',text: '#374151', dot: '#6b7280' },
  EXPIRED:      { label: 'Expired',       bg: 'rgba(127,29,29,0.15)',  text: '#7f1d1d', dot: '#b91c1c' },
};

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  CRITICAL: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: 'emergency' },
  WARNING:  { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: 'warning' },
  INFO:     { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: 'info' },
};

const UNIT_OPTIONS = ['tablets', 'capsules', 'vials', 'bottles', 'units', 'cylinders', 'boxes', 'packs', 'liters', 'ml', 'kits'];

const EMPTY_FORM: CreateInventoryItemPayload = {
  name: '', category: 'MEDICINE', quantity: 0, minQuantity: 0,
  maxQuantity: 0, unit: 'units', supplier: '', expiryDate: '', batchNumber: '',
  unitCost: 0, usagePerDay: undefined, notes: ''
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatCurrency = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const catLabel = (c: string) => CATEGORIES.find(x => x.key === c)?.label ?? c;
const catIcon  = (c: string) => CATEGORIES.find(x => x.key === c)?.icon ?? 'inventory_2';
const catColor = (c: string) => CATEGORIES.find(x => x.key === c)?.color ?? '#6366f1';

// ─── Main Component ───────────────────────────────────────────────────────────

const InventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryCategory | 'ALL'>('ALL');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertsExpanded, setAlertsExpanded] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<CreateInventoryItemPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, alertsData] = await Promise.all([
        getInventory(activeTab === 'ALL' ? undefined : activeTab),
        getInventoryAlerts()
      ]);
      setItems(itemsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredItems = items.filter(item =>
    search === '' ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(search.toLowerCase()) ||
    item.batchNumber?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Summary counts from current items ────────────────────────────────────
  const counts = {
    total:    items.length,
    low:      items.filter(i => i.status === 'LOW_STOCK').length,
    critical: items.filter(i => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK').length,
    expired:  items.filter(i => i.status === 'EXPIRED').length,
    expiring: items.filter(i => i.daysRemaining !== null && i.daysRemaining <= 30 && i.daysRemaining > 0).length,
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...EMPTY_FORM, category: activeTab === 'ALL' ? 'MEDICINE' : activeTab });
    setEditingItem(null);
    setFormError('');
    setModalMode('create');
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      name: item.name, category: item.category, quantity: item.quantity,
      minQuantity: item.minQuantity, maxQuantity: item.maxQuantity,
      unit: item.unit, supplier: item.supplier ?? '', expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
      batchNumber: item.batchNumber ?? '', unitCost: item.unitCost,
      usagePerDay: item.usagePerDay ?? undefined, notes: item.notes ?? ''
    });
    setEditingItem(item);
    setFormError('');
    setModalMode('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        expiryDate: form.expiryDate || null,
        supplier: form.supplier || null,
        batchNumber: form.batchNumber || null,
        notes: form.notes || null,
        usagePerDay: form.usagePerDay || null,
      };
      if (modalMode === 'create') {
        await createInventoryItem(payload);
      } else if (editingItem) {
        await updateInventoryItem(editingItem.id, payload);
      }
      setModalMode(null);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInventoryItem(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveInventoryAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ─── Stock Bar ─────────────────────────────────────────────────────────────
  const StockBar = ({ item }: { item: InventoryItem }) => {
    const pct = item.stockPercent ?? 0;
    const color = pct <= 25 ? '#ef4444' : pct <= 50 ? '#f59e0b' : '#10b981';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
        <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{pct}%</span>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#111827', minHeight: '100%' }}>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #1e40af, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Hospital Inventory
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Manage medicines, equipment, blood units, vaccines, consumables & oxygen
          </p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg, #1e40af, #7c3aed)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)', transition: 'transform 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Item
        </button>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Items',     value: counts.total,    icon: 'inventory_2',  bg: 'linear-gradient(135deg, #6366f1, #818cf8)', shadow: 'rgba(99,102,241,0.3)' },
          { label: 'Low Stock',        value: counts.low,      icon: 'trending_down',bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)', shadow: 'rgba(245,158,11,0.3)' },
          { label: 'Critical / Empty', value: counts.critical, icon: 'error',        bg: 'linear-gradient(135deg, #ef4444, #f87171)', shadow: 'rgba(239,68,68,0.3)' },
          { label: 'Expiring ≤30d',    value: counts.expiring, icon: 'schedule',     bg: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', shadow: 'rgba(139,92,246,0.3)' },
          { label: 'Expired',          value: counts.expired,  icon: 'block',        bg: 'linear-gradient(135deg, #dc2626, #b91c1c)', shadow: 'rgba(220,38,38,0.3)' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: 16, padding: '18px 20px', color: '#fff', boxShadow: `0 4px 20px ${card.shadow}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, letterSpacing: '0.02em' }}>{card.label.toUpperCase()}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 20, opacity: 0.85 }}>{card.icon}</span>
            </div>
            <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* ── Active Alerts Panel ───────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, marginBottom: 24, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: alertsExpanded ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}
            onClick={() => setAlertsExpanded(v => !v)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 22 }}>notifications_active</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Active Alerts</span>
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{alerts.length}</span>
            </div>
            <span className="material-symbols-outlined" style={{ color: '#9ca3af', transition: 'transform 0.2s', transform: alertsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
          </div>
          {alertsExpanded && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {alerts.map(alert => {
                const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
                return (
                  <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10 }}>
                    <span className="material-symbols-outlined" style={{ color: cfg.text, fontSize: 18, flexShrink: 0 }}>{cfg.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: cfg.text }}>{alert.inventoryItem?.name} — {catLabel(alert.inventoryItem?.category ?? '')}</div>
                      <div style={{ fontSize: 12, color: cfg.text, opacity: 0.85, marginTop: 2 }}>{alert.message}</div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginRight: 8 }}>{alert.severity}</span>
                    <button onClick={() => handleResolveAlert(alert.id)} style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: `1px solid ${cfg.border}`, borderRadius: 6, color: cfg.text, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Resolve
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Category Tabs ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveTab(cat.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, border: activeTab === cat.key ? 'none' : '1px solid #e5e7eb', background: activeTab === cat.key ? cat.color : '#fff', color: activeTab === cat.key ? '#fff' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', boxShadow: activeTab === cat.key ? `0 3px 10px ${cat.color}50` : 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Inventory Table ───────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Table toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
            {CATEGORIES.find(c => c.key === activeTab)?.label} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({filteredItems.length})</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#9ca3af' }}>search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: 180 }} />
            </div>
            <button onClick={loadData} style={{ padding: '7px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#6b7280' }}>refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ color: '#9ca3af', fontSize: 14 }}>Loading inventory...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 12, color: '#9ca3af' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48 }}>inventory_2</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>No items found</span>
            <button onClick={openCreate} style={{ fontSize: 13, padding: '8px 18px', background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ Add First Item</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Item', 'Category', 'Quantity / Stock', 'Status', 'Supplier', 'Expiry', 'Cost', 'Trend', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.ADEQUATE;
                  return (
                    <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 14px', minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${catColor(item.category)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: catColor(item.category) }}>{catIcon(item.category)}</span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{item.name}</div>
                            {item.batchNumber && <div style={{ fontSize: 11, color: '#9ca3af' }}>Batch: {item.batchNumber}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{catLabel(item.category)}</td>
                      <td style={{ padding: '12px 14px', minWidth: 140 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{item.quantity} <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{item.unit}</span></div>
                        <StockBar item={item} />
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>min {item.minQuantity} · max {item.maxQuantity}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>{item.supplier ?? '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: item.daysRemaining !== null && item.daysRemaining <= 7 && item.daysRemaining >= 0 ? '#ef4444' : '#374151', whiteSpace: 'nowrap' }}>
                        {formatDate(item.expiryDate)}
                        {item.daysRemaining !== null && item.daysRemaining >= 0 && (
                          <div style={{ fontSize: 10, color: item.daysRemaining <= 7 ? '#ef4444' : '#9ca3af' }}>{item.daysRemaining}d left</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{formatCurrency(item.unitCost)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: item.trend === 'CRITICAL' ? '#fee2e2' : item.trend === 'LOW' ? '#fef3c7' : '#dcfce7', color: item.trend === 'CRITICAL' ? '#991b1b' : item.trend === 'LOW' ? '#92400e' : '#065f46' }}>
                          {item.trend}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(item)} style={{ padding: '5px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                          </button>
                          <button onClick={() => setDeleteTarget(item)} style={{ padding: '5px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {modalMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', borderRadius: '20px 20px 0 0' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {modalMode === 'create' ? 'Add Inventory Item' : `Edit: ${editingItem?.name}`}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                  {modalMode === 'create' ? 'Fill in all required fields' : 'Update the item details below'}
                </p>
              </div>
              <button onClick={() => setModalMode(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{formError}</div>
              )}

              {/* Row: Name + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Item Name *</label>
                  <input required value={form.name} onChange={e => handleFormChange('name', e.target.value)} placeholder="e.g. Paracetamol 500mg" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <select required value={form.category} onChange={e => handleFormChange('category', e.target.value)} style={inputStyle}>
                    {CATEGORIES.filter(c => c.key !== 'ALL').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: Quantity + Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Quantity *</label>
                  <input required type="number" min={0} value={form.quantity} onChange={e => handleFormChange('quantity', Number(e.target.value))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Min Quantity *</label>
                  <input required type="number" min={0} value={form.minQuantity} onChange={e => handleFormChange('minQuantity', Number(e.target.value))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Max Quantity *</label>
                  <input required type="number" min={0} value={form.maxQuantity} onChange={e => handleFormChange('maxQuantity', Number(e.target.value))} style={inputStyle} />
                </div>
              </div>

              {/* Row: Unit + Cost + Usage/day */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Unit *</label>
                  <select value={form.unit} onChange={e => handleFormChange('unit', e.target.value)} style={inputStyle}>
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Unit Cost (₹) *</label>
                  <input required type="number" min={0} step="0.01" value={form.unitCost} onChange={e => handleFormChange('unitCost', Number(e.target.value))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Usage/Day</label>
                  <input type="number" min={0} step="0.1" value={form.usagePerDay ?? ''} onChange={e => handleFormChange('usagePerDay', e.target.value ? Number(e.target.value) : null)} placeholder="Optional" style={inputStyle} />
                </div>
              </div>

              {/* Row: Supplier + Batch */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Supplier</label>
                  <input value={form.supplier ?? ''} onChange={e => handleFormChange('supplier', e.target.value)} placeholder="Supplier name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Batch Number</label>
                  <input value={form.batchNumber ?? ''} onChange={e => handleFormChange('batchNumber', e.target.value)} placeholder="e.g. BT-2024-001" style={inputStyle} />
                </div>
              </div>

              {/* Row: Expiry + Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="date" value={form.expiryDate ?? ''} onChange={e => handleFormChange('expiryDate', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <input value={form.notes ?? ''} onChange={e => handleFormChange('notes', e.target.value)} placeholder="Optional notes" style={inputStyle} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f3f4f6', paddingTop: 16, marginTop: 4 }}>
                <button type="button" onClick={() => setModalMode(null)} style={{ padding: '10px 20px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#374151' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, color: '#fff', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {saving ? (
                    <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Saving...</>
                  ) : (
                    <>{modalMode === 'create' ? '+ Add Item' : 'Save Changes'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#ef4444' }}>delete_forever</span>
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>Delete Item?</h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                  Are you sure you want to remove <strong>{deleteTarget.name}</strong> from inventory? This action cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', borderRadius: 10, cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, color: '#fff', opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', background: '#fff', transition: 'border-color 0.15s' };

export default InventoryManagement;
