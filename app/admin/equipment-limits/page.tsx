'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SupervisorLimits {
  motorcycleBox: number;
  bicycleBox: number;
  tshirt: number;
  jacket: number;
  helmet: number;
}

interface SupervisorWithLimits {
  code: string;
  name: string;
  region: string;
  limits: SupervisorLimits;
}

export default function EquipmentLimitsPage() {
  const queryClient = useQueryClient();
  const [localLimits, setLocalLimits] = useState<Record<string, SupervisorLimits>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'equipment-limits'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/equipment-limits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { supervisors: SupervisorWithLimits[] };
    },
  });

  useEffect(() => {
    if (data?.supervisors) {
      const map: Record<string, SupervisorLimits> = {};
      data.supervisors.forEach((s) => {
        map[s.code] = { ...s.limits };
      });
      setLocalLimits(map);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (limits: Record<string, SupervisorLimits>) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/equipment-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ limits }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'equipment-limits'] });
      alert('✅ تم حفظ حدود خصم المعدات بنجاح');
    },
    onError: (e: Error) => {
      alert('❌ فشل الحفظ: ' + e.message);
    },
  });

  const handleChange = (code: string, field: keyof SupervisorLimits, value: number) => {
    setLocalLimits((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] || { motorcycleBox: 0, bicycleBox: 0, tshirt: 0, jacket: 0, helmet: 0 }),
        [field]: Math.max(0, value),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(localLimits);
  };

  const supervisors = data?.supervisors ?? [];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 break-words">حدود خصم المعدات</h1>
          <p className="text-gray-600 text-sm sm:text-base break-words">
            تحديد الكميات المسموح خصمها لكل مشرف (صناديق دراجات، تيشرتات، قبعات، إلخ)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-right p-3 font-semibold text-gray-800 whitespace-nowrap">المشرف</th>
                  <th className="text-center p-3 font-semibold text-gray-800 whitespace-nowrap">صندوق دراجة نارية</th>
                  <th className="text-center p-3 font-semibold text-gray-800 whitespace-nowrap">صندوق دراجة هوائية</th>
                  <th className="text-center p-3 font-semibold text-gray-800 whitespace-nowrap">تيشرت</th>
                  <th className="text-center p-3 font-semibold text-gray-800 whitespace-nowrap">جاكت</th>
                  <th className="text-center p-3 font-semibold text-gray-800 whitespace-nowrap">خوذة</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map((sup) => {
                  const limits = localLimits[sup.code] ?? sup.limits;
                  return (
                    <tr key={sup.code} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-3 text-right">
                        <span className="font-medium text-gray-800">{sup.name}</span>
                        {sup.region && (
                          <span className="block text-xs text-gray-500">{sup.region}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={limits.motorcycleBox}
                          onChange={(e) => handleChange(sup.code, 'motorcycleBox', parseInt(e.target.value, 10) || 0)}
                          className="w-full max-w-[5rem] mx-auto block px-2 py-1.5 border border-gray-300 rounded text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={limits.bicycleBox}
                          onChange={(e) => handleChange(sup.code, 'bicycleBox', parseInt(e.target.value, 10) || 0)}
                          className="w-full max-w-[5rem] mx-auto block px-2 py-1.5 border border-gray-300 rounded text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={limits.tshirt}
                          onChange={(e) => handleChange(sup.code, 'tshirt', parseInt(e.target.value, 10) || 0)}
                          className="w-full max-w-[5rem] mx-auto block px-2 py-1.5 border border-gray-300 rounded text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={limits.jacket}
                          onChange={(e) => handleChange(sup.code, 'jacket', parseInt(e.target.value, 10) || 0)}
                          className="w-full max-w-[5rem] mx-auto block px-2 py-1.5 border border-gray-300 rounded text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={limits.helmet}
                          onChange={(e) => handleChange(sup.code, 'helmet', parseInt(e.target.value, 10) || 0)}
                          className="w-full max-w-[5rem] mx-auto block px-2 py-1.5 border border-gray-300 rounded text-center"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>

        {supervisors.length === 0 && (
          <p className="text-gray-500 text-center py-8">لا يوجد مشرفون. أضف مشرفين من صفحة إدارة المشرفين.</p>
        )}
      </div>
    </Layout>
  );
}
