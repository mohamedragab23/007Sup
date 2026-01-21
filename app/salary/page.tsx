'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SalaryCalculation {
  supervisorId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  salaryMethod: 'fixed' | 'commission';
  baseAmount: number;
  commission?: {
    totalOrders: number;
    totalHours: number;
    commissionRate: number;
    dailyAverageHours?: number;
    workingDays?: number;
    calculatedCommission: number;
  };
  deductions: {
    advances: number;
    advancesDetails?: { date: string; amount: number }[];
    deductions: number;
    deductionsDetails?: { date: string; reason: string; amount: number }[];
    equipment: number;
    equipmentDetails?: { name: string; quantity: number; price: number; total: number }[];
    security: number;
    total: number;
  };
  netSalary: number;
  breakdown: {
    date: string;
    orders: number;
    hours: number;
    multiplier: number;
    dailyCommission: number;
  }[];
}

export default function SalaryPage() {
  // Use refs to track pending date changes
  const [confirmedStartDate, setConfirmedStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [confirmedEndDate, setConfirmedEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  // Temporary state for date inputs (doesn't trigger query)
  const [tempStartDate, setTempStartDate] = useState(confirmedStartDate);
  const [tempEndDate, setTempEndDate] = useState(confirmedEndDate);
  const [hasChanges, setHasChanges] = useState(false);
  
  const queryClient = useQueryClient();

  // Check if dates have changed
  useEffect(() => {
    setHasChanges(tempStartDate !== confirmedStartDate || tempEndDate !== confirmedEndDate);
  }, [tempStartDate, tempEndDate, confirmedStartDate, confirmedEndDate]);

  // Apply date changes
  const applyDateChanges = useCallback(() => {
    if (tempStartDate && tempEndDate) {
      setConfirmedStartDate(tempStartDate);
      setConfirmedEndDate(tempEndDate);
      setHasChanges(false);
    }
  }, [tempStartDate, tempEndDate]);

  const { data: salaryData, isLoading, error, isFetching } = useQuery({
    queryKey: ['salary', confirmedStartDate, confirmedEndDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/salary/calculate?startDate=${confirmedStartDate}&endDate=${confirmedEndDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل تحميل البيانات');
      return data.data as SalaryCalculation;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (optimized for mobile)
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false,
  });


  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ج.م`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري حساب الراتب...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">حساب الراتب</h1>
          <p className="text-gray-600">تفاصيل الراتب والخصومات</p>
        </div>

        {/* Date Range Selector - No auto-reload */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="salary-start-date" className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                id="salary-start-date"
                name="salary-start-date"
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label htmlFor="salary-end-date" className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                id="salary-end-date"
                name="salary-end-date"
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <button
                onClick={applyDateChanges}
                disabled={!hasChanges || isFetching}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                  hasChanges && !isFetching
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isFetching ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    جاري التحميل...
                  </span>
                ) : (
                  '🔍 عرض الراتب'
                )}
              </button>
            </div>
          </div>
          {hasChanges && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ تم تغيير التاريخ. اضغط "عرض الراتب" لتحديث البيانات.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error instanceof Error ? error.message : 'حدث خطأ في تحميل البيانات'}
          </div>
        )}

        {salaryData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Salary Details */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">تفاصيل الراتب</h3>
              <div className="space-y-3">
                {salaryData.salaryMethod === 'fixed' ? (
                  <>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">نوع الراتب:</span>
                      <span className="font-semibold text-gray-800">راتب ثابت</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">الراتب الأساسي:</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(salaryData.baseAmount)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">نوع الراتب:</span>
                      <span className="font-semibold text-gray-800">عمولة</span>
                    </div>
                    {salaryData.commission && (
                      <>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">إجمالي الطلبات:</span>
                          <span className="font-semibold text-gray-800">{salaryData.commission.totalOrders}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">إجمالي الساعات:</span>
                          <span className="font-semibold text-gray-800">
                            {((salaryData.commission?.totalHours || 0)).toFixed(1)} ساعة
                          </span>
                        </div>
                        {salaryData.commission.dailyAverageHours !== undefined && (
                          <div className="flex justify-between py-2 border-b bg-blue-50 px-2 rounded">
                            <span className="text-gray-600">متوسط الساعات اليومي:</span>
                            <span className="font-semibold text-blue-700">
                              {(salaryData.commission.dailyAverageHours).toFixed(1)} ساعة
                            </span>
                          </div>
                        )}
                        {salaryData.commission.workingDays !== undefined && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">عدد أيام العمل:</span>
                            <span className="font-semibold text-gray-800">
                              {salaryData.commission.workingDays} يوم
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 border-b bg-green-50 px-2 rounded">
                          <span className="text-gray-600">معدل العمولة:</span>
                          <span className="font-semibold text-green-700">
                            {((salaryData.commission?.commissionRate || 0)).toFixed(2)} ج.م لكل طلب
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">العمولة المحسوبة:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(salaryData.commission?.calculatedCommission || 0)}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
                <div className="flex justify-between py-2 pt-4 border-t-2 border-gray-300">
                  <span className="text-lg font-semibold text-gray-800">إجمالي الراتب:</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(salaryData.baseAmount)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">الخصومات</h3>
              <div className="space-y-3">
                {/* السلف مع التفاصيل */}
                <div className="py-2 border-b">
                  <div className="flex justify-between">
                    <span className="text-gray-600">السلف:</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(salaryData.deductions.advances)}
                    </span>
                  </div>
                  {salaryData.deductions.advancesDetails && salaryData.deductions.advancesDetails.length > 0 && (
                    <div className="mt-2 mr-4 text-sm bg-gray-50 rounded-lg p-3">
                      {salaryData.deductions.advancesDetails.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-gray-600 py-1">
                          <span>📅 {item.date}</span>
                          <span className="text-red-500">-{item.amount} ج.م</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* الخصومات مع التفاصيل */}
                <div className="py-2 border-b">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الخصومات:</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(salaryData.deductions.deductions)}
                    </span>
                  </div>
                  {salaryData.deductions.deductionsDetails && salaryData.deductions.deductionsDetails.length > 0 && (
                    <div className="mt-2 mr-4 text-sm bg-gray-50 rounded-lg p-3">
                      {salaryData.deductions.deductionsDetails.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-gray-600 py-1">
                          <span>📅 {item.date} - {item.reason}</span>
                          <span className="text-red-500">-{item.amount} ج.م</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="py-2 border-b">
                  <div className="flex justify-between">
                    <span className="text-gray-600">تكلفة المعدات:</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(salaryData.deductions.equipment)}
                    </span>
                  </div>
                  {/* Equipment Details Breakdown */}
                  {salaryData.deductions.equipmentDetails && salaryData.deductions.equipmentDetails.length > 0 && (
                    <div className="mt-2 mr-4 text-sm bg-gray-50 rounded-lg p-3">
                      {salaryData.deductions.equipmentDetails.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-gray-600 py-1">
                          <span>{item.name} ({item.quantity} × {item.price} ج.م)</span>
                          <span className="text-red-500">-{item.total} ج.م</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">تكلفة الاستعلامات الأمنية:</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(salaryData.deductions.security)}
                  </span>
                </div>
                <div className="flex justify-between py-2 pt-4 border-t-2 border-gray-300">
                  <span className="text-lg font-semibold text-gray-800">إجمالي الخصومات:</span>
                  <span className="text-xl font-bold text-red-600">
                    -{formatCurrency(salaryData.deductions.total)}
                  </span>
                </div>
                <div className="flex justify-between py-2 pt-4 border-t-2 border-blue-300 bg-blue-50 rounded-lg p-3">
                  <span className="text-xl font-bold text-gray-800">الراتب الصافي:</span>
                  <span className="text-2xl font-bold text-blue-600">{formatCurrency(salaryData.netSalary)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commission Breakdown (if commission-based) */}
        {salaryData && salaryData.salaryMethod === 'commission' && salaryData.breakdown && salaryData.breakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">تفاصيل العمولة اليومية</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">التاريخ</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الطلبات</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الساعات</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">المعامل</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">العمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salaryData.breakdown.map((day, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{day.date}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{day.orders}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{((day.hours || 0)).toFixed(1)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{((day.multiplier || 0)).toFixed(1)}x</td>
                      <td className="py-3 px-4 text-sm font-semibold text-green-600">
                        {formatCurrency(day.dailyCommission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

