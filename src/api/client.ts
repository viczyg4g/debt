/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Customer,
  Debt,
  Repayment,
  BusinessSettings,
  ReportsSummary,
  ReminderLog,
  DebtStatus,
} from '../types';

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `idemp_${crypto.randomUUID()}`;
  }
  return `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Settings
  async getSettings(): Promise<BusinessSettings> {
    return request<BusinessSettings>('/api/settings');
  },

  async updateSettings(updates: Partial<BusinessSettings>, adminPin?: string): Promise<BusinessSettings> {
    return request<BusinessSettings>('/api/settings', {
      method: 'PUT',
      headers: adminPin ? { 'x-admin-pin': adminPin } : {},
      body: JSON.stringify(updates),
    });
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return request<Customer[]>('/api/customers');
  },

  async createCustomer(data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    creditLimit?: number;
  }): Promise<Customer> {
    return request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return request<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  },

  // Debts
  async getDebts(params?: {
    status?: DebtStatus | 'all';
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ debts: Debt[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return request(`/api/debts?${query.toString()}`);
  },

  async getDebtDetails(id: string): Promise<{ debt: Debt; repayments: Repayment[]; customer?: Customer }> {
    return request(`/api/debts/${id}`);
  },

  async createDebt(data: {
    customerId: string;
    description: string;
    originalAmount: number;
    dueDate?: string | null;
    notes?: string;
    invoiceRef?: string;
  }): Promise<Debt> {
    return request<Debt>('/api/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDebt(id: string, updates: Partial<Debt>): Promise<Debt> {
    return request<Debt>(`/api/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteDebt(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/debts/${id}`, {
      method: 'DELETE',
    });
  },

  // Repayments & Idempotency
  async verifyIdempotency(key: string): Promise<{ exists: boolean; record?: any }> {
    return request(`/api/repayments/verify-idempotency/${encodeURIComponent(key)}`);
  },

  async recordRepayment(data: {
    debtId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: Repayment['paymentMethod'];
    reference?: string;
    note?: string;
    idempotencyKey: string;
  }): Promise<{ repayment: Repayment; debt: Debt; isReplay: boolean }> {
    try {
      return await request<{ repayment: Repayment; debt: Debt; isReplay: boolean }>('/api/repayments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      // If error might be due to timeout or network disconnect, check idempotency record
      if (data.idempotencyKey) {
        try {
          const verify = await api.verifyIdempotency(data.idempotencyKey);
          if (verify.exists && verify.record) {
            return {
              repayment: verify.record.repayment,
              debt: {} as Debt,
              isReplay: true,
            };
          }
        } catch {
          // Ignore verification error and rethrow original error
        }
      }
      throw err;
    }
  },

  async getRepayments(params?: {
    debtId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
  }): Promise<Repayment[]> {
    const query = new URLSearchParams();
    if (params?.debtId) query.set('debtId', params.debtId);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.paymentMethod) query.set('paymentMethod', params.paymentMethod);

    return request<Repayment[]>(`/api/repayments?${query.toString()}`);
  },

  // Reports
  async getReportsSummary(): Promise<ReportsSummary> {
    return request<ReportsSummary>('/api/reports/summary');
  },

  // Reminders Log
  async logReminder(data: {
    customerId: string;
    debtId?: string;
    type: ReminderLog['type'];
    normalizedPhone: string;
    messagePreview: string;
  }): Promise<ReminderLog> {
    return request<ReminderLog>('/api/reminders/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReminderLogs(customerId: string): Promise<ReminderLog[]> {
    return request<ReminderLog[]>(`/api/reminders/history/${customerId}`);
  },

  async resetData(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/reset-data', {
      method: 'POST',
    });
  },
};
