/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  Customer,
  Debt,
  Repayment,
  BusinessSettings,
  ReminderLog,
  IdempotencyRecord,
  ReportsSummary,
  DebtStatus,
} from '../src/types.js';
import { normalizePhoneNumber } from '../src/utils/phoneUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'debtbook.json');

export interface DatabaseSchema {
  settings: BusinessSettings;
  customers: Customer[];
  debts: Debt[];
  repayments: Repayment[];
  reminderLogs: ReminderLog[];
  idempotencyRecords: Record<string, IdempotencyRecord>;
}

// Mutex lock to serialize transaction commits
let writeLock: Promise<void> = Promise.resolve();

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Authoritatively computes debt status based on outstanding balance and due date
 */
export function computeDebtStatus(debt: Pick<Debt, 'originalAmount' | 'amountRepaid' | 'outstandingBalance' | 'dueDate'>): DebtStatus {
  const outstanding = Math.max(0, debt.outstandingBalance);
  if (outstanding <= 0.001) {
    return 'paid';
  }
  const today = getTodayString();
  if (debt.dueDate && debt.dueDate < today) {
    return 'overdue';
  }
  if (debt.amountRepaid > 0.001) {
    return 'partially_paid';
  }
  return 'open';
}

function getDefaultData(): DatabaseSchema {
  const now = new Date().toISOString();
  const today = getTodayString();

  const c1Id = 'cust-101';
  const c2Id = 'cust-102';
  const c3Id = 'cust-103';
  const c4Id = 'cust-104';
  const c5Id = 'cust-105';

  const customers: Customer[] = [
    {
      id: c1Id,
      name: 'Chief Emeka Okonkwo',
      phone: '08031234567',
      normalizedPhone: '2348031234567',
      email: 'emeka.okonkwo@gmail.com',
      address: 'Shop 14, Planks & Building Market, Alaba, Lagos',
      notes: 'Wholesale distributor. Reliable buyer, usually pays in two tranches.',
      creditLimit: 5000000,
      createdAt: '2026-09-01T09:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
    },
    {
      id: c2Id,
      name: 'Alhaja Fatimah Bello',
      phone: '08189876543',
      normalizedPhone: '2348189876543',
      email: 'fatimah.bello.fabrics@yahoo.com',
      address: 'Block C, Gbagi Textile Complex, Ibadan',
      notes: 'Lace and Ankara fabric retailer. Requires gentle WhatsApp reminder before due date.',
      creditLimit: 3000000,
      createdAt: '2026-09-05T11:20:00.000Z',
      updatedAt: '2026-09-05T11:20:00.000Z',
    },
    {
      id: c3Id,
      name: 'Engr. Babatunde Williams',
      phone: '07055551234',
      normalizedPhone: '2347055551234',
      email: 'bwilliams.elect@outlook.com',
      address: '28 Allen Avenue, Ikeja, Lagos',
      notes: 'Electrical contractor for residential projects. Settles after site inspections.',
      creditLimit: 2500000,
      createdAt: '2026-09-10T14:40:00.000Z',
      updatedAt: '2026-09-10T14:40:00.000Z',
    },
    {
      id: c4Id,
      name: 'Mrs. Ngozi Eze',
      phone: '08023456789',
      normalizedPhone: '2348023456789',
      email: 'ngozieze.catering@gmail.com',
      address: 'No 45 New Market Road, Onitsha',
      notes: 'Provisions, grains and palm oil dealer.',
      creditLimit: 1500000,
      createdAt: '2026-09-15T08:15:00.000Z',
      updatedAt: '2026-09-15T08:15:00.000Z',
    },
    {
      id: c5Id,
      name: 'Malam Ibrahim Musa',
      phone: '09012345678',
      normalizedPhone: '2349012345678',
      email: 'ibrahimmusa.kano@gmail.com',
      address: 'Kanti Kwari Market, Kano',
      notes: 'Grain bulk buyer. Transacts primarily via bank transfer.',
      creditLimit: 4000000,
      createdAt: '2026-09-20T16:00:00.000Z',
      updatedAt: '2026-09-20T16:00:00.000Z',
    },
  ];

  const debts: Debt[] = [
    {
      id: 'debt-001',
      customerId: c1Id,
      customerName: 'Chief Emeka Okonkwo',
      customerPhone: '08031234567',
      description: '50 Rolls of Industrial Galvanized Roofing Sheets',
      originalAmount: 1850000,
      amountRepaid: 1000000,
      outstandingBalance: 850000,
      dueDate: '2026-10-15', // Past due date relative to 2026-10-21 -> OVERDUE
      status: 'overdue',
      notes: 'Dispatched to Alaba warehouse. Cheque initial deposit cleared.',
      invoiceRef: 'INV-2026-089',
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-10-02T12:00:00.000Z',
    },
    {
      id: 'debt-002',
      customerId: c2Id,
      customerName: 'Alhaja Fatimah Bello',
      customerPhone: '08189876543',
      description: '30 Cartons of Swiss Voile Lace & Dutch Wax Hollandais',
      originalAmount: 950000,
      amountRepaid: 400000,
      outstandingBalance: 550000,
      dueDate: '2026-10-30', // Future relative to 2026-10-21 -> PARTIALLY PAID
      status: 'partially_paid',
      notes: 'Agreed 45-day payment period. Part payment made via OPay transfer.',
      invoiceRef: 'INV-2026-094',
      createdAt: '2026-09-25T14:30:00.000Z',
      updatedAt: '2026-10-10T16:45:00.000Z',
    },
    {
      id: 'debt-003',
      customerId: c3Id,
      customerName: 'Engr. Babatunde Williams',
      customerPhone: '07055551234',
      description: '100 Coils of Pure Copper Armoured Cables 16mm',
      originalAmount: 1200000,
      amountRepaid: 0,
      outstandingBalance: 1200000,
      dueDate: '2026-10-10', // Past -> OVERDUE
      status: 'overdue',
      notes: 'Supplied for duplex electrification project. Follow up needed.',
      invoiceRef: 'INV-2026-101',
      createdAt: '2026-09-28T09:15:00.000Z',
      updatedAt: '2026-09-28T09:15:00.000Z',
    },
    {
      id: 'debt-004',
      customerId: c4Id,
      customerName: 'Mrs. Ngozi Eze',
      customerPhone: '08023456789',
      description: '40 Bags of Royal Stallion Rice 50kg + 10 Jerrycans Groundnut Oil',
      originalAmount: 760000,
      amountRepaid: 0,
      outstandingBalance: 760000,
      dueDate: '2026-11-05', // Future -> OPEN
      status: 'open',
      notes: 'Weekly provisions restock consignment.',
      invoiceRef: 'INV-2026-107',
      createdAt: '2026-10-08T11:00:00.000Z',
      updatedAt: '2026-10-08T11:00:00.000Z',
    },
    {
      id: 'debt-005',
      customerId: c5Id,
      customerName: 'Malam Ibrahim Musa',
      customerPhone: '09012345678',
      description: 'Truckload of Yellow Maize (150 Bags)',
      originalAmount: 2100000,
      amountRepaid: 2100000,
      outstandingBalance: 0,
      dueDate: '2026-10-18',
      status: 'paid',
      notes: 'Full payment received via GTBank transfer. Settled in two installments.',
      invoiceRef: 'INV-2026-082',
      createdAt: '2026-09-10T13:00:00.000Z',
      updatedAt: '2026-10-18T15:30:00.000Z',
    },
  ];

  const repayments: Repayment[] = [
    {
      id: 'rep-001',
      debtId: 'debt-001',
      customerId: c1Id,
      customerName: 'Chief Emeka Okonkwo',
      debtDescription: '50 Rolls of Industrial Galvanized Roofing Sheets',
      amount: 1000000,
      paymentDate: '2026-10-02',
      paymentMethod: 'bank_transfer',
      reference: 'GTB-TRF-98124501',
      note: 'Part payment into Moniepoint business account',
      balanceBefore: 1850000,
      balanceAfter: 850000,
      idempotencyKey: 'seed-idemp-001',
      createdAt: '2026-10-02T12:00:00.000Z',
    },
    {
      id: 'rep-002',
      debtId: 'debt-002',
      customerId: c2Id,
      customerName: 'Alhaja Fatimah Bello',
      debtDescription: '30 Cartons of Swiss Voile Lace & Dutch Wax Hollandais',
      amount: 400000,
      paymentDate: '2026-10-10',
      paymentMethod: 'bank_transfer',
      reference: 'OPY-77341908-TRF',
      note: 'First installment via OPay',
      balanceBefore: 950000,
      balanceAfter: 550000,
      idempotencyKey: 'seed-idemp-002',
      createdAt: '2026-10-10T16:45:00.000Z',
    },
    {
      id: 'rep-003',
      debtId: 'debt-005',
      customerId: c5Id,
      customerName: 'Malam Ibrahim Musa',
      debtDescription: 'Truckload of Yellow Maize (150 Bags)',
      amount: 1100000,
      paymentDate: '2026-09-28',
      paymentMethod: 'bank_transfer',
      reference: 'ZEN-99201411-TRF',
      note: '50% advance delivery payment',
      balanceBefore: 2100000,
      balanceAfter: 1000000,
      idempotencyKey: 'seed-idemp-003',
      createdAt: '2026-09-28T14:00:00.000Z',
    },
    {
      id: 'rep-004',
      debtId: 'debt-005',
      customerId: c5Id,
      customerName: 'Malam Ibrahim Musa',
      debtDescription: 'Truckload of Yellow Maize (150 Bags)',
      amount: 1000000,
      paymentDate: '2026-10-18',
      paymentMethod: 'bank_transfer',
      reference: 'ZEN-10048291-TRF',
      note: 'Final settlement payment. Account cleared.',
      balanceBefore: 1000000,
      balanceAfter: 0,
      idempotencyKey: 'seed-idemp-004',
      createdAt: '2026-10-18T15:30:00.000Z',
    },
  ];

  const idempotencyRecords: Record<string, IdempotencyRecord> = {
    'seed-idemp-001': {
      key: 'seed-idemp-001',
      debtId: 'debt-001',
      amount: 1000000,
      paymentDate: '2026-10-02',
      timestamp: '2026-10-02T12:00:00.000Z',
      repayment: repayments[0],
    },
    'seed-idemp-002': {
      key: 'seed-idemp-002',
      debtId: 'debt-002',
      amount: 400000,
      paymentDate: '2026-10-10',
      timestamp: '2026-10-10T16:45:00.000Z',
      repayment: repayments[1],
    },
    'seed-idemp-003': {
      key: 'seed-idemp-003',
      debtId: 'debt-005',
      amount: 1100000,
      paymentDate: '2026-09-28',
      timestamp: '2026-09-28T14:00:00.000Z',
      repayment: repayments[2],
    },
    'seed-idemp-004': {
      key: 'seed-idemp-004',
      debtId: 'debt-005',
      amount: 1000000,
      paymentDate: '2026-10-18',
      timestamp: '2026-10-18T15:30:00.000Z',
      repayment: repayments[3],
    },
  };

  const settings: BusinessSettings = {
    businessName: 'Ade & Sons Trading Enterprise',
    ownerName: 'Alhaji Adeleke Balogun',
    phone: '08021112233',
    email: 'contact@adeandsonstrading.ng',
    address: 'Suite 24, Balogun Wholesale Complex, Lagos Island, Lagos State',
    bankName: 'Guaranty Trust Bank (GTBank)',
    accountNumber: '0124890123',
    accountName: 'Ade & Sons Trading Ent.',
    currency: 'NGN',
    currencySymbol: '₦',
    defaultGracePeriodDays: 14,
    adminPin: '1234',
    reminderTemplates: {
      gentle:
        'Hello {customer_name}, this is a gentle reminder from {business_name} regarding your balance of {amount_due} for "{description}". Due date: {due_date}. Kindly transfer to {bank_name}, {account_number} ({account_name}). Thank you for your continued patronage!',
      overdue:
        'Dear {customer_name}, your payment of {amount_due} for "{description}" was due on {due_date} and is now overdue. Please settle this balance promptly to maintain your credit facility with {business_name}. Payment details: {bank_name}, {account_number} ({account_name}). Thank you.',
      finalNotice:
        'URGENT NOTICE: {customer_name}, this is a final demand notice from {business_name} regarding your overdue debt of {amount_due} for "{description}". Due date was {due_date}. Please make payment immediately to avoid suspension of all supplies: {bank_name}, {account_number} ({account_name}).',
      receipt:
        'Payment Confirmation from {business_name}:\nDear {customer_name}, we have received your payment of {amount_repaid} for "{description}" on {payment_date}.\nRemaining balance: {amount_due}.\nReference: {reference}.\nThank you for doing business with us!',
    },
  };

  return {
    settings,
    customers,
    debts,
    repayments,
    reminderLogs: [],
    idempotencyRecords,
  };
}

