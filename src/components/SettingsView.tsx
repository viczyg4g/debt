/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Landmark,
  Coins,
  Shield,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { api } from '../api/client';

interface SettingsViewProps {
  settings: BusinessSettings | null;
  onSettingsUpdated: (updated: BusinessSettings) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  onResetData,
}) => {
  const [formData, setFormData] = useState<BusinessSettings | null>(settings);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'currency' | 'templates' | 'security'>('profile');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  if (!formData) {
    return <div className="p-8 text-center text-slate-400">Loading settings...</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      setLoading(true);
      const updated = await api.updateSettings(formData, adminPinInput || undefined);
      onSettingsUpdated(updated);
      setSuccessMsg('Business settings updated successfully and saved to authoritative database.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings. Please check your administrator PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (
      !confirm(
        'Warning: This will reset all debts, customers, and repayments back to the default Nigerian small-business demo records. Do you wish to continue?'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await api.resetData();
      onResetData();
      setSuccessMsg('Database reset to clean demo records.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business & System Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business identity, banking details, currency, WhatsApp message templates, and server security.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Sample Records</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'profile', label: 'Business Profile', icon: Building2 },
          { id: 'bank', label: 'Bank Settlement Details', icon: Landmark },
          { id: 'currency', label: 'Currency & Credit Terms', icon: Coins },
          { id: 'templates', label: 'WhatsApp Reminder Templates', icon: MessageSquare },
          { id: 'security', label: 'Server PIN Security', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
        {/* Tab 1: Business Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Business Contact & Store Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business / Trading Enterprise Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Proprietor / Managing Partner Name
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Business Phone Number *
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Market Stall / Store Address (Lagos, Abuja, Onitsha, Kano, etc.)
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Banking Details */}
        {activeTab === 'bank' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Default Bank Settlement Account
            </h3>
            <p className="text-xs text-slate-500">
              These details are automatically inserted into WhatsApp reminders and repayment receipts so debtors can transfer funds directly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Name (e.g. GTBank, Access, Zenith, Moniepoint, OPay) *
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  NUBAN Account Number (10 Digits) *
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Beneficiary Account Name *
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Currency & Terms */}
        {activeTab === 'currency' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Currency & Credit Period Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Operating Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    let sym = '₦';
                    if (c === 'USD') sym = '$';
                    if (c === 'GBP') sym = '£';
                    if (c === 'EUR') sym = '€';
                    if (c === 'GHS') sym = '₵';
                    if (c === 'KES') sym = 'KSh';
                    if (c === 'XOF') sym = 'CFA';
                    setFormData({ ...formData, currency: c, currencySymbol: sym });
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="NGN">Nigerian Naira (₦ - NGN)</option>
                  <option value="USD">US Dollar ($ - USD)</option>
                  <option value="GBP">British Pound (£ - GBP)</option>
                  <option value="EUR">Euro (€ - EUR)</option>
                  <option value="GHS">Ghanaian Cedi (₵ - GHS)</option>
                  <option value="KES">Kenyan Shilling (KSh - KES)</option>
                  <option value="XOF">West African CFA Franc (CFA - XOF)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Payment Grace Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.defaultGracePeriodDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultGracePeriodDays: parseInt(e.target.value, 10) || 14,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Reminder Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              WhatsApp Reminder Message Templates
            </h3>
            <p className="text-xs text-slate-500">
              Customize the message templates. Available placeholders: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{customer_name}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{business_name}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{amount_due}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{description}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{due_date}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{bank_name}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{account_number}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">{'{account_name}'}</code>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gentle Pre-Due Reminder
                </label>
                <textarea
                  rows={3}
                  value={formData.reminderTemplates.gentle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminderTemplates: {
                        ...formData.reminderTemplates,
                        gentle: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overdue Debt Notice
                </label>
                <textarea
                  rows={3}
                  value={formData.reminderTemplates.overdue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminderTemplates: {
                        ...formData.reminderTemplates,
                        overdue: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Urgent Final Demand Notice
                </label>
                <textarea
                  rows={3}
                  value={formData.reminderTemplates.finalNotice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminderTemplates: {
                        ...formData.reminderTemplates,
                        finalNotice: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repayment Confirmation & Receipt
                </label>
                <textarea
                  rows={3}
                  value={formData.reminderTemplates.receipt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminderTemplates: {
                        ...formData.reminderTemplates,
                        receipt: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Security PIN */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Server-Side Authorization & PIN Protection
            </h3>
            <p className="text-xs text-slate-500">
              Sensitive configuration changes require authorization. Set or update your administrator security PIN below. (Default seed PIN is <code className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">1234</code>).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Administrator PIN (for authorization)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Enter current PIN (e.g. 1234)"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Set New Administrator PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={formData.adminPin}
                  onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                  placeholder="New PIN (4-6 digits)"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {formData.adminPin && !adminPinInput && (
              <span className="text-amber-700">
                Tip: Enter your administrator PIN if saving security or system changes.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer self-end sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
