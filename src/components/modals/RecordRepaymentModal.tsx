/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Debt, Repayment, PaymentMethod } from '../../types';
import { api, generateIdempotencyKey } from '../../api/client';
import { formatCurrency } from '../../utils/phoneUtils';

interface RecordRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debts: Debt[];
  initialDebtId?: string | null;
  onPaymentSuccess: (repayment: Repayment, debt: Debt, isReplay: boolean) => void;
  currencySymbol: string;
}

export const RecordRepaymentModal: React.FC<RecordRepaymentModalProps> = ({
  isOpen,
  onClose,
  debts,
  initialDebtId,
  onPaymentSuccess,
  currencySymbol,
}) => {
  const [selectedDebtId, setSelectedDebtId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available debts that have outstanding balances
  const openDebts = debts.filter((d) => d.outstandingBalance > 0.001);

  useEffect(() => {
    if (isOpen) {
      // Generate a new idempotency key on modal open
      setIdempotencyKey(generateIdempotencyKey());
      setError(null);
      setAmount('');
      setReference('');
      setNote('');
      setPaymentDate(new Date().toISOString().split('T')[0]);

      if (initialDebtId && openDebts.some((d) => d.id === initialDebtId)) {
        setSelectedDebtId(initialDebtId);
      } else if (openDebts.length > 0) {
        setSelectedDebtId(openDebts[0].id);
      } else {
        setSelectedDebtId('');
      }
    }
  }, [isOpen, initialDebtId]);

  if (!isOpen) return null;

  const currentDebt = openDebts.find((d) => d.id === selectedDebtId);

  const numAmount = parseFloat(amount) || 0;
  const currentBalance = currentDebt ? currentDebt.outstandingBalance : 0;
  const resultingBalance = Math.max(0, Math.round((currentBalance - numAmount) * 100) / 100);

  const handlePayFull = () => {
    if (currentDebt) {
      setAmount(currentDebt.outstandingBalance.toFixed(2));
    }
  };

  const handleVerifyKey = async () => {
    if (!idempotencyKey) return;
    try {
      setVerifying(true);
      setError(null);
      const res = await api.verifyIdempotency(idempotencyKey);
      if (res.exists && res.record) {
        onPaymentSuccess(res.record.repayment, currentDebt || ({} as Debt), true);
        onClose();
      } else {
        setError('No previous transaction was found with this key. It is safe to submit now.');
      }
    } catch (err: any) {
      setError(`Failed to verify key: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDebtId || !currentDebt) {
      setError('Please select an active debt to apply repayment.');
      return;
    }

    if (numAmount <= 0) {
      setError('Repayment amount must be greater than zero.');
      return;
    }

    if (numAmount > currentBalance + 0.01) {
      setError(
        `Repayment amount (${formatCurrency(numAmount, currencySymbol)}) cannot exceed outstanding balance (${formatCurrency(currentBalance, currencySymbol)}).`
      );
      return;
    }

    try {
      setLoading(true);

      const result = await api.recordRepayment({
        debtId: selectedDebtId,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        idempotencyKey,
      });

      onPaymentSuccess(result.repayment, result.debt, result.isReplay);
      onClose();
    } catch (err: any) {
      // If error might be uncertain outcome, offer verification
      setError(
        `${err.message || 'Payment submission failed.'} If you suspect a network timeout, click "Verify Key" below to ensure no duplicate charge.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Record Customer Repayment</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Idempotent financial ledger entry
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {openDebts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">All Debts Fully Settled!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              There are currently no outstanding debts in the ledger to record repayments against.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyKey}
                  disabled={verifying}
                  className="self-start text-[11px] font-semibold text-red-800 underline hover:text-red-950 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
                  <span>Verify Idempotency Key Status</span>
                </button>
              </div>
            )}

            {/* Debt Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Debt to Repay *
              </label>
              <select
                value={selectedDebtId}
                onChange={(e) => setSelectedDebtId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              >
                {openDebts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.customerName} - {d.description} (Bal: {formatCurrency(d.outstandingBalance, currencySymbol)})
                  </option>
                ))}
              </select>

              {/* Outstanding Balance Banner */}
              {currentDebt && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Current Outstanding Balance:</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                      {formatCurrency(currentDebt.outstandingBalance, currencySymbol)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors cursor-pointer"
                  >
                    Pay Full Balance
                  </button>
                </div>
              )}
            </div>

            {/* Repayment Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Repayment Amount ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-500">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={currentBalance || undefined}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-8 pr-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>
            </div>

            {/* Resulting Balance Calculation */}
            {currentDebt && numAmount > 0 && (
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Resulting Outstanding Balance:</span>
                <span className="font-mono tabular-nums font-bold text-emerald-800 text-sm">
                  {formatCurrency(resultingBalance, currencySymbol)}
                  {resultingBalance === 0 && ' (Paid in Full 🎉)'}
                </span>
              </div>
            )}

            {/* Supported Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'bank_transfer', label: 'Bank Transfer' },
                  { id: 'cash', label: 'Cash' },
                  { id: 'pos_card', label: 'POS / Card' },
                  { id: 'ussd', label: 'USSD' },
                  { id: 'cheque_other', label: 'Cheque / Other' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Reference / Session ID
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. GTB-TRF-091823"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Note / Receipt Memo
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Part payment tranche 2"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>
            </div>

            {/* Idempotency Protection Indicator */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Idempotent Transaction Protection Active</span>
              </span>
              <span className="font-mono truncate max-w-[150px]" title={idempotencyKey}>
                {idempotencyKey.substring(0, 16)}...
              </span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !numAmount || numAmount <= 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Repayment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
