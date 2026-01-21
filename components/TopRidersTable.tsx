'use client';

interface TopRider {
  name: string;
  orders: number;
  hours: number;
  acceptance: number;
}

export default function TopRidersTable({ topRiders }: { topRiders: TopRider[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">أفضل المناديب</h3>
      {topRiders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الاسم</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الطلبات</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">الساعات</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">نسبة القبول</th>
              </tr>
            </thead>
            <tbody>
              {topRiders.map((rider, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-800">{rider.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{rider.orders}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{rider.hours.toFixed(1)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{rider.acceptance.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">لا توجد بيانات متاحة</div>
      )}
    </div>
  );
}

