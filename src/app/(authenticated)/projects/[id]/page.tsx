'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, isApiConfigured } from '@/lib/api';
import type { MeetingRecord, CostItem } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/mockProjects';
import type { Project, Photo, ProjectStatus } from '@/types';

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : unknown;

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

const DEFAULT_MEETING_TYPES = ['訪問', '電話', 'オンライン', 'メール', '来店', 'その他'];

const COST_CATEGORIES = [
  '材料費', '外注費', '人件費', '足場代', '運搬費', '廃材処理費', '諸経費', 'その他',
];

function formatAmount(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万円` : `${n.toLocaleString()}円`;
}

function formatDateShort(d: string) {
  if (!d) return '-';
  return String(d).substring(0, 10);
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'photo' | 'cost' | 'meeting'>('basic');
  const [photoType, setPhotoType] = useState('before');
  const [status, setStatus] = useState<ProjectStatus>('inquiry');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  const [meetingModal, setMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    meeting_date: new Date().toISOString().substring(0, 10),
    meeting_type: '訪問',
    attendees: '',
    content: '',
    next_action: '',
  });
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [meetingTypes, setMeetingTypes] = useState<string[]>(DEFAULT_MEETING_TYPES);
  const [isRecording, setIsRecording] = useState(false);
  const [aiFormatting, setAiFormatting] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const [costModal, setCostModal] = useState(false);
  const [costForm, setCostForm] = useState({
    cost_date: new Date().toISOString().substring(0, 10),
    category: '材料費',
    vendor_name: '',
    description: '',
    amount: '',
  });
  const [costSaving, setCostSaving] = useState(false);

  const loadMeetings = useCallback(async () => {
    if (!id) return;
    const res = await api.getMeetings(id);
    if (res.success && res.data?.meetings) setMeetings(res.data.meetings);
  }, [id]);

  const loadCostItems = useCallback(async () => {
    if (!id) return;
    const res = await api.getCostItems(id);
    if (res.success && res.data) {
      setCostItems(res.data.cost_items || []);
      setTotalCost(res.data.total_cost || 0);
    }
  }, [id]);

  useEffect(() => {
    if (!isApiConfigured() || !id) { setLoading(false); return; }
    Promise.all([
      api.getProject(id),
      api.getPhotos(id),
      api.getMasters(),
    ]).then(([projRes, photoRes, mastersRes]) => {
      if (projRes.success && projRes.data) {
        const p = (projRes.data as unknown as { project: Project }).project ?? projRes.data as unknown as Project;
        setProject(p);
        setStatus(p.status);
      }
      if (photoRes.success && photoRes.data?.photos) setPhotos(photoRes.data.photos);
      if (mastersRes.success && mastersRes.data) {
        const d = mastersRes.data as Record<string, Array<{ value: string }>>;
        if (d.meeting_type && d.meeting_type.length > 0) {
          setMeetingTypes(d.meeting_type.map((item) => item.value));
        }
      }
      setLoading(false);
    });
    loadMeetings();
    loadCostItems();
  }, [id, loadMeetings, loadCostItems]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setStatus(newStatus);
    if (project) {
      await api.updateProject(String(project.id), { status: newStatus });
    }
  };

  const startEdit = () => {
    if (!project) return;
    setEditForm({
      customer_name: project.customer_name,
      customer_name_kana: project.customer_name_kana || '',
      postal_code: project.postal_code || '',
      address: project.address,
      phone: project.phone,
      email: project.email || '',
      work_description: project.work_description || '',
      estimated_amount: project.estimated_amount,
      contract_amount: project.contract_amount,
      planned_budget: project.planned_budget,
      actual_budget: project.actual_budget,
      actual_cost: project.actual_cost,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!project) return;
    const res = await api.updateProject(String(project.id), editForm);
    if (res.success) {
      setProject({ ...project, ...editForm } as Project);
      setEditing(false);
    }
  };

  const toggleVoiceInput = useCallback(() => {
    if (isRecording) {
      const rec = recognitionRef.current as { stop?: () => void } | null;
      rec?.stop?.();
      setIsRecording(false);
      return;
    }
    const W = window as unknown as Record<string, unknown>;
    const SpeechRec = (W.SpeechRecognition || W.webkitSpeechRecognition) as { new(): {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: (e: { results: { isFinal: boolean;[n: number]: { transcript: string } }[] }) => void;
      onerror: () => void; onend: () => void; start: () => void; stop: () => void;
    } } | undefined;
    if (!SpeechRec) { alert('このブラウザは音声入力に対応していません'); return; }
    const rec = new SpeechRec();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setMeetingForm((prev) => ({ ...prev, content: prev.content.split('\n【音声入力中】')[0] + (transcript ? '\n【音声入力中】' + transcript : '') }));
      const allFinal = Array.from(e.results).every((r) => r.isFinal);
      if (allFinal && transcript) {
        setMeetingForm((prev) => {
          const base = prev.content.split('\n【音声入力中】')[0];
          return { ...prev, content: (base ? base + '\n' : '') + transcript };
        });
      }
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start();
    recognitionRef.current = rec as unknown as SpeechRecognitionType;
    setIsRecording(true);
  }, [isRecording]);

  const handleAiFormat = useCallback(async () => {
    const raw = meetingForm.content.split('\n【音声入力中】')[0].trim();
    if (!raw) return;
    setAiFormatting(true);
    const res = await api.formatText(raw, 'meeting');
    if (res.success && res.data?.formatted_text) {
      setMeetingForm((prev) => ({ ...prev, content: res.data!.formatted_text }));
    }
    setAiFormatting(false);
  }, [meetingForm.content]);

  const handleCreateMeeting = async () => {
    if (!meetingForm.content.trim()) return;
    setMeetingSaving(true);
    const res = await api.createMeeting({ project_id: id, ...meetingForm });
    if (res.success) {
      setMeetingModal(false);
      setMeetingForm({ meeting_date: new Date().toISOString().substring(0, 10), meeting_type: '訪問', attendees: '', content: '', next_action: '' });
      await loadMeetings();
    }
    setMeetingSaving(false);
  };

  const handleCreateCost = async () => {
    if (!costForm.amount) return;
    setCostSaving(true);
    const res = await api.createCostItem({
      project_id: id,
      cost_date: costForm.cost_date,
      category: costForm.category,
      vendor_name: costForm.vendor_name,
      description: costForm.description,
      amount: Number(costForm.amount),
    });
    if (res.success) {
      setCostModal(false);
      setCostForm({ cost_date: new Date().toISOString().substring(0, 10), category: '材料費', vendor_name: '', description: '', amount: '' });
      await loadCostItems();
    }
    setCostSaving(false);
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
  const contractAmount = Number(project.contract_amount) || 0;
  const filteredPhotos = photos.filter((p) => p.photo_type === photoType);

  const tabs = [
    { id: 'basic' as const, label: '基本情報' },
    { id: 'photo' as const, label: `写真 (${photos.length})` },
    { id: 'cost' as const, label: '原価' },
    { id: 'meeting' as const, label: '商談記録' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/projects" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
          <span className="material-icons text-xl">arrow_back</span><span>戻る</span>
        </Link>
        <h2 className="text-xl font-bold flex-1">案件詳細: {project.project_number} {project.customer_name}</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== 基本情報 ==================== */}
      {activeTab === 'basic' && (
        <div>
          {editing ? (
            <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={saveEdit} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">保存</button>
            </div>
          ) : (
            <div className="flex justify-end mb-4">
              <button onClick={startEdit} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1">
                <span className="material-icons text-base">edit</span>編集
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 顧客情報 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-bold mb-4 pb-2 border-b border-gray-100">顧客情報</h3>
              <div className="space-y-4">
                <DetailRow label="管理番号" value={project.project_number} />
                <DetailRow label="顧客名">
                  {editing ? (
                    <input className="form-input w-full" value={editForm.customer_name || ''} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} />
                  ) : project.customer_name}
                </DetailRow>
                <DetailRow label="住所">
                  {editing ? (
                    <input className="form-input w-full" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                  ) : (
                    <span>{project.address}{' '}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">地図</a>
                    </span>
                  )}
                </DetailRow>
                <DetailRow label="電話番号">
                  {editing ? (
                    <input className="form-input w-full" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  ) : project.phone ? <a href={`tel:${project.phone}`} className="text-green-600 hover:underline">{project.phone}</a> : '-'}
                </DetailRow>
              </div>
            </div>

            {/* 工事情報 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-bold mb-4 pb-2 border-b border-gray-100">工事情報</h3>
              <div className="space-y-4">
                <DetailRow label="工事概要">
                  {editing ? (
                    <input className="form-input w-full" value={editForm.work_description || ''} onChange={(e) => setEditForm({ ...editForm, work_description: e.target.value })} />
                  ) : project.work_description || '-'}
                </DetailRow>
                <DetailRow label="工事種別">
                  <div className="flex gap-2 flex-wrap">
                    {workTypes.filter(Boolean).map((w) => <span key={w} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded">{w}</span>)}
                  </div>
                </DetailRow>
                <DetailRow label="見込み金額">
                  {editing ? (
                    <input type="number" className="form-input w-full" value={editForm.estimated_amount ?? ''} onChange={(e) => setEditForm({ ...editForm, estimated_amount: Number(e.target.value) })} />
                  ) : formatAmount(Number(project.estimated_amount) || 0)}
                </DetailRow>
                <DetailRow label="集客ルート">
                  {project.acquisition_route ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">{project.acquisition_route}</span> : '-'}
                </DetailRow>
              </div>
            </div>

            {/* 担当・ステータス */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-bold mb-4 pb-2 border-b border-gray-100">担当・ステータス</h3>
              <div className="space-y-4">
                <DetailRow label="営業担当者" value={project.assigned_to_name || '-'} />
                <DetailRow label="ステータス">
                  <select value={status} onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)} className="form-input w-full">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </DetailRow>
                <DetailRow label="問い合わせ日" value={formatDateShort(project.inquiry_date)} />
                {project.contract_date && <DetailRow label="契約日" value={formatDateShort(project.contract_date)} />}
                {project.start_date && <DetailRow label="着工日" value={formatDateShort(String(project.start_date))} />}
                {project.completion_date && <DetailRow label="完工日" value={formatDateShort(String(project.completion_date))} />}
              </div>
            </div>

            {/* 原価情報 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-bold mb-4 pb-2 border-b border-gray-100">原価情報</h3>
              <div className="space-y-4">
                <DetailRow label="契約金額">
                  {editing ? (
                    <input type="number" className="form-input w-full" value={editForm.contract_amount ?? ''} onChange={(e) => setEditForm({ ...editForm, contract_amount: Number(e.target.value) })} />
                  ) : contractAmount ? formatAmount(contractAmount) : '-'}
                </DetailRow>
                <DetailRow label="計画予算">
                  {editing ? (
                    <input type="number" className="form-input w-full" value={editForm.planned_budget ?? ''} onChange={(e) => setEditForm({ ...editForm, planned_budget: Number(e.target.value) })} />
                  ) : project.planned_budget ? formatAmount(Number(project.planned_budget)) : '-'}
                </DetailRow>
                <DetailRow label="実行予算">
                  {editing ? (
                    <input type="number" className="form-input w-full" value={editForm.actual_budget ?? ''} onChange={(e) => setEditForm({ ...editForm, actual_budget: Number(e.target.value) })} />
                  ) : project.actual_budget ? formatAmount(Number(project.actual_budget)) : '-'}
                </DetailRow>
                <DetailRow label="実際原価">
                  {editing ? (
                    <input type="number" className="form-input w-full" value={editForm.actual_cost ?? ''} onChange={(e) => setEditForm({ ...editForm, actual_cost: Number(e.target.value) })} />
                  ) : project.actual_cost ? formatAmount(Number(project.actual_cost)) : '-'}
                </DetailRow>
                <DetailRow label="粗利額">
                  <span className={grossProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {grossProfit ? formatAmount(grossProfit) : '-'}
                  </span>
                </DetailRow>
                <DetailRow label="粗利率">
                  <span className={grossProfitRate >= 20 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {grossProfitRate ? `${grossProfitRate}%` : '-'}
                  </span>
                </DetailRow>
              </div>
            </div>
          </div>

          {project.drive_folder_id && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <h3 className="text-base font-bold mb-3">資料（Google Drive）</h3>
              <a href={`https://drive.google.com/drive/folders/${project.drive_folder_id}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <span className="material-icons text-base">folder_open</span>Google Driveを開く
              </a>
            </div>
          )}
        </div>
      )}

      {/* ==================== 写真 ==================== */}
      {activeTab === 'photo' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 flex-wrap">
              {PHOTO_TYPES.map((t) => {
                const count = photos.filter(p => p.photo_type === t.id).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${photoType === t.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    onClick={() => setPhotoType(t.id)}
                  >
                    {t.label} {count > 0 && <span className="ml-1 opacity-75">({count})</span>}
                  </button>
                );
              })}
            </div>
            <button className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 inline-flex items-center gap-1">
              <span className="material-icons text-sm">add_photo_alternate</span>写真を追加
            </button>
          </div>

          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group relative">
                  {photo.url ? (
                    <img src={photo.url} alt={photo.memo || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-icons text-4xl text-gray-300">image</span>
                    </div>
                  )}
                  {photo.memo && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                      {photo.memo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="material-icons text-5xl text-gray-300 mb-3 block">photo_library</span>
              <p className="text-gray-500 text-sm">「{PHOTO_TYPES.find(t => t.id === photoType)?.label}」の写真はまだありません</p>
              <p className="text-gray-400 text-xs mt-1">写真を追加ボタンからアップロードしてください</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== 原価 ==================== */}
      {activeTab === 'cost' && (
        <div>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="契約金額" value={contractAmount ? formatAmount(contractAmount) : '-'} />
            <SummaryCard label="原価合計" value={totalCost ? formatAmount(totalCost) : '-'} color={totalCost > contractAmount && contractAmount > 0 ? 'red' : undefined} />
            <SummaryCard label="粗利額" value={contractAmount ? formatAmount(contractAmount - totalCost) : '-'} color={(contractAmount - totalCost) >= 0 ? 'green' : 'red'} />
            <SummaryCard label="粗利率" value={contractAmount ? `${Math.round(((contractAmount - totalCost) / contractAmount) * 1000) / 10}%` : '-'} color={contractAmount > 0 && ((contractAmount - totalCost) / contractAmount) >= 0.2 ? 'green' : 'red'} />
          </div>

          {/* 明細テーブル */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-sm">原価明細</h3>
              <button onClick={() => setCostModal(true)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 inline-flex items-center gap-1">
                <span className="material-icons text-sm">add</span>原価を追加
              </button>
            </div>
            {costItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">日付</th>
                      <th className="px-4 py-3 font-medium text-gray-600">カテゴリ</th>
                      <th className="px-4 py-3 font-medium text-gray-600">業者名</th>
                      <th className="px-4 py-3 font-medium text-gray-600">内容</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(item.cost_date)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{item.category}</span>
                        </td>
                        <td className="px-4 py-3">{item.vendor_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.description || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{item.amount.toLocaleString()}円</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-right">合計</td>
                      <td className="px-4 py-3 text-right">{totalCost.toLocaleString()}円</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-icons text-5xl text-gray-300 mb-3 block">receipt_long</span>
                <p className="text-gray-500 text-sm">原価明細はまだ登録されていません</p>
                <p className="text-gray-400 text-xs mt-1">「原価を追加」ボタンから登録してください</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 商談記録 ==================== */}
      {activeTab === 'meeting' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">商談記録 ({meetings.length}件)</h3>
            <button onClick={() => setMeetingModal(true)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 inline-flex items-center gap-1">
              <span className="material-icons text-sm">add</span>商談記録を追加
            </button>
          </div>

          {meetings.length > 0 ? (
            <div className="space-y-4">
              {meetings.map((m) => (
                <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">{formatDateShort(m.meeting_date)}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getMeetingTypeBadge(m.meeting_type)}`}>{m.meeting_type}</span>
                    </div>
                    <span className="text-xs text-gray-400">{m.user_name}</span>
                  </div>
                  {m.attendees && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <span className="material-icons text-sm">people</span>
                      <span>参加者: {m.attendees}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.next_action && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-start gap-2">
                        <span className="material-icons text-sm text-orange-500 mt-0.5">flag</span>
                        <div>
                          <span className="text-xs font-medium text-orange-600">次のアクション</span>
                          <p className="text-sm text-gray-700 mt-0.5">{m.next_action}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
              <span className="material-icons text-5xl text-gray-300 mb-3 block">description</span>
              <p className="text-gray-500 text-sm">商談記録はまだ登録されていません</p>
              <p className="text-gray-400 text-xs mt-1">「商談記録を追加」ボタンから登録してください</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== 商談記録モーダル ==================== */}
      {meetingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMeetingModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg">商談記録を追加</h3>
              <button onClick={() => setMeetingModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日付 *</label>
                  <input type="date" className="form-input w-full" value={meetingForm.meeting_date} onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">種別 *</label>
                  <select className="form-input w-full" value={meetingForm.meeting_type} onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}>
                    {meetingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">参加者</label>
                <input className="form-input w-full" placeholder="例: 山田太郎, 高橋花子" value={meetingForm.attendees} onChange={(e) => setMeetingForm({ ...meetingForm, attendees: e.target.value })} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">内容 *</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="material-icons text-sm">{isRecording ? 'stop' : 'mic'}</span>
                      {isRecording ? '停止' : '音声入力'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAiFormat}
                      disabled={aiFormatting || !meetingForm.content.split('\n【音声入力中】')[0].trim()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-icons text-sm">auto_fix_high</span>
                      {aiFormatting ? 'AI整形中...' : 'AI議事録整形'}
                    </button>
                  </div>
                </div>
                <textarea
                  className={`form-input w-full ${isRecording ? 'border-red-300 bg-red-50/30' : ''}`}
                  rows={7}
                  placeholder={isRecording ? '音声を認識しています...' : '商談の内容を記録してください（音声入力も可能）'}
                  value={meetingForm.content}
                  onChange={(e) => setMeetingForm({ ...meetingForm, content: e.target.value })}
                />
                {isRecording && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    音声認識中...マイクに向かって話してください
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">次のアクション</label>
                <input className="form-input w-full" placeholder="例: 見積書を送付する" value={meetingForm.next_action} onChange={(e) => setMeetingForm({ ...meetingForm, next_action: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setMeetingModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleCreateMeeting} disabled={meetingSaving || !meetingForm.content.trim()} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {meetingSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 原価追加モーダル ==================== */}
      {costModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCostModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg">原価明細を追加</h3>
              <button onClick={() => setCostModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                  <input type="date" className="form-input w-full" value={costForm.cost_date} onChange={(e) => setCostForm({ ...costForm, cost_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
                  <select className="form-input w-full" value={costForm.category} onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}>
                    {COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">業者名</label>
                <input className="form-input w-full" placeholder="例: ○○塗装株式会社" value={costForm.vendor_name} onChange={(e) => setCostForm({ ...costForm, vendor_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <input className="form-input w-full" placeholder="例: 外壁塗装 材料一式" value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金額（円） *</label>
                <input type="number" className="form-input w-full" placeholder="0" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setCostModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleCreateCost} disabled={costSaving || !costForm.amount} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {costSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string | number; children?: React.ReactNode }) {
  return (
    <div className="flex items-start">
      <span className="text-sm text-gray-500 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-gray-900 flex-1">{children ?? value ?? '-'}</div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function getMeetingTypeBadge(type: string): string {
  const map: Record<string, string> = {
    '訪問': 'bg-blue-50 text-blue-700',
    '電話': 'bg-purple-50 text-purple-700',
    'オンライン': 'bg-cyan-50 text-cyan-700',
    'メール': 'bg-yellow-50 text-yellow-700',
    '来店': 'bg-green-50 text-green-700',
  };
  return map[type] || 'bg-gray-100 text-gray-700';
}
