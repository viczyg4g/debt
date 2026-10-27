/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Calendar,
  ShieldCheck,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { Repayment, Debt, BusinessSettings } from '../types';
import { formatCurrency } from '../utils/phoneUtils';
import { exportRepaymentsToCSV } from '../utils/csvExport';

interface RepaymentsViewProps {
  repayments: Repayment[];
  debts: Debt[];
  settings: BusinessSettings | null;
  onOpenRecordRepayment: () => void;
  onViewReceipt: (repayment: Repayment, debt: Debt) => void;
}

export const RepaymentsView: React.FC<RepaymentsViewProps> = ({
  repayments,
  debts,
  settings,
  onOpenRecordRepayment,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const currencySymbol = settings?.currencySymbol || '₦';

  const filteredRepayments = repayments.filter((rep) => {
    if (methodFilter !== 'all' && rep.paymentMethod !== methodFilter) {
      return false;
    }

    if (startDate && rep.paymentDate < startDate) {
      return false;
    }

    if (endDate && rep.paymentDate > endDate) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchCustomer = rep.customerName.toLowerCase().includes(q);
      const matchDesc = rep.debtDescription.toLowerCase().includes(q);
      const matchRef = rep.reference ? rep.reference.toLowerCase().includes(q) : false;
      const matchId = rep.id.toLowerCase().includes(q);
      if (!matchCustomer && !matchDesc && !matchRef && !matchId) {
        return false;
      }
    }

    return true;
  });

  const totalCollected = filteredRepayments.reduce((sum, r) => sum + r.amount, 0);

  const handleExportCSV = () => {
    exportRepaymentsToCSV(filteredRepayments, 'debtbook_repayments_ledger.csv');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Repayments Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade history of all customer payments with balance tracking and idempotency tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenRecordRepayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors shadow-2xs cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Collected (Filtered)</span>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-600">
            {formatCurrency(totalCollected, currencySymbol)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Transactions Recorded</span>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900">
            {filteredRepayments.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All transactions committed with unique idempotency protection.</span>
        </div>
      </div>

      {/* Filter and Date Range Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer, reference, note..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            >
              <option value="all">All Payment Methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="pos_card">POS / Card</option>
              <option value="ussd">USSD</option>
              <option value="cheque_other">Cheque / Other</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-1 cursor-pointer"
                title="Clear date filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredRepayments.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No repayments found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No repayment transactions match the chosen filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer & Debt</th>
                    <th className="py-3 px-4">Method & Ref</th>
                    <th className="py-3 px-4 text-right">Repayment Amount</th>
                    <th className="py-3 px-4 text-right">Balance Change</th>
                    <th className="py-3 px-4">Idempotency Key</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredRepayments.map((rep) => {
                    const parentDebt = debts.find((d) => d.id === rep.debtId);
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                          {rep.paymentDate}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{rep.customerName}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                            {rep.debtDescription}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                            {rep.paymentMethod.replace('_', ' ')}
                          </span>
                          {rep.reference && (
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {rep.reference}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-600 text-sm">
                          +{formatCurrency(rep.amount, currencySymbol)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono tabular-nums text-slate-600">
                            {formatCurrency(rep.balanceBefore, currencySymbol)} →{' '}
                            <strong className="text-slate-900">
                              {formatCurrency(rep.balanceAfter, currencySymbol)}
                            </strong>
                          </div>
                          {rep.balanceAfter === 0 && (
                            <span className="text-[10px] text-emerald-600 font-semibold">Cleared</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className="font-mono text-[10px] text-slate-400 truncate block max-w-[120px]"
                            title={rep.idempotencyKey}
                          >
                            {rep.idempotencyKey}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {parentDebt ? (
                            <button
                              onClick={() => onViewReceipt(rep, parentDebt)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredRepayments.map((rep) => {
                const parentDebt = debts.find((d) => d.id === rep.debtId);
                return (
                  <div key={rep.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-slate-500">{rep.paymentDate}</span>
                        <h4 className="text-sm font-bold text-slate-900">{rep.customerName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 block">
                          +{formatCurrency(rep.amount, currencySymbol)}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          {rep.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">{rep.debtDescription}</p>

                    <div className="p-2 bg-slate-50 rounded-lg text-xs flex items-center justify-between font-mono">
                      <span className="text-slate-500">Resulting Balance:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(rep.balanceAfter, currencySymbol)}
                        {rep.balanceAfter === 0 && ' (Settled)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="font-mono text-[10px] truncate max-w-[150px]">
                        Ref: {rep.reference || rep.id}
                      </span>
                      {parentDebt && (
                        <button
                          onClick={() => onViewReceipt(rep, parentDebt)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-md"
                        >
                          View Receipt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
