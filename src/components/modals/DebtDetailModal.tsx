/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, MessageSquare, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Debt, Repayment, Customer } from '../../types';
import { api } from '../../api/client';
import { formatCurrency } from '../../utils/phoneUtils';

interface DebtDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtId: string | null;
  onRecordPayment: (debtId: string) => void;
  onSendReminder: (customer: Customer, debt: Debt) => void;
  onViewReceipt: (repayment: Repayment, debt: Debt) => void;
  currencySymbol: string;
}

export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  isOpen,
  onClose,
  debtId,
  onRecordPayment,
  onSendReminder,
  onViewReceipt,
  currencySymbol,
}) => {
  const [data, setData] = useState<{ debt: Debt; repayments: Repayment[]; customer?: Customer } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && debtId) {
      loadDetails(debtId);
    } else {
      setData(null);
    }
  }, [isOpen, debtId]);

  const loadDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDebtDetails(id);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load debt details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const debt = data?.debt;
  const customer = data?.customer;
  const repayments = data?.repayments || [];

  const percentageRepaid = debt
    ? Math.min(100, Math.round((debt.amountRepaid / debt.originalAmount) * 100))
    : 0;

  const getStatusBadge = (status: Debt['status']) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            Overdue
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Partially Paid
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Paid in Full
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Open
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Debt Record & Audit Trail</h2>
            <p className="text-xs text-slate-400 mt-0.5">Authoritative balance ledger</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading debt details...</div>
        ) : error || !debt ? (
          <div className="p-8 text-center text-red-600 text-sm">
            {error || 'Debt record not found'}
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Title & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {debt.description}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>Customer: <strong className="text-slate-800">{debt.customerName}</strong></span>
                  <span>·</span>
                  <span>{debt.customerPhone}</span>
                  {debt.invoiceRef && (
                    <>
                      <span>·</span>
                      <span className="font-mono">Ref: {debt.invoiceRef}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0">{getStatusBadge(debt.status)}</div>
            </div>

            {/* Financial Balances Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[11px] text-slate-500 block">Original Amount</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {formatCurrency(debt.originalAmount, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Amount Repaid</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-emerald-600">
                    {formatCurrency(debt.amountRepaid, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Outstanding Balance</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-red-600">
                    {formatCurrency(debt.outstandingBalance, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Settlement Progress</span>
                  <span className="font-semibold">{percentageRepaid}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${percentageRepaid}%` }}
                  />
                </div>
              </div>

              {/* Due Date Indicator */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due Date:</span>
                </span>
                <span
                  className={`font-mono font-medium ${
                    debt.status === 'overdue' ? 'text-red-700 font-bold' : 'text-slate-700'
                  }`}
                >
                  {debt.dueDate ? debt.dueDate : 'No due date set'}
                  {debt.status === 'overdue' && ' (Overdue)'}
                </span>
              </div>
            </div>

            {/* Notes if any */}
            {debt.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-900">
                <span className="font-semibold block mb-0.5">Notes:</span>
                <span>{debt.notes}</span>
              </div>
            )}

            {/* Repayment History Ledger */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Repayment History ({repayments.length})
                </h4>
              </div>

              {repayments.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  No repayments recorded yet for this debt.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {repayments.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono tabular-nums text-emerald-700 text-sm">
                            +{formatCurrency(rep.amount, currencySymbol)}
                          </span>
                          <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                            {rep.paymentMethod.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span>{rep.paymentDate}</span>
                          {rep.reference && <span> · Ref: {rep.reference}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(rep, debt)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        >
                          Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {customer && debt.outstandingBalance > 0.001 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSendReminder(customer, debt);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Reminder</span>
                  </button>
                )}

                {debt.outstandingBalance > 0.001 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRecordPayment(debt.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
