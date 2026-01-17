/**
 * Upload API - Write-First Architecture
 * Processes Excel files and writes to Google Sheets FIRST
 * Client-side can cache in IndexedDB for performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { readExcelFromBuffer } from '@/lib/excelProcessorServer';
import { processRidersExcel, processPerformanceExcel } from '@/lib/excelProcessor';
import { bulkAddRiders, getAllRiders } from '@/lib/adminService';
import { appendToSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for large file processing

export async function POST(request: NextRequest) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization');
    console.log('[Upload API] Authorization header:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      console.error('[Upload API] ❌ No token provided');
      return NextResponse.json({ 
        success: false, 
        error: 'غير مصرح - لم يتم توفير رمز المصادقة. يرجى تسجيل الدخول مرة أخرى.' 
      }, { status: 401 });
    }

    console.log('[Upload API] Token received, length:', token.length);
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.error('[Upload API] ❌ Token verification failed - invalid or expired token');
      return NextResponse.json({ 
        success: false, 
        error: 'غير مصرح - رمز المصادقة غير صحيح أو منتهي الصلاحية. يرجى تسجيل الدخول مرة أخرى.' 
      }, { status: 401 });
    }

    console.log('[Upload API] Token decoded:', { code: decoded.code, role: decoded.role, name: decoded.name });

    if (decoded.role !== 'admin') {
      console.error('[Upload API] ❌ Access denied - user role is not admin:', decoded.role);
      return NextResponse.json({ 
        success: false, 
        error: 'غير مصرح - يجب أن تكون مسجلاً كمدير للوصول إلى هذه الصفحة.' 
      }, { status: 401 });
    }

    // Support both JSON (new method) and FormData (legacy)
    const contentType = request.headers.get('content-type') || '';
    let rawData: any[][];
    let type: string;
    let adminSelectedDate: string | undefined;

    if (contentType.includes('application/json')) {
      // New method: JSON data (processed on client-side)
      const body = await request.json();
      type = body.type;
      rawData = body.data;
      adminSelectedDate = body.performanceDate;
      
      if (!type) {
        return NextResponse.json({ success: false, error: 'نوع الملف مطلوب' }, { status: 400 });
      }

      if (!rawData || !Array.isArray(rawData)) {
        return NextResponse.json({ success: false, error: 'بيانات غير صحيحة' }, { status: 400 });
      }

      console.log('[Upload API] Received JSON data:', { type, rows: rawData.length, hasDate: !!adminSelectedDate });
    } else {
      // Legacy method: FormData with file
      const formData = await request.formData();
      const file = formData.get('file') as File;
      type = formData.get('type') as string;
      adminSelectedDate = formData.get('performanceDate')?.toString();

      if (!file) {
        return NextResponse.json({ success: false, error: 'لم يتم اختيار ملف' }, { status: 400 });
      }

      if (!type) {
        return NextResponse.json({ success: false, error: 'نوع الملف مطلوب' }, { status: 400 });
      }

      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      rawData = await readExcelFromBuffer(arrayBuffer);
    }

    if (type === 'riders') {
      // Step 1: Process Excel
      const processed = processRidersExcel(rawData);

      if (!processed.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'أخطاء في معالجة الملف',
            errors: processed.errors,
            warnings: processed.warnings,
          },
          { status: 400 }
        );
      }

      // Step 2: Check for duplicates
      // Note: bulkAddRiders will handle updates for unassigned riders automatically
      // We only check for actual conflicts (riders assigned to different supervisors)
      const existingRiders = await getAllRiders();
      const { checkDuplicateRiders } = await import('@/lib/excelProcessor');
      const duplicateCheck = await checkDuplicateRiders(processed.data, existingRiders);

      // Only fail if there are actual conflicts (not just existing riders without supervisor)
      if (duplicateCheck.duplicates.length > 0 || duplicateCheck.conflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: duplicateCheck.conflicts.length > 0 ? 'تم العثور على تعيينات متضاربة' : 'تم العثور على تكرارات في الملف',
            errors: [...duplicateCheck.duplicates, ...duplicateCheck.conflicts],
            warnings: processed.warnings,
          },
          { status: 400 }
        );
      }

      // Step 3: Write to Google Sheets FIRST
      const ridersToAdd = processed.data.map((r) => ({
        code: r.riderCode,
        name: r.riderName,
        region: r.region,
        supervisorCode: r.supervisorCode,
      }));

      const result = await bulkAddRiders(ridersToAdd);

      // Log detailed results
      console.log('[Upload] BulkAdd result:', {
        added: result.added,
        failed: result.failed,
        errorsCount: result.errors?.length || 0,
        firstErrors: result.errors?.slice(0, 3) || [],
      });

      // Check if there were errors
      if (result.errors && result.errors.length > 0) {
        console.log('[Upload] BulkAdd errors:', result.errors.slice(0, 10));
      }

      return NextResponse.json({
        success: result.failed === 0 || result.added > 0, // Success if no failures OR some were added
        message: result.added > 0 
          ? `تم تعيين ${result.added} مندوب بنجاح${result.failed > 0 ? ` (فشل ${result.failed})` : ''}` 
          : (result.errors.length > 0 
              ? 'لم تتم إضافة أي مندوب - تحقق من الأخطاء' 
              : 'جميع المناديب موجودون بالفعل'),
        added: result.added || 0,
        failed: result.failed || 0,
        total: processed.data.length,
        warnings: processed.warnings,
        errors: result.errors?.slice(0, 20) || [], // Show first 20 errors
      });
    } else if (type === 'performance') {
      // Step 1: Process Excel
      const processed = processPerformanceExcel(rawData);

      if (!processed.success) {
        console.error('[Upload] Performance file processing failed:', processed.errors);
        return NextResponse.json(
          {
            success: false,
            error: processed.errors.length > 0 
              ? `أخطاء في معالجة الملف: ${processed.errors.slice(0, 3).join(', ')}${processed.errors.length > 3 ? '...' : ''}`
              : 'أخطاء في معالجة الملف',
            errors: processed.errors,
            warnings: processed.warnings,
          },
          { status: 400 }
        );
      }

      if (processed.data.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'لم يتم العثور على بيانات صحيحة في الملف. تأكد من أن الملف يحتوي على بيانات وأن التاريخ في العمود الأول',
            warnings: processed.warnings,
          },
          { status: 400 }
        );
      }

      // Step 2: Write to Google Sheets FIRST
      // Use admin-selected date if provided, otherwise use date from file
      const performanceData = processed.data.map((p) => {
        // Use admin-selected date if provided, otherwise use date from file
        const dateStr = adminSelectedDate || p.date;
        
        console.log(`[Upload] Processing row: adminDate=${adminSelectedDate || 'none'}, fileDate=${p.date}, using=${dateStr}, riderCode=${p.riderCode}`);
        
        return [
          dateStr, // Date in YYYY-MM-DD format
          p.riderCode,
          p.hours,
          p.break,
          p.delay,
          p.absence,
          p.orders,
          p.acceptance,
          p.debt,
        ];
      });

      console.log(`[Upload] Writing ${performanceData.length} rows to Google Sheets`);
      console.log(`[Upload] Sample first 3 rows:`, performanceData.slice(0, 3));
      console.log(`[Upload] Sample last row:`, performanceData[performanceData.length - 1]);
      
      // Log unique dates being uploaded
      const uploadedDates = new Set(performanceData.map(row => row[0]));
      console.log(`[Upload] Unique dates being uploaded: ${Array.from(uploadedDates).join(', ')}`);

      await appendToSheet('البيانات اليومية', performanceData);

      // Clear cache and notify supervisors
      const { invalidateSupervisorCaches, notifySupervisorsOfChange } = await import('@/lib/realtimeSync');
      invalidateSupervisorCaches(); // Clear all caches to force refresh
      notifySupervisorsOfChange('performance');

      return NextResponse.json({
        success: true,
        message: 'تم رفع بيانات الأداء بنجاح',
        rows: performanceData.length,
        warnings: processed.warnings,
      });
    }

    return NextResponse.json({ success: false, error: 'نوع الملف غير مدعوم' }, { status: 400 });
  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Handle specific errors
    if (error.message?.includes('413') || error.message?.includes('Payload Too Large') || error.message?.includes('body size')) {
      return NextResponse.json({ 
        success: false, 
        error: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 4 MB. يرجى تقليل حجم الملف أو تقسيمه إلى ملفات أصغر.' 
      }, { status: 413 });
    }
    
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ' }, { status: 500 });
  }
}

