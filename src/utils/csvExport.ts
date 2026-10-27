/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Debt, Repayment, ReportsSummary } from '../types';

export function exportDebtsToCSV(debts: Debt[], filename = 'debtbook_register.csv') {
  const headers = [
    'Debt ID',
    'Customer Name',
    'Customer Phone',
    'Description',
    'Original Amount',
    'Amount Repaid',
    'Outstanding Balance',
    'Due Date',
    'Status',
    'Invoice Ref',
    'Created At',
  ];

  const rows = debts.map((d) => [
    d.id,
    `"${d.customerName.replace(/"/g, '""')}"`,
    `"${d.customerPhone}"`,
    `"${d.description.replace(/"/g, '""')}"`,
    d.originalAmount.toFixed(2),
    d.amountRepaid.toFixed(2),
    d.outstandingBalance.toFixed(2),
    d.dueDate || 'N/A',
    d.status.toUpperCase(),
    `"${(d.invoiceRef || '').replace(/"/g, '""')}"`,
    d.createdAt,
  ]);

  downloadCSV([headers, ...rows], filename);
}

export function exportRepaymentsToCSV(repayments: Repayment[], filename = 'debtbook_repayments.csv') {
  const headers = [
    'Repayment ID',
    'Debt ID',
    'Customer Name',
    'Debt Description',
    'Amount',
    'Payment Date',
    'Payment Method',
    'Reference',
    'Balance Before',
    'Balance After',
    'Idempotency Key',
    'Created At',
  ];

  const rows = repayments.map((r) => [
    r.id,
    r.debtId,
    `"${r.customerName.replace(/"/g, '""')}"`,
    `"${r.debtDescription.replace(/"/g, '""')}"`,
    r.amount.toFixed(2),
    r.paymentDate,
    r.paymentMethod.toUpperCase(),
    `"${(r.reference || '').replace(/"/g, '""')}"`,
    r.balanceBefore.toFixed(2),
    r.balanceAfter.toFixed(2),
    r.idempotencyKey,
    r.createdAt,
  ]);

  downloadCSV([headers, ...rows], filename);
}

export function exportCustomerBalancesToCSV(
  customerBalances: ReportsSummary['customerBalances'],
  filename = 'debtbook_customer_balances.csv'
) {
  const headers = [
    'Customer ID',
    'Customer Name',
    'Phone',
    'Total Outstanding Debt',
    'Total Repaid',
    'Active Debts Count',
    'Overdue Debts Count',
    'Last Payment Date',
  ];

  const rows = customerBalances.map((c) => [
    c.customerId,
    `"${c.customerName.replace(/"/g, '""')}"`,
    `"${c.customerPhone}"`,
    c.totalOutstanding.toFixed(2),
    c.totalRepaid.toFixed(2),
    c.activeDebtsCount,
    c.overdueDebtsCount,
    c.lastPaymentDate || 'None',
  ]);

  downloadCSV([headers, ...rows], filename);
}

function downloadCSV(dataRows: (string | number)[][], filename: string) {
  const csvContent = dataRows.map((row) => row.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
