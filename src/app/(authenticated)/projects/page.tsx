'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, isApiConfigured } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/mockProjects';
import type { Project } from '@/types';

const WORK_TYPE_FILTERS = ['外壁塗装', '屋根塗装', '水回り', '内装'];
const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['inquiry', 'estimate', 'followup_status', 'contract', 'in_progress', 'completed'] as const;

const formatAmount = (n: number) =>
  n >= 10000 ? `${Math.floor(n / 10000)}万` : n.toLocaleString();

export default function ProjectsListPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectNumber, setProjectNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [assignedName, setAssignedName] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [workTypeFilters, setWorkTypeFilters] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    api.getProjects({ limit: '500' }).then((res) => {
      if (res.success && res.data?.projects) setProjects(res.data.projects);
      setLoading(false);
    });
  }, []);

  const toggleStatus = (s: string) => {
    setStatusFilters((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setCurrentPage(1);
  };
  const toggleWorkType = (w: string) => {
    setWorkTypeFilters((prev) => { const n = new Set(prev); n.has(w) ? n.delete(w) : n.add(w); return n; });
    setCurrentPage(1);
  };
  const resetSearch = () => { setProjectNumber(''); setCustomerName(''); setAssignedName(''); setYear(''); setMonth(''); setCurrentPage(1); };
  const clearFilters = () => { setStatusFilters(new Set()); setWorkTypeFilters(new Set()); setCurrentPage(1); };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (projectNumber && !(p.project_number || '').includes(projectNumber)) return false;
      if (customerName && !(p.customer_name || '').includes(customerName)) return false;
      if (assignedName && !(p.assigned_to_name || '').includes(assignedName)) return false;
      if (year || month) {
        const d = (p.inquiry_date || '').split('-');
        if (year && d[0] !== year) return false;
        if (month && d[1] !== month) return false;
      }
      if (statusFilters.size > 0 && !statusFilters.has(p.status)) return false;
      if (workTypeFilters.size > 0) {
        const types = Array.isArray(p.work_type) ? p.work_type : String(p.work_type || '').split(',').map((s) => s.trim());
        if (!Array.from(workTypeFilters).some((f) => types.some((t) => t.includes(f)))) return false;
      }
      return true;
    });
  }, [projects, projectNumber, customerName, assignedName, year, month, statusFilters, workTypeFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const years = ['2026', '2025', '2024'];
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">案件一覧（{filtered.length}件）</h2>
        <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2">
          <span className="material-icons text-lg">add</span>新規登録
        </Link>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <div className="search-field"><label>管理番号</label><input type="text" placeholder="例: 2026-001" value={projectNumber} onChange={(e) => setProjectNumber(e.target.value)} /></div>
          <div className="search-field"><label>お客様名</label><input type="text" placeholder="お客様名で検索" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div className="search-field"><label>担当者名</label><input type="text" placeholder="担当者名で検索" value={assignedName} onChange={(e) => setAssignedName(e.target.value)} /></div>
          <div className="search-field" style={{ minWidth: '100px' }}><label>年</label><select value={year} onChange={(e) => setYear(e.target.value)}><option value="">--</option>{years.map((y) => <option key={y} value={y}>{y}年</option>)}</select></div>
          <div className="search-field" style={{ minWidth: '90px' }}><label>月</label><select value={month} onChange={(e) => setMonth(e.target.value)}><option value="">--</option>{months.map((m) => <option key={m} value={m}>{m}月</option>)}</select></div>
          <button type="button" className="btn-secondary" onClick={resetSearch}>リセット</button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="filter-panel">
          <div className="filter-group"><h4>ステータス</h4>
            {STATUS_OPTIONS.map((s) => <label key={s}><input type="checkbox" checked={statusFilters.has(s)} onChange={() => toggleStatus(s)} />{STATUS_LABELS[s]?.label ?? s}</label>)}
          </div>
          <div className="filter-group"><h4>工事種別</h4>
            {WORK_TYPE_FILTERS.map((w) => <label key={w}><input type="checkbox" checked={workTypeFilters.has(w)} onChange={() => toggleWorkType(w)} />{w}</label>)}
          </div>
          <button type="button" className="btn-secondary w-full" onClick={clearFilters}>クリア</button>
        </div>

        <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>管理番号</th><th>顧客名</th><th>住所</th><th>工事種別</th><th>見込み金額</th><th>営業担当者</th><th>ステータス</th><th>問い合わせ日</th></tr></thead>
              <tbody>
                {paginated.map((p) => {
                  const types = Array.isArray(p.work_type) ? p.work_type : String(p.work_type || '').split(',').map((s) => s.trim());
                  return (
                    <tr key={p.id} className="cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                      <td className="font-medium">{p.project_number}</td>
                      <td>{p.customer_name}</td>
                      <td className="max-w-[180px] truncate" title={p.address}>{p.address}</td>
                      <td>{types.join(', ')}</td>
                      <td>{formatAmount(Number(p.estimated_amount) || 0)}円</td>
                      <td>{p.assigned_to_name}</td>
                      <td><span className={`badge ${STATUS_LABELS[p.status]?.class ?? 'badge-gray'}`}>{STATUS_LABELS[p.status]?.label ?? p.status}</span></td>
                      <td>{String(p.inquiry_date || '').substring(0, 10)}</td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-500">案件が見つかりません</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((n) => Math.max(1, n - 1))} className="disabled:opacity-50 disabled:cursor-not-allowed px-2">前へ</button>
            <span>ページ {currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((n) => Math.min(totalPages, n + 1))} className="disabled:opacity-50 disabled:cursor-not-allowed px-2">次へ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
