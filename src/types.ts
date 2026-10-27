/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DebtStatus = 'open' | 'partially_paid' | 'paid' | 'overdue';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos_card' | 'ussd' | 'cheque_other';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  address?: string;
  notes?: string;
  creditLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  description: string;
  originalAmount: number;
  amountRepaid: number;
  outstandingBalance: number;
  dueDate: string | null; // YYYY-MM-DD or null
  status: DebtStatus;
  notes?: string;
  invoiceRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repayment {
  id: string;
  debtId: string;
  customerId: string;
  customerName: string;
  debtDescription: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  reference?: string; // e.g. bank session ID / POS slip number
  note?: string;
  balanceBefore: number;
  balanceAfter: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  currencySymbol: string;
  defaultGracePeriodDays: number;
  adminPin: string;
  reminderTemplates: {
    gentle: string;
    overdue: string;
    finalNotice: string;
    receipt: string;
  };
}

export interface ReminderLog {
  id: string;
  customerId: string;
  debtId?: string;
  type: 'gentle' | 'overdue' | 'finalNotice' | 'receipt' | 'custom';
  normalizedPhone: string;
  messagePreview: string;
  timestamp: string;
}

export interface IdempotencyRecord {
  key: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  timestamp: string;
  repayment: Repayment;
}

export interface ReportsSummary {
  totalOutstandingDebt: number;
  totalOverdueDebt: number;
  totalPaidDebt: number;
  totalOriginalDebt: number;
  totalRepaidAmount: number;
  countOpen: number;
  countPartiallyPaid: number;
  countOverdue: number;
  countPaid: number;
  totalDebtsCount: number;
  totalCustomersCount: number;
  customerBalances: Array<{
    customerId: string;
    customerName: string;
    customerPhone: string;
    totalOutstanding: number;
    totalRepaid: number;
    activeDebtsCount: number;
    overdueDebtsCount: number;
    lastPaymentDate: string | null;
  }>;
}
