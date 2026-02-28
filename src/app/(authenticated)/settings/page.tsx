'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsPage() {
  const { user } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('プロフィールを保存しました');
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">アカウント設定</h2>

      <div className="flex gap-6 flex-wrap">
        <div className="flex-1 min-w-[320px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="material-icons text-green-600">person</span>プロフィール設定
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                <span className="material-icons text-5xl text-gray-400">person</span>
              </div>
              <div className="text-sm text-gray-500">{user?.role ?? ''}</div>
            </div>

            <form onSubmit={handleSave}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                  <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {toast.show && <div className={`toast show ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
