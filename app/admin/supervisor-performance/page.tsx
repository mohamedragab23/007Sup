'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useQuery } from '@tanstack/react-query';

interface SupervisorPerformanceRow {
  code: string;
  name: string;
  region: string;
  subordinate_count: number;
  total_orders: number;
  total_hours: number;
  avg_acceptance: number;
  records_count: number;
  orders_per_rider: number;
}

interface ReportSummary {
  total_supervisors: number;
  total_orders: number;
  total_hours: number;
  avg_acceptance: number;
  total_records: number;
}

export default function SupervisorPerformancePage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestRange, setRequestRange] = useState<{ start: string; end: string } | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin', 'supervisor-performance', requestRange?.start, requestRange?.end],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/admin/supervisor-performance?start_date=${requestRange!.start}&end_date=${requestRange!.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'فشل تحميل التقرير');
      return json.data as {
        start_date: string;
        end_date: string;
        summary: ReportSummary;
        supervisors: SupervisorPerformanceRow[];
      };
    },
    enabled: !!requestRange?.start && !!requestRange?.end,
    staleTime: 2 * 60 * 1000,
  });

  const loadReport = () => {
    if (!startDate || !endDate) {
      alert('يرجى اختيار تاريخ البداية والنهاية');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }
    setRequestRange({ start: startDate, end: endDate });
  };

  const loading = isLoading || isFetching;
  const supervisors = data?.supervisors ?? [];
  const summary = data?.summary;

  return (
    <Layout>
      <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 break-words">أداء المشرفين</h1>
          <p className="text-gray-600 text-sm sm:text-base break-words">
            عرض أداء كل مشرف بناءً على أداء مناديبه خلال الفترة المحددة — تقرير مفصل مع شرح المؤشرات
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">مرشح التاريخ</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-0 flex-1 sm:flex-initial">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                من تاريخ
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="min-w-0 flex-1 sm:flex-initial">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                إلى تاريخ
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التحميل...' : 'عرض التقرير'}
            </button>
          </div>
        </div>

        {/* شرح المؤشرات */}
        {data && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
            <h3 className="font-bold text-amber-900 mb-3">📖 شرح المؤشرات — كيف تقرأ التقرير</h3>
            <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
              <li><strong>عدد المناديب:</strong> عدد المناديب المسجلين تحت هذا المشرف في الفترة.</li>
              <li><strong>إجمالي الطلبات:</strong> مجموع الطلبات التي أنجزها كل مناديب المشرف خلال الفترة المحددة.</li>
              <li><strong>إجمالي الساعات:</strong> مجموع ساعات العمل المسجلة لجميع المناديب في الفترة.</li>
              <li><strong>متوسط معدل القبول:</strong> متوسط نسبة قبول الطلبات (معدل الجودة) لسجلات الأداء في الفترة.</li>
              <li><strong>متوسط الطلبات للمندوب:</strong> إجمالي الطلبات ÷ عدد المناديب — يعطي فكرة عن أداء الفريق لكل مندوب.</li>
              <li><strong>سجلات الأداء:</strong> عدد صفوف البيانات اليومية المستخدمة في الحساب (كل سجل = مندوب في يوم معين).</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-red-800">
            {(error as Error).message}
          </div>
        )}

        {data && summary && (
          <>
            {/* ملخص التقرير */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-5">
              <h3 className="font-bold text-blue-900 mb-3">📊 ملخص التقرير — الفترة من {data.start_date} إلى {data.end_date}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1">عدد المشرفين</p>
                  <p className="text-xl font-bold text-blue-900">{summary.total_supervisors}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1">إجمالي الطلبات</p>
                  <p className="text-xl font-bold text-blue-900">{summary.total_orders}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1">إجمالي الساعات</p>
                  <p className="text-xl font-bold text-blue-900">{summary.total_hours}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1">متوسط معدل القبول</p>
                  <p className="text-xl font-bold text-blue-900">{summary.avg_acceptance}%</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600 mb-1">إجمالي السجلات</p>
                  <p className="text-xl font-bold text-blue-900">{summary.total_records}</p>
                </div>
              </div>
            </div>

            {/* تبديل العرض: بطاقات / جدول */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg font-medium ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                عرض البطاقات
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg font-medium ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                جدول المقارنة
              </button>
            </div>

            {viewMode === 'cards' && (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {supervisors.map((sup) => (
                  <div
                    key={sup.code}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 min-w-0 overflow-hidden"
                  >
                    <h3 className="font-bold text-gray-800 mb-2 truncate" title={sup.name}>
                      {sup.name}
                    </h3>
                    {sup.region && (
                      <p className="text-xs text-gray-500 mb-3 truncate" title={sup.region}>
                        {sup.region}
                      </p>
                    )}
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between gap-2">
                        <span className="text-gray-600">عدد المناديب</span>
                        <span className="font-semibold text-gray-800">{sup.subordinate_count}</span>
                      </li>
                      <li className="flex justify-between gap-2">
                        <span className="text-gray-600">إجمالي الطلبات</span>
                        <span className="font-semibold text-gray-800">{sup.total_orders}</span>
                      </li>
                      <li className="flex justify-between gap-2">
                        <span className="text-gray-600">إجمالي الساعات</span>
                        <span className="font-semibold text-gray-800">{sup.total_hours}</span>
                      </li>
                      <li className="flex justify-between gap-2">
                        <span className="text-gray-600">متوسط معدل القبول</span>
                        <span className="font-semibold text-gray-800">{sup.avg_acceptance}%</span>
                      </li>
                      <li className="flex justify-between gap-2">
                        <span className="text-gray-600">متوسط الطلبات للمندوب</span>
                        <span className="font-semibold text-gray-800">{sup.orders_per_rider}</span>
                      </li>
                      <li className="flex justify-between gap-2">
                        <span className="text-gray-600">سجلات الأداء</span>
                        <span className="font-semibold text-gray-800">{sup.records_count}</span>
                      </li>
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'table' && (
              <div className="overflow-x-auto min-w-0 rounded-xl border border-gray-200">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-right p-3 font-semibold text-gray-800">المشرف</th>
                      <th className="text-center p-3 font-semibold text-gray-800">المنطقة</th>
                      <th className="text-center p-3 font-semibold text-gray-800">عدد المناديب</th>
                      <th className="text-center p-3 font-semibold text-gray-800">إجمالي الطلبات</th>
                      <th className="text-center p-3 font-semibold text-gray-800">إجمالي الساعات</th>
                      <th className="text-center p-3 font-semibold text-gray-800">متوسط القبول %</th>
                      <th className="text-center p-3 font-semibold text-gray-800">متوسط طلبات/مندوب</th>
                      <th className="text-center p-3 font-semibold text-gray-800">السجلات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisors.map((sup) => (
                      <tr key={sup.code} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="p-3 text-right font-medium">{sup.name}</td>
                        <td className="p-3 text-center text-gray-600">{sup.region || '—'}</td>
                        <td className="p-3 text-center">{sup.subordinate_count}</td>
                        <td className="p-3 text-center">{sup.total_orders}</td>
                        <td className="p-3 text-center">{sup.total_hours}</td>
                        <td className="p-3 text-center">{sup.avg_acceptance}%</td>
                        <td className="p-3 text-center">{sup.orders_per_rider}</td>
                        <td className="p-3 text-center">{sup.records_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {supervisors.length === 0 && (
              <p className="text-gray-500 text-center py-8">لا توجد بيانات أداء للمشرفين في هذه الفترة.</p>
            )}
          </>
        )}

        {!data && !error && requestRange && !loading && (
          <p className="text-gray-500 text-center py-4">لم يتم تحميل بيانات بعد. اضغط «عرض التقرير».</p>
        )}
      </div>
    </Layout>
  );
}
