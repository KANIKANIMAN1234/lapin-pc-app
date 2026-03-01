'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { MapCustomer } from '@/components/features/map/MapContent';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSearchParams } from 'next/navigation';
import { api, isApiConfigured } from '@/lib/api';

const MapContent = dynamic(() => import('@/components/features/map/MapContent'), { ssr: false });

const STATUS_LABELS: Record<string, string> = {
  completed: '完工',
  in_progress: '施工中',
  estimate: '見積中',
  contract: '契約済',
};

const DEFAULT_CENTER: [number, number] = [35.853, 139.412];

export default function MapPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const focusProjectId = searchParams.get('focus') || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<MapCustomer | null>(null);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [focusCenter, setFocusCenter] = useState<[number, number] | null>(null);

  const [areaType, setAreaType] = useState<'company' | 'custom'>('company');
  const [customAddress, setCustomAddress] = useState('');
  const [savedCenter, setSavedCenter] = useState<[number, number] | undefined>(undefined);
  const [savedAreaAddress, setSavedAreaAddress] = useState('');
  const [savedAreaSource, setSavedAreaSource] = useState('（会社住所を使用中）');
  const [mapSettingsLoaded, setMapSettingsLoaded] = useState(false);
  const [filterMyOnly, setFilterMyOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const isSales = user?.role === 'sales' || user?.role === 'manager';

  const loadMapSettings = useCallback(() => {
    if (!isApiConfigured()) return;
    api.getUserMapSettings().then((res) => {
      if (res.success && res.data) {
        const d = res.data as Record<string, string>;
        if (d.center_lat && d.center_lng) {
          setSavedCenter([Number(d.center_lat), Number(d.center_lng)]);
        }
        if (d.area_type) setAreaType(d.area_type as 'company' | 'custom');
        if (d.custom_address) setCustomAddress(d.custom_address);
        if (d.area_address) setSavedAreaAddress(d.area_address);
        if (d.area_source) setSavedAreaSource(d.area_source);
        if (d.filter_my_only === 'true') setFilterMyOnly(true);
      }
      setMapSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!mapSettingsLoaded) loadMapSettings();
  }, [mapSettingsLoaded, loadMapSettings]);

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    setGeocoding(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const results = await resp.json();
      if (results.length > 0) {
        return [Number(results[0].lat), Number(results[0].lon)];
      }
      return null;
    } catch {
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  const handleSaveArea = async () => {
    setSaving(true);
    let lat = DEFAULT_CENTER[0];
    let lng = DEFAULT_CENTER[1];
    let areaAddress = '';
    let areaSource = '（会社住所を使用中）';

    if (areaType === 'custom' && customAddress.trim()) {
      const coords = await geocodeAddress(customAddress);
      if (coords) {
        [lat, lng] = coords;
        areaAddress = customAddress;
        areaSource = '（カスタム住所を使用中）';
      } else {
        alert('住所から座標を取得できませんでした。住所を確認してください。');
        setSaving(false);
        return;
      }
    } else {
      const companyRes = await api.getCompanySettings();
      if (companyRes.success && companyRes.data) {
        const addr = (companyRes.data as Record<string, string>).address || '';
        if (addr) {
          const coords = await geocodeAddress(addr);
          if (coords) [lat, lng] = coords;
          areaAddress = addr;
          areaSource = '（会社住所を使用中）';
        }
      }
    }

    await api.saveUserMapSettings({
      center_lat: String(lat),
      center_lng: String(lng),
      area_type: areaType,
      custom_address: customAddress,
      area_address: areaAddress,
      area_source: areaSource,
    });

    setSavedCenter([lat, lng]);
    setSavedAreaAddress(areaAddress);
    setSavedAreaSource(areaSource);
    setShowAreaModal(false);
    setSaving(false);
  };

  const handleToggleMyOnly = async (checked: boolean) => {
    setFilterMyOnly(checked);
    if (isApiConfigured()) {
      await api.saveUserMapSettings({ filter_my_only: String(checked) });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold">OB顧客マップ</h2>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="顧客名・住所で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-56"
          />
          {isSales && (
            <label className="toggle-label text-xs whitespace-nowrap">
              <input type="checkbox" checked={filterMyOnly} onChange={(e) => handleToggleMyOnly(e.target.checked)} />
              自分の担当のみ
            </label>
          )}
          <button
            type="button"
            className="btn-area-setting"
            onClick={() => setShowAreaModal(true)}
          >
            <span className="material-icons" style={{ fontSize: 16 }}>settings</span>
            エリア設定
          </button>
        </div>
      </div>

      <div className="map-container">
        <div className="map-view">
          <MapContent
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            center={focusCenter || savedCenter}
            filterMyOnly={filterMyOnly}
            currentUserId={user?.id ? String(user.id) : undefined}
            focusProjectId={focusProjectId}
            onFocusResolved={(customer, coords) => {
              setSelectedCustomer(customer);
              setFocusCenter(coords);
            }}
          />
        </div>
        <div className="customer-info-panel">
          <div className="map-area-info">
            <div className="map-area-badge">
              <span className="material-icons">my_location</span> 初期表示エリア
            </div>
            <p className="map-area-address">{savedAreaAddress || '埼玉県狭山市南入曽580-1'}</p>
            <p className="map-area-source">{savedAreaSource}</p>
          </div>
          <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
          {selectedCustomer ? (
            <>
              <h3 className="text-lg font-semibold mb-1">{selectedCustomer.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{selectedCustomer.address ?? '住所未登録'}</p>
              <span className={`badge badge-${
                selectedCustomer.status === 'completed' ? 'green' :
                selectedCustomer.status === 'in_progress' ? 'blue' :
                selectedCustomer.status === 'contract' ? 'purple' : 'yellow'
              }`}>
                {STATUS_LABELS[selectedCustomer.status] ?? selectedCustomer.status}
              </span>
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">工事履歴</h4>
                <ul className="history-list">
                  {selectedCustomer.workHistory && selectedCustomer.workHistory.length > 0 ? (
                    selectedCustomer.workHistory.map((h, i) => (
                      <li key={i}>{h.date}: {h.work}</li>
                    ))
                  ) : (
                    <li>{selectedCustomer.lastWork}</li>
                  )}
                </ul>
              </div>
              <Link href={`/projects?customer=${selectedCustomer.id}`} className="btn-primary mt-4 w-full justify-center">
                案件詳細を見る
              </Link>
            </>
          ) : (
            <div className="text-gray-500 text-sm mt-2">
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

      {/* エリア設定モーダル */}
      {showAreaModal && (
        <div className="modal-overlay" onClick={() => setShowAreaModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span className="material-icons text-green-600">map</span>
                地図 初期表示エリア設定
              </h3>
              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setShowAreaModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="map-area-option-group">
                <label className={`map-area-option ${areaType === 'company' ? 'selected' : ''}`}>
                  <input type="radio" name="map-area-type" value="company" checked={areaType === 'company'} onChange={() => setAreaType('company')} />
                  <div className="map-area-option-body">
                    <div className="map-area-option-header">
                      <span className="material-icons text-green-600">domain</span>
                      <strong>会社住所（デフォルト）</strong>
                    </div>
                    <p className="map-area-option-desc">管理画面の企業情報に登録された住所を使用します</p>
                  </div>
                </label>
                <label className={`map-area-option ${areaType === 'custom' ? 'selected' : ''}`}>
                  <input type="radio" name="map-area-type" value="custom" checked={areaType === 'custom'} onChange={() => setAreaType('custom')} />
                  <div className="map-area-option-body">
                    <div className="map-area-option-header">
                      <span className="material-icons text-green-600">edit_location_alt</span>
                      <strong>カスタム住所を指定</strong>
                    </div>
                    <p className="map-area-option-desc">任意のエリアを初期表示に設定できます</p>
                  </div>
                </label>
              </div>
              {areaType === 'custom' && (
                <div className="map-area-custom-input">
                  <label className="block text-sm font-semibold mb-1">表示エリアの住所</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例: 東京都渋谷区神宮前1-1-1"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAreaModal(false)}>キャンセル</button>
              <button className="btn-primary" onClick={handleSaveArea} disabled={saving || geocoding}>
                <span className="material-icons text-base">save</span>
                {saving || geocoding ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
