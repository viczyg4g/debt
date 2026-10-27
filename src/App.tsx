/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header, NavTab } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { DebtRegisterView } from './components/DebtRegisterView';
import { RepaymentsView } from './components/RepaymentsView';
import { CustomersView } from './components/CustomersView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

import { RecordDebtModal } from './components/modals/RecordDebtModal';
import { RecordRepaymentModal } from './components/modals/RecordRepaymentModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { WhatsAppReminderModal } from './components/modals/WhatsAppReminderModal';
import { DebtDetailModal } from './components/modals/DebtDetailModal';
import { CustomerModal } from './components/modals/CustomerModal';

import { Customer, Debt, Repayment, ReportsSummary, BusinessSettings } from './types';
import { api } from './api/client';
import { Plus, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Application Data State
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isRecordDebtOpen, setIsRecordDebtOpen] = useState<boolean>(false);
  const [isRecordRepaymentOpen, setIsRecordRepaymentOpen] = useState<boolean>(false);
  const [selectedDebtIdForRepayment, setSelectedDebtIdForRepayment] = useState<string | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [whatsAppCustomer, setWhatsAppCustomer] = useState<Customer | null>(null);
  const [whatsAppDebt, setWhatsAppDebt] = useState<Debt | null>(null);

  const [isDebtDetailOpen, setIsDebtDetailOpen] = useState<boolean>(false);
  const [detailDebtId, setDetailDebtId] = useState<string | null>(null);

  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [receiptRepayment, setReceiptRepayment] = useState<Repayment | null>(null);
  const [receiptDebt, setReceiptDebt] = useState<Debt | null>(null);
  const [receiptIsReplay, setReceiptIsReplay] = useState<boolean>(false);

  // Load all data from backend
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsRes, customersRes, debtsRes, repaymentsRes, summaryRes] = await Promise.all([
        api.getSettings(),
        api.getCustomers(),
        api.getDebts({ limit: 500 }),
        api.getRepayments(),
        api.getReportsSummary(),
      ]);

      setSettings(settingsRes);
      setCustomers(customersRes);
      setDebts(debtsRes.debts);
      setRepayments(repaymentsRes);
      setSummary(summaryRes);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to DebtBook database. Retrying...');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for modal interactions
  const handleOpenRecordDebt = (prefillCustomerId?: string) => {
    setIsRecordDebtOpen(true);
  };

  const handleOpenRecordRepayment = (debtId?: string) => {
    setSelectedDebtIdForRepayment(debtId || null);
    setIsRecordRepaymentOpen(true);
  };

  const handleOpenWhatsAppReminder = (customer: Customer, debt?: Debt) => {
    setWhatsAppCustomer(customer);
    setWhatsAppDebt(debt || null);
    setIsWhatsAppModalOpen(true);
  };

  const handleViewDebtDetail = (debtId: string) => {
    setDetailDebtId(debtId);
    setIsDebtDetailOpen(true);
  };

  const handleViewReceipt = (rep: Repayment, debt: Debt) => {
    setReceiptRepayment(rep);
    setReceiptDebt(debt);
    setReceiptIsReplay(false);
    setIsReceiptOpen(true);
  };

  const handlePaymentSuccess = (repayment: Repayment, updatedDebt: Debt, isReplay: boolean) => {
    // Refresh authoritative ledger data
    loadData();
    // Open receipt modal
    const matchedDebt = debts.find((d) => d.id === repayment.debtId) || updatedDebt;
    setReceiptRepayment(repayment);
    setReceiptDebt(matchedDebt);
    setReceiptIsReplay(isReplay);
    setIsReceiptOpen(true);
  };

  const handleDebtCreated = (newDebt: Debt) => {
    loadData();
  };

  const handleCustomerSaved = (savedCustomer: Customer) => {
    loadData();
  };

  const handleCustomerDeleted = (deletedId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== deletedId));
    loadData();
  };

  const currencySymbol = settings?.currencySymbol || '₦';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-20 md:pb-8">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenRecordDebt={() => handleOpenRecordDebt()}
        onOpenRecordRepayment={() => handleOpenRecordRepayment()}
        settings={settings}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {loading && !settings ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Connecting to Authoritative Database...</p>
            <p className="text-xs text-slate-400 mt-1">Verifying ledger and idempotency integrity</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl max-w-lg mx-auto text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h2 className="text-base font-bold text-red-900">Database Connection Notice</h2>
            <p className="text-xs text-red-700">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                summary={summary}
                debts={debts}
                repayments={repayments}
                customers={customers}
                settings={settings}
                onSelectTab={setCurrentTab}
                onOpenRecordDebt={() => handleOpenRecordDebt()}
                onOpenRecordRepayment={handleOpenRecordRepayment}
                onOpenWhatsAppReminder={handleOpenWhatsAppReminder}
                onViewDebtDetail={handleViewDebtDetail}
                onViewReceipt={handleViewReceipt}
              />
            )}

            {currentTab === 'debts' && (
              <DebtRegisterView
                debts={debts}
                customers={customers}
                settings={settings}
                onOpenRecordDebt={() => handleOpenRecordDebt()}
                onOpenRecordRepayment={handleOpenRecordRepayment}
                onOpenWhatsAppReminder={handleOpenWhatsAppReminder}
                onViewDebtDetail={handleViewDebtDetail}
              />
            )}

            {currentTab === 'repayments' && (
              <RepaymentsView
                repayments={repayments}
                debts={debts}
                settings={settings}
                onOpenRecordRepayment={() => handleOpenRecordRepayment()}
                onViewReceipt={handleViewReceipt}
              />
            )}

            {currentTab === 'customers' && (
              <CustomersView
                customers={customers}
                debts={debts}
                settings={settings}
                onOpenNewCustomer={() => {
                  setCustomerToEdit(null);
                  setIsCustomerModalOpen(true);
                }}
                onEditCustomer={(cust) => {
                  setCustomerToEdit(cust);
                  setIsCustomerModalOpen(true);
                }}
                onOpenRecordDebt={handleOpenRecordDebt}
                onOpenWhatsAppReminder={handleOpenWhatsAppReminder}
                onCustomerDeleted={handleCustomerDeleted}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                summary={summary}
                debts={debts}
                repayments={repayments}
                settings={settings}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                onSettingsUpdated={(updated) => {
                  setSettings(updated);
                  loadData();
                }}
                onResetData={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Floating Action Button (for fast entry) */}
      <div className="md:hidden fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2">
        <button
          onClick={() => handleOpenRecordRepayment()}
          className="w-11 h-11 rounded-full bg-slate-900 text-emerald-400 border border-slate-700 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          title="Record Repayment"
          aria-label="Record Repayment"
        >
          <CreditCard className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleOpenRecordDebt()}
          className="w-13 h-13 rounded-full bg-emerald-500 text-slate-950 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
          title="Create New Debt"
          aria-label="Create New Debt"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Modals */}
      <RecordDebtModal
        isOpen={isRecordDebtOpen}
        onClose={() => setIsRecordDebtOpen(false)}
        customers={customers}
        onDebtCreated={handleDebtCreated}
        onOpenNewCustomer={() => {
          setIsRecordDebtOpen(false);
          setCustomerToEdit(null);
          setIsCustomerModalOpen(true);
        }}
        currencySymbol={currencySymbol}
        defaultGraceDays={settings?.defaultGracePeriodDays || 14}
      />

      <RecordRepaymentModal
        isOpen={isRecordRepaymentOpen}
        onClose={() => setIsRecordRepaymentOpen(false)}
        debts={debts}
        initialDebtId={selectedDebtIdForRepayment}
        onPaymentSuccess={handlePaymentSuccess}
        currencySymbol={currencySymbol}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        repayment={receiptRepayment}
        debt={receiptDebt}
        settings={settings}
        isReplay={receiptIsReplay}
      />

      <WhatsAppReminderModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        customer={whatsAppCustomer}
        debt={whatsAppDebt}
        settings={settings}
      />

      <DebtDetailModal
        isOpen={isDebtDetailOpen}
        onClose={() => setIsDebtDetailOpen(false)}
        debtId={detailDebtId}
        onRecordPayment={(id) => handleOpenRecordRepayment(id)}
        onSendReminder={(c, d) => handleOpenWhatsAppReminder(c, d)}
        onViewReceipt={handleViewReceipt}
        currencySymbol={currencySymbol}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
        onCustomerSaved={handleCustomerSaved}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
