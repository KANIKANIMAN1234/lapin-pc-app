'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { exchangeCodeForToken } from '@/lib/auth';

const GAS_URL = process.env.NEXT_PUBLIC_GAS_WEB_APP_URL || '';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('LINE認証がキャンセルされました: ' + (searchParams.get('error_description') || errorParam));
      return;
    }

    if (!code) {
      setError('認証コードが取得できませんでした');
      return;
    }

    const savedState = typeof window !== 'undefined' ? localStorage.getItem('line_login_state') : null;
    if (savedState && state !== savedState) {
      setError('認証状態が一致しません。再度ログインしてください。');
      return;
    }

    (async () => {
      try {
        const result = await exchangeCodeForToken(code);
        if (!result.token) {
          setError('トークン交換に失敗しました: ' + (result.error || '不明なエラー'));
          return;
        }
        const idToken = result.token;

        const url = `${GAS_URL}?action=getUserInfo&token=${encodeURIComponent(idToken)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.data) {
          login(
            {
              id: String(data.data.id),
              name: data.data.name,
              role: data.data.role,
              email: data.data.email || '',
              status: 'active',
            },
            idToken
          );
          router.replace('/dashboard');
        } else {
          setError('ユーザー情報の取得に失敗しました: ' + (data.error?.message || data.error || '不明なエラー'));
        }
      } catch (err) {
        setError('ログイン処理中にエラーが発生しました: ' + String(err));
      }
    })();
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md text-center">
          <span className="material-icons text-5xl text-red-400 mb-4">error_outline</span>
          <h2 className="text-lg font-bold mb-2">ログインエラー</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner mb-4" style={{ margin: '0 auto' }} />
        <p className="text-gray-600">LINE認証処理中...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mb-4" style={{ margin: '0 auto' }} />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
