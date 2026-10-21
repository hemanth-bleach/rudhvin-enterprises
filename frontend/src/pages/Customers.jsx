import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  FileText
} from 'lucide-react';
import api from '../api/axios';
import { formatINR, formatDate } from '../utils/formatters';
import CustomerModal from '../components/CustomerModal';
import toast from 'react-hot-toast';

export default function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: customerData, isLoading, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}&limit=100`);
      return res.data;
    }
  });

  const customers = customerData?.data || [];
  const total = customerData?.total || 0;

  const handleEdit = (cust) => {
    setSelectedCustomer(cust);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"? Historical invoices will be preserved.`)) {
      return;
    }

    try {
      await api.delete(`/customers/${id}`);
      toast.success(`Customer ${name} deleted`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customers</h1>
          <p className="text-xs text-slate-500 font-medium">Manage client database, contact information, and outstanding balances</p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, GSTIN, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Total Customers: <span className="text-blue-600 font-bold">{total}</span>
        </div>
      </div>

      {/* Customers List Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading customers...</span>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700">No Customers Found</h3>
          <p className="text-xs text-slate-500">Click <strong>Add Customer</strong> to add your first client record.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((cust) => (
            <div
              key={cust._id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                    {cust.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(cust)}
                      title="Edit Customer"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cust._id, cust.name)}
                      title="Delete Customer"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{cust.name}</h3>
                  {cust.organization && (
                    <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {cust.organization}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px] leading-tight">{cust.billingAddress}</span>
                  </div>
                  {cust.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.phone}</span>
                    </div>
                  )}
                  {cust.gstin && (
                    <div className="text-[11px] font-mono text-slate-500">
                      <span className="font-semibold text-slate-700">GSTIN:</span> {cust.gstin}
                    </div>
                  )}
                </div>
              </div>

              {/* Outstanding Balance Banner */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Outstanding:</span>
                <span className={`font-bold ${cust.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatINR(cust.outstandingBalance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Modal */}
      <CustomerModal
        customer={selectedCustomer}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        }}
      />
    </div>
  );
}
