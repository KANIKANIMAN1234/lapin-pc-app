'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('今月');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesMode, setSalesMode] = useState<SalesPeriodMode>('month');

  const fetchDashboard = useCallback(() => {
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

    api.getDashboard({ start_date: startDate, end_date: endDate }).then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
  }, [period]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

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

  // --- Monthly sales chart data ---
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
      monthlySales.forEach((m, i) => {
        qData[Math.floor(i / 3)] += m.amount || 0;
      });
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

  // --- Acquisition route 100% stacked horizontal bar ---
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

  // --- Work type vertical bar chart ---
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">営業ダッシュボード: {data.user_name ?? user?.name ?? 'ユーザー'}</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="form-input w-auto">
          <option>今月</option>
          <option>今四半期</option>
          <option>今年</option>
        </select>
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
        {/* 月別売上推移（全幅） */}
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
          <div style={{ height: 350 }}>
            {isSalesBar ? (
              <Bar data={salesChartConfig} options={salesChartOptions as never} />
            ) : (
              <Line data={salesChartConfig} options={salesChartOptions as never} />
            )}
          </div>
        </div>

        {/* 集客ルート別案件数（100%積み上げ横棒） */}
        {routeChart.length > 0 && (
          <div className="chart-card">
            <h3 className="font-bold mb-4">集客ルート別案件数</h3>
            <div style={{ height: 200 }}>
              <Bar data={routeStackedData} options={routeStackedOptions as never} />
            </div>
          </div>
        )}

        {/* 工事種別別売上（縦棒グラフ） */}
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
