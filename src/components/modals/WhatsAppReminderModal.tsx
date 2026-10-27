/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Copy, Check, ExternalLink, AlertCircle, Phone, Info } from 'lucide-react';
import { Customer, Debt, BusinessSettings } from '../../types';
import {
  normalizePhoneNumber,
  buildWhatsAppLink,
  interpolateTemplate,
  formatCurrency,
} from '../../utils/phoneUtils';
import { api } from '../../api/client';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  debt?: Debt | null;
  settings: BusinessSettings | null;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  isOpen,
  onClose,
  customer,
  debt,
  settings,
}) => {
  const [templateType, setTemplateType] = useState<'gentle' | 'overdue' | 'finalNotice' | 'custom'>('gentle');
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [phoneOverride, setPhoneOverride] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currencySymbol = settings?.currencySymbol || '₦';

  useEffect(() => {
    if (isOpen && customer) {
      setPhoneOverride(customer.phone);
      setCopied(false);
      setStatusMessage(null);

      // Auto pick overdue template if debt is overdue
      const defaultType = debt?.status === 'overdue' ? 'overdue' : 'gentle';
      setTemplateType(defaultType);
      generateMessageForType(defaultType);
    }
  }, [isOpen, customer, debt]);

  if (!isOpen || !customer) return null;

  const phoneValidation = normalizePhoneNumber(phoneOverride || customer.phone);

  const generateMessageForType = (type: 'gentle' | 'overdue' | 'finalNotice' | 'custom') => {
    if (type === 'custom') return;

    const template = settings?.reminderTemplates[type] || '';
    const amountDue = debt
      ? formatCurrency(debt.outstandingBalance, currencySymbol)
      : 'all outstanding balances';
    const description = debt ? debt.description : 'goods supplied on credit';
    const dueDate = debt?.dueDate || 'immediate settlement';

    const text = interpolateTemplate(template, {
      customerName: customer.name,
      businessName: settings?.businessName || 'Our Business',
      ownerName: settings?.ownerName,
      description,
      amountDue,
      originalAmount: debt ? formatCurrency(debt.originalAmount, currencySymbol) : undefined,
      amountRepaid: debt ? formatCurrency(debt.amountRepaid, currencySymbol) : undefined,
      dueDate,
      bankName: settings?.bankName,
      accountNumber: settings?.accountNumber,
      accountName: settings?.accountName,
    });

    setMessage(text);
  };

  const handleTemplateChange = (type: 'gentle' | 'overdue' | 'finalNotice' | 'custom') => {
    setTemplateType(type);
    generateMessageForType(type);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!phoneValidation.isValid) {
      alert(`Invalid phone number: ${phoneValidation.error || 'Please correct the number first.'}`);
      return;
    }

    const waLink = buildWhatsAppLink(phoneValidation.normalized, message);

    try {
      // Log the reminder in the authoritative database
      await api.logReminder({
        customerId: customer.id,
        debtId: debt?.id,
        type: templateType,
        normalizedPhone: phoneValidation.normalized,
        messagePreview: message,
      });
      setStatusMessage(
        'WhatsApp chat initiated. Please send the message in WhatsApp and await delivery confirmation directly from the recipient.'
      );
    } catch (e) {
      console.error('Failed to log reminder', e);
    }

    // Open WhatsApp in new tab
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Send WhatsApp Reminder</h2>
              <p className="text-xs text-slate-400">Direct wa.me link generation with normalization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Phone Normalization Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Recipient Phone:</span>
              <span className="text-slate-500">{customer.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={phoneOverride}
                onChange={(e) => setPhoneOverride(e.target.value)}
                placeholder="08012345678"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Validation Feedback */}
            {phoneValidation.isValid ? (
              <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <span>Normalized Format:</span>
                <span className="font-mono font-bold">{phoneValidation.displayFormatted}</span>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{phoneValidation.error || 'Please enter a valid phone number.'}</span>
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Reminder Template
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateChange('gentle')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  templateType === 'gentle'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                Gentle Notice
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('overdue')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  templateType === 'overdue'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                Overdue Notice
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('finalNotice')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center cursor-pointer ${
                  templateType === 'finalNotice'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                Final Demand
              </button>
            </div>
          </div>

          {/* Message Preview & Edit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Message Content</label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setTemplateType('custom');
              }}
              className="w-full p-3 text-xs leading-relaxed bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none font-sans"
            />
          </div>

          {/* Transparency & Consent Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Transparent Messaging Protocol:</p>
              <p className="mt-0.5 text-blue-800">
                Clicking the button opens WhatsApp so you can review and send the reminder manually.
                DebtBook does not send automatic background messages without your consent, nor claim
                delivery merely because the chat was opened.
              </p>
            </div>
          </div>

          {statusMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!phoneValidation.isValid}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] rounded-lg transition-all shadow-md shadow-emerald-950/10 disabled:opacity-50 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
