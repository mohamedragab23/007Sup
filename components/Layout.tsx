'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface User {
  name?: string;
  role?: string;
}

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/');
      return;
    }

    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user data');
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      // Removed: المزامنة, رفع الملفات, التحقق من البيانات (backend preserved)
      return [
        { href: '/admin/dashboard', label: 'لوحة التحكم', icon: '📊' },
        { href: '/admin/supervisors', label: 'إدارة المشرفين', icon: '👔' },
        { href: '/admin/riders', label: 'إدارة المناديب', icon: '👥' },
        { href: '/admin/termination-requests', label: 'طلبات الإقالة', icon: '🚫' },
        { href: '/admin/performance', label: 'رفع بيانات الأداء', icon: '📈' },
        { href: '/admin/salary-config', label: 'إعدادات الرواتب', icon: '⚙️' },
        { href: '/admin/equipment-pricing', label: 'أسعار المعدات', icon: '🛠️' },
        { href: '/admin/salaries', label: 'حساب الرواتب', icon: '💰' },
      ];
    } else {
      // Supervisor menu - Reports tab removed as per requirements
      return [
        { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
        { href: '/riders', label: 'المناديب', icon: '👥' },
        { href: '/performance', label: 'الأداء', icon: '📈' },
        { href: '/salary', label: 'الراتب', icon: '💰' },
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800">نظام الإدارة</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">007 للخدمات</h2>
              <p className="text-sm text-gray-600 mt-1">{user?.name || 'المستخدم'}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true} // Prefetch pages on hover for faster navigation
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <span>🚪</span>
                <span className="font-medium">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
