/**
 * Riders API - Read from Google Sheets
 * Server-side compatible, client can cache in IndexedDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getSupervisorRiders, getLatestRiderData } from '@/lib/dataService';
import { getSupervisorPerformanceFiltered } from '@/lib/dataFilter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const dateParam = searchParams.get('date'); // Backward compatibility

    // Get riders from Google Sheets (filtered by supervisor if supervisor)
    const supervisorId = decoded.role === 'supervisor' ? decoded.code : undefined;
    // Check if refresh is requested (bypass cache)
    const refresh = searchParams.get('refresh') === 'true';
    const riders = await getSupervisorRiders(supervisorId || '', !refresh);

    // If date range is provided, get data for that range
    if (startDateParam && endDateParam) {
      // Parse dates properly - handle timezone issues
      const startDate = new Date(startDateParam + 'T00:00:00');
      const endDate = new Date(endDateParam + 'T23:59:59');
      
      console.log(`[Riders API] ========================================`);
      console.log(`[Riders API] Date range requested: ${startDateParam} to ${endDateParam}`);
      console.log(`[Riders API] Parsed dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`[Riders API] Supervisor: ${decoded.code}, Assigned riders: ${riders.length}`);
      console.log(`[Riders API] Rider codes: ${riders.map(r => r.code).join(', ')}`);

      // Get performance data for the selected date range
      const performanceData = await getSupervisorPerformanceFiltered(
        decoded.code,
        startDate,
        endDate
      );

      console.log(`[Riders API] Performance data found: ${performanceData.length} records`);
      
      // Debug: Log sample performance data
      if (performanceData.length > 0) {
        console.log(`[Riders API] Sample performance records:`, performanceData.slice(0, 3).map(p => ({
          date: p.date,
          riderCode: p.riderCode,
          orders: p.orders,
          hours: p.hours
        })));
      } else {
        console.log(`[Riders API] ⚠️ No performance data found for the date range!`);
      }

      // Group by rider code and aggregate data
      const riderDataMap = new Map<string, any>();
      
      // Initialize all riders (even if no performance data)
      riders.forEach((rider) => {
        riderDataMap.set(rider.code, {
          code: rider.code,
          name: rider.name,
          region: rider.region,
          hours: 0,
          break: 0,
          delay: 0,
          absenceCount: 0, // Count of absent days
          absenceDays: 0, // Total days with data
          orders: 0,
          acceptanceSum: 0, // Sum of acceptance rates
          acceptanceCount: 0, // Count of records with acceptance
          debt: 0,
          date: startDateParam === endDateParam ? startDateParam : `${startDateParam} - ${endDateParam}`,
        });
      });

      // Aggregate performance data by rider
      let recordsProcessed = 0;
      performanceData.forEach((record) => {
        const riderData = riderDataMap.get(record.riderCode);
        if (riderData) {
          recordsProcessed++;
          riderData.hours += record.hours || 0;
          riderData.break += record.break || 0;
          riderData.delay += record.delay || 0;
          riderData.orders += record.orders || 0;
          riderData.debt += record.debt || 0;
          riderData.absenceDays++;
          
          // Count absences - handle various formats
          const absenceRaw = record.absence?.toString().trim() || 'لا';
          if (absenceRaw === 'نعم' || absenceRaw === '1' || absenceRaw === 'yes' || absenceRaw.toLowerCase() === 'yes') {
            riderData.absenceCount++;
          }
          
          // Sum acceptance rates for averaging later
          const acceptanceStr = record.acceptance?.toString() || '0';
          let acceptanceNum = parseFloat(acceptanceStr.replace('%', '').replace('٪', '')) || 0;
          // If acceptance is between 0 and 1, it's likely a decimal (0.01 = 1%), so multiply by 100
          if (acceptanceNum > 0 && acceptanceNum <= 1) {
            acceptanceNum = acceptanceNum * 100;
          }
          if (acceptanceNum > 0) {
            riderData.acceptanceSum += acceptanceNum;
            riderData.acceptanceCount++;
          }
        }
      });

      // Calculate final values
      riderDataMap.forEach((riderData) => {
        // Calculate average acceptance rate
        riderData.acceptance = riderData.acceptanceCount > 0 
          ? riderData.acceptanceSum / riderData.acceptanceCount 
          : 0;
        
        // Set absence text
        riderData.absence = riderData.absenceCount > 0 ? 'نعم' : 'لا';
        
        // Clean up temporary fields
        delete riderData.acceptanceSum;
        delete riderData.acceptanceCount;
        delete riderData.absenceCount;
        delete riderData.absenceDays;
      });

      console.log(`[Riders API] Records processed: ${recordsProcessed}, Riders with data: ${Array.from(riderDataMap.values()).filter(r => r.orders > 0 || r.hours > 0).length}`);

      const ridersWithData = Array.from(riderDataMap.values());
      
      // Always return riders, even if no performance data (so supervisor can see their assigned riders)
      return NextResponse.json({
        success: true,
        data: ridersWithData,
      });
    }

    // Backward compatibility: If single date is provided
    if (dateParam) {
      const selectedDate = new Date(dateParam);
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      // Get performance data for the selected date
      const performanceData = await getSupervisorPerformanceFiltered(
        decoded.code,
        startDate,
        endDate
      );

      // Group by rider code
      const riderDataMap = new Map<string, any>();
      riders.forEach((rider) => {
        riderDataMap.set(rider.code, {
          code: rider.code,
          name: rider.name,
          region: rider.region,
          hours: 0,
          break: 0,
          delay: 0,
          absence: 'لا',
          orders: 0,
          acceptance: 0,
          debt: 0,
          date: dateParam,
        });
      });

      // Aggregate performance data by rider
      performanceData.forEach((record) => {
        const riderData = riderDataMap.get(record.riderCode);
        if (riderData) {
          riderData.hours += record.hours || 0;
          riderData.break += record.break || 0;
          riderData.delay += record.delay || 0;
          riderData.orders += record.orders || 0;
          riderData.debt += record.debt || 0;
          if (record.absence === 'نعم') {
            riderData.absence = 'نعم';
          }
          // Calculate average acceptance rate
          const acceptanceNum = parseFloat(record.acceptance?.toString().replace('%', '') || '0');
          if (acceptanceNum > 0) {
            riderData.acceptance = acceptanceNum;
          }
        }
      });

      const ridersWithData = Array.from(riderDataMap.values());
      return NextResponse.json({
        success: true,
        data: ridersWithData,
      });
    }

    // Get latest performance data for each rider (no date filter)
    const ridersWithData = await Promise.all(
      riders.map(async (rider) => {
        const latestData = await getLatestRiderData(rider.code);
        return {
          code: rider.code,
          name: rider.name,
          region: rider.region,
          hours: latestData?.hours || 0,
          break: latestData?.break || 0,
          delay: latestData?.delay || 0,
          absence: latestData?.absence || 'لا',
          orders: latestData?.orders || 0,
          acceptance: latestData?.acceptance || 0,
          debt: latestData?.debt || 0,
          date: latestData?.date || null, // Include date for display
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: ridersWithData,
    });
  } catch (error: any) {
    console.error('Get riders error:', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ' }, { status: 500 });
  }
}
