'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import PerformanceChart from '@/components/PerformanceChart';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function PerformancePage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(weekAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch detailed performance metrics
  const { data: performanceStats, isLoading } = useQuery({
    queryKey: ['supervisor', 'performance', startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/performance?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success && data.data) {
        return {
          labels: data.data.labels || [],
          orders: data.data.orders || [],
          hours: data.data.hours || [],
          // New metrics
          totalHours: data.data.totalHours || 0,
          totalOrders: data.data.totalOrders || 0,
          avgAcceptance: data.data.avgAcceptance || 0,
          totalAbsences: data.data.totalAbsences || 0,
          totalBreaks: data.data.totalBreaks || 0,
          bestDay: data.data.bestDay || null,
          target: data.data.target || null,
        };
      }
      return {
        labels: [],
        orders: [],
        hours: [],
        totalHours: 0,
        totalOrders: 0,
        avgAcceptance: 0,
        totalAbsences: 0,
        totalBreaks: 0,
        bestDay: null,
        target: null,
      };
    },
    enabled: !!startDate && !!endDate,
    staleTime: 10 * 60 * 1000, // 10 minutes (optimized for mobile)
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: false,
    refetchOnMount: false, // Don't refetch if data is fresh
  });

  // Calculate totals from arrays if not provided by API
  const totalHours = performanceStats?.totalHours || 
    (performanceStats?.hours?.reduce((a: number, b: number) => a + b, 0) || 0);
  const totalOrders = performanceStats?.totalOrders || 
    (performanceStats?.orders?.reduce((a: number, b: number) => a + b, 0) || 0);
  
  // Find best performance day
  const bestDayIndex = performanceStats?.orders?.indexOf(Math.max(...(performanceStats?.orders || [0])));
  const bestDay = bestDayIndex !== undefined && bestDayIndex >= 0 && performanceStats?.labels?.[bestDayIndex] ? {
    date: performanceStats.labels[bestDayIndex],
    orders: performanceStats.orders[bestDayIndex],
    hours: performanceStats.hours?.[bestDayIndex] || 0,
  } : null;

  return (
    <Layout>
      <div className="space-y-6 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 break-words">تتبع الأداء</h1>
          <p className="text-gray-600 text-sm sm:text-base break-words">تحليل أداء المناديب خلال فترة محددة - حدد التاريخ لعرض البيانات</p>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 min-w-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="performance-start-date" className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                id="performance-start-date"
                name="performance-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label htmlFor="performance-end-date" className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                id="performance-end-date"
                name="performance-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['supervisor', 'performance', startDate, endDate] });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              🔄 تحديث البيانات
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        {performanceStats && performanceStats.labels && performanceStats.labels.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 min-w-0">
            {/* Total Hours */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-3 sm:p-4 text-white min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-blue-100 text-xs font-medium truncate">إجمالي الساعات</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 break-all">{totalHours.toFixed(1)}</p>
                  <p className="text-blue-200 text-xs mt-1">ساعة</p>
                </div>
                <div className="text-3xl opacity-80">⏱️</div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-3 sm:p-4 text-white min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-green-100 text-xs font-medium truncate">إجمالي الطلبات</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 break-all">{totalOrders.toLocaleString()}</p>
                  <p className="text-green-200 text-xs mt-1">طلب</p>
                </div>
                <div className="text-3xl opacity-80">📦</div>
              </div>
            </div>

            {/* Total Absences */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-3 sm:p-4 text-white min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-red-100 text-xs font-medium truncate">إجمالي الغيابات</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1">{performanceStats?.totalAbsences || 0}</p>
                  <p className="text-red-200 text-xs mt-1">غياب</p>
                </div>
                <div className="text-3xl opacity-80">❌</div>
              </div>
            </div>

            {/* Total Breaks */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-3 sm:p-4 text-white min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-orange-100 text-xs font-medium truncate">إجمالي الاستراحات</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1">{(performanceStats?.totalBreaks || 0).toFixed(1)}</p>
                  <p className="text-orange-200 text-xs mt-1">دقيقة</p>
                </div>
                <div className="text-3xl opacity-80">☕</div>
              </div>
            </div>

            {/* Average Acceptance Rate */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-3 sm:p-4 text-white min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-purple-100 text-xs font-medium truncate">متوسط القبول</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1">
                    {(performanceStats?.avgAcceptance || 0).toFixed(1)}%
                  </p>
                  <p className="text-purple-200 text-xs mt-1">معدل</p>
                </div>
                <div className="text-3xl opacity-80">✅</div>
              </div>
            </div>

            {/* Best Performance Day */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-3 sm:p-4 text-white min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-amber-100 text-xs font-medium truncate">أفضل يوم</p>
                  {bestDay ? (
                    <>
                      <p className="text-sm sm:text-lg font-bold mt-1 break-all">{bestDay.date}</p>
                      <p className="text-amber-200 text-xs mt-1">
                        {bestDay.orders} طلب
                      </p>
                    </>
                  ) : (
                    <p className="text-xl font-bold mt-1">-</p>
                  )}
                </div>
                <div className="text-3xl opacity-80">🏆</div>
              </div>
            </div>
          </div>
        )}

        {/* Target vs Achievement (if target exists) */}
        {performanceStats?.target && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">الهدف مقابل الإنجاز</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">الهدف</p>
                <p className="text-2xl font-bold text-gray-800">{performanceStats.target.targetOrders}</p>
                <p className="text-xs text-gray-500">طلب</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">الإنجاز الفعلي</p>
                <p className="text-2xl font-bold text-green-600">{totalOrders}</p>
                <p className="text-xs text-gray-500">طلب</p>
              </div>
              <div className={`text-center p-4 rounded-lg ${
                totalOrders >= (performanceStats.target.targetOrders || 0) 
                  ? 'bg-green-50' 
                  : 'bg-red-50'
              }`}>
                <p className="text-sm text-gray-600">فجوة الأداء</p>
                <p className={`text-2xl font-bold ${
                  totalOrders >= (performanceStats.target.targetOrders || 0) 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {totalOrders >= (performanceStats.target.targetOrders || 0) ? '+' : ''}
                  {totalOrders - (performanceStats.target.targetOrders || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {totalOrders >= (performanceStats.target.targetOrders || 0) ? 'تجاوز الهدف' : 'أقل من الهدف'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Performance Chart */}
        {performanceStats && performanceStats.labels && performanceStats.labels.length > 0 ? (
          <PerformanceChart startDate={startDate} endDate={endDate} />
        ) : startDate && endDate && !isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
            <p className="text-gray-500 text-lg mb-2">لا توجد بيانات متاحة</p>
            <p className="text-sm text-gray-400">
              للفترة من {new Date(startDate).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} إلى {new Date(endDate).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              تأكد من أن المدير قد رفع بيانات الأداء لهذه الفترة
            </p>
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
          </div>
        ) : (
          <PerformanceChart startDate={startDate} endDate={endDate} />
        )}
      </div>
    </Layout>
  );
}

