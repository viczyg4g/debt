/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  CreditCard,
  PlusCircle,
  ExternalLink,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { Customer, Debt, BusinessSettings } from '../types';
import { formatCurrency, normalizePhoneNumber, buildWhatsAppLink } from '../utils/phoneUtils';
import { api } from '../api/client';

interface CustomersViewProps {
  customers: Customer[];
  debts: Debt[];
  settings: BusinessSettings | null;
  onOpenNewCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onOpenRecordDebt: (customerId?: string) => void;
  onOpenWhatsAppReminder: (customer: Customer) => void;
  onCustomerDeleted: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  debts,
  settings,
  onOpenNewCustomer,
  onEditCustomer,
  onOpenRecordDebt,
  onOpenWhatsAppReminder,
  onCustomerDeleted,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currencySymbol = settings?.currencySymbol || '₦';

  // Compute live per-customer metrics from authoritative debts
  const customerMetrics = new Map<
    string,
    { totalOutstanding: number; totalRepaid: number; activeDebtsCount: number }
  >();

  for (const c of customers) {
    customerMetrics.set(c.id, { totalOutstanding: 0, totalRepaid: 0, activeDebtsCount: 0 });
  }

  for (const d of debts) {
    let m = customerMetrics.get(d.customerId);
    if (!m) {
      m = { totalOutstanding: 0, totalRepaid: 0, activeDebtsCount: 0 };
      customerMetrics.set(d.customerId, m);
    }
    m.totalOutstanding += d.outstandingBalance;
    m.totalRepaid += d.amountRepaid;
    if (d.outstandingBalance > 0.001) {
      m.activeDebtsCount++;
    }
  }

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (c: Customer) => {
    const metric = customerMetrics.get(c.id);
    if (metric && metric.totalOutstanding > 0.001) {
      alert(`Cannot delete ${c.name} because they have ${formatCurrency(metric.totalOutstanding, currencySymbol)} in outstanding debt. Please settle all balances first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${c.name} from your customer directory?`)) {
      return;
    }

    try {
      setDeletingId(c.id);
      await api.deleteCustomer(c.id);
      onCustomerDeleted(c.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer accounts, credit limits, contact profiles, and outstanding balances.
          </p>
        </div>

        <button
          onClick={onOpenNewCustomer}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer by name, phone, email, or market stall address..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No customers found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add a customer to begin issuing debts and recording repayments.
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const metrics = customerMetrics.get(customer.id) || {
              totalOutstanding: 0,
              totalRepaid: 0,
              activeDebtsCount: 0,
            };
            const phoneVal = normalizePhoneNumber(customer.phone);

            return (
              <div
                key={customer.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Customer Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{customer.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{phoneVal.displayFormatted || customer.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditCustomer(customer)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                        title="Edit Customer Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        disabled={deletingId === customer.id || metrics.totalOutstanding > 0.001}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded transition-colors cursor-pointer"
                        title={
                          metrics.totalOutstanding > 0.001
                            ? 'Cannot delete customer with active debts'
                            : 'Delete Customer'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Address or Location */}
                  {customer.address && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2 line-clamp-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{customer.address}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {customer.notes && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md mt-2 line-clamp-2">
                      {customer.notes}
                    </p>
                  )}

                  {/* Balances Card */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/80 rounded-lg mt-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Outstanding</span>
                      <span
                        className={`font-mono tabular-nums font-bold ${
                          metrics.totalOutstanding > 0.001 ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {formatCurrency(metrics.totalOutstanding, currencySymbol)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase block">Total Repaid</span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-600">
                        {formatCurrency(metrics.totalRepaid, currencySymbol)}
                      </span>
                    </div>
                  </div>

                  {customer.creditLimit && (
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 px-0.5">
                      <span>Credit Limit:</span>
                      <span className="font-mono">{formatCurrency(customer.creditLimit, currencySymbol)}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    {metrics.activeDebtsCount} active debt(s)
                  </span>

                  <div className="flex items-center gap-1.5">
                    {metrics.totalOutstanding > 0.001 && (
                      <button
                        onClick={() => onOpenWhatsAppReminder(customer)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Remind</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenRecordDebt(customer.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      title="Issue New Debt"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>New Debt</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
