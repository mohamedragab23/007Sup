/**
 * Equipment Pricing API
 * Manages equipment prices for deduction calculations
 * Stores pricing in الإعدادات sheet (row for equipment pricing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getSheetData, updateSheetRow, appendToSheet } from '@/lib/googleSheets';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Use الإعدادات sheet which should already exist, or fallback to local file
const SHEET_NAME = 'الإعدادات';
const LOCAL_FILE = path.join(process.cwd(), 'data', 'equipment-pricing.json');

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

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read pricing from local file
function readLocalPricing(): EquipmentPricing | null {
  try {
    if (fs.existsSync(LOCAL_FILE)) {
      const data = fs.readFileSync(LOCAL_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Equipment Pricing] Error reading local file:', error);
  }
  return null;
}

// Save pricing to local file
function saveLocalPricing(pricing: EquipmentPricing): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(pricing, null, 2));
    return true;
  } catch (error) {
    console.error('[Equipment Pricing] Error saving local file:', error);
    return false;
  }
}

// GET - Fetch equipment pricing
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

    // Try local file first (faster)
    const localPricing = readLocalPricing();
    if (localPricing) {
      return NextResponse.json({ success: true, data: localPricing });
    }

    // Return default pricing
    return NextResponse.json({ success: true, data: defaultPricing });
  } catch (error: any) {
    console.error('Get equipment pricing error:', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ' }, { status: 500 });
  }
}

// POST - Save equipment pricing (مدير لا يمكنه تعديل الأسعار - للإدارة العليا فقط)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    // منع المدير من تعديل الأسعار - الأسعار للقراءة فقط في واجهة المدير
    return NextResponse.json(
      { success: false, error: 'لا يمكن للمدير تعديل الأسعار. الأسعار محددة من قبل الإدارة العليا.' },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Save equipment pricing error:', error);
    return NextResponse.json({ success: false, error: error.message || 'حدث خطأ' }, { status: 500 });
  }
}

