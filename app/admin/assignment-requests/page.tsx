'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AssignmentRequest {
  id: number;
  supervisorCode: string;
  supervisorName: string;
  riderCode: string;
  riderName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  approvalDate: string;
  approvedBy: string;
}

export default function AssignmentRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const queryClient = useQueryClient();

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['assignment-requests', statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const url = new URL('/api/assignment-requests', window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter);
      }
      
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? (data.data as AssignmentRequest[]) : [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/assignment-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          requestId, 
          action: 'approve',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل الموافقة');
      return data;
    },
    onSuccess: async () => {
      // Clear all caches first
      queryClient.removeQueries({ queryKey: ['assignment-requests'] });
      queryClient.removeQueries({ queryKey: ['admin', 'riders'] });
      queryClient.removeQueries({ queryKey: ['riders'] });
      queryClient.removeQueries({ queryKey: ['supervisor-riders'] });
      
      // Invalidate admin dashboard queries to update pending counts
      queryClient.invalidateQueries({ queryKey: ['assignment-requests', 'pending'] });
      
      // Wait a bit for Google Sheets to update, then refetch with refresh=true
      setTimeout(async () => {
        // Refetch with refresh=true to bypass cache
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['assignment-requests'] }),
          queryClient.refetchQueries({ queryKey: ['admin', 'riders'] }),
        ]);
        
        // Also invalidate supervisor riders queries
        queryClient.invalidateQueries({ queryKey: ['riders'] });
        queryClient.invalidateQueries({ queryKey: ['supervisor-riders'] });
      }, 1500);
      
      alert('✅ تمت الموافقة على الطلب بنجاح. سيتم تعيين المندوب للمشرف تلقائياً.');
    },
    onError: (error: any) => {
      alert(`❌ خطأ: ${error.message || 'فشل الموافقة على الطلب'}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/assignment-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, action: 'reject' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل الرفض');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-requests', 'pending'] });
      alert('✅ تم رفض الطلب');
    },
    onError: (error: any) => {
      alert(`❌ خطأ: ${error.message || 'فشل رفض الطلب'}`);
    },
  });

  const pendingRequests = requests?.filter((r) => r.status === 'pending') || [];
  const approvedRequests = requests?.filter((r) => r.status === 'approved') || [];
  const rejectedRequests = requests?.filter((r) => r.status === 'rejected') || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">طلبات التعيين</h1>
          <p className="text-gray-600">إدارة طلبات تعيين المناديب للمشرفين</p>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل ({requests?.length || 0})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              قيد الانتظار ({pendingRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الموافق عليها ({approvedRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              المرفوضة ({rejectedRequests.length})
            </button>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">المشرف</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">المندوب</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">تاريخ الطلب</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">الحالة</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm">
                        <div>
                          <p className="font-medium text-gray-800">{request.supervisorName}</p>
                          <p className="text-xs text-gray-500">{request.supervisorCode}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <div>
                          <p className="font-medium text-gray-800">{request.riderName}</p>
                          <p className="text-xs text-gray-500">{request.riderCode}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {request.requestDate
                          ? new Date(request.requestDate).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : request.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {request.status === 'pending'
                            ? 'قيد الانتظار'
                            : request.status === 'approved'
                            ? 'موافق عليها'
                            : 'مرفوضة'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من الموافقة على تعيين المندوب "${request.riderName}" للمشرف "${request.supervisorName}"؟`)) {
                                  approveMutation.mutate(request.id);
                                }
                              }}
                              disabled={approveMutation.isPending}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50"
                            >
                              {approveMutation.isPending ? 'جاري...' : 'موافقة'}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('هل أنت متأكد من رفض طلب التعيين؟')) {
                                  rejectMutation.mutate(request.id);
                                }
                              }}
                              disabled={rejectMutation.isPending}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium disabled:opacity-50"
                            >
                              {rejectMutation.isPending ? 'جاري...' : 'رفض'}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            {request.approvalDate && (
                              <p>
                                {new Date(request.approvalDate).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            )}
                            {request.approvedBy && <p className="mt-1">بواسطة: {request.approvedBy}</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
            <p className="text-gray-500 text-lg">لا توجد طلبات تعيين</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

