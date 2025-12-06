'use client';

import { memo } from 'react';

interface DashboardData {
  totalHours: number;
  totalOrders: number;
  totalAbsences: number;
  totalBreaks?: number;
  avgAcceptance: number;
}

const DashboardStats = memo(function DashboardStats({ data }: { data: DashboardData }) {
  const stats = [
    {
      label: 'إجمالي ساعات العمل',
      value: data.totalHours.toFixed(1),
      icon: '⏰',
      color: 'bg-blue-500',
    },
    {
      label: 'إجمالي الطلبات',
      value: data.totalOrders.toLocaleString(),
      icon: '📦',
      color: 'bg-green-500',
    },
    {
      label: 'عدد الغيابات',
      value: data.totalAbsences,
      icon: '❌',
      color: 'bg-red-500',
    },
    {
      label: 'إجمالي الاستراحات',
      value: (data.totalBreaks || 0).toFixed(1),
      icon: '☕',
      color: 'bg-orange-500',
    },
    {
      label: 'متوسط نسبة القبول',
      value: `${data.avgAcceptance.toFixed(1)}%`,
      icon: '✅',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`${stat.color} p-2.5 rounded-lg text-white text-xl`}>
              {stat.icon}
            </div>
          </div>
          <h3 className="text-gray-600 text-xs mb-1">{stat.label}</h3>
          <p className="text-xl font-bold text-gray-800">{stat.value}</p>
        </div>
      ))}
    </div>
  );
});

export default DashboardStats;

