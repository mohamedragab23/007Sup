'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DashboardStats from '@/components/DashboardStats';
import PerformanceChart from '@/components/PerformanceChart';
import TopRidersTable from '@/components/TopRidersTable';
import { StatsSkeleton, TableSkeleton } from '@/components/SkeletonLoader';

interface DashboardData {
  totalHours: number;
  totalOrders: number;
  totalAbsences: number;
  totalBreaks: number;
  avgAcceptance: number;
  lastUploadDate: string;
  targetHours: number;
  targetAchievement: number;
  topRiders: Array<{
    name: string;
    orders: number;
    hours: number;
    acceptance: number;
  }>;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || 'فشل تحميل البيانات');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة التحكم</h1>
            <p className="text-gray-600">نظرة عامة على الأداء والإحصائيات</p>
          </div>
          <StatsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
            <TableSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة التحكم</h1>
          <p className="text-gray-600">نظرة عامة على الأداء والإحصائيات</p>
        </div>

        {dashboardData && (
          <>
            {/* Last Upload Date Banner */}
            {dashboardData.lastUploadDate && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">بيانات آخر يوم تم رفعه</p>
                    <p className="text-2xl font-bold">
                      {new Date(dashboardData.lastUploadDate).toLocaleDateString('ar-EG', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-5xl opacity-80">📅</div>
                </div>
              </div>
            )}

            {/* Target Achievement Card */}
            {dashboardData.targetHours > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">تحقيق الهدف اليومي</h3>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">الساعات الفعلية: {dashboardData.totalHours.toFixed(1)}</span>
                      <span className="text-gray-600">الهدف: {dashboardData.targetHours} ساعة</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-4 rounded-full transition-all duration-500 ${
                          dashboardData.targetAchievement >= 100 ? 'bg-green-500' : 
                          dashboardData.targetAchievement >= 75 ? 'bg-blue-500' : 
                          dashboardData.targetAchievement >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(dashboardData.targetAchievement, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className={`text-3xl font-bold ${
                    dashboardData.targetAchievement >= 100 ? 'text-green-600' : 
                    dashboardData.targetAchievement >= 75 ? 'text-blue-600' : 
                    dashboardData.targetAchievement >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {dashboardData.targetAchievement.toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            <DashboardStats data={dashboardData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceChart />
              <TopRidersTable topRiders={dashboardData.topRiders} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

