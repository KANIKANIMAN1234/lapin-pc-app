'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';
import type { Notice } from '@/lib/api';
import type { DashboardData } from '@/types';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title, Tooltip, Legend);

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06C755', '#ec4899'];

function formatYen(v: number) {
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}万円`;
  return `${v.toLocaleString()}円`;
}

type SalesPeriodMode = 'month' | 'quarter' | 'year';
type DashboardTab = 'management' | 'calendar' | 'notices';

const TABS: { key: DashboardTab; label: string; icon: string }[] = [
  { key: 'management', label: '管理業務', icon: 'dashboard' },
  { key: 'calendar', label: 'カレンダー', icon: 'calendar_today' },
  { key: 'notices', label: '連絡事項', icon: 'campaign' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<DashboardTab>('management');

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'management' && <ManagementTab user={user} />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'notices' && <NoticesTab user={user} />}
    </div>
  );
}

// ============================================================
// ① 管理業務タブ（既存ダッシュボード）
// ============================================================
function ManagementTab({ user }: { user: { name?: string } | null }) {
  const [period, setPeriod] = useState('今月');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesMode, setSalesMode] = useState<SalesPeriodMode>('month');

  const fetchDashboard = useCallback(async () => {
    if (!isApiConfigured()) { setLoading(false); return; }
    setLoading(true);

    const now = new Date();
    let startDate: string;
    let endDate: string;

    if (period === '今四半期') {
      const q = Math.floor(now.getMonth() / 3);
      startDate = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
      const endMonth = q * 3 + 3;
      endDate = `${now.getFullYear()}-${String(endMonth).padStart(2, '0')}-${new Date(now.getFullYear(), endMonth, 0).getDate()}`;
    } else if (period === '今年') {
      startDate = `${now.getFullYear()}-01-01`;
      endDate = `${now.getFullYear()}-12-31`;
    } else {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
    }

    const params = { start_date: startDate, end_date: endDate };
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = await api.getDashboard(params);
      if (res.success && res.data) {
        setData(res.data);
        setLoading(false);
        return;
      }
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  void setPeriod;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-500">
        <span className="material-icons text-5xl mb-2">cloud_off</span>
        <p>ダッシュボードデータの取得に失敗しました</p>
        <p className="text-sm mt-1">GAS WebアプリURLが正しく設定されているか確認してください</p>
      </div>
    );
  }

  const kpi = data.kpi;
  const comp = data.comparison as unknown as Record<string, number> | undefined;
  const bonus = data.bonus_progress;

  const kpiItems = [
    { title: '担当案件数', value: String(kpi.assigned_projects_count), unit: '件', change: comp?.assigned_projects_count_change },
    { title: '見込み金額', value: formatYen(kpi.assigned_projects_amount), unit: '', change: comp?.assigned_projects_amount_change, isMoney: true },
    { title: '送客金額', value: formatYen(kpi.sent_estimates_amount ?? 0), unit: '', change: undefined },
    { title: '見積もり数', value: String(kpi.sent_estimates_count), unit: '件', change: undefined },
    { title: '契約数', value: String(kpi.contract_count), unit: '件', change: comp?.contract_count_change },
    { title: '契約平均単価', value: kpi.average_contract_amount > 0 ? formatYen(kpi.average_contract_amount) : '-', unit: '', change: undefined },
    { title: '契約率', value: String(kpi.contract_rate), unit: '%', change: comp?.contract_rate_change },
    { title: '粗利率', value: String(kpi.gross_profit_rate), unit: '%', change: undefined },
  ];

  const monthlySales = data.charts?.monthly_sales ?? [];
  const getSalesChartData = () => {
    if (salesMode === 'year') {
      return {
        type: 'bar' as const,
        labels: ['前々年度', '前年度', '今年度'],
        data: [0, 0, monthlySales.reduce((s, m) => s + (m.amount || 0), 0)],
      };
    }
    if (salesMode === 'quarter') {
      const qLabels = ['Q1 (4-6月)', 'Q2 (7-9月)', 'Q3 (10-12月)', 'Q4 (1-3月)'];
      const qData = [0, 0, 0, 0];
      monthlySales.forEach((m, i) => { qData[Math.floor(i / 3)] += m.amount || 0; });
      return { type: 'bar' as const, labels: qLabels, data: qData };
    }
    return {
      type: 'line' as const,
      labels: monthlySales.map((m) => m.month),
      data: monthlySales.map((m) => m.amount || 0),
    };
  };
  const salesChart = getSalesChartData();
  const isSalesBar = salesChart.type === 'bar';

  const salesChartConfig = {
    labels: salesChart.labels,
    datasets: [{
      label: '売上',
      data: salesChart.data,
      borderColor: '#06C755',
      backgroundColor: isSalesBar ? 'rgba(6, 199, 85, 0.6)' : 'rgba(6, 199, 85, 0.1)',
      tension: 0.4,
      fill: !isSalesBar,
      pointBackgroundColor: '#06C755',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: isSalesBar ? 0 : 5,
      borderRadius: isSalesBar ? 6 : 0,
    }],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => {
            if (ctx.parsed.y == null) return 'データなし';
            return '売上: ' + ctx.parsed.y.toLocaleString() + '円';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => (Number(value) / 10000).toLocaleString() + '万円',
        },
      },
    },
  };

  const routeChart = data.charts?.acquisition_route ?? [];
  const routeTotal = routeChart.reduce((s, r) => s + r.count, 0);
  const routeStackedData = {
    labels: ['集客ルート'],
    datasets: routeChart.map((r, i) => ({
      label: r.route,
      data: [r.count],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
      barPercentage: 0.6,
    })),
  };
  const routeStackedOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        max: routeTotal || 1,
        ticks: {
          callback: (value: number | string) => Math.round(Number(value) / (routeTotal || 1) * 100) + '%',
          font: { size: 10 },
        },
        grid: { display: false },
      },
      y: { stacked: true, display: false },
    },
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 10 }, padding: 8 } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
            const pct = routeTotal > 0 ? ((Number(ctx.raw) / routeTotal) * 100).toFixed(1) : '0';
            return `${ctx.dataset.label}: ${ctx.raw}件 (${pct}%)`;
          },
        },
      },
    },
  };

  const workChart = data.charts?.work_type ?? [];
  const workBarData = {
    labels: workChart.map((w) => w.type),
    datasets: [{
      label: '売上',
      data: workChart.map((w) => w.amount),
      backgroundColor: workChart.map((_, i) => {
        const colors = ['#06C755', '#05a948', '#3b82f6', '#2563eb', '#1d4ed8', '#8b5cf6', '#a78bfa'];
        return colors[i % colors.length];
      }),
      borderRadius: 4,
    }],
  };
  const workBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => '売上: ' + ctx.parsed.y.toLocaleString() + '円',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => (Number(value) / 10000).toLocaleString() + '万円',
        },
      },
    },
  };

  const renderChange = (change: number | undefined, isMoney?: boolean) => {
    if (change === undefined || change === null) return null;
    const isPos = change > 0;
    const isNeg = change < 0;
    const arrow = isPos ? '↑' : isNeg ? '↓' : '';
    const sign = isPos ? '+' : '';
    const cls = isPos ? 'kpi-change positive' : isNeg ? 'kpi-change negative' : 'kpi-change';
    const display = isMoney ? `${sign}${formatYen(change)}` : `${sign}${change}`;
    return <div className={cls}>{arrow} {display}</div>;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold">営業ダッシュボード: {data.user_name ?? user?.name ?? 'ユーザー'}</h2>
      </div>

      <div className="kpi-grid">
        {kpiItems.map((item) => (
          <div key={item.title} className="kpi-card">
            <div className="kpi-title">{item.title}</div>
            <div className="kpi-value">
              {item.value}
              {item.unit && <span className="kpi-unit">{item.unit}</span>}
            </div>
            {renderChange(item.change, item.isMoney)}
          </div>
        ))}
      </div>

      {bonus && (
        <div className="my-bonus-section">
          <div className="my-bonus-header">
            <h3>
              <span className="material-icons" style={{ color: '#f59e0b' }}>emoji_events</span>{' '}
              マイボーナス進捗（{bonus.period_label}）
            </h3>
            <span className="my-bonus-period">{bonus.period_months}</span>
          </div>
          <div className="my-bonus-grid">
            <div className="my-bonus-card">
              <div className="my-bonus-label">固定費負担額</div>
              <div className="my-bonus-value">{formatYen(bonus.fixed_cost)}</div>
            </div>
            <div className="my-bonus-card">
              <div className="my-bonus-label">期間粗利</div>
              <div className="my-bonus-value">{formatYen(bonus.gross_profit)}</div>
            </div>
            <div className={`my-bonus-card ${bonus.surplus >= 0 ? 'highlight-positive' : ''}`}>
              <div className="my-bonus-label">粗利 − 固定費</div>
              <div className="my-bonus-value">{bonus.surplus >= 0 ? '+' : ''}{formatYen(bonus.surplus)}</div>
            </div>
            <div className="my-bonus-card highlight-accent">
              <div className="my-bonus-label">ボーナス見込み</div>
              <div className="my-bonus-value">{formatYen(bonus.bonus_estimate)}</div>
              <div className="my-bonus-sub">超過分 × {bonus.distribution_rate}%</div>
            </div>
          </div>
          <div className="my-bonus-progress-wrap">
            <div className="my-bonus-progress-labels">
              <span>0</span>
              <span className="my-bonus-breakeven-label">固定費 {formatYen(bonus.fixed_cost)}</span>
              <span>目標 {formatYen(bonus.target_amount)}</span>
            </div>
            <div className="my-bonus-progress-bar">
              <div className="my-bonus-progress-fill" style={{ width: `${Math.min(100, bonus.achievement_rate)}%` }} />
              {bonus.target_amount > 0 && (
                <div className="my-bonus-breakeven-line" style={{ left: `${Math.min(100, (bonus.fixed_cost / bonus.target_amount) * 100)}%` }} />
              )}
            </div>
            <div className="my-bonus-progress-current">
              現在: {formatYen(bonus.gross_profit)}（達成率 {bonus.achievement_rate}%）
            </div>
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card chart-card-wide">
          <div className="chart-header">
            <h3 className="font-bold">月別売上推移</h3>
            <div className="chart-period-tabs">
              {([['month', '月'], ['quarter', '四半期'], ['year', '年']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  className={`chart-tab ${salesMode === mode ? 'active' : ''}`}
                  onClick={() => setSalesMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 210 }}>
            {isSalesBar ? (
              <Bar data={salesChartConfig} options={salesChartOptions as never} />
            ) : (
              <Line data={salesChartConfig} options={salesChartOptions as never} />
            )}
          </div>
        </div>

        {routeChart.length > 0 && (
          <div className="chart-card">
            <h3 className="font-bold mb-4">集客ルート別案件数</h3>
            <div style={{ height: 200 }}>
              <Bar data={routeStackedData} options={routeStackedOptions as never} />
            </div>
          </div>
        )}

        {workChart.length > 0 && (
          <div className="chart-card">
            <h3 className="font-bold mb-4">工事種別別売上</h3>
            <div className="h-64">
              <Bar data={workBarData} options={workBarOptions as never} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ② カレンダータブ
// ============================================================
function CalendarTab() {
  const [calendarId, setCalendarId] = useState('');
  const [inputId, setInputId] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('google_calendar_id');
    if (saved) setCalendarId(saved);
  }, []);

  const saveCalendarId = () => {
    const id = inputId.trim();
    if (id) {
      localStorage.setItem('google_calendar_id', id);
      setCalendarId(id);
      setShowSettings(false);
    }
  };

  const encodedId = encodeURIComponent(calendarId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="material-icons text-green-600">calendar_today</span>
          Googleカレンダー
        </h2>
        <button
          onClick={() => { setShowSettings(!showSettings); setInputId(calendarId); }}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1"
        >
          <span className="material-icons" style={{ fontSize: 14 }}>settings</span>
          カレンダー設定
        </button>
      </div>

      {showSettings && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-blue-800 mb-2 font-medium">GoogleカレンダーIDを設定</p>
          <p className="text-xs text-blue-600 mb-3">
            Googleカレンダーの「設定と共有」→「カレンダーの統合」からカレンダーIDをコピーしてください。
            <br />通常は <code className="bg-blue-100 px-1 rounded">xxxxx@group.calendar.google.com</code> の形式です。
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="カレンダーID（例: abc123@group.calendar.google.com）"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button onClick={saveCalendarId} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              保存
            </button>
            <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {calendarId ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <iframe
            src={`https://calendar.google.com/calendar/embed?src=${encodedId}&ctz=Asia%2FTokyo&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0`}
            style={{ border: 0, width: '100%', height: '100%' }}
            title="Google Calendar"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <span className="material-icons text-gray-200" style={{ fontSize: 64 }}>calendar_today</span>
          <p className="text-gray-400 mt-4">GoogleカレンダーIDが設定されていません</p>
          <button
            onClick={() => setShowSettings(true)}
            className="mt-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 inline-flex items-center gap-1"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>settings</span>
            カレンダーIDを設定
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ③ 連絡事項タブ
// ============================================================

