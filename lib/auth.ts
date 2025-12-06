import { getSheetData, findDataInSheet } from './googleSheets';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthResult {
  success: boolean;
  error?: string;
  code?: string;
  name?: string;
  region?: string;
  email?: string;
  permissions?: string;
  role?: 'supervisor' | 'admin';
  token?: string;
}

// Authenticate supervisor
export async function authenticateSupervisor(code: string, password: string): Promise<AuthResult> {
  try {
    const supervisorsData = await getSheetData('المشرفين');

    if (supervisorsData.length === 0) {
      return {
        success: false,
        error: 'ورقة المشرفين غير موجودة أو فارغة في قاعدة البيانات',
      };
    }

    for (let i = 1; i < supervisorsData.length; i++) {
      const row = supervisorsData[i];

      if (!row[0] || row[0].toString().trim() === '') continue;

      const supervisorCode = row[0].toString().trim();
      const supervisorName = row[1] ? row[1].toString().trim() : '';
      const supervisorRegion = row[2] ? row[2].toString().trim() : '';
      const supervisorEmail = row[3] ? row[3].toString().trim() : '';
      const supervisorPassword = row[4] ? row[4].toString().trim() : '';

      if (supervisorCode === code) {
        if (supervisorPassword === password) {
          const token = jwt.sign(
            {
              code: supervisorCode,
              name: supervisorName,
              role: 'supervisor',
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return {
            success: true,
            code: supervisorCode,
            name: supervisorName,
            region: supervisorRegion,
            email: supervisorEmail,
            role: 'supervisor',
            token,
          };
        } else {
          return {
            success: false,
            error: 'كلمة المرور غير صحيحة',
          };
        }
      }
    }

    return {
      success: false,
      error: 'كود المشرف غير مسجل في النظام',
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'حدث خطأ في النظام: ' + error.toString(),
    };
  }
}

// Authenticate admin
export async function authenticateAdmin(code: string, password: string): Promise<AuthResult> {
  try {
    let adminsData = await getSheetData('Admins');

    // If Admins sheet doesn't exist, create it with default admin
    if (adminsData.length === 0) {
      // Note: In production, you'd want to create the sheet programmatically
      // For now, we'll return an error asking to create it manually
      return {
        success: false,
        error: 'ورقة الأدمن غير موجودة. يرجى إنشاؤها يدوياً في Google Sheets',
      };
    }

    for (let i = 1; i < adminsData.length; i++) {
      const row = adminsData[i];

      if (!row[0] || row[0].toString().trim() === '') continue;

      const adminCode = row[0].toString().trim();
      const adminName = row[1] ? row[1].toString().trim() : '';
      const adminPassword = row[2] ? row[2].toString().trim() : '';
      const adminPermissions = row[3] ? row[3].toString().trim() : '';

      if (adminCode === code) {
        if (adminPassword === password) {
          const token = jwt.sign(
            {
              code: adminCode,
              name: adminName,
              role: 'admin',
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          return {
            success: true,
            code: adminCode,
            name: adminName,
            permissions: adminPermissions,
            role: 'admin',
            token,
          };
        } else {
          return {
            success: false,
            error: 'كلمة المرور غير صحيحة',
          };
        }
      }
    }

    return {
      success: false,
      error: 'كود الأدمن غير مسجل في النظام',
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'حدث خطأ في النظام: ' + error.toString(),
    };
  }
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

