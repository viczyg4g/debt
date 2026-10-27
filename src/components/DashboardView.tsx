/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  PlusCircle,
  CreditCard,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Debt, Repayment, ReportsSummary, BusinessSettings, Customer } from '../types';
import { formatCurrency } from '../utils/phoneUtils';
import { NavTab } from './Header';

interface DashboardViewProps {
  summary: ReportsSummary | null;
  debts: Debt[];
  repayments: Repayment[];
  customers: Customer[];
  settings: BusinessSettings | null;
  onSelectTab: (tab: NavTab) => void;
  onOpenRecordDebt: () => void;
  onOpenRecordRepayment: (debtId?: string) => void;
  onOpenWhatsAppReminder: (customer: Customer, debt: Debt) => void;
  onViewDebtDetail: (debtId: string) => void;
  onViewReceipt: (repayment: Repayment, debt: Debt) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  debts,
  repayments,
  customers,
  settings,
  onSelectTab,
  onOpenRecordDebt,
  onOpenRecordRepayment,
  onOpenWhatsAppReminder,
  onViewDebtDetail,
  onViewReceipt,
}) => {
  const currencySymbol = settings?.currencySymbol || '₦';

  // Urgent overdue debts
  const overdueDebts = debts.filter((d) => d.status === 'overdue');
  const recentRepayments = repayments.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
            Business Ledger Overview
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">
            {settings?.businessName || 'DebtBook Ledger'}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Authoritative source for debtor records, customer balances, and idempotent repayments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenRecordRepayment()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/90 border border-emerald-800 rounded-lg hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={onOpenRecordDebt}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Debt</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Outstanding */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Outstanding Debt</span>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] text-slate-400">Authoritative</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatCurrency(summary?.totalOutstandingDebt ?? 0, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>{summary?.totalDebtsCount ?? 0} total debts recorded</span>
          </div>
        </div>

        {/* Overdue Debt */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-red-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue Balance</span>
            </span>
            <span className="text-[11px] font-mono font-bold bg-red-50 px-1.5 py-0.5 rounded text-red-700">
              {summary?.countOverdue ?? 0} Debts
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-red-600">
            {formatCurrency(summary?.totalOverdueDebt ?? 0, currencySymbol)}
          </div>
          <div className="text-[11px] text-red-700/80 mt-2 flex items-center justify-between">
            <span>Requires urgent reminder</span>
          </div>
        </div>

        {/* Total Repaid */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Repaid</span>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {summary?.countPaid ?? 0} Fully Paid
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-emerald-600">
            {formatCurrency(summary?.totalRepaidAmount ?? 0, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            <span>Recovered from customers</span>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Customer Accounts</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
            {summary?.totalCustomersCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            <span>
              {summary?.customerBalances.filter((c) => c.totalOutstanding > 0).length ?? 0} with
              active balances
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Debts Attention Section */}
      {overdueDebts.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50/70 border-b border-red-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-red-900">
                Overdue Debts Requiring Attention ({overdueDebts.length})
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('debts')}
              className="text-xs text-red-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {overdueDebts.slice(0, 3).map((debt) => {
              const customer = customers.find((c) => c.id === debt.customerId);
              return (
                <div
                  key={debt.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {debt.customerName}
                      </h4>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{debt.customerPhone}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                      {debt.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-red-700 font-medium mt-1">
                      <span>Due: {debt.dueDate}</span>
                      <span>·</span>
                      <span>Original: {formatCurrency(debt.originalAmount, currencySymbol)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block">Outstanding</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-red-600">
                        {formatCurrency(debt.outstandingBalance, currencySymbol)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {customer && (
                        <button
                          onClick={() => onOpenWhatsAppReminder(customer, debt)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Generate WhatsApp Reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Remind</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenRecordRepayment(debt.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Record Payment"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2-Column Split: Recent Debts & Recent Repayments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Debts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Debt Ledger
            </h3>
            <button
              onClick={() => onSelectTab('debts')}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>See All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {debts.slice(0, 4).map((debt) => (
              <div
                key={debt.id}
                onClick={() => onViewDebtDetail(debt.id)}
                className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {debt.customerName}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        debt.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : debt.status === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800'
                          : debt.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {debt.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">
                    {debt.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {formatCurrency(debt.outstandingBalance, currencySymbol)}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    of {formatCurrency(debt.originalAmount, currencySymbol)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Repayments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Repayments
            </h3>
            <button
              onClick={() => onSelectTab('repayments')}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Repayments Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRepayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No repayments recorded yet.
              </div>
            ) : (
              recentRepayments.map((rep) => {
                const parentDebt = debts.find((d) => d.id === rep.debtId);
                return (
                  <div
                    key={rep.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {rep.customerName}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize font-medium">
                          {rep.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>{rep.paymentDate}</span>
                        {rep.reference && <span>· Ref: {rep.reference}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono tabular-nums text-emerald-600">
                          +{formatCurrency(rep.amount, currencySymbol)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Bal: {formatCurrency(rep.balanceAfter, currencySymbol)}
                        </span>
                      </div>

                      {parentDebt && (
                        <button
                          onClick={() => onViewReceipt(rep, parentDebt)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
