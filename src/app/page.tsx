'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { getLineLoginUrl } from '@/lib/auth';

export default function LoginPage() {
  const { isAuthenticated, loginAsDemo, setLoading, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleLineLogin = () => {
    window.location.href = getLineLoginUrl();
  };

  const handleDemoLogin = (role: 'admin' | 'sales' | 'staff') => {
    setLoading(true);
    setTimeout(() => {
      loginAsDemo(role);
      setLoading(false);
      router.push('/dashboard');
    }, 500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #06C755 0%, #04a045 50%, #1d4ed8 100%)',
      }}
    >
      <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-[90%]">
        <div className="mb-4">
          <span className="material-icons" style={{ fontSize: 64, color: '#06C755' }}>
            business
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">ラパンリフォーム 業務管理システム</h1>
        <p className="text-gray-500 text-sm mb-8">LINE公式アカウント連携 業務管理</p>

        <button onClick={handleLineLogin} className="btn-line w-full mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 5.64 2 10.14c0 4.04 3.58 7.42 8.41 8.06.33.07.77.22.88.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1.02.89.56.91-.38 4.89-2.88 6.67-4.93C20.53 14.13 22 12.26 22 10.14 22 5.64 17.52 2 12 2z" />
          </svg>
          LINEでログイン
        </button>

        <div className="border-t pt-4">
          <p className="text-xs text-gray-400 mb-3">デモユーザー:</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleDemoLogin('admin')}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              社長としてログイン
            </button>
            <button
              onClick={() => handleDemoLogin('staff')}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              事務としてログイン
            </button>
            <button
              onClick={() => handleDemoLogin('sales')}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              営業としてログイン
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p className="mt-4 text-gray-600">処理中...</p>
        </div>
      )}
    </div>
  );
}
