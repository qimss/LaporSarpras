import { User, Report, KPIs } from '../types';

const API_BASE = '/api';

export const api = {
  // ===================== AUTH =====================
  async login(identifier: string, password: string): Promise<{ success: boolean; user: User; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, nim: identifier, password }),
    });
    return res.json();
  },

  async me(): Promise<{ success: boolean; user: User | null }> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      return res.json();
    } catch {
      return { success: false, user: null };
    }
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  },

  // ===================== MAHASISWA & REPORT =====================
  async createReport(formData: FormData): Promise<{ success: boolean; report?: Report; message?: string }> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return res.json();
  },

  async getMyReports(): Promise<{ success: boolean; reports: Report[]; message?: string }> {
    const res = await fetch(`${API_BASE}/reports/my`, { credentials: 'include' });
    return res.json();
  },

  async getTracking(ticketNumber: string): Promise<{
    success: boolean;
    report?: Report;
    stepIndex?: number;
    statusLogs?: any[];
    message?: string;
  }> {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(ticketNumber)}`, {
      credentials: 'include',
    });
    return res.json();
  },

  // ===================== ADMIN =====================
  async getAdminDashboard(): Promise<{
    success: boolean;
    kpis: KPIs;
    emergencyList: Report[];
    clusteredReports: Report[];
    allReports: Report[];
    message?: string;
  }> {
    const res = await fetch(`${API_BASE}/admin/dashboard`, { credentials: 'include' });
    return res.json();
  },

  async triageEmergency(reportId: number, action: 'verify' | 'downgrade', catatan?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/triage/${reportId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, catatan }),
    });
    return res.json();
  },

  async runBatchAI(): Promise<{ success: boolean; message: string; results?: any }> {
    const res = await fetch(`${API_BASE}/admin/batch-ai`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  },

  async updateReportStatus(reportId: number, status: string, keterangan?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, keterangan }),
    });
    return res.json();
  },

  async unlinkCluster(reportId: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}/unlink`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  },
};