const NOTICE_CATEGORIES = [
  { value: 'general', label: '連絡事項', color: 'bg-blue-50 text-blue-700' },
  { value: 'notice', label: 'お知らせ', color: 'bg-green-50 text-green-700' },
  { value: 'tip', label: '今日のお気づき', color: 'bg-yellow-50 text-yellow-700' },
];

function NoticesTab({ user }: { user: { id?: string; name?: string; role?: string } | null }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formPinned, setFormPinned] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchNotices = useCallback(async () => {
    if (!isApiConfigured()) { setLoading(false); return; }
    const res = await api.getNotices({ limit: 50 });
    if (res.success && res.data?.notices) {
      setNotices(res.data.notices);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const handlePost = async () => {
    if (!formBody.trim()) return;
    setPosting(true);
    const res = await api.createNotice({
      title: formTitle.trim(),
      body: formBody.trim(),
      category: formCategory,
      is_pinned: formPinned,
    });
    if (res.success && res.data) {
      setNotices((prev) => [res.data as Notice, ...prev]);
      setFormTitle('');
      setFormBody('');
      setFormCategory('general');
      setFormPinned(false);
      setShowForm(false);
    }
    setPosting(false);
  };

  const getCategoryBadge = (cat: string) => {
    const c = NOTICE_CATEGORIES.find((nc) => nc.value === cat);
    if (!c) return null;
    return <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${c.color}`}>{c.label}</span>;
  };

  const formatDate = (d: string) => {
    try {
      const dt = new Date(d);
      const now = new Date();
      const diff = now.getTime() - dt.getTime();
      if (diff < 60000) return 'たった今';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}日前`;
      return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch { return d; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="material-icons text-green-600">campaign</span>
          連絡事項
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 inline-flex items-center gap-1"
        >
          <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
          投稿する
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        投稿するとLINE友達登録済みの全メンバーに通知が送信されます
      </p>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-green-600" style={{ fontSize: 16 }}>person</span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name || 'ユーザー'}</p>
              <p className="text-[10px] text-gray-400">{user?.role === 'admin' ? '管理者' : '従業員'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {NOTICE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="件名（任意）"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder="連絡内容を入力してください..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={formPinned} onChange={(e) => setFormPinned(e.target.checked)} className="rounded" />
                ピン留め（上部に固定）
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handlePost}
                  disabled={!formBody.trim() || posting}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {posting ? (
                    <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> 送信中...</>
                  ) : (
                    <><span className="material-icons" style={{ fontSize: 14 }}>send</span> 投稿＆通知</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="material-icons text-gray-200" style={{ fontSize: 48 }}>forum</span>
          <p className="text-gray-400 mt-3">まだ連絡事項はありません</p>
          <p className="text-xs text-gray-300 mt-1">「投稿する」ボタンから最初の投稿をしましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`bg-white rounded-xl border p-5 ${notice.is_pinned ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notice.user_role === 'admin' ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <span className={`material-icons ${notice.user_role === 'admin' ? 'text-red-600' : 'text-green-600'}`} style={{ fontSize: 18 }}>
                    {notice.user_role === 'admin' ? 'admin_panel_settings' : 'person'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium">{notice.user_name}</span>
                    {notice.user_role === 'admin' && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded">管理者</span>
                    )}
                    {getCategoryBadge(notice.category)}
                    {notice.is_pinned && (
                      <span className="material-icons text-yellow-500" style={{ fontSize: 14 }}>push_pin</span>
                    )}
                    <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">{formatDate(notice.created_at)}</span>
                  </div>
                  {notice.title && (
                    <h4 className="text-sm font-bold mb-1">{notice.title}</h4>
                  )}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{notice.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
