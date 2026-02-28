'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (!isApiConfigured()) return;
    api.getUserInfo().then((res) => {
      if (res.success && res.data) {
        const data = res.data as unknown as Record<string, string>;
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      }
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploading(true);
      const res = await api.uploadProfilePhoto(base64);
      if (res.success && res.data) {
        setAvatarUrl(res.data.avatar_url);
        setAvatarPreview(null);
        showToast('プロフィール写真を保存しました');
      } else {
        showToast(res.error || 'アップロードに失敗しました', 'error');
        setAvatarPreview(null);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('プロフィールを保存しました');
  };

  const displayImage = avatarPreview || avatarUrl;

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
              <div
                className="relative w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center mb-2 cursor-pointer group overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="プロフィール"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="material-icons text-5xl text-gray-400">person</span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-icons text-white text-2xl">camera_alt</span>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              <button
                type="button"
                className="text-xs text-green-600 hover:underline mt-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'アップロード中...' : '写真を変更'}
              </button>
              <div className="text-sm text-gray-500 mt-1">{user?.role ?? ''}</div>
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
