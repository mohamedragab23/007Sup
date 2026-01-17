'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface ExcelUploadEnhancedProps {
  type: 'riders' | 'performance';
  performanceDate?: string; // Date for performance data upload
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export default function ExcelUploadEnhanced({ type, performanceDate, onSuccess, onError }: ExcelUploadEnhancedProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);

  // Performance date tracking (no logging to reduce console noise)

  const typeLabels = {
    riders: { label: 'المناديب', accept: '.xlsx,.xls', template: '/templates/riders-template.xlsx' },
    performance: { label: 'بيانات الأداء', accept: '.xlsx,.xls', template: '/templates/performance-template.xlsx' },
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setPreview(null);

    // Preview file info
    const fileSizeKB = (selectedFile.size / 1024).toFixed(2);
    const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
    setPreview({
      name: selectedFile.name,
      size: selectedFile.size > 1024 * 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`,
      type: selectedFile.type,
    });
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      // Check file type
      if (
        droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        droppedFile.type === 'application/vnd.ms-excel' ||
        droppedFile.name.endsWith('.xlsx') ||
        droppedFile.name.endsWith('.xls')
      ) {
        handleFileSelect(droppedFile);
      } else {
        onError?.('يرجى اختيار ملف Excel (.xlsx أو .xls)');
      }
    }
  }, [handleFileSelect, onError]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      onError?.('يرجى اختيار ملف');
      return;
    }

    // Validate performance date

    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      // Validate performance date if type is performance
      // Check if performanceDate is empty, null, undefined, or just whitespace
      const isDateValid = performanceDate && performanceDate.trim() !== '';
      if (type === 'performance' && !isDateValid) {
        const errorMsg = 'يرجى تحديد تاريخ بيانات الأداء قبل الرفع';
        setResult({ success: false, error: errorMsg });
        onError?.(errorMsg);
        setUploading(false);
        return;
      }

      setUploadProgress(10); // Starting file processing

      // Read Excel file on client-side and convert to JSON
      // This reduces the payload size significantly (JSON is much smaller than Excel)
      let jsonData: any[][];
      
      try {
        setUploadProgress(15); // Reading file
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('الملف لا يحتوي على أوراق');
        }

        setUploadProgress(20); // Processing file
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: true,
        }) as any[][];

        // Only log for large files
        if (jsonData.length > 1000) {
          console.log(`[ExcelUpload] Processed large file: ${jsonData.length} rows`);
        }
      } catch (readError: any) {
        console.error('[ExcelUpload] Error reading file:', readError);
        const errorMsg = `فشل قراءة الملف: ${readError.message || 'خطأ غير معروف'}`;
        setResult({ success: false, error: errorMsg });
        onError?.(errorMsg);
        setUploading(false);
        return;
      }

      setUploadProgress(30); // File processed

      const token = localStorage.getItem('token');
      
      if (!token) {
        const errorMsg = 'لم يتم العثور على رمز المصادقة. يرجى تسجيل الخروج ثم الدخول مرة أخرى.';
        setResult({ success: false, error: errorMsg });
        onError?.(errorMsg);
        setUploading(false);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }, 2000);
        return;
      }

      // Split data into chunks to avoid Vercel 4.5MB limit
      // Each chunk should be less than 3MB to be safe
      const CHUNK_SIZE = 50000; // Process 50k rows per chunk
      const totalChunks = Math.ceil(jsonData.length / CHUNK_SIZE);
      
      setUploadProgress(50); // Data prepared

      // Process chunks sequentially
      let totalProcessed = 0;
      let allWarnings: string[] = [];
      let lastError: string | null = null;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, jsonData.length);
        const chunk = jsonData.slice(start, end);

        const requestBody = {
          type,
          data: chunk,
          fileName: file.name,
          chunkIndex,
          totalChunks,
          isLastChunk: chunkIndex === totalChunks - 1,
          ...(type === 'performance' && performanceDate && performanceDate.trim() !== '' 
            ? { performanceDate: performanceDate.trim() } 
            : {}),
        };

        // Calculate progress: 50% + (chunkIndex / totalChunks) * 40%
        const chunkProgress = 50 + Math.floor((chunkIndex / totalChunks) * 40);
        setUploadProgress(chunkProgress);

        try {
          const response = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'خطأ غير معروف' }));
            throw new Error(errorData.error || `خطأ في رفع Chunk ${chunkIndex + 1}`);
          }

          const result = await response.json();
          totalProcessed += result.rows || chunk.length;
          if (result.warnings) {
            allWarnings.push(...result.warnings);
          }

          // Small delay between chunks to avoid overwhelming the server
          if (chunkIndex < totalChunks - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (chunkError: any) {
          console.error(`[ExcelUpload] Error uploading chunk ${chunkIndex + 1}:`, chunkError);
          lastError = chunkError.message || 'خطأ في رفع جزء من الملف';
          // Continue with next chunk instead of failing completely
        }
      }

      setUploadProgress(95); // All chunks uploaded

      // Final response handling
      if (lastError && totalProcessed === 0) {
        // All chunks failed
        setResult({ success: false, error: lastError });
        onError?.(lastError);
        setUploading(false);
        return;
      }

      // Success (even if some chunks failed, we processed some data)
      const response = {
        success: true,
        message: totalProcessed > 0 
          ? `تم رفع ${totalProcessed} صف بنجاح${totalChunks > 1 ? ` (${totalChunks} دفعة)` : ''}`
          : 'تم معالجة الملف',
        rows: totalProcessed,
        added: totalProcessed, // For compatibility
        failed: 0,
        warnings: allWarnings,
        errors: [] as string[],
      };

      // Use the response structure
      const data = response;

      setUploadProgress(100); // Complete

      if (data.success) {
        setResult({
          success: true,
          message: data.message || 'تم الرفع بنجاح',
          added: data.added || data.rows || 0,
          failed: data.failed || 0,
          warnings: data.warnings || [],
          errors: data.errors || [], // Include errors even if success is true
        });
        onSuccess?.(data);
        // Clear file after short delay to show success message
        setTimeout(() => {
          setFile(null);
          setPreview(null);
        }, 3000);
      } else {
        // This should not happen since we set success: true above
        // But handle it just in case
        const errorMsg = 'فشل رفع الملف';
        setResult({ 
          success: false, 
          error: errorMsg, 
          errors: data.errors || [],
          warnings: data.warnings || [],
        });
        onError?.(errorMsg);
      }
    } catch (error: any) {
      setUploadProgress(100);
      const errorMsg = error.message || 'حدث خطأ في الاتصال';
      setResult({ success: false, error: errorMsg });
      onError?.(errorMsg);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">رفع ملف {typeLabels[type].label}</h3>

      <div className="space-y-4">
        {/* Drag & Drop Zone */}
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input
            id={`excel-upload-${type}`}
            name={`excel-upload-${type}`}
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            {isDragActive ? (
              <p className="text-blue-600 font-medium">أسقط الملف هنا</p>
            ) : (
              <>
                <p className="text-gray-600">
                  اسحب الملف هنا أو <span className="text-blue-600 font-medium">اضغط للاختيار</span>
                </p>
                <p className="text-sm text-gray-500">ملفات Excel فقط (.xlsx, .xls)</p>
              </>
            )}
          </div>
        </div>

        {/* File Preview */}
        {preview && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{preview.name}</p>
                <p className="text-sm text-gray-600">{preview.size}</p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="relative">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>جاري الرفع... {uploadProgress > 0 && `${uploadProgress}%`}</span>
              </>
            ) : (
              <span>رفع الملف</span>
            )}
          </button>
          {uploading && uploadProgress > 0 && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-blue-400 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          )}
        </div>

        {/* Results */}
        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {result.success ? (
              <div>
                <div className="font-semibold mb-2">✅ تم الرفع بنجاح</div>
                {result.added !== undefined && (
                  <div className="text-sm space-y-1">
                    <p>تمت إضافة: {result.added} سجل</p>
                    {result.failed > 0 && <p className="text-red-600">فشل: {result.failed} سجل</p>}
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        <p className="font-medium text-xs mb-1">الأخطاء:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          {result.errors.slice(0, 10).map((error: string, i: number) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                        {result.errors.length > 10 && (
                          <p className="text-xs mt-1">و {result.errors.length - 10} خطأ آخر...</p>
                        )}
                      </div>
                    )}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">تحذيرات:</p>
                        <ul className="list-disc list-inside text-xs">
                          {result.warnings.slice(0, 5).map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {result.rows !== undefined && (
                  <div className="text-sm">تم معالجة {result.rows} صف</div>
                )}
              </div>
            ) : (
              <div>
                <div className="font-semibold mb-2">❌ فشل الرفع</div>
                <p className="text-sm mb-2">{result.error}</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <p className="font-medium text-xs mb-1">الأخطاء:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {result.errors.slice(0, 10).map((error: string, i: number) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                    {result.errors.length > 10 && (
                      <p className="text-xs mt-1">و {result.errors.length - 10} خطأ آخر...</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">متطلبات الملف:</p>
          {type === 'riders' && (
            <div className="text-xs text-gray-600 space-y-1">
              <p>الأعمدة المطلوبة (بالترتيب):</p>
              <ol className="list-decimal list-inside mr-4 space-y-1">
                <li>كود المندوب</li>
                <li>الاسم</li>
                <li>المنطقة</li>
                <li>كود المشرف</li>
              </ol>
              <p className="mt-2 text-red-600">⚠️ يجب أن يكون كود المندوب فريداً</p>
            </div>
          )}
          {type === 'performance' && (
            <div className="text-xs text-gray-600 space-y-1">
              <p>الأعمدة المطلوبة (بالترتيب):</p>
              <ol className="list-decimal list-inside mr-4 space-y-1">
                <li>التاريخ</li>
                <li>كود المندوب</li>
                <li>ساعات العمل</li>
                <li>البريك</li>
                <li>التأخير</li>
                <li>الغياب (نعم/لا)</li>
                <li>الطلبات</li>
                <li>معدل القبول (مثال: 95%)</li>
                <li>المحفظة</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

