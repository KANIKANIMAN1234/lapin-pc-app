import type { ProjectStatus } from '@/types';

export const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  inquiry: { label: '問い合わせ', class: 'status-inquiry' },
  estimate: { label: '見積もり', class: 'status-estimate' },
  followup_status: { label: '追客', class: 'status-followup_status' },
  contract: { label: '契約', class: 'status-contract' },
  in_progress: { label: '工事中', class: 'status-in_progress' },
  completed: { label: '完工', class: 'status-completed' },
  lost: { label: '失注', class: 'status-lost' },
};

export const WORK_TYPES = ['外壁塗装', '屋根塗装', '水回り', '内装', '外構'];

export const STATUS_OPTIONS: ProjectStatus[] = [
  'inquiry',
  'estimate',
  'followup_status',
  'contract',
  'in_progress',
  'completed',
  'lost',
];
