'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useQuery } from '@tanstack/react-query';

interface Stats {
  totalSupervisors: number;
  totalRiders: number;
  activeRiders: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSupervisors: 0,
    totalRiders: 0,
    activeRiders: 0,
  });

  const { data: supervisorsData } = useQuery({
    queryKey: ['admin', 'supervisors'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/supervisors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (optimized for mobile)
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: ridersData } = useQuery({
    queryKey: ['admin', 'riders'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/riders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (optimized for mobile)
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (supervisorsData && ridersData) {
      const activeRiders = ridersData.filter((r: any) => r.status === 'نشط' || !r.status).length;

      setStats({
        totalSupervisors: supervisorsData.length,
        totalRiders: ridersData.length,
        activeRiders,
      });
    }
  }, [supervisorsData, ridersData]);

  const statCards = [
    {
      label: 'إجمالي المشرفين',
      value: stats.totalSupervisors,
      icon: '👔',
      color: 'bg-blue-500',
    },
    {
      label: 'إجمالي المناديب',
      value: stats.totalRiders,
      icon: '👥',
      color: 'bg-green-500',
    },
    {
      label: 'المناديب النشطين',
      value: stats.activeRiders,
      icon: '✅',
      color: 'bg-purple-500',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة تحكم المدير</h1>
          <p className="text-gray-600">نظرة عامة على النظام</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg text-white text-2xl`}>{stat.icon}</div>
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.label}</h3>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">إجراءات سريعة</h3>
            <div className="space-y-3">
              <a
                href="/admin/supervisors"
                className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="font-semibold text-blue-800">إدارة المشرفين</div>
                <div className="text-sm text-blue-600">إضافة أو تعديل المشرفين</div>
              </a>
              <a
                href="/admin/riders"
                className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="font-semibold text-green-800">إدارة المناديب</div>
                <div className="text-sm text-green-600">إضافة أو تعيين المناديب</div>
              </a>
              <a
                href="/admin/upload"
                className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="font-semibold text-purple-800">رفع الملفات</div>
                <div className="text-sm text-purple-600">رفع بيانات Excel</div>
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">إحصائيات سريعة</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">متوسط المناديب لكل مشرف</span>
                <span className="font-semibold text-gray-800">
                  {stats.totalSupervisors > 0
                    ? (stats.totalRiders / stats.totalSupervisors).toFixed(1)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">نسبة المناديب النشطين</span>
                <span className="font-semibold text-gray-800">
                  {stats.totalRiders > 0 ? ((stats.activeRiders / stats.totalRiders) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

