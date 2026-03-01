'use client';

import { useState, useEffect, useRef } from 'react';
import { api, isApiConfigured, AccountPhoto } from '@/lib/api';
import type { Project } from '@/types';

type TemplateType = 'thankyou' | 'seasonal' | 'campaign';

interface TemplateConfig {
  id: TemplateType;
  label: string;
  icon: string;
  iconColor: string;
  previewTitle: string;
  previewBody: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'thankyou',
    label: 'お礼状',
    icon: 'favorite',
    iconColor: '#ef4444',
    previewTitle: '株式会社ラパンリフォーム',
    previewBody: 'この度はリフォーム工事にご依頼いただき誠にありがとうございました。\n今後もお住まいのことでお気軽にご相談ください。\n今後ともどうぞよろしくお願いいたします。',
  },
  {
    id: 'seasonal',
    label: '季節DM',
    icon: 'pets',
    iconColor: '#374151',
    previewTitle: '株式会社ラパンリフォーム',
    previewBody: '春の訪れと共に、ご挨拶申し上げます。\n季節の変わり目は外壁や屋根の点検に最適な時期です。\n無料点検も承っておりますので、お気軽にお問い合わせください。',
  },
  {
    id: 'campaign',
    label: 'キャンペーン',
    icon: 'auto_awesome',
    iconColor: '#374151',
    previewTitle: '株式会社ラパンリフォーム',
    previewBody: '春のリフォームキャンペーン実施中です。\n期間中のご契約で工事費用を最大10%割引いたします。\nこの機会にぜひご検討ください。',
  },
];

interface SendListItem {
  id: string;
  name: string;
  lastWork: string;
  lastWorkDate: string;
  status: string;
}

type PhotoTarget = 'staff' | 'house';