class Database {
  private data: DatabaseSchema;
  private initialized = false;

  constructor() {
    this.data = getDefaultData();
  }

  public init(): void {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = {
          ...getDefaultData(),
          ...parsed,
          settings: { ...getDefaultData().settings, ...(parsed.settings || {}) },
        };
        // Normalize statuses
        this.recalculateAllStatuses();
      } else {
        this.saveSync();
      }
      this.initialized = true;
    } catch (err) {
      console.error('Error initializing database, using default seed:', err);
      this.data = getDefaultData();
      this.initialized = true;
    }
  }

  private recalculateAllStatuses(): void {
    for (const debt of this.data.debts) {
      debt.status = computeDebtStatus(debt);
    }
  }

  private saveSync(): void {
    const tmpFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  private async save(): Promise<void> {
    writeLock = writeLock.then(async () => {
      const tmpFile = `${DB_FILE}.${Date.now()}-${Math.random().toString(36).substring(2)}.tmp`;
      await fs.promises.writeFile(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      await fs.promises.rename(tmpFile, DB_FILE);
    });
    return writeLock;
  }

  // --- SETTINGS ---
  public getSettings(): BusinessSettings {
    this.init();
    return { ...this.data.settings };
  }

  public async updateSettings(updates: Partial<BusinessSettings>): Promise<BusinessSettings> {
    this.init();
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      reminderTemplates: {
        ...this.data.settings.reminderTemplates,
        ...(updates.reminderTemplates || {}),
      },
    };
    await this.save();
    return this.data.settings;
  }

  // --- CUSTOMERS ---
  public getCustomers(): Customer[] {
    this.init();
    return [...this.data.customers].sort((a, b) => a.name.localeCompare(b.name));
  }

  public getCustomerById(id: string): Customer | undefined {
    this.init();
    return this.data.customers.find((c) => c.id === id);
  }

  public async createCustomer(params: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    creditLimit?: number;
  }): Promise<Customer> {
    this.init();
    const phoneVal = normalizePhoneNumber(params.phone);
    const now = new Date().toISOString();

    const customer: Customer = {
      id: `cust-${crypto.randomUUID().substring(0, 8)}`,
      name: params.name.trim(),
      phone: params.phone.trim(),
      normalizedPhone: phoneVal.isValid ? phoneVal.normalized : params.phone.replace(/\D/g, ''),
      email: params.email?.trim() || undefined,
      address: params.address?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      creditLimit: params.creditLimit ? Number(params.creditLimit) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.data.customers.push(customer);
    await this.save();
    return customer;
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    this.init();
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    const existing = this.data.customers[idx];
    let normalizedPhone = existing.normalizedPhone;
    if (updates.phone) {
      const pVal = normalizePhoneNumber(updates.phone);
      normalizedPhone = pVal.isValid ? pVal.normalized : updates.phone.replace(/\D/g, '');
    }

    const updated: Customer = {
      ...existing,
      ...updates,
      normalizedPhone,
      updatedAt: new Date().toISOString(),
    };

    this.data.customers[idx] = updated;

    // Update customer name/phone in related debts as well for consistency
    for (const debt of this.data.debts) {
      if (debt.customerId === id) {
        if (updates.name) debt.customerName = updates.name;
        if (updates.phone) debt.customerPhone = updates.phone;
      }
    }
    for (const rep of this.data.repayments) {
      if (rep.customerId === id && updates.name) {
        rep.customerName = updates.name;
      }
    }

    await this.save();
    return updated;
  }

  public async deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
    this.init();
    // Check if customer has outstanding debts
    const activeDebts = this.data.debts.filter(
      (d) => d.customerId === id && d.outstandingBalance > 0.001
    );
    if (activeDebts.length > 0) {
      return {
        success: false,
        error: `Cannot delete customer with ${activeDebts.length} active outstanding debt(s). Please resolve or clear debts first.`,
      };
    }

    this.data.customers = this.data.customers.filter((c) => c.id !== id);
    await this.save();
    return { success: true };
  }

  // --- DEBTS ---
  public getDebts(filter?: {
    status?: DebtStatus | 'all';
    customerId?: string;
    search?: string;
  }): Debt[] {
    this.init();
    this.recalculateAllStatuses();

    let list = [...this.data.debts];

    if (filter?.customerId) {
      list = list.filter((d) => d.customerId === filter.customerId);
    }

    if (filter?.status && filter.status !== 'all') {
      list = list.filter((d) => d.status === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.customerName.toLowerCase().includes(q) ||
          d.customerPhone.includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.invoiceRef && d.invoiceRef.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getDebtById(id: string): { debt: Debt; repayments: Repayment[]; customer?: Customer } | null {
    this.init();
    this.recalculateAllStatuses();
    const debt = this.data.debts.find((d) => d.id === id);
    if (!debt) return null;

    const repayments = this.data.repayments
      .filter((r) => r.debtId === id)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    const customer = this.data.customers.find((c) => c.id === debt.customerId);

    return { debt, repayments, customer };
  }

  public async createDebt(params: {
    customerId: string;
    description: string;
    originalAmount: number;
    dueDate?: string | null;
    notes?: string;
    invoiceRef?: string;
  }): Promise<Debt> {
    this.init();
    const customer = this.data.customers.find((c) => c.id === params.customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${params.customerId} not found.`);
    }

    const amount = Number(params.originalAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Original amount must be a positive number greater than 0.');
    }

    const now = new Date().toISOString();
    const dueDate = params.dueDate ? params.dueDate.trim() : null;

    const initialStatus = computeDebtStatus({
      originalAmount: amount,
      amountRepaid: 0,
      outstandingBalance: amount,
      dueDate,
    });

    const debt: Debt = {
      id: `debt-${crypto.randomUUID().substring(0, 8)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      description: params.description.trim(),
      originalAmount: Math.round(amount * 100) / 100,
      amountRepaid: 0,
      outstandingBalance: Math.round(amount * 100) / 100,
      dueDate,
      status: initialStatus,
      notes: params.notes?.trim() || undefined,
      invoiceRef: params.invoiceRef?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.data.debts.unshift(debt);
    await this.save();
    return debt;
  }

  public async updateDebt(
    id: string,
    updates: Partial<Pick<Debt, 'description' | 'dueDate' | 'notes' | 'invoiceRef'>>
  ): Promise<Debt | null> {
    this.init();
    const idx = this.data.debts.findIndex((d) => d.id === id);
    if (idx === -1) return null;

    const existing = this.data.debts[idx];
    const updated: Debt = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    updated.status = computeDebtStatus(updated);

    this.data.debts[idx] = updated;
    await this.save();
    return updated;
  }

  public async deleteDebt(id: string): Promise<{ success: boolean; error?: string }> {
    this.init();
    const debt = this.data.debts.find((d) => d.id === id);
    if (!debt) return { success: false, error: 'Debt not found' };

    const reps = this.data.repayments.filter((r) => r.debtId === id);
    if (reps.length > 0) {
      return {
        success: false,
        error: `Cannot delete debt with ${reps.length} recorded repayment(s). If needed, adjust records or contact administrator.`,
      };
    }

    this.data.debts = this.data.debts.filter((d) => d.id !== id);
    await this.save();
    return { success: true };
  }

  // --- REPAYMENTS & IDEMPOTENCY ---
  public verifyIdempotencyKey(key: string): { exists: boolean; record?: IdempotencyRecord } {
    this.init();
    if (!key) return { exists: false };
    const record = this.data.idempotencyRecords[key];
    if (record) {
      return { exists: true, record };
    }
    return { exists: false };
  }

  public async recordRepayment(params: {
    debtId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: Repayment['paymentMethod'];
    reference?: string;
    note?: string;
    idempotencyKey: string;
  }): Promise<{
    repayment: Repayment;
    debt: Debt;
    isReplay: boolean;
  }> {
    this.init();

    // 1. Check idempotency: if request already committed with this key, return without double-executing!
    const key = params.idempotencyKey?.trim();
    if (key && this.data.idempotencyRecords[key]) {
      const existing = this.data.idempotencyRecords[key];
      const debt = this.data.debts.find((d) => d.id === existing.debtId);
      return {
        repayment: existing.repayment,
        debt: debt || ({} as Debt),
        isReplay: true,
      };
    }

    const debtIndex = this.data.debts.findIndex((d) => d.id === params.debtId);
    if (debtIndex === -1) {
      throw new Error(`Debt with ID ${params.debtId} does not exist.`);
    }

    const debt = this.data.debts[debtIndex];
    const amount = Math.round(Number(params.amount) * 100) / 100;

    if (isNaN(amount) || amount <= 0) {
      throw new Error('Repayment amount must be greater than zero.');
    }

    if (debt.outstandingBalance <= 0.001) {
      throw new Error('This debt has already been paid in full.');
    }

    // Guard against paying more than outstanding balance
    if (amount > debt.outstandingBalance + 0.01) {
      throw new Error(
        `Repayment amount (${amount}) cannot exceed current outstanding balance (${debt.outstandingBalance}).`
      );
    }

    const balanceBefore = debt.outstandingBalance;
    const balanceAfter = Math.max(0, Math.round((balanceBefore - amount) * 100) / 100);
    const newAmountRepaid = Math.round((debt.amountRepaid + amount) * 100) / 100;

    const now = new Date().toISOString();
    const repaymentId = `rep-${crypto.randomUUID().substring(0, 8)}`;

    const repayment: Repayment = {
      id: repaymentId,
      debtId: debt.id,
      customerId: debt.customerId,
      customerName: debt.customerName,
      debtDescription: debt.description,
      amount,
      paymentDate: params.paymentDate || getTodayString(),
      paymentMethod: params.paymentMethod || 'bank_transfer',
      reference: params.reference?.trim() || undefined,
      note: params.note?.trim() || undefined,
      balanceBefore,
      balanceAfter,
      idempotencyKey: key || repaymentId,
      createdAt: now,
    };

    // Update debt
    debt.amountRepaid = newAmountRepaid;
    debt.outstandingBalance = balanceAfter;
    debt.status = computeDebtStatus(debt);
    debt.updatedAt = now;

    // Push records
    this.data.repayments.unshift(repayment);

    // Record idempotency
    if (key) {
      this.data.idempotencyRecords[key] = {
        key,
        debtId: debt.id,
        amount,
        paymentDate: repayment.paymentDate,
        timestamp: now,
        repayment,
      };
    }

    await this.save();

    return {
      repayment,
      debt,
      isReplay: false,
    };
  }

  public getRepayments(filter?: {
    debtId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
  }): Repayment[] {
    this.init();
    let list = [...this.data.repayments];

    if (filter?.debtId) {
      list = list.filter((r) => r.debtId === filter.debtId);
    }

    if (filter?.customerId) {
      list = list.filter((r) => r.customerId === filter.customerId);
    }

    if (filter?.paymentMethod && filter.paymentMethod !== 'all') {
      list = list.filter((r) => r.paymentMethod === filter.paymentMethod);
    }

    if (filter?.startDate) {
      list = list.filter((r) => r.paymentDate >= filter.startDate!);
    }

    if (filter?.endDate) {
      list = list.filter((r) => r.paymentDate <= filter.endDate!);
    }

    return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }

  // --- REMINDERS LOG ---
  public async logReminder(params: {
    customerId: string;
    debtId?: string;
    type: ReminderLog['type'];
    normalizedPhone: string;
    messagePreview: string;
  }): Promise<ReminderLog> {
    this.init();
    const log: ReminderLog = {
      id: `rem-${crypto.randomUUID().substring(0, 8)}`,
      customerId: params.customerId,
      debtId: params.debtId,
      type: params.type,
      normalizedPhone: params.normalizedPhone,
      messagePreview: params.messagePreview.substring(0, 150),
      timestamp: new Date().toISOString(),
    };
    this.data.reminderLogs.unshift(log);
    await this.save();
    return log;
  }

  public getReminderLogs(customerId?: string): ReminderLog[] {
    this.init();
    if (customerId) {
      return this.data.reminderLogs.filter((r) => r.customerId === customerId);
    }
    return this.data.reminderLogs;
  }

  // --- REPORTS & AGGREGATES ---
  public getReportsSummary(): ReportsSummary {
    this.init();
    this.recalculateAllStatuses();

    let totalOutstandingDebt = 0;
    let totalOverdueDebt = 0;
    let totalPaidDebt = 0;
    let totalOriginalDebt = 0;
    let totalRepaidAmount = 0;

    let countOpen = 0;
    let countPartiallyPaid = 0;
    let countOverdue = 0;
    let countPaid = 0;

    for (const d of this.data.debts) {
      totalOriginalDebt += d.originalAmount;
      totalRepaidAmount += d.amountRepaid;
      totalOutstandingDebt += d.outstandingBalance;

      if (d.status === 'overdue') {
        countOverdue++;
        totalOverdueDebt += d.outstandingBalance;
      } else if (d.status === 'partially_paid') {
        countPartiallyPaid++;
      } else if (d.status === 'open') {
        countOpen++;
      } else if (d.status === 'paid') {
        countPaid++;
        totalPaidDebt += d.originalAmount;
      }
    }

    // Customer level breakdown
    const customerBalancesMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        customerPhone: string;
        totalOutstanding: number;
        totalRepaid: number;
        activeDebtsCount: number;
        overdueDebtsCount: number;
        lastPaymentDate: string | null;
      }
    >();

    for (const c of this.data.customers) {
      customerBalancesMap.set(c.id, {
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        totalOutstanding: 0,
        totalRepaid: 0,
        activeDebtsCount: 0,
        overdueDebtsCount: 0,
        lastPaymentDate: null,
      });
    }

    for (const d of this.data.debts) {
      let entry = customerBalancesMap.get(d.customerId);
      if (!entry) {
        entry = {
          customerId: d.customerId,
          customerName: d.customerName,
          customerPhone: d.customerPhone,
          totalOutstanding: 0,
          totalRepaid: 0,
          activeDebtsCount: 0,
          overdueDebtsCount: 0,
          lastPaymentDate: null,
        };
        customerBalancesMap.set(d.customerId, entry);
      }

      entry.totalOutstanding += d.outstandingBalance;
      entry.totalRepaid += d.amountRepaid;
      if (d.outstandingBalance > 0.001) {
        entry.activeDebtsCount++;
      }
      if (d.status === 'overdue') {
        entry.overdueDebtsCount++;
      }
    }

    for (const r of this.data.repayments) {
      const entry = customerBalancesMap.get(r.customerId);
      if (entry) {
        if (!entry.lastPaymentDate || r.paymentDate > entry.lastPaymentDate) {
          entry.lastPaymentDate = r.paymentDate;
        }
      }
    }

    const customerBalances = Array.from(customerBalancesMap.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding
    );

    return {
      totalOutstandingDebt: Math.round(totalOutstandingDebt * 100) / 100,
      totalOverdueDebt: Math.round(totalOverdueDebt * 100) / 100,
      totalPaidDebt: Math.round(totalPaidDebt * 100) / 100,
      totalOriginalDebt: Math.round(totalOriginalDebt * 100) / 100,
      totalRepaidAmount: Math.round(totalRepaidAmount * 100) / 100,
      countOpen,
      countPartiallyPaid,
      countOverdue,
      countPaid,
      totalDebtsCount: this.data.debts.length,
      totalCustomersCount: this.data.customers.length,
      customerBalances,
    };
  }

  public async resetToSeed(): Promise<void> {
    this.data = getDefaultData();
    await this.save();
  }
}

export const db = new Database();
