'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api, isApiConfigured } from '@/lib/api';

interface BonusPeriod {
  label: string;
  months_label: string;
  start_date: string;
  end_date: string;
  fixed_cost_per_person: number;
  distribution_rate: number;
  target_amount: number;
}

interface BonusEmployee {
  user_id: number;
  name: string;
  role: string;
  contract_count: number;
  contract_amount: number;
  gross_profit: number;
  fixed_cost: number;
  surplus: number;
  bonus_estimate: number;
  target_amount: number;
  achievement_rate: number;
  achievement: 'achieved' | 'barely' | 'not_achieved';
}

interface BonusSummary {
  total_employees: number;
  total_gross_profit: number;
  total_bonus: number;
  total_contract_count: number;
}

interface BonusData {
  period: BonusPeriod | null;
  employees: BonusEmployee[];
  summary: BonusSummary;
}

function formatYen(v: number) {
  if (v === 0) return '¥0万';
  const neg = v < 0;
  const abs = Math.abs(v);
  const str = abs >= 10000 ? `¥${(abs / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}万` : `¥${abs.toLocaleString()}`;
  return neg ? `-${str}` : str;
}

export default function BonusPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApiConfigured()) { setLoading(false); return; }
    api.getBonusOverview().then((res) => {
      if (res.success && res.data) setData(res.data as BonusData);
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

  const period = data?.period;
  const employees = data?.employees ?? [];
  const summary = data?.summary;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">ボーナス計算（社長専用）- 固定費ベース方式</h2>

      {period ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-lg">{period.label}</h3>
                <p className="text-sm text-gray-500">{period.months_label}（{period.start_date} 〜 {period.end_date}）</p>
              </div>
              <div className="flex gap-6 text-sm text-gray-600">
                <div>固定費/人: <span className="font-bold text-gray-900">{formatYen(period.fixed_cost_per_person)}</span></div>
                <div>分配率: <span className="font-bold text-gray-900">{period.distribution_rate}%</span></div>
                <div>目標: <span className="font-bold text-gray-900">{formatYen(period.target_amount)}</span></div>
              </div>
            </div>
          </div>

          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-sm text-gray-500">対象社員数</div>
                <div className="text-2xl font-bold mt-1">{summary.total_employees}名</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-sm text-gray-500">全体契約数</div>
                <div className="text-2xl font-bold mt-1">{summary.total_contract_count}件</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-sm text-gray-500">全体粗利合計</div>
                <div className="text-2xl font-bold mt-1">{formatYen(summary.total_gross_profit)}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-sm text-gray-500">ボーナス合計</div>
                <div className="text-2xl font-bold mt-1 text-green-600">{formatYen(summary.total_bonus)}</div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold">社員別ボーナス一覧</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>社員名</th>
                    <th>役職</th>
                    <th className="text-right">契約数</th>
                    <th className="text-right">契約金額</th>
                    <th className="text-right">粗利額</th>
                    <th className="text-right">固定費</th>
                    <th className="text-right">超過額</th>
                    <th className="text-right">ボーナス見込</th>
                    <th>達成率</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const achColor = emp.achievement === 'achieved' ? 'text-green-600' :
                      emp.achievement === 'barely' ? 'text-yellow-600' : 'text-red-500';
                    const barColor = emp.achievement === 'achieved' ? '#06C755' :
                      emp.achievement === 'barely' ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={emp.user_id}>
                        <td className="font-medium">{emp.name}</td>
                        <td>
                          <span className={`badge ${emp.role === 'sales' ? 'badge-blue' : 'badge-gray'}`}>
                            {emp.role === 'sales' ? '営業' : emp.role === 'staff' ? 'スタッフ' : emp.role}
                          </span>
                        </td>
                        <td className="text-right">{emp.contract_count}件</td>
                        <td className="text-right">{formatYen(emp.contract_amount)}</td>
                        <td className="text-right font-medium">{formatYen(emp.gross_profit)}</td>
                        <td className="text-right text-gray-500">{formatYen(emp.fixed_cost)}</td>
                        <td className={`text-right font-medium ${emp.surplus >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {emp.surplus >= 0 ? '+' : ''}{formatYen(emp.surplus)}
                        </td>
                        <td className="text-right font-bold text-green-700">{formatYen(emp.bonus_estimate)}</td>
                        <td style={{ minWidth: 140 }}>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, emp.achievement_rate)}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${achColor}`} style={{ minWidth: 40, textAlign: 'right' }}>
                              {emp.achievement_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-500">対象社員がいません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
          <span className="material-icons text-5xl mb-2">info</span>
          <p>現在のボーナス期間データがありません</p>
          <p className="text-sm mt-1">スプレッドシートのbonus_periodsシートを確認してください</p>
        </div>
      )}
    </div>
  );
}
