'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, isApiConfigured } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/mockProjects';
import type { Project, Photo, ProjectStatus } from '@/types';

const PHOTO_TYPES = [
  { id: 'before', label: '契約前' },
  { id: 'inspection', label: '現調' },
  { id: 'pre_construction', label: '施工前' },
  { id: 'undercoat', label: '下地' },
  { id: 'during', label: '施工中' },
  { id: 'after', label: '施工後' },
  { id: 'completed', label: '完工' },
  { id: 'other', label: 'その他' },
];

function formatAmount(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万円` : `${n.toLocaleString()}円`;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'photo' | 'cost' | 'meeting'>('basic');
  const [photoType, setPhotoType] = useState('before');
  const [status, setStatus] = useState<ProjectStatus>('inquiry');

  useEffect(() => {
    if (!isApiConfigured() || !id) { setLoading(false); return; }
    Promise.all([
      api.getProject(id),
      api.getPhotos(id),
    ]).then(([projRes, photoRes]) => {
      if (projRes.success && projRes.data) {
        const p = (projRes.data as unknown as { project: Project }).project ?? projRes.data as unknown as Project;
        setProject(p);
        setStatus(p.status);
      }
      if (photoRes.success && photoRes.data?.photos) setPhotos(photoRes.data.photos);
      setLoading(false);
    });
  }, [id]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setStatus(newStatus);
    if (project) {
      await api.updateProject(String(project.id), { status: newStatus });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-600 mb-4">案件が見つかりません</p>
        <Link href="/projects" className="btn-secondary">← 案件一覧へ戻る</Link>
      </div>
    );
  }

  const workTypes = Array.isArray(project.work_type) ? project.work_type : String(project.work_type || '').split(',').map((s) => s.trim());
  const grossProfit = Number(project.gross_profit) || 0;
  const grossProfitRate = Number(project.gross_profit_rate) || 0;
  const filteredPhotos = photos.filter((p) => p.photo_type === photoType);

  const tabs = [
    { id: 'basic' as const, label: '基本情報' },
    { id: 'photo' as const, label: `写真 (${photos.length})` },
    { id: 'cost' as const, label: '原価' },
    { id: 'meeting' as const, label: '商談記録' },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/projects" className="btn-secondary inline-flex items-center gap-1">
          <span className="material-icons">arrow_back</span><span>戻る</span>
        </Link>
        <h2 className="text-xl font-bold flex-1">案件詳細: {project.project_number} {project.customer_name}</h2>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'basic' && (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>顧客情報</h3>
            <div className="detail-item"><label>管理番号</label><div>{project.project_number}</div></div>
            <div className="detail-item"><label>顧客名</label><div>{project.customer_name}</div></div>
            <div className="detail-item"><label>住所</label><div>{project.address}{' '}
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline ml-1">地図</a>
            </div></div>
            <div className="detail-item"><label>電話番号</label><div>{project.phone ? <a href={`tel:${project.phone}`} className="text-green-600 hover:underline">{project.phone}</a> : '-'}</div></div>
          </div>

          <div className="detail-section">
            <h3>工事情報</h3>
            <div className="detail-item"><label>工事概要</label><div>{project.work_description || '-'}</div></div>
            <div className="detail-item"><label>工事種別</label><div className="flex gap-2 flex-wrap">{workTypes.map((w) => <span key={w} className="badge badge-green">{w}</span>)}</div></div>
            <div className="detail-item"><label>見込み金額</label><div>{formatAmount(Number(project.estimated_amount) || 0)}</div></div>
            <div className="detail-item"><label>集客ルート</label><div>{project.acquisition_route ? <span className="badge badge-blue">{project.acquisition_route}</span> : '-'}</div></div>
          </div>

          <div className="detail-section">
            <h3>担当・ステータス</h3>
            <div className="detail-item"><label>営業担当者</label><div>{project.assigned_to_name || '-'}</div></div>
            <div className="detail-item"><label>ステータス</label><div>
              <select value={status} onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)} className="form-input w-auto">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div></div>
            <div className="detail-item"><label>問い合わせ日</label><div>{String(project.inquiry_date || '').substring(0, 10)}</div></div>
            {project.contract_date && <div className="detail-item"><label>契約日</label><div>{String(project.contract_date).substring(0, 10)}</div></div>}
          </div>

          <div className="detail-section">
            <h3>原価情報</h3>
            <div className="detail-item"><label>契約金額</label><div>{project.contract_amount ? formatAmount(Number(project.contract_amount)) : '-'}</div></div>
            <div className="detail-item"><label>計画予算</label><div>{project.planned_budget ? formatAmount(Number(project.planned_budget)) : '-'}</div></div>
            <div className="detail-item"><label>実行予算</label><div>{project.actual_budget ? formatAmount(Number(project.actual_budget)) : '-'}</div></div>
            <div className="detail-item"><label>実際原価</label><div>{project.actual_cost ? formatAmount(Number(project.actual_cost)) : '-'}</div></div>
            <div className="detail-item"><label>粗利額</label><div className={grossProfit >= 0 ? 'positive' : 'negative'}>{grossProfit ? formatAmount(grossProfit) : '-'}</div></div>
            <div className="detail-item"><label>粗利率</label><div className={grossProfitRate >= 20 ? 'positive' : 'negative'}>{grossProfitRate ? `${grossProfitRate}%` : '-'}</div></div>
          </div>

          {project.drive_folder_id && (
            <div className="detail-section col-span-2">
              <h3>資料（Google Drive）</h3>
              <a href={`https://drive.google.com/drive/folders/${project.drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 mt-2">
                <span className="material-icons">folder_open</span>Google Driveを開く
              </a>
            </div>
          )}
        </div>
      )}

      {activeTab === 'photo' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 flex-wrap">
              {PHOTO_TYPES.map((t) => (
                <button key={t.id} type="button" className={`admin-tab ${photoType === t.id ? 'active' : ''}`} onClick={() => setPhotoType(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="photo-gallery">
            {filteredPhotos.length > 0 ? filteredPhotos.map((photo) => (
              <div key={photo.id} className="photo-item">
                {photo.url ? <img src={photo.url} alt={photo.memo || ''} className="w-full h-full object-cover" /> :
                  <span className="material-icons text-4xl text-gray-400">image</span>}
              </div>
            )) : (
              <div className="col-span-full text-center py-8 text-gray-500">この種別の写真はまだありません</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cost' && (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500 py-12">
          <span className="material-icons text-5xl mb-2">receipt_long</span>
          <p>原価データはスプレッドシートから取得されます</p>
        </div>
      )}

      {activeTab === 'meeting' && (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500 py-12">
          <span className="material-icons text-5xl mb-2">description</span>
          <p>商談記録はスプレッドシートから取得されます</p>
        </div>
      )}
    </div>
  );
}
