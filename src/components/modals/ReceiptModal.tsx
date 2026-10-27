/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, CheckCircle2, Share2, Printer, MessageSquare, ArrowRight } from 'lucide-react';
import { Repayment, Debt, BusinessSettings } from '../../types';
import { formatCurrency, buildWhatsAppLink, interpolateTemplate, normalizePhoneNumber } from '../../utils/phoneUtils';
import { api } from '../../api/client';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  repayment: Repayment | null;
  debt: Debt | null;
  settings: BusinessSettings | null;
  isReplay?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  repayment,
  debt,
  settings,
  isReplay = false,
}) => {
  if (!isOpen || !repayment) return null;

  const currencySymbol = settings?.currencySymbol || '₦';

  const handleShareWhatsApp = async () => {
    if (!repayment || !debt) return;

    const phoneResult = normalizePhoneNumber(debt.customerPhone);
    const template =
      settings?.reminderTemplates.receipt ||
      'Payment Confirmation from {business_name}:\nDear {customer_name}, we have received your payment of {amount_repaid} for "{description}" on {payment_date}.\nRemaining balance: {amount_due}.\nReference: {reference}.\nThank you for doing business with us!';

    const message = interpolateTemplate(template, {
      customerName: repayment.customerName,
      businessName: settings?.businessName || 'Our Business',
      description: repayment.debtDescription,
      amountDue: formatCurrency(repayment.balanceAfter, currencySymbol),
      amountRepaid: formatCurrency(repayment.amount, currencySymbol),
      paymentDate: repayment.paymentDate,
      reference: repayment.reference || repayment.id,
      bankName: settings?.bankName,
      accountNumber: settings?.accountNumber,
      accountName: settings?.accountName,
    });

    if (phoneResult.isValid) {
      const waUrl = buildWhatsAppLink(phoneResult.normalized, message);
      // Log the reminder
      try {
        await api.logReminder({
          customerId: repayment.customerId,
          debtId: repayment.debtId,
          type: 'receipt',
          normalizedPhone: phoneResult.normalized,
          messagePreview: message,
        });
      } catch (e) {
        console.error('Failed to log reminder', e);
      }
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert(`Invalid customer phone number: ${debt.customerPhone}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Receipt Header */}
        <div className="p-6 bg-slate-900 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close receipt"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
            {isReplay ? 'Transaction Record Verified' : 'Repayment Confirmed'}
          </span>
          <h2 className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
            {formatCurrency(repayment.amount, currencySymbol)}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {settings?.businessName || 'DebtBook Official Ledger Receipt'}
          </p>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Customer</span>
              <span className="font-semibold text-slate-900">{repayment.customerName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Debt Description</span>
              <span className="font-medium text-slate-900 text-right max-w-[200px] truncate">
                {repayment.debtDescription}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Payment Date</span>
              <span className="font-medium font-mono text-slate-900">{repayment.paymentDate}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Payment Method</span>
              <span className="font-medium text-slate-900 capitalize">
                {repayment.paymentMethod.replace('_', ' ')}
              </span>
            </div>

            {repayment.reference && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Reference</span>
                <span className="font-mono text-slate-900">{repayment.reference}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Balance Before Payment</span>
              <span className="font-mono tabular-nums text-slate-700">
                {formatCurrency(repayment.balanceBefore, currencySymbol)}
              </span>
            </div>

            <div className="flex justify-between py-2 bg-emerald-50/70 px-3 rounded-lg border border-emerald-100">
              <span className="font-semibold text-emerald-950">Resulting Outstanding Balance</span>
              <span className="font-bold font-mono tabular-nums text-emerald-800 text-sm">
                {formatCurrency(repayment.balanceAfter, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Idempotency reference */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center justify-between">
            <span>Transaction Ref ID:</span>
            <span className="font-mono text-slate-700">{repayment.id}</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Send WhatsApp Receipt</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Receipt</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
