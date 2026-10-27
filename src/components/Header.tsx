/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlusCircle, CreditCard, BookOpen } from 'lucide-react';
import { BusinessSettings } from '../types';

export type NavTab = 'dashboard' | 'debts' | 'repayments' | 'customers' | 'reports' | 'settings';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenRecordDebt: () => void;
  onOpenRecordRepayment: () => void;
  settings: BusinessSettings | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenRecordDebt,
  onOpenRecordRepayment,
  settings,
}) => {
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'debts', label: 'Debt Register' },
    { id: 'repayments', label: 'Repayments' },
    { id: 'customers', label: 'Customers' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
                DebtBook
              </span>
              {settings?.businessName && (
                <span className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-[200px] leading-tight">
                  {settings.businessName}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Zone 2: Desktop Navigation Links (Single-line, unboxed) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
                currentTab === item.id
                  ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenRecordRepayment}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 rounded-lg hover:bg-emerald-900/80 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
            title="Record Customer Repayment"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={onOpenRecordDebt}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 active:scale-[0.98] transition-all whitespace-nowrap shadow-sm cursor-pointer"
            title="Create New Debt"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Debt</span>
          </button>
        </div>
      </div>
    </header>
  );
};
