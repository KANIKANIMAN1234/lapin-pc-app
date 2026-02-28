'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
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
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左: プロフィール設定フォーム */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-base flex items-center gap-2">
              <span className="material-icons text-green-600" style={{ fontSize: 20 }}>person</span>
              プロフィール設定
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSave}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                  <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">携帯番号</label>
                  <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090-1234-5678" />
                </div>
              </div>
              <div className="mt-6">
                <button type="submit" className="btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>

        {/* 右: プロフィール写真 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-base flex items-center gap-2">
              <span className="material-icons text-green-600" style={{ fontSize: 20 }}>photo_camera</span>
              プロフィール写真
            </h3>
          </div>
          <div className="p-6 flex flex-col items-center">
            <div
              className="relative w-36 h-36 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer group overflow-hidden border-4 border-gray-200 hover:border-green-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {displayImage ? (
                <img src={displayImage} alt="プロフィール" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="material-icons text-gray-300" style={{ fontSize: 64 }}>person</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-icons text-white text-3xl">camera_alt</span>
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

            <button
              type="button"
              className="mt-3 text-sm text-green-600 hover:text-green-700 hover:underline font-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'アップロード中...' : '写真を変更'}
            </button>
            <span className="text-sm text-gray-400 mt-1">{user?.role ?? ''}</span>

            <div className="mt-6 w-full bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">
                <span className="material-icons align-middle" style={{ fontSize: 14 }}>info</span>{' '}
                JPG・PNG形式の画像をアップロードできます
              </p>
              <p className="text-xs text-gray-400 mt-1">推奨サイズ: 400×400px以上</p>
            </div>
          </div>
        </div>
      </div>

      {toast.show && <div className={`toast show ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
