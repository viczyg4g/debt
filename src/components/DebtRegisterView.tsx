/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  CreditCard,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Debt, Customer, DebtStatus, BusinessSettings } from '../types';
import { formatCurrency } from '../utils/phoneUtils';
import { exportDebtsToCSV } from '../utils/csvExport';

interface DebtRegisterViewProps {
  debts: Debt[];
  customers: Customer[];
  settings: BusinessSettings | null;
  onOpenRecordDebt: () => void;
  onOpenRecordRepayment: (debtId: string) => void;
  onOpenWhatsAppReminder: (customer: Customer, debt: Debt) => void;
  onViewDebtDetail: (debtId: string) => void;
}

export const DebtRegisterView: React.FC<DebtRegisterViewProps> = ({
  debts,
  customers,
  settings,
  onOpenRecordDebt,
  onOpenRecordRepayment,
  onOpenWhatsAppReminder,
  onViewDebtDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<DebtStatus | 'all'>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const currencySymbol = settings?.currencySymbol || '₦';

  // Client-side filtering over authoritative debts
  const filteredDebts = debts.filter((d) => {
    // Status filter
    if (statusFilter !== 'all' && d.status !== statusFilter) {
      return false;
    }

    // Customer filter
    if (customerFilter !== 'all' && d.customerId !== customerFilter) {
      return false;
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = d.customerName.toLowerCase().includes(q);
      const matchPhone = d.customerPhone.includes(q);
      const matchDesc = d.description.toLowerCase().includes(q);
      const matchRef = d.invoiceRef ? d.invoiceRef.toLowerCase().includes(q) : false;
      if (!matchName && !matchPhone && !matchDesc && !matchRef) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalItems = filteredDebts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const paginatedDebts = filteredDebts.slice((validPage - 1) * pageSize, validPage * pageSize);

  const handleExportCSV = () => {
    exportDebtsToCSV(filteredDebts, `debtbook_register_${statusFilter}.csv`);
  };

  const getStatusBadge = (status: DebtStatus) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">
            Overdue
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
            Partially Paid
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
            Open
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Authoritative Debt Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full ledger of customer credit, settlement statuses, and outstanding balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Download CSV of current filtered list"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenRecordDebt}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors shadow-2xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Debt</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by customer name, phone, goods description, invoice ref..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Customer Filter */}
          <div className="w-full sm:w-48 shrink-0">
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs (Interactive Segmented Buttons) */}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Status:</span>
          </span>
          {[
            { id: 'all', label: 'All Debts' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'open', label: 'Open' },
            { id: 'paid', label: 'Paid' },
          ].map((tab) => {
            const count =
              tab.id === 'all'
                ? debts.length
                : debts.filter((d) => d.status === tab.id).length;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-1.5 font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Register Table & Mobile View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {paginatedDebts.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No debts found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No debt records match the chosen search or status filters. Adjust your search or create a new debt.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Original Amount</th>
                    <th className="py-3 px-4 text-right">Amount Repaid</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {paginatedDebts.map((debt) => {
                    const customer = customers.find((c) => c.id === debt.customerId);
                    return (
                      <tr key={debt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{debt.customerName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{debt.customerPhone}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-900 line-clamp-1">{debt.description}</div>
                          {debt.invoiceRef && (
                            <span className="text-[10px] text-slate-400 font-mono">Ref: {debt.invoiceRef}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatCurrency(debt.originalAmount, currencySymbol)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-emerald-700">
                          {formatCurrency(debt.amountRepaid, currencySymbol)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-red-600">
                          {formatCurrency(debt.outstandingBalance, currencySymbol)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className={`font-mono ${debt.status === 'overdue' ? 'text-red-700 font-semibold' : 'text-slate-600'}`}>
                            {debt.dueDate || '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {getStatusBadge(debt.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onViewDebtDetail(debt.id)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="View Audit Trail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {customer && debt.outstandingBalance > 0.001 && (
                              <button
                                onClick={() => onOpenWhatsAppReminder(customer, debt)}
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                title="WhatsApp Reminder"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}

                            {debt.outstandingBalance > 0.001 && (
                              <button
                                onClick={() => onOpenRecordRepayment(debt.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-900 bg-emerald-300 hover:bg-emerald-400 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                title="Record Repayment"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {paginatedDebts.map((debt) => {
                const customer = customers.find((c) => c.id === debt.customerId);
                return (
                  <div key={debt.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{debt.customerName}</h4>
                        <span className="text-xs text-slate-500 font-mono">{debt.customerPhone}</span>
                      </div>
                      <div>{getStatusBadge(debt.status)}</div>
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-2">{debt.description}</p>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Outstanding</span>
                        <span className="font-mono tabular-nums font-bold text-red-600 text-sm">
                          {formatCurrency(debt.outstandingBalance, currencySymbol)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Original / Paid</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          {formatCurrency(debt.amountRepaid, currencySymbol)} / {formatCurrency(debt.originalAmount, currencySymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {debt.dueDate || 'No due date'}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onViewDebtDetail(debt.id)}
                          className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md"
                        >
                          Details
                        </button>
                        {customer && debt.outstandingBalance > 0.001 && (
                          <button
                            onClick={() => onOpenWhatsAppReminder(customer, debt)}
                            className="p-1.5 text-emerald-700 bg-emerald-50 rounded-md"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {debt.outstandingBalance > 0.001 && (
                          <button
                            onClick={() => onOpenRecordRepayment(debt.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-md"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Showing {Math.min((validPage - 1) * pageSize + 1, totalItems)} -{' '}
                  {Math.min(validPage * pageSize, totalItems)} of {totalItems} debts
                </span>
                <span className="text-slate-300">|</span>
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage <= 1}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono">
                  {validPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage >= totalPages}
                  className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
