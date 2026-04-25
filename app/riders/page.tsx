'use client';

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

interface RiderData {
  code: string;
  name: string;
  region?: string;
  hours: number;
  break: number;
  delay: number;
  absence: string;
  orders: number;
  acceptance: number;
  debt: number;
  date?: string | null;
  workDays?: number;
}

export default function RidersPage() {
  const [riders, setRiders] = useState<RiderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchRiderCode, setSearchRiderCode] = useState('');
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderData | null>(null);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminationLoading, setTerminationLoading] = useState(false);

  const [fHoursMin, setFHoursMin] = useState('');
  const [fHoursMax, setFHoursMax] = useState('');
  const [fBreakMin, setFBreakMin] = useState('');
  const [fBreakMax, setFBreakMax] = useState('');
  const [fDelayMin, setFDelayMin] = useState('');
  const [fDelayMax, setFDelayMax] = useState('');
  const [fAbsence, setFAbsence] = useState<'all' | 'نعم' | 'لا'>('all');
  const [fOrdersMin, setFOrdersMin] = useState('');
  const [fOrdersMax, setFOrdersMax] = useState('');
  const [fAcceptMin, setFAcceptMin] = useState('');
  const [fAcceptMax, setFAcceptMax] = useState('');
  const [fDebtMin, setFDebtMin] = useState('');
  const [fDebtMax, setFDebtMax] = useState('');

  useEffect(() => {
    fetchRiders();
  }, [startDate, endDate]);

  const normalizedSearchCode = searchRiderCode.trim().toLowerCase();
  const visibleRiders =
    normalizedSearchCode.length === 0
      ? riders
      : riders.filter((r) => (r.code || '').toString().trim().toLowerCase().includes(normalizedSearchCode));

  const parseNum = (s: string) => {
    const t = s.trim();
    if (t === '') return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };

  const inNumRange = (value: number, minS: string, maxS: string) => {
    const mn = parseNum(minS);
    const mx = parseNum(maxS);
    if (mn !== null && value < mn) return false;
    if (mx !== null && value > mx) return false;
    return true;
  };

  const columnFilteredRiders = useMemo(() => {
    return visibleRiders.filter((r) => {
      if (!inNumRange(Number(r.hours) || 0, fHoursMin, fHoursMax)) return false;
      if (!inNumRange(Number(r.break) || 0, fBreakMin, fBreakMax)) return false;
      if (!inNumRange(Number(r.delay) || 0, fDelayMin, fDelayMax)) return false;
      if (fAbsence !== 'all' && (r.absence || '').trim() !== fAbsence) return false;
      if (!inNumRange(Number(r.orders) || 0, fOrdersMin, fOrdersMax)) return false;
      if (!inNumRange(Number(r.acceptance) || 0, fAcceptMin, fAcceptMax)) return false;
      if (!inNumRange(Number(r.debt) || 0, fDebtMin, fDebtMax)) return false;
      return true;
    });
  }, [
    visibleRiders,
    fHoursMin,
    fHoursMax,
    fBreakMin,
    fBreakMax,
    fDelayMin,
    fDelayMax,
    fAbsence,
    fOrdersMin,
    fOrdersMax,
    fAcceptMin,
    fAcceptMax,
    fDebtMin,
    fDebtMax,
  ]);

  const clearColumnFilters = () => {
    setFHoursMin('');
    setFHoursMax('');
    setFBreakMin('');
    setFBreakMax('');
    setFDelayMin('');
    setFDelayMax('');
    setFAbsence('all');
    setFOrdersMin('');
    setFOrdersMax('');
    setFAcceptMin('');
    setFAcceptMax('');
    setFDebtMin('');
    setFDebtMax('');
  };

  const fetchRiders = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = new URL('/api/riders', window.location.origin);
      if (startDate && endDate) {
        url.searchParams.append('startDate', startDate);
        url.searchParams.append('endDate', endDate);
      }
      if (forceRefresh) {
        url.searchParams.append('refresh', 'true');
        url.searchParams.append('t', Date.now().toString());
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Debt is already included in rider data from performance (المحفظة column)
        setRiders(data.data);
      } else {
        setError(data.error || 'فشل تحميل البيانات');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      setExporting(true);
      const rows = columnFilteredRiders.map((r) => ({
        'كود المندوب': r.code ?? '',
        'اسم المندوب': r.name ?? '',
        'التاريخ/الفترة': r.date ?? (startDate && endDate ? (startDate === endDate ? startDate : `${startDate} - ${endDate}`) : ''),
        'عدد أيام العمل': Number.isFinite(r.workDays) ? Number(r.workDays) : 0,
        'ساعات العمل': Number.isFinite(r.hours) ? Number(r.hours) : 0,
        'البريك': Number.isFinite(r.break) ? Number(r.break) : 0,
        'التأخير': Number.isFinite(r.delay) ? Number(r.delay) : 0,
        'الغياب': r.absence ?? '',
        'الطلبات': Number.isFinite(r.orders) ? Number(r.orders) : 0,
        'نسبة القبول %': Number.isFinite(r.acceptance) ? Number(r.acceptance) : 0,
        'المديونية': Number.isFinite(r.debt) ? Number(r.debt) : 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: [
          'كود المندوب',
          'اسم المندوب',
          'التاريخ/الفترة',
          'عدد أيام العمل',
          'ساعات العمل',
          'البريك',
          'التأخير',
          'الغياب',
          'الطلبات',
          'نسبة القبول %',
          'المديونية',
        ],
      });

      worksheet['!cols'] = [
        { wch: 14 },
        { wch: 22 },
        { wch: 22 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 14 },
        { wch: 12 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'أداء المناديب');

      const safeStart = (startDate || '').replaceAll(':', '-');
      const safeEnd = (endDate || '').replaceAll(':', '-');
      const suffix = safeStart && safeEnd ? `${safeStart}_to_${safeEnd}` : new Date().toISOString().split('T')[0];
      const fileName = `riders_performance_${suffix}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (e: any) {
      alert(`❌ فشل تنزيل ملف Excel: ${e?.message || 'خطأ غير معروف'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleRequestTermination = (rider: RiderData) => {
    setSelectedRider(rider);
    setTerminationReason('');
    setShowTerminationModal(true);
  };

  const submitTerminationRequest = async () => {
    if (!selectedRider || !terminationReason.trim()) {
      setError('الرجاء إدخال سبب الإقالة');
      return;
    }

    try {
      setTerminationLoading(true);
      setError(''); // Clear previous errors
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('غير مصرح - يرجى تسجيل الدخول مرة أخرى');
        return;
      }
      
      console.log('[TerminationRequest] Submitting request:', {
        riderCode: selectedRider.code,
        reason: terminationReason,
      });
      
      const response = await fetch('/api/termination-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          riderCode: selectedRider.code?.toString().trim(),
          reason: terminationReason.trim(),
        }),
      });

      const data = await response.json();
      
      console.log('[TerminationRequest] Response:', data);

      if (data.success) {
        alert('✅ تم إرسال طلب الإقالة بنجاح. سيتم مراجعته من قبل المدير.');
        setShowTerminationModal(false);
        setSelectedRider(null);
        setTerminationReason('');
        // Wait a bit then refresh with force refresh
        setTimeout(() => {
          fetchRiders(true); // Force refresh to bypass cache
        }, 500);
      } else {
        const errorMsg = data.error || 'فشل إرسال طلب الإقالة';
        setError(errorMsg);
        console.error('[TerminationRequest] Error:', errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ في الاتصال بالخادم';
      setError(errorMsg);
      console.error('[TerminationRequest] Network error:', err);
    } finally {
      setTerminationLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-[#EAF0FF] mb-2">المناديب</h1>
          <p className="text-[rgba(234,240,255,0.70)]">
            قائمة بجميع المناديب وأدائهم - اختر النطاق الزمني لعرض البيانات
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="riders-start-date" className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                id="riders-start-date"
                name="riders-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label htmlFor="riders-end-date" className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                id="riders-end-date"
                name="riders-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={() => fetchRiders()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🔄 تحديث
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 items-end justify-between">
            <div className="min-w-0 flex-1 sm:flex-initial">
              <label htmlFor="search-rider-code" className="block text-sm font-medium text-gray-700 mb-2">
                بحث بكود المندوب
              </label>
              <input
                id="search-rider-code"
                name="search-rider-code"
                type="text"
                value={searchRiderCode}
                onChange={(e) => setSearchRiderCode(e.target.value)}
                placeholder="اكتب كود المندوب..."
                className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="button"
              onClick={clearColumnFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              مسح فلاتر الأعمدة
            </button>
            <button
              type="button"
              onClick={downloadExcel}
              disabled={exporting || columnFilteredRiders.length === 0}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={columnFilteredRiders.length === 0 ? 'لا توجد بيانات لتنزيلها' : 'تنزيل البيانات كملف Excel'}
            >
              {exporting ? 'جاري تجهيز Excel...' : '⬇️ تنزيل Excel'}
            </button>
          </div>

          {startDate && endDate && (
            <p className="mt-3 text-sm text-gray-600">
              عرض بيانات من <span className="font-semibold text-blue-600">
                {new Date(startDate).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span> إلى <span className="font-semibold text-blue-600">
                {new Date(endDate).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الكود</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 min-w-[200px]">الاسم</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">التاريخ</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap">عدد أيام العمل</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">ساعات العمل</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">البريك</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">التأخير</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الغياب</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الطلبات</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">نسبة القبول</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">المديونية</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">إجراءات</th>
                </tr>
                <tr className="border-t border-gray-200 bg-gray-100/80">
                  <th className="p-2 px-4" />
                  <th className="p-2 px-4" />
                  <th className="p-2 px-4" />
                  <th className="p-2 px-4" />
                  <th className="p-2 px-2 align-bottom">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="من"
                        value={fHoursMin}
                        onChange={(e) => setFHoursMin(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="إلى"
                        value={fHoursMax}
                        onChange={(e) => setFHoursMax(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                    </div>
                  </th>
                  <th className="p-2 px-2 align-bottom">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="من"
                        value={fBreakMin}
                        onChange={(e) => setFBreakMin(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="إلى"
                        value={fBreakMax}
                        onChange={(e) => setFBreakMax(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                    </div>
                  </th>
                  <th className="p-2 px-2 align-bottom">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="من"
                        value={fDelayMin}
                        onChange={(e) => setFDelayMin(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="إلى"
                        value={fDelayMax}
                        onChange={(e) => setFDelayMax(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                    </div>
                  </th>
                  <th className="p-2 px-2 align-bottom">
                    <select
                      value={fAbsence}
                      onChange={(e) => setFAbsence(e.target.value as 'all' | 'نعم' | 'لا')}
                      className="w-full min-w-[5rem] px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                    >
                      <option value="all">الكل</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                    </select>
                  </th>
                  <th className="p-2 px-2 align-bottom">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="من"
                        value={fOrdersMin}
                        onChange={(e) => setFOrdersMin(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="إلى"
                        value={fOrdersMax}
                        onChange={(e) => setFOrdersMax(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                    </div>
                  </th>
                  <th className="p-2 px-2 align-bottom">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="من %"
                        value={fAcceptMin}
                        onChange={(e) => setFAcceptMin(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="إلى %"
                        value={fAcceptMax}
                        onChange={(e) => setFAcceptMax(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                    </div>
                  </th>
                  <th className="p-2 px-2 align-bottom">
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="من"
                        value={fDebtMin}
                        onChange={(e) => setFDebtMin(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="إلى"
                        value={fDebtMax}
                        onChange={(e) => setFDebtMax(e.target.value)}
                        className="w-full min-w-[4.5rem] px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                      />
                    </div>
                  </th>
                  <th className="p-2 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {columnFilteredRiders.length > 0 ? (
                  columnFilteredRiders.map((rider, index) => (
                    <tr key={`rider-${rider.code}-${index}`} className="hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm text-gray-800">{rider.code}</td>
                      <td className="py-4 px-4 text-sm text-gray-800 font-medium whitespace-normal break-words">
                        {rider.name}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {rider.date ? (() => {
                          try {
                            // Handle date range string (e.g., "2025-11-01 - 2025-11-22")
                            if (typeof rider.date === 'string' && rider.date.includes(' - ')) {
                              return <span className="text-blue-600 font-medium">{rider.date}</span>;
                            }
                            // Handle single date
                            const dateObj = new Date(rider.date);
                            if (!isNaN(dateObj.getTime())) {
                              return (
                                <span className="text-blue-600 font-medium">
                                  {dateObj.toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              );
                            }
                            return <span className="text-blue-600 font-medium">{rider.date}</span>;
                          } catch {
                            return <span className="text-blue-600 font-medium">{String(rider.date)}</span>;
                          }
                        })() : (
                          <span className="text-gray-400 italic">غير متوفر</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-800 font-medium tabular-nums">
                        {Number.isFinite(rider.workDays) ? rider.workDays : 0}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{(rider.hours || 0).toFixed(1)}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{(rider.break || 0).toFixed(1)}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{(rider.delay || 0).toFixed(1)}</td>
                      <td className="py-4 px-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            rider.absence === 'نعم'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {rider.absence}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{rider.orders}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{((rider.acceptance || 0)).toFixed(1)}%</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{((rider.debt || 0)).toFixed(2)}</td>
                      <td className="py-4 px-4 text-sm">
                        <button
                          onClick={() => handleRequestTermination(rider)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                        >
                          طلب إقالة
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-gray-500">
                      {riders.length === 0
                        ? 'لا توجد بيانات متاحة'
                        : 'لا توجد نتائج مطابقة للبحث أو فلاتر الأعمدة'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Termination Request Modal */}
        {showTerminationModal && selectedRider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">طلب إقالة مندوب</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">المندوب:</p>
                  <p className="font-semibold text-gray-800">{selectedRider.name} ({selectedRider.code})</p>
                </div>
                <div>
                  <label htmlFor="termination-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    سبب الإقالة <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="termination-reason"
                    name="termination-reason"
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                    placeholder="أدخل سبب طلب الإقالة..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowTerminationModal(false);
                      setSelectedRider(null);
                      setTerminationReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={submitTerminationRequest}
                    disabled={terminationLoading || !terminationReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {terminationLoading ? 'جاري الإرسال...' : 'إرسال الطلب'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

