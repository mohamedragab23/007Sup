'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useQuery } from '@tanstack/react-query';

export default function AdminDebugPage() {
  const [action, setAction] = useState<'performance' | 'supervisor'>('performance');
  const [supervisorCode, setSupervisorCode] = useState('');
  const [startDate, setStartDate] = useState('2023-11-14');
  const [endDate, setEndDate] = useState('2023-11-15');

  const { data: debugData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'debug', action, supervisorCode, startDate, endDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      let url = `/api/admin/debug?action=${action}`;
      if (action === 'supervisor' && supervisorCode) {
        url += `&supervisorCode=${supervisorCode}&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data;
    },
    enabled: action === 'performance' || (action === 'supervisor' && !!supervisorCode),
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🔍 التحقق من البيانات</h1>
          <p className="text-gray-600">فحص البيانات في Google Sheets والتحقق من الفلترة</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="space-y-4">
            <div>
              <label htmlFor="debug-action-select" className="block text-sm font-medium text-gray-700 mb-2">نوع الفحص</label>
              <select
                id="debug-action-select"
                name="debug-action-select"
                value={action}
                onChange={(e) => setAction(e.target.value as 'performance' | 'supervisor')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="performance">فحص بيانات الأداء في Google Sheets</option>
                <option value="supervisor">فحص بيانات مشرف معين</option>
              </select>
            </div>

            {action === 'supervisor' && (
              <>
                <div>
                  <label htmlFor="debug-supervisor-code" className="block text-sm font-medium text-gray-700 mb-2">كود المشرف</label>
                  <input
                    id="debug-supervisor-code"
                    name="debug-supervisor-code"
                    type="text"
                    value={supervisorCode}
                    onChange={(e) => setSupervisorCode(e.target.value)}
                    placeholder="مثال: ASY-001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="debug-start-date" className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                    <input
                      id="debug-start-date"
                      name="debug-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="debug-end-date" className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                    <input
                      id="debug-end-date"
                      name="debug-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => refetch()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🔄 تحديث البيانات
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
          </div>
        )}

        {debugData && debugData.success && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">نتائج الفحص</h3>
            
            {action === 'performance' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">إجمالي الصفوف في Google Sheets:</p>
                  <p className="text-2xl font-bold text-blue-600">{debugData.totalRows || 0}</p>
                </div>
                
                {debugData.sampleRows && debugData.sampleRows.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">عينة من البيانات (أول 10 صفوف بيانات، تم تخطي صف العنوان):</p>
                    <p className="text-xs text-gray-500 mb-2">
                      💡 ملاحظة: إذا كان التاريخ (Parsed) يظهر "Invalid"، فهذا يعني أن التاريخ في Google Sheets بتنسيق غير معروف. 
                      يجب أن يكون التاريخ بتنسيق YYYY-MM-DD أو M/D/YYYY أو D/M/YYYY.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-right py-2 px-3">الصف</th>
                            <th className="text-right py-2 px-3">التاريخ (Raw)</th>
                            <th className="text-right py-2 px-3">التاريخ (Parsed)</th>
                            <th className="text-right py-2 px-3">كود المندوب</th>
                            <th className="text-right py-2 px-3">الطلبات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {debugData.sampleRows.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-2 px-3">{row.rowIndex}</td>
                              <td className="py-2 px-3 font-mono text-xs">{String(row.date?.raw || '')}</td>
                              <td className="py-2 px-3">
                                {row.date?.parsed ? (
                                  <span className="text-green-600 font-medium">{row.date.parsed}</span>
                                ) : (
                                  <span className="text-red-600">Invalid</span>
                                )}
                              </td>
                              <td className="py-2 px-3">{row.riderCode}</td>
                              <td className="py-2 px-3">{row.orders}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {action === 'supervisor' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">كود المشرف:</p>
                  <p className="text-lg font-bold text-blue-600">{debugData.supervisorCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">عدد المناديب المعينين:</p>
                  <p className="text-2xl font-bold text-blue-600">{debugData.ridersCount || 0}</p>
                </div>
                {debugData.riders && debugData.riders.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">المناديب المعينين:</p>
                    <div className="flex flex-wrap gap-2">
                      {debugData.riders.map((rider: any, index: number) => (
                        <span key={`rider-${rider.code}-${index}`} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                          {rider.code} - {rider.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-2">عدد سجلات الأداء في النطاق الزمني:</p>
                  <p className="text-2xl font-bold text-blue-600">{debugData.performanceDataCount || 0}</p>
                </div>
                {debugData.performanceData && debugData.performanceData.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">عينة من بيانات الأداء (أول 10 سجلات):</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-right py-2 px-3">التاريخ</th>
                            <th className="text-right py-2 px-3">كود المندوب</th>
                            <th className="text-right py-2 px-3">الطلبات</th>
                            <th className="text-right py-2 px-3">ساعات العمل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {debugData.performanceData.map((record: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-2 px-3">{record.date}</td>
                              <td className="py-2 px-3">{record.riderCode}</td>
                              <td className="py-2 px-3">{record.orders}</td>
                              <td className="py-2 px-3">{record.hours}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {debugData.performanceDataCount === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-semibold">⚠️ لا توجد بيانات في النطاق الزمني المحدد</p>
                    <p className="text-sm text-yellow-700 mt-2">
                      تأكد من:
                      <ul className="list-disc list-inside mr-4 mt-1 space-y-1">
                        <li>أن المناديب معينين للمشرف بشكل صحيح</li>
                        <li>أن التاريخ المحدد يطابق تاريخ البيانات في Google Sheets</li>
                        <li>أن البيانات موجودة في ورقة "البيانات اليومية"</li>
                      </ul>
                    </p>
                    <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">💡 نصيحة مهمة:</p>
                      <p className="text-xs text-yellow-800">
                        إذا كان التاريخ في Google Sheets هو "10/1/2025" (أكتوبر 1, 2025)، استخدم "2025-10-01" في البحث.
                        <br />
                        افتح صفحة "فحص بيانات الأداء" أعلاه لرؤية تنسيق التاريخ الفعلي في Google Sheets.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {debugData && !debugData.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">❌ خطأ</p>
            <p className="text-sm text-red-700 mt-2">{debugData.error || 'حدث خطأ غير معروف'}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

