'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ExcelUpload from '@/components/ExcelUpload';

interface Rider {
  code: string;
  name: string;
  region: string;
  supervisorCode: string;
  supervisorName?: string;
  phone?: string;
  joinDate?: string;
  status?: string;
}

export default function AdminRidersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [formData, setFormData] = useState<Partial<Rider>>({
    code: '',
    name: '',
    region: '',
    supervisorCode: '',
    phone: '',
    status: 'نشط',
  });

  const queryClient = useQueryClient();

  const { data: riders = [], isLoading: ridersLoading } = useQuery({
    queryKey: ['admin', 'riders'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      // Add timestamp to force refresh when needed
      const res = await fetch(`/api/admin/riders?refresh=true&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchOnMount: true, // Always refetch on mount
  });

  const { data: supervisors = [] } = useQuery({
    queryKey: ['admin', 'supervisors'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/supervisors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (rider: Rider) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rider),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      setShowAddModal(false);
      setFormData({ code: '', name: '', region: '', supervisorCode: '', phone: '', status: 'نشط' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ code, ...updates }: Partial<Rider> & { code: string }) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/riders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, ...updates }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      setEditingRider(null);
      setFormData({ code: '', name: '', region: '', supervisorCode: '', phone: '', status: 'نشط' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/riders?code=${code}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
  });

  const handleEdit = (rider: Rider) => {
    setEditingRider(rider);
    setFormData({
      code: rider.code,
      name: rider.name,
      region: rider.region,
      supervisorCode: rider.supervisorCode,
      phone: rider.phone || '',
      status: rider.status || 'نشط',
    });
  };

  const handleDelete = (code: string) => {
    if (confirm('هل أنت متأكد من إزالة تعيين هذا المندوب من المشرف؟')) {
      deleteMutation.mutate(code);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRider) {
      updateMutation.mutate(formData as Rider);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData as Rider);
  };

  if (ridersLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 break-words">إدارة المناديب</h1>
            <p className="text-gray-600 text-sm sm:text-base break-words">إضافة وتعيين المناديب للمشرفين</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm sm:text-base shrink-0"
          >
            + إضافة مندوب
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">إضافة مندوب واحد</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="rider-code" className="block text-sm font-medium text-gray-700 mb-2">كود المندوب *</label>
                <input
                  id="rider-code"
                  name="rider-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="rider-name" className="block text-sm font-medium text-gray-700 mb-2">الاسم *</label>
                <input
                  id="rider-name"
                  name="rider-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="rider-region" className="block text-sm font-medium text-gray-700 mb-2">المنطقة</label>
                <input
                  id="rider-region"
                  name="rider-region"
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label htmlFor="rider-supervisor" className="block text-sm font-medium text-gray-700 mb-2">المشرف *</label>
                <select
                  id="rider-supervisor"
                  name="rider-supervisor"
                  value={formData.supervisorCode}
                  onChange={(e) => setFormData({ ...formData, supervisorCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر المشرف</option>
                  {supervisors.map((s: any, index: number) => (
                    <option key={`supervisor-${s.code}-${index}`} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rider-phone" className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                <input
                  id="rider-phone"
                  name="rider-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                إضافة
              </button>
            </form>
          </div>

          <ExcelUpload
            type="riders"
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
            }}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">الكود</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">الاسم</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">المنطقة</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">المشرف</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {riders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      لا توجد مناديب
                    </td>
                  </tr>
                ) : (
                  riders
                    .filter((rider: Rider) => {
                      // Filter out deleted riders (those with empty code or marked as deleted)
                      if (!rider.code || rider.code.trim() === '') return false;
                      // Show all riders for admin (including unassigned ones)
                      return true;
                    })
                    .map((rider: Rider, index: number) => (
                    <tr key={`rider-${rider.code}-${index}`} className="hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm text-gray-800">{rider.code}</td>
                      <td className="py-4 px-6 text-sm text-gray-800 font-medium">{rider.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{rider.region}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {rider.supervisorCode && rider.supervisorCode.trim() !== '' && 
                         !['لم يتم التعيين', 'غير معروف', 'غير معين'].some(text => 
                           rider.supervisorCode?.toLowerCase().includes(text.toLowerCase())) ? (
                          <>
                            {rider.supervisorName || 'غير معروف'} ({rider.supervisorCode})
                          </>
                        ) : (
                          <span className="text-gray-400 italic">لم يتم التعيين</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            rider.status === 'نشط'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {rider.status || 'نشط'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(rider)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(rider.code)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs"
                          >
                            إزالة التعيين
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingRider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">تعديل المندوب</h3>
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <label htmlFor="edit-rider-code" className="block text-sm font-medium text-gray-700 mb-2">كود المندوب</label>
                  <input
                    id="edit-rider-code"
                    name="edit-rider-code"
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-rider-name" className="block text-sm font-medium text-gray-700 mb-2">الاسم *</label>
                  <input
                    id="edit-rider-name"
                    name="edit-rider-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-rider-region" className="block text-sm font-medium text-gray-700 mb-2">المنطقة</label>
                  <input
                    id="edit-rider-region"
                    name="edit-rider-region"
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-rider-supervisor" className="block text-sm font-medium text-gray-700 mb-2">المشرف</label>
                  <select
                    id="edit-rider-supervisor"
                    name="edit-rider-supervisor"
                    value={formData.supervisorCode || ''}
                    onChange={(e) => setFormData({ ...formData, supervisorCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">-- اختر المشرف --</option>
                    {supervisors.map((sup: any, index: number) => (
                      <option key={`supervisor-${sup.code}-${index}`} value={sup.code}>
                        {sup.name} ({sup.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-rider-phone" className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                  <input
                    id="edit-rider-phone"
                    name="edit-rider-phone"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRider(null);
                      setFormData({ code: '', name: '', region: '', supervisorCode: '', phone: '', status: 'نشط' });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