export default function ThankYouPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('thankyou');
  const [sendList, setSendList] = useState<SendListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [sending, setSending] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [staffPhoto, setStaffPhoto] = useState<string | null>(null);
  const [housePhoto, setHousePhoto] = useState<string | null>(null);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoModalTarget, setPhotoModalTarget] = useState<PhotoTarget>('staff');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<AccountPhoto[]>([]);
  const [newUploadPreview, setNewUploadPreview] = useState<string | null>(null);
  const modalFileRef = useRef<HTMLInputElement>(null);

  const currentTemplate = TEMPLATES.find((t) => t.id === activeTemplate)!;

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    Promise.all([
      api.getProjects({ limit: '500' }),
      api.getUserInfo(),
      api.getAccountPhotos(),
    ]).then(([projRes, userRes, photoRes]) => {
      if (projRes.success && projRes.data?.projects) {
        const items = projRes.data.projects
          .filter((p: Project) => p.status === 'completed' || p.status === 'in_progress' || p.status === 'contract')
          .map((p: Project) => {
            const dateStr = String(p.completion_date || p.start_date || p.inquiry_date || '').substring(0, 7).replace('-', '.');
            const workType = Array.isArray(p.work_type) ? p.work_type.join(', ') : p.work_type || '';
            return { id: String(p.id), name: p.customer_name, lastWork: workType, lastWorkDate: dateStr, status: p.status === 'completed' ? '完工' : p.status === 'in_progress' ? '施工中' : '契約済' };
          });
        setSendList(items);
      }
      if (userRes.success && userRes.data) {
        const data = userRes.data as unknown as Record<string, string>;
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      }
      if (photoRes.success && photoRes.data) {
        setGalleryPhotos(photoRes.data.photos || []);
      }
      setLoading(false);
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sendList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sendList.map((c) => c.id)));
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 300);
  };

  const handleSend = () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    const selectedNames = sendList.filter((r) => selectedIds.has(r.id)).map((r) => r.name);
    setTimeout(() => {
      alert(`以下の${selectedNames.length}件に「${currentTemplate.label}」を送付しました:\n${selectedNames.join('\n')}`);
      setSending(false);
    }, 500);
  };

  const openPhotoModal = (target: PhotoTarget) => {
    setPhotoModalTarget(target);
    setNewUploadPreview(null);
    setPhotoModalOpen(true);
  };

  const selectPhotoFromModal = (url: string) => {
    if (photoModalTarget === 'staff') setStaffPhoto(url);
    else setHousePhoto(url);
    setPhotoModalOpen(false);
    setNewUploadPreview(null);
  };

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setNewUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
        <p className="ml-3 text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">お礼状・DM管理</h2>

      <div className="flex gap-6">
        {/* === 左: テンプレート選択 === */}
        <div className="flex-shrink-0" style={{ width: 170 }}>
          <h3 className="text-xs font-bold text-gray-600 mb-2">テンプレート選択</h3>
          <div className="flex flex-col gap-1.5">
            {TEMPLATES.map((t) => {
              const isActive = activeTemplate === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTemplate(t.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-green-100 border border-green-400 shadow-sm'
                      : 'bg-transparent border border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className="material-icons" style={{ fontSize: 18, color: isActive ? t.iconColor : '#9ca3af' }}>{t.icon}</span>
                  <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* === 中央: プレビュー === */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-600">プレビュー</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openPhotoModal('staff')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="material-icons" style={{ fontSize: 15 }}>person</span>
                担当者写真
              </button>
              <button
                type="button"
                onClick={() => openPhotoModal('house')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="material-icons" style={{ fontSize: 15 }}>home</span>
                施工写真
              </button>
            </div>
          </div>

          <div ref={printRef} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="flex">
              {/* 写真エリア */}
              <div className="flex flex-col gap-0 border-r border-gray-100" style={{ width: 160 }}>
                <div
                  className="flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  style={{ height: 120 }}
                  onClick={() => openPhotoModal('staff')}
                >
                  {staffPhoto ? (
                    <img src={staffPhoto} alt="担当者" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300">
                      <span className="material-icons" style={{ fontSize: 32 }}>person</span>
                      <span className="text-[10px] mt-0.5">担当者写真</span>
                    </div>
                  )}
                </div>
                <div
                  className="flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors border-t border-gray-100"
                  style={{ height: 120 }}
                  onClick={() => openPhotoModal('house')}
                >
                  {housePhoto ? (
                    <img src={housePhoto} alt="施工写真" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300">
                      <span className="material-icons" style={{ fontSize: 32 }}>home</span>
                      <span className="text-[10px] mt-0.5">施工写真</span>
                    </div>
                  )}
                </div>
              </div>
              {/* テキストエリア */}
              <div className="flex-1 p-6">
                <div className="font-bold text-base text-gray-900 mb-3">{currentTemplate.previewTitle}</div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{currentTemplate.previewBody}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={printing}
            className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            <span className="material-icons" style={{ fontSize: 18 }}>print</span>
            {printing ? '印刷中...' : '印刷'}
          </button>
        </div>

        {/* === 右: 送付リスト === */}
        <div className="flex-shrink-0 border-l border-gray-200 pl-5" style={{ width: 250 }}>
          <h3 className="text-xs font-bold text-gray-600 mb-2">送付リスト（{sendList.length}件）</h3>

          <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 px-0.5 w-5">
                    <input type="checkbox" checked={sendList.length > 0 && selectedIds.size === sendList.length} onChange={toggleSelectAll} className="rounded w-3 h-3 accent-green-600" />
                  </th>
                  <th className="text-left py-1 px-0.5 font-semibold text-gray-500">顧客名</th>
                  <th className="text-left py-1 px-0.5 font-semibold text-gray-500">最終工事</th>
                  <th className="text-left py-1 px-0.5 font-semibold text-gray-500">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {sendList.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 px-0.5">
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded w-3 h-3 accent-green-600" />
                    </td>
                    <td className="py-1.5 px-0.5 text-gray-800 whitespace-nowrap">{row.name}</td>
                    <td className="py-1.5 px-0.5 text-gray-500">
                      <div>{row.lastWorkDate}</div>
                      <div className="text-[10px]">{row.lastWork}</div>
                    </td>
                    <td className="py-1.5 px-0.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        row.status === '完工' ? 'bg-purple-100 text-purple-700' : row.status === '施工中' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
                {sendList.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-xs">対象顧客がいません</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">{selectedIds.size}件選択中</span>
            <button
              type="button"
              onClick={handleSend}
              disabled={selectedIds.size === 0 || sending}
              className="inline-flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>play_arrow</span>
              {sending ? '送付中...' : '送付実行'}
            </button>
          </div>
        </div>
      </div>

      {/* === 担当者写真選択モーダル === */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPhotoModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-base">
                {photoModalTarget === 'staff' ? '担当者写真を選択' : '施工写真を選択'}
              </h3>
              <button onClick={() => setPhotoModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-500">使用する写真を1枚選択してください</p>

              {/* プロフィール写真 */}
              <div>
                <h4 className="text-xs font-bold text-gray-600 mb-2">プロフィール写真</h4>
                <div className="flex flex-wrap gap-2">
                  {avatarUrl ? (
                    <div
                      className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-green-400 transition-colors"
                      onClick={() => selectPhotoFromModal(avatarUrl)}
                    >
                      <img src={avatarUrl} alt="プロフィール" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">プロフィール写真が未登録です</p>
                  )}
                </div>
              </div>

              {/* 登録済み写真 */}
              <div>
                <h4 className="text-xs font-bold text-gray-600 mb-2">登録済み写真 ({galleryPhotos.length}枚)</h4>
                {galleryPhotos.length > 0 ? (
                  <div className="grid grid-cols-5 gap-2">
                    {galleryPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-green-400 transition-colors"
                        onClick={() => selectPhotoFromModal(photo.url)}
                      >
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">登録写真がありません（設定ページで追加できます）</p>
                )}
              </div>

              {/* 新しくアップロード */}
              <div>
                <h4 className="text-xs font-bold text-gray-600 mb-2">新しくアップロード</h4>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-green-300 hover:bg-green-50/30 transition-colors"
                  onClick={() => modalFileRef.current?.click()}
                >
                  <span className="material-icons text-gray-300" style={{ fontSize: 28 }}>add_photo_alternate</span>
                  <span className="text-xs text-gray-400 mt-1">写真を選択</span>
                </div>
                <input ref={modalFileRef} type="file" accept="image/*" className="hidden" onChange={handleModalFileChange} />
                {newUploadPreview && (
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="w-20 h-20 rounded-lg overflow-hidden border-2 border-green-400 cursor-pointer"
                      onClick={() => selectPhotoFromModal(newUploadPreview)}
                    >
                      <img src={newUploadPreview} alt="アップロード" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                      onClick={() => selectPhotoFromModal(newUploadPreview)}
                    >
                      この写真を使用
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setPhotoModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
