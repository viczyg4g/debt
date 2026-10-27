/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { normalizePhoneNumber } from './src/utils/phoneUtils.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize database
db.init();

// --- API ROUTES ---

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    // Do not expose raw admin pin directly to client unless authenticated, but send masked or flag
    res.json({
      ...settings,
      hasAdminPin: Boolean(settings.adminPin),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const pinHeader = req.headers['x-admin-pin'] as string;
    const currentSettings = db.getSettings();

    // Verify PIN if current settings require one
    if (currentSettings.adminPin && pinHeader !== currentSettings.adminPin) {
      return res.status(403).json({ error: 'Invalid or missing administrator PIN.' });
    }

    const updated = await db.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

// Customers
app.get('/api/customers', (_req: Request, res: Response) => {
  try {
    const customers = db.getCustomers();
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch customers' });
  }
});

app.post('/api/customers', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, notes, creditLimit } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Customer name and phone number are required.' });
    }

    const phoneValidation = normalizePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        error: phoneValidation.error || 'Invalid phone number format. Please provide a valid Nigerian or international number.',
      });
    }

    const customer = await db.createCustomer({
      name,
      phone,
      email,
      address,
      notes,
      creditLimit,
    });
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (req.body.phone) {
      const phoneValidation = normalizePhoneNumber(req.body.phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          error: phoneValidation.error || 'Invalid phone number format.',
        });
      }
    }

    const updated = await db.updateCustomer(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.deleteCustomer(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete customer' });
  }
});

// Debts
app.get('/api/debts', (req: Request, res: Response) => {
  try {
    const { status, customerId, search, page, limit } = req.query;
    const allDebts = db.getDebts({
      status: status as any,
      customerId: customerId as string,
      search: search as string,
    });

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const pageSize = limit ? parseInt(limit as string, 10) : 50;

    const total = allDebts.length;
    const startIndex = (pageNum - 1) * pageSize;
    const paginated = allDebts.slice(startIndex, startIndex + pageSize);

    res.json({
      debts: paginated,
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch debts' });
  }
});

app.get('/api/debts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const debtDetails = db.getDebtById(id);
    if (!debtDetails) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json(debtDetails);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch debt details' });
  }
});

app.post('/api/debts', async (req: Request, res: Response) => {
  try {
    const { customerId, description, originalAmount, dueDate, notes, invoiceRef } = req.body;
    if (!customerId || !description || originalAmount === undefined) {
      return res.status(400).json({ error: 'Customer, description, and original amount are required.' });
    }

    const debt = await db.createDebt({
      customerId,
      description,
      originalAmount,
      dueDate,
      notes,
      invoiceRef,
    });

    res.status(201).json(debt);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create debt' });
  }
});

app.put('/api/debts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.updateDebt(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update debt' });
  }
});

app.delete('/api/debts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.deleteDebt(id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete debt' });
  }
});

// Repayments & Idempotency
app.get('/api/repayments/verify-idempotency/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const result = db.verifyIdempotencyKey(key);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check idempotency key' });
  }
});

app.post('/api/repayments', async (req: Request, res: Response) => {
  try {
    const { debtId, amount, paymentDate, paymentMethod, reference, note, idempotencyKey } = req.body;

    if (!debtId || amount === undefined) {
      return res.status(400).json({ error: 'Debt ID and repayment amount are required.' });
    }

    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency key is required to guarantee safe financial transactions.' });
    }

    const result = await db.recordRepayment({
      debtId,
      amount: parseFloat(amount),
      paymentDate,
      paymentMethod,
      reference,
      note,
      idempotencyKey,
    });

    res.status(result.isReplay ? 200 : 201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record repayment' });
  }
});

app.get('/api/repayments', (req: Request, res: Response) => {
  try {
    const { debtId, customerId, startDate, endDate, paymentMethod } = req.query;
    const repayments = db.getRepayments({
      debtId: debtId as string,
      customerId: customerId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      paymentMethod: paymentMethod as string,
    });
    res.json(repayments);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch repayments' });
  }
});

// Reports & Analytics
app.get('/api/reports/summary', (_req: Request, res: Response) => {
  try {
    const summary = db.getReportsSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate report' });
  }
});

// Reminders Log
app.post('/api/reminders/log', async (req: Request, res: Response) => {
  try {
    const { customerId, debtId, type, normalizedPhone, messagePreview } = req.body;
    if (!customerId || !normalizedPhone || !type) {
      return res.status(400).json({ error: 'Customer ID, normalized phone, and reminder type are required.' });
    }

    const log = await db.logReminder({
      customerId,
      debtId,
      type,
      normalizedPhone,
      messagePreview: messagePreview || '',
    });

    res.status(201).json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log reminder' });
  }
});

app.get('/api/reminders/history/:customerId', (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const logs = db.getReminderLogs(customerId);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reminder history' });
  }
});

// Reset Demo Data
app.post('/api/reset-data', async (_req: Request, res: Response) => {
  try {
    await db.resetToSeed();
    res.json({ success: true, message: 'Database reset to default seed records successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset database' });
  }
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DebtBook Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
