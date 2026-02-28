'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';
import type { DashboardData } from '@/types';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const CHART_COLORS = ['#06C755', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1', '#10b981'];

function formatYen(v: number) {
  if (v >= 10000) return `${Math.floor(v / 10000).toLocaleString()}万円`;
  return `${v.toLocaleString()}円`;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('今月');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  const bonus = data.bonus_progress;

  const kpiItems = [
    { title: '担当案件数', value: String(kpi.assigned_projects_count), unit: '件' },
    { title: '見込み金額', value: formatYen(kpi.assigned_projects_amount), unit: '' },
    { title: '見積もり数', value: String(kpi.sent_estimates_count), unit: '件' },
    { title: '契約数', value: String(kpi.contract_count), unit: '件' },
    { title: '契約金額', value: formatYen(kpi.contract_amount), unit: '' },
    { title: '契約率', value: String(kpi.contract_rate), unit: '%' },
    { title: '契約平均単価', value: kpi.average_contract_amount > 0 ? formatYen(kpi.average_contract_amount) : '-', unit: '' },
    { title: '粗利率', value: String(kpi.gross_profit_rate), unit: '%' },
  ];

  const routeChart = data.charts?.acquisition_route ?? [];
  const routeChartData = {
    labels: routeChart.map((r) => r.route),
    datasets: [{
      data: routeChart.map((r) => r.count),
      backgroundColor: CHART_COLORS.slice(0, routeChart.length),
    }],
  };

  const workChart = data.charts?.work_type ?? [];
  const workTypeChartData = {
    labels: workChart.map((w) => w.type),
    datasets: [{
      data: workChart.map((w) => w.amount),
      backgroundColor: CHART_COLORS.slice(0, workChart.length),
    }],
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
        {routeChart.length > 0 && (
          <div className="chart-card">
            <h3 className="font-bold mb-4">集客ルート別案件数</h3>
            <div className="h-64">
              <Doughnut data={routeChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
        )}
        {workChart.length > 0 && (
          <div className="chart-card">
            <h3 className="font-bold mb-4">工事種別別売上</h3>
            <div className="h-64">
              <Doughnut data={workTypeChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
