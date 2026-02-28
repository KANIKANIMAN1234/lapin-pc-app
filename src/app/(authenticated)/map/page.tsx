'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapCustomer } from '@/components/features/map/MapContent';
import Link from 'next/link';

const MapContent = dynamic(() => import('@/components/features/map/MapContent'), { ssr: false });

const STATUS_LABELS: Record<string, string> = {
  completed: '完工',
  in_progress: '施工中',
  estimate: '見積中',
  contract: '契約済',
};

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<MapCustomer | null>(null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h2 className="text-xl font-bold">OB顧客マップ</h2>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="顧客名・住所で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-64"
          />
          <button type="button" className="btn-secondary">
            <span className="material-icons text-lg">tune</span>
            エリア設定
          </button>
        </div>
      </div>

      {/* Map container */}
      <div className="map-container">
        <div className="map-view">
          <MapContent
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />
        </div>
        <div className="customer-info-panel">
          <div className="text-sm text-gray-600 mb-3">
            <span className="material-icons text-base align-middle mr-1">place</span>
            マップエリア: 埼玉県狭山市・入間市周辺
          </div>
          {selectedCustomer ? (
            <>
              <div className="font-bold text-lg mb-1">{selectedCustomer.name}</div>
              <div className="text-sm text-gray-600 mb-2">
                {selectedCustomer.address ?? '住所未登録'}
              </div>
              <span className={`badge badge-${
                selectedCustomer.status === 'completed' ? 'green' :
                selectedCustomer.status === 'in_progress' ? 'blue' :
                selectedCustomer.status === 'contract' ? 'purple' : 'yellow'
              }`}>
                {STATUS_LABELS[selectedCustomer.status] ?? selectedCustomer.status}
              </span>
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 mb-2">工事履歴</div>
                <ul className="space-y-1.5">
                  {selectedCustomer.workHistory && selectedCustomer.workHistory.length > 0 ? (
                    selectedCustomer.workHistory.map((h, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-gray-500 shrink-0">{h.date}</span>
                        <span>{h.work}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">
                      {selectedCustomer.lastWork}
                    </li>
                  )}
                </ul>
              </div>
              <Link
                href={`/projects?customer=${selectedCustomer.id}`}
                className="btn-primary mt-4 w-full justify-center"
              >
                案件詳細を見る
              </Link>
            </>
          ) : (
            <div className="text-gray-500 text-sm mt-4">
              <p>マップ上のマーカーをクリックして顧客情報を表示</p>
              <div className="mt-4 text-xs">
                <p className="font-medium mb-2">マーカー色の凡例:</p>
                <ul className="space-y-1">
                  <li><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1.5 align-middle" />完工</li>
                  <li><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1.5 align-middle" />施工中</li>
                  <li><span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1.5 align-middle" />見積中</li>
                  <li><span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1.5 align-middle" />契約済</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
