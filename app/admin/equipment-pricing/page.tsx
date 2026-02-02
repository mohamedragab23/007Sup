'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface EquipmentPricing {
  motorcycleBox: number;
  bicycleBox: number;
  tshirt: number;
  jacket: number;
  helmet: number;
}

const defaultPricing: EquipmentPricing = {
  motorcycleBox: 550,
  bicycleBox: 550,
  tshirt: 100,
  jacket: 200,
  helmet: 150,
};

export default function EquipmentPricingPage() {
  const [pricing, setPricing] = useState<EquipmentPricing>(defaultPricing);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagerReadOnly, setIsManagerReadOnly] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setIsManagerReadOnly(user?.role === 'admin'); // المدير = admin، الأسعار للقراءة فقط
      }
    } catch (_) {}
  }, []);

  // Fetch existing pricing
  const { data: existingPricing, isLoading } = useQuery({
    queryKey: ['equipment-pricing'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/equipment-pricing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : defaultPricing;
    },
  });

  useEffect(() => {
    if (existingPricing) {
      setPricing(existingPricing);
    }
  }, [existingPricing]);

  // Save pricing
  const saveMutation = useMutation({
    mutationFn: async (newPricing: EquipmentPricing) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/equipment-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPricing),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['equipment-pricing'] });
        alert('✅ تم حفظ أسعار المعدات بنجاح');
      } else {
        alert('❌ فشل حفظ الأسعار: ' + data.error);
      }
    },
    onError: (error) => {
      alert('❌ حدث خطأ: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isManagerReadOnly) return; // منع أي حفظ من واجهة المدير
    saveMutation.mutate(pricing);
  };

  // Calculate example
  const exampleCalculation = {
    motorcycleBoxes: 1,
    bicycleBoxes: 0,
    tshirts: 2,
    jackets: 1,
    helmets: 0,
  };
  
  const exampleTotal = 
    (exampleCalculation.motorcycleBoxes * pricing.motorcycleBox) +
    (exampleCalculation.bicycleBoxes * pricing.bicycleBox) +
    (exampleCalculation.tshirts * pricing.tshirt) +
    (exampleCalculation.jackets * pricing.jacket) +
    (exampleCalculation.helmets * pricing.helmet);

  if (isLoading) {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">أسعار المعدات</h1>
          <p className="text-gray-600">تحديد أسعار المعدات لحساب الخصومات تلقائياً</p>
        </div>

        {isManagerReadOnly && (
          <div className="rounded-xl p-4 bg-blue-50 border border-blue-200 flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <p className="text-blue-800 text-sm">
              الأسعار محددة من قبل الإدارة العليا ولا يمكن تعديلها من هنا. الحقول للقراءة فقط.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Motorcycle Box */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏍️</span>
                <div>
                  <label className="block text-sm font-medium text-gray-700">صندوق دراجة نارية</label>
                  <p className="text-xs text-gray-500">Motorcycle Box</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={pricing.motorcycleBox}
                  onChange={(e) => !isManagerReadOnly && setPricing({ ...pricing, motorcycleBox: parseFloat(e.target.value) || 0 })}
                  readOnly={isManagerReadOnly}
                  disabled={isManagerReadOnly}
                  className={`w-full px-4 py-2 border rounded-lg text-lg font-semibold ${isManagerReadOnly ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed readonly-price' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'}`}
                  min="0"
                  step="0.01"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ج.م</span>
              </div>
            </div>

            {/* Bicycle Box */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🚲</span>
                <div>
                  <label className="block text-sm font-medium text-gray-700">صندوق دراجة هوائية</label>
                  <p className="text-xs text-gray-500">Bicycle Box</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={pricing.bicycleBox}
                  onChange={(e) => !isManagerReadOnly && setPricing({ ...pricing, bicycleBox: parseFloat(e.target.value) || 0 })}
                  readOnly={isManagerReadOnly}
                  disabled={isManagerReadOnly}
                  className={`w-full px-4 py-2 border rounded-lg text-lg font-semibold ${isManagerReadOnly ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed readonly-price' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'}`}
                  min="0"
                  step="0.01"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ج.م</span>
              </div>
            </div>

            {/* T-shirt */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">👕</span>
                <div>
                  <label className="block text-sm font-medium text-gray-700">تيشرت</label>
                  <p className="text-xs text-gray-500">T-shirt</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={pricing.tshirt}
                  onChange={(e) => !isManagerReadOnly && setPricing({ ...pricing, tshirt: parseFloat(e.target.value) || 0 })}
                  readOnly={isManagerReadOnly}
                  disabled={isManagerReadOnly}
                  className={`w-full px-4 py-2 border rounded-lg text-lg font-semibold ${isManagerReadOnly ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed readonly-price' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'}`}
                  min="0"
                  step="0.01"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ج.م</span>
              </div>
            </div>

            {/* Jacket */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🧥</span>
                <div>
                  <label className="block text-sm font-medium text-gray-700">جاكت</label>
                  <p className="text-xs text-gray-500">Jacket</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={pricing.jacket}
                  onChange={(e) => !isManagerReadOnly && setPricing({ ...pricing, jacket: parseFloat(e.target.value) || 0 })}
                  readOnly={isManagerReadOnly}
                  disabled={isManagerReadOnly}
                  className={`w-full px-4 py-2 border rounded-lg text-lg font-semibold ${isManagerReadOnly ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed readonly-price' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'}`}
                  min="0"
                  step="0.01"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ج.م</span>
              </div>
            </div>

            {/* Helmet */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">⛑️</span>
                <div>
                  <label className="block text-sm font-medium text-gray-700">خوذة</label>
                  <p className="text-xs text-gray-500">Helmet</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={pricing.helmet}
                  onChange={(e) => !isManagerReadOnly && setPricing({ ...pricing, helmet: parseFloat(e.target.value) || 0 })}
                  readOnly={isManagerReadOnly}
                  disabled={isManagerReadOnly}
                  className={`w-full px-4 py-2 border rounded-lg text-lg font-semibold ${isManagerReadOnly ? 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed readonly-price' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'}`}
                  min="0"
                  step="0.01"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ج.م</span>
              </div>
            </div>
          </div>

          {/* Submit Button - مخفي للمدير (قراءة فقط) */}
          {!isManagerReadOnly && (
            <div className="pt-4">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ الأسعار'}
              </button>
            </div>
          )}
        </form>

        {/* Example Calculation */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-bold text-green-800 mb-4 text-lg">📊 مثال على حساب تكلفة المعدات</h3>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">للمشرف MHL-001:</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2">المعدة</th>
                  <th className="text-center py-2">الكمية</th>
                  <th className="text-center py-2">السعر</th>
                  <th className="text-left py-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">🏍️ صندوق دراجة نارية</td>
                  <td className="text-center">{exampleCalculation.motorcycleBoxes}</td>
                  <td className="text-center">{pricing.motorcycleBox} ج.م</td>
                  <td className="text-left font-semibold">{exampleCalculation.motorcycleBoxes * pricing.motorcycleBox} ج.م</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">👕 تيشرت</td>
                  <td className="text-center">{exampleCalculation.tshirts}</td>
                  <td className="text-center">{pricing.tshirt} ج.م</td>
                  <td className="text-left font-semibold">{exampleCalculation.tshirts * pricing.tshirt} ج.م</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">🧥 جاكت</td>
                  <td className="text-center">{exampleCalculation.jackets}</td>
                  <td className="text-center">{pricing.jacket} ج.م</td>
                  <td className="text-left font-semibold">{exampleCalculation.jackets * pricing.jacket} ج.م</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-green-100">
                  <td colSpan={3} className="py-3 font-bold text-green-800">إجمالي تكلفة المعدات:</td>
                  <td className="text-left py-3 font-bold text-green-800 text-lg">{exampleTotal} ج.م</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-sm text-green-700">
            <strong>المعادلة:</strong> (صناديق نارية × {pricing.motorcycleBox}) + (صناديق هوائية × {pricing.bicycleBox}) + (تيشرتات × {pricing.tshirt}) + (جواكيت × {pricing.jacket}) + (خوذ × {pricing.helmet})
          </p>
        </div>

        {/* Google Sheets Structure Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-800 mb-4 text-lg">📋 هيكل شيت المعدات في Google Sheets</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-blue-300 px-3 py-2 text-right">كود المشرف</th>
                  <th className="border border-blue-300 px-3 py-2 text-right">الشهر</th>
                  <th className="border border-blue-300 px-3 py-2 text-right">صناديق نارية</th>
                  <th className="border border-blue-300 px-3 py-2 text-right">صناديق هوائية</th>
                  <th className="border border-blue-300 px-3 py-2 text-right">تيشرتات</th>
                  <th className="border border-blue-300 px-3 py-2 text-right">جواكيت</th>
                  <th className="border border-blue-300 px-3 py-2 text-right">خوذ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-blue-300 px-3 py-2">MHL-001</td>
                  <td className="border border-blue-300 px-3 py-2">2025-11-27</td>
                  <td className="border border-blue-300 px-3 py-2">1</td>
                  <td className="border border-blue-300 px-3 py-2">0</td>
                  <td className="border border-blue-300 px-3 py-2">2</td>
                  <td className="border border-blue-300 px-3 py-2">1</td>
                  <td className="border border-blue-300 px-3 py-2">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-blue-700 mt-3">
            <strong>ملاحظة:</strong> يتم فلترة البيانات بناءً على عمود "الشهر" (Column B) لضمان عرض بيانات الشهر المحدد فقط.
          </p>
        </div>
      </div>
    </Layout>
  );
}

