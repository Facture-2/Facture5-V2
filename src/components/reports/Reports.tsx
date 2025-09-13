import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Calendar, Download } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import FinancialAlerts from './FinancialAlerts';
import FinancialKPIs from './FinancialKPIs';
import CashflowChart from './charts/CashflowChart';
import RevenueEvolutionChart from './charts/RevenueEvolutionChart';
import PaymentStatusChart from './charts/PaymentStatusChart';
import PaymentMethodChart from './charts/PaymentMethodChart';
import PaymentDelayChart from './charts/PaymentDelayChart';
import TopClientsChart from './charts/TopClientsChart';

const Reports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const { invoices } = useData();

  // Prepare revenue evolution data
  const revenueEvolutionData = React.useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    return months.map((month, index) => ({
      month,
      currentYear: Math.floor(Math.random() * 50000) + 20000, // Mock data
      previousYear: Math.floor(Math.random() * 45000) + 15000, // Mock data
      date: `${currentYear}-${String(index + 1).padStart(2, '0')}-01`
    }));
  }, []);

  // Prepare cashflow data
  const cashflowData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      income: Math.floor(Math.random() * 40000) + 20000,
      expenses: Math.floor(Math.random() * 30000) + 15000,
      profit: Math.floor(Math.random() * 15000) + 5000
    }));
  }, []);

  // Prepare payment status data
  const paymentStatusData = React.useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return [
        { name: 'Paid', value: 0, color: '#10B981' },
        { name: 'Pending', value: 0, color: '#F59E0B' },
        { name: 'Overdue', value: 0, color: '#EF4444' }
      ];
    }

    const statusCounts = invoices.reduce((acc: any, invoice: any) => {
      const status = invoice.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'Paid', value: statusCounts.paid || 0, color: '#10B981' },
      { name: 'Pending', value: statusCounts.pending || 0, color: '#F59E0B' },
      { name: 'Overdue', value: statusCounts.overdue || 0, color: '#EF4444' }
    ];
  }, [invoices]);

  // Prepare payment method data
  const paymentMethodData = React.useMemo(() => {
    return [
      { name: 'Bank Transfer', value: 45, color: '#3B82F6' },
      { name: 'Credit Card', value: 30, color: '#10B981' },
      { name: 'Cash', value: 15, color: '#F59E0B' },
      { name: 'Check', value: 10, color: '#8B5CF6' }
    ];
  }, []);

  // Prepare payment delay data
  const paymentDelayData = React.useMemo(() => {
    const ranges = ['0-30 days', '31-60 days', '61-90 days', '90+ days'];
    return ranges.map(range => ({
      range,
      count: Math.floor(Math.random() * 20) + 5,
      amount: Math.floor(Math.random() * 50000) + 10000
    }));
  }, []);

  // Calculate top clients data from invoices
  const topClientsData = React.useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    
    const clientStats = invoices.reduce((acc: any, invoice: any) => {
      const clientName = invoice.clientName || 'Unknown Client';
      if (!acc[clientName]) {
        acc[clientName] = {
          name: clientName,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          invoiceCount: 0
        };
      }
      
      const amount = parseFloat(invoice.total) || 0;
      acc[clientName].totalAmount += amount;
      acc[clientName].invoiceCount += 1;
      
      if (invoice.status === 'paid') {
        acc[clientName].paidAmount += amount;
      } else {
        acc[clientName].unpaidAmount += amount;
      }
      
      return acc;
    }, {});
    
    return Object.values(clientStats)
      .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
  }, [invoices]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  const periods = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600">Comprehensive business analytics and insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            <FinancialKPIs invoices={invoices || []} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueEvolutionChart data={revenueEvolutionData} />
              <CashflowChart data={cashflowData} />
            </div>
            <TopClientsChart data={topClientsData} />
          </>
        )}

        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <RevenueEvolutionChart data={revenueEvolutionData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopClientsChart data={topClientsData} />
              <CashflowChart data={cashflowData} />
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PaymentStatusChart data={paymentStatusData} />
              <PaymentMethodChart data={paymentMethodData} />
            </div>
            <PaymentDelayChart data={paymentDelayData} />
          </div>
        )}

        {activeTab === 'alerts' && (
          <FinancialAlerts invoices={invoices || []} />
        )}
      </div>
    </div>
  );
};

export default Reports;