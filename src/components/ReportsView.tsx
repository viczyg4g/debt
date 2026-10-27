/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CreditCard,
  PieChart,
} from 'lucide-react';
import { ReportsSummary, Debt, Repayment, BusinessSettings } from '../types';
import { formatCurrency } from '../utils/phoneUtils';
import {
  exportCustomerBalancesToCSV,
  exportRepaymentsToCSV,
  exportDebtsToCSV,
} from '../utils/csvExport';

interface ReportsViewProps {
  summary: ReportsSummary | null;
  debts: Debt[];
  repayments: Repayment[];
  settings: BusinessSettings | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  debts,
  repayments,
  settings,
}) => {
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const currencySymbol = settings?.currencySymbol || '₦';

  // Compute date range limits
  const now = new Date();
  let rangeStart = '';
  let rangeEnd = now.toISOString().split('T')[0];

  if (dateRangePreset === 'today') {
    rangeStart = rangeEnd;
  } else if (dateRangePreset === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    rangeStart = d.toISOString().split('T')[0];
  } else if (dateRangePreset === 'month') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    rangeStart = d.toISOString().split('T')[0];
  } else if (dateRangePreset === 'year') {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    rangeStart = d.toISOString().split('T')[0];
  } else if (dateRangePreset === 'custom') {
    rangeStart = customStart;
    rangeEnd = customEnd || now.toISOString().split('T')[0];
  }

  // Filter repayments in date range
  const filteredRepayments = repayments.filter((r) => {
    if (rangeStart && r.paymentDate < rangeStart) return false;
    if (rangeEnd && r.paymentDate > rangeEnd) return false;
    return true;
  });

  const rangeRepaymentTotal = filteredRepayments.reduce((sum, r) => sum + r.amount, 0);

  // Method breakdown
  const methodMap: Record<string, number> = {};
  for (const r of filteredRepayments) {
    methodMap[r.paymentMethod] = (methodMap[r.paymentMethod] || 0) + r.amount;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Global CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financial Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time authoritative ledger totals, debt aging, and customer credit exposure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportDebtsToCSV(debts, 'debtbook_all_debts_report.csv')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Debts CSV</span>
          </button>

          <button
            onClick={() =>
              exportRepaymentsToCSV(filteredRepayments, 'debtbook_repayments_period_report.csv')
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Repayments CSV</span>
          </button>

          <button
            onClick={() =>
              summary &&
              exportCustomerBalancesToCSV(
                summary.customerBalances,
                'debtbook_customer_balances_report.csv'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Customer Balances CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
            Total Outstanding Debt
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(summary?.totalOutstandingDebt ?? 0, currencySymbol)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Original: {formatCurrency(summary?.totalOriginalDebt ?? 0, currencySymbol)}</span>
            <span className="font-semibold text-slate-700">
              {summary?.totalDebtsCount ?? 0} total
            </span>
          </div>
        </div>

        {/* Overdue Balances */}
        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              Overdue Balances
            </span>
            <span className="text-[11px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-mono">
              {summary?.countOverdue ?? 0}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-red-600">
            {formatCurrency(summary?.totalOverdueDebt ?? 0, currencySymbol)}
          </div>
          <p className="text-xs text-red-700/80 mt-2">
            Past due date without full settlement
          </p>
        </div>

        {/* Partially Paid Balances */}
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Partially Paid Debts
            </span>
            <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">
              {summary?.countPartiallyPaid ?? 0}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-800">
            {summary?.countPartiallyPaid ?? 0} Active
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Installments in progress
          </p>
        </div>

        {/* Fully Paid Debts */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Paid Debts
            </span>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
              {summary?.countPaid ?? 0}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {formatCurrency(summary?.totalPaidDebt ?? 0, currencySymbol)}
          </div>
          <p className="text-xs text-emerald-700/80 mt-2">
            Recovered principal in full
          </p>
        </div>
      </div>

      {/* Repayments Within Date Range Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Repayments Within Selected Date Range</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Collections filter based on payment transaction date.
            </p>
          </div>

          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'Last 30 Days' },
              { id: 'year', label: 'Last Year' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateRangePreset(p.id as any)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  dateRangePreset === p.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateRangePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded"
              />
            </div>
          </div>
        )}

        {/* Period Summary & Method Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
            <span className="text-xs text-emerald-800 font-semibold uppercase block">
              Total Repayments in Period
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
              {formatCurrency(rangeRepaymentTotal, currencySymbol)}
            </div>
            <span className="text-xs text-emerald-700 block mt-1">
              {filteredRepayments.length} payment transaction(s) recorded
            </span>
          </div>

          <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-700 uppercase block mb-2">
              Payment Method Breakdown
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(methodMap).length === 0 ? (
                <span className="text-xs text-slate-400 col-span-full">
                  No payment records in selected period.
                </span>
              ) : (
                Object.entries(methodMap).map(([method, amt]) => (
                  <div key={method} className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 capitalize block">
                      {method.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums text-slate-900 block mt-0.5">
                      {formatCurrency(amt, currencySymbol)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer-Level Outstanding Balances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Customer-Level Outstanding Balances
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by total outstanding debt exposure across all active consignments.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-center">Active Debts</th>
                <th className="py-3 px-4 text-center">Overdue Debts</th>
                <th className="py-3 px-4 text-right">Total Repaid</th>
                <th className="py-3 px-4 text-right">Total Outstanding Debt</th>
                <th className="py-3 px-4">Last Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {summary?.customerBalances.map((item) => (
                <tr key={item.customerId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {item.customerName}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {item.customerPhone}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    {item.activeDebtsCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    {item.overdueDebtsCount > 0 ? (
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        {item.overdueDebtsCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                    {formatCurrency(item.totalRepaid, currencySymbol)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 text-sm">
                    <span className={item.totalOutstanding > 0 ? 'text-red-600' : 'text-slate-700'}>
                      {formatCurrency(item.totalOutstanding, currencySymbol)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {item.lastPaymentDate || 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
