'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured, AccountPhoto } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const [galleryPhotos, setGalleryPhotos] = useState<AccountPhoto[]>([]);
  const [galleryMax, setGalleryMax] = useState(30);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    api.getAccountPhotos().then((res) => {
      if (res.success && res.data) {
        setGalleryPhotos(res.data.photos || []);
        setGalleryMax(res.data.max || 30);
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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = galleryMax - galleryPhotos.length;
    if (remaining <= 0) { showToast(`写真は最大${galleryMax}枚までです`, 'error'); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    if (files.length > remaining) showToast(`上限のため ${remaining}枚のみ追加します`, 'error');

    setGalleryUploading(true);
    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) continue;
      const base64 = await readFileAsBase64(file);
      const res = await api.uploadAccountPhoto(base64, file.name);
      if (res.success && res.data) {
        setGalleryPhotos(res.data.photos);
      } else {
        showToast(res.error || 'アップロードに失敗しました', 'error');
        break;
      }
    }
    setGalleryUploading(false);
    showToast('写真をアップロードしました');
    e.target.value = '';
  };

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingId(photoId);
    const res = await api.deleteAccountPhoto(photoId);
    if (res.success && res.data) {
      setGalleryPhotos(res.data.photos);
      showToast('写真を削除しました');
    } else {
      showToast(res.error || '削除に失敗しました', 'error');
    }
    setDeletingId(null);
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('プロフィールを保存しました');
  };

  const displayImage = avatarPreview || avatarUrl;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">アカウント設定</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左: プロフィール設定 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-base flex items-center gap-2">
              <span className="material-icons text-green-600" style={{ fontSize: 20 }}>person</span>
              プロフィール設定
            </h3>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-5 mb-6">
              <div
                className="relative w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer group overflow-hidden border-3 border-gray-200 hover:border-green-400 transition-colors flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayImage ? (
                  <img src={displayImage} alt="プロフィール" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="material-icons text-gray-300" style={{ fontSize: 40 }}>person</span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-icons text-white text-xl">camera_alt</span>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="text-sm text-green-600 hover:text-green-700 hover:underline font-medium"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'アップロード中...' : '写真を変更'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <p className="text-xs text-gray-400 mt-0.5">{user?.role ?? ''}</p>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <div className="space-y-4">
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
              <div className="mt-5">
                <button type="submit" className="btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>

        {/* 右: 施工写真・資料 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <span className="material-icons text-green-600" style={{ fontSize: 20 }}>photo_library</span>
              施工写真・資料
              <span className="text-sm font-normal text-gray-400">({galleryPhotos.length}/{galleryMax})</span>
            </h3>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => galleryInputRef.current?.click()}
              disabled={galleryUploading || galleryPhotos.length >= galleryMax}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>add_photo_alternate</span>
              写真を追加
            </button>
            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
          </div>
          <div className="p-5">
            {galleryPhotos.length === 0 && !galleryUploading ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-green-300 hover:bg-green-50/30 transition-colors"
                onClick={() => galleryInputRef.current?.click()}
              >
                <span className="material-icons text-gray-300 mb-2" style={{ fontSize: 48 }}>add_photo_alternate</span>
                <p className="text-sm text-gray-400">クリックして写真を追加</p>
                <p className="text-xs text-gray-300 mt-1">お礼状・DMに使用できます</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {galleryPhotos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deletingId === photo.id}
                    >
                      {deletingId === photo.id ? (
                        <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                      ) : (
                        <span className="material-icons" style={{ fontSize: 14 }}>close</span>
                      )}
                    </button>
                  </div>
                ))}
                {galleryPhotos.length < galleryMax && (
                  <div
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-300 hover:bg-green-50/30 transition-colors"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <span className="material-icons text-gray-300" style={{ fontSize: 28 }}>add</span>
                    <span className="text-[10px] text-gray-300 mt-0.5">追加</span>
                  </div>
                )}
              </div>
            )}
            {galleryUploading && (
              <div className="flex items-center justify-center gap-2 mt-3 py-2">
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                <span className="text-xs text-gray-500">アップロード中...</span>
              </div>
            )}
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">
                <span className="material-icons align-middle" style={{ fontSize: 14 }}>info</span>{' '}
                お礼状・DM作成時に担当者写真・施工写真として使用できます
              </p>
            </div>
          </div>
        </div>
      </div>

      {toast.show && <div className={`toast show ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
