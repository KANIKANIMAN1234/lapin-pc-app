'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';
import type { DashboardData } from '@/types';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function formatYen(v: number) {
  return `¥${(v / 10000).toLocaleString()}万`;
}

export default function BonusPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    api.getDashboard().then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-icons text-6xl text-red-400 mb-4">lock</span>
        <h2 className="text-xl font-bold text-gray-800 mb-2">アクセスできません</h2>
        <p className="text-gray-600">このページは社長（管理者）専用です。</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /><p className="ml-3 text-gray-500">読み込み中...</p></div>;
  }

  const bonus = data?.bonus_progress;
  const kpi = data?.kpi;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h2 className="text-xl font-bold">ボーナス計算（社長専用）- 固定費ベース方式</h2>
      </div>

      {bonus ? (
        <>
          <div className="bonus-overview">
            <div className="bonus-overview-card">
              <div className="bonus-overview-title">固定費負担額</div>
              <div className="bonus-overview-value">{formatYen(bonus.fixed_cost)}</div>
            </div>
            <div className="bonus-overview-card">
              <div className="bonus-overview-title">期間粗利</div>
              <div className="bonus-overview-value">{formatYen(bonus.gross_profit)}</div>
            </div>
            <div className="bonus-overview-card">
              <div className="bonus-overview-title">粗利 − 固定費</div>
              <div className="bonus-overview-value">{bonus.surplus >= 0 ? '+' : ''}{formatYen(bonus.surplus)}</div>
            </div>
            <div className="bonus-overview-card accent">
              <div className="bonus-overview-title">ボーナス見込み</div>
              <div className="bonus-overview-value">{formatYen(bonus.bonus_estimate)}</div>
              <div className="bonus-overview-sub">超過分 × {bonus.distribution_rate}%</div>
            </div>
          </div>

          <div className="my-bonus-progress-wrap mb-6">
            <div className="my-bonus-progress-labels">
              <span>0</span>
              <span>固定費 {formatYen(bonus.fixed_cost)}</span>
              <span>目標 {formatYen(bonus.target_amount)}</span>
            </div>
            <div className="my-bonus-progress-bar">
              <div className="my-bonus-progress-fill" style={{ width: `${Math.min(100, bonus.achievement_rate)}%` }} />
            </div>
            <div className="my-bonus-progress-current">
              達成率 {bonus.achievement_rate}%
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm mb-6">
          <span className="material-icons text-5xl mb-2">info</span>
          <p>現在のボーナス期間データがありません</p>
          <p className="text-sm mt-1">スプレッドシートのbonus_periodsシートを確認してください</p>
        </div>
      )}

      {kpi && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-bold mb-4">全体KPI</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><div className="text-sm text-gray-500">契約数</div><div className="text-2xl font-bold">{kpi.contract_count}件</div></div>
            <div><div className="text-sm text-gray-500">契約金額</div><div className="text-2xl font-bold">{formatYen(kpi.contract_amount)}</div></div>
            <div><div className="text-sm text-gray-500">粗利額</div><div className="text-2xl font-bold">{formatYen(kpi.gross_profit_amount)}</div></div>
            <div><div className="text-sm text-gray-500">粗利率</div><div className="text-2xl font-bold">{kpi.gross_profit_rate}%</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
