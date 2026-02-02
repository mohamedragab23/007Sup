/**
 * لوحة أداء المشرفين للمدير
 * يعرض أداء كل مشرف بناءً على أداء مناديبه خلال الفترة المحددة
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAllSupervisors } from '@/lib/adminService';
import { getSupervisorRiders } from '@/lib/dataService';
import { getSupervisorPerformanceFiltered } from '@/lib/dataFilter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('start_date');
    const endDateStr = searchParams.get('end_date');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { success: false, error: 'المطلوب: start_date و end_date (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T23:59:59');
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ success: false, error: 'تاريخ غير صحيح' }, { status: 400 });
    }
    if (startDate > endDate) {
      return NextResponse.json({ success: false, error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' }, { status: 400 });
    }

    const supervisors = await getAllSupervisors(false);
    const results: Array<{
      code: string;
      name: string;
      region: string;
      subordinate_count: number;
      total_orders: number;
      total_hours: number;
      avg_acceptance: number;
      records_count: number;
      orders_per_rider: number;
    }> = [];

    let grandTotalOrders = 0;
    let grandTotalHours = 0;
    let grandAcceptanceSum = 0;
    let grandAcceptanceCount = 0;

    for (const sup of supervisors) {
      const riders = await getSupervisorRiders(sup.code, false);
      const performance = await getSupervisorPerformanceFiltered(sup.code, startDate, endDate);

      let totalOrders = 0;
      let totalHours = 0;
      let acceptanceSum = 0;
      let acceptanceCount = 0;

      for (const record of performance) {
        totalOrders += record.orders || 0;
        totalHours += record.hours || 0;
        const acc = typeof record.acceptance === 'string'
          ? parseFloat(String(record.acceptance).replace('%', '')) || 0
          : Number(record.acceptance) || 0;
        acceptanceSum += acc;
        acceptanceCount += 1;
      }

      grandTotalOrders += totalOrders;
      grandTotalHours += totalHours;
      grandAcceptanceSum += acceptanceSum;
      grandAcceptanceCount += acceptanceCount;

      const avgAcceptance = acceptanceCount > 0 ? Math.round((acceptanceSum / acceptanceCount) * 100) / 100 : 0;
      const ordersPerRider = riders.length > 0 ? Math.round((totalOrders / riders.length) * 100) / 100 : 0;

      results.push({
        code: sup.code,
        name: sup.name || sup.code,
        region: sup.region || '',
        subordinate_count: riders.length,
        total_orders: totalOrders,
        total_hours: Math.round(totalHours * 100) / 100,
        avg_acceptance: avgAcceptance,
        records_count: performance.length,
        orders_per_rider: ordersPerRider,
      });
    }

    const grandAvgAcceptance = grandAcceptanceCount > 0
      ? Math.round((grandAcceptanceSum / grandAcceptanceCount) * 100) / 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        start_date: startDateStr,
        end_date: endDateStr,
        summary: {
          total_supervisors: results.length,
          total_orders: grandTotalOrders,
          total_hours: Math.round(grandTotalHours * 100) / 100,
          avg_acceptance: grandAvgAcceptance,
          total_records: results.reduce((s, r) => s + r.records_count, 0),
        },
        supervisors: results,
      },
    });
  } catch (error: any) {
    console.error('[Supervisor Performance API]', error);
    return NextResponse.json({ success: false, error: error?.message || 'حدث خطأ' }, { status: 500 });
  }
}
