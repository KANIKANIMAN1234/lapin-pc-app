import type {
  ApiResponse,
  DashboardData,
  Employee,
  Expense,
  Photo,
  Project,
} from '@/types';

const GAS_URL = process.env.NEXT_PUBLIC_GAS_WEB_APP_URL || '';

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

export function isApiConfigured(): boolean {
  return !!GAS_URL;
}

async function requestGet<T>(
  action: string,
  params: Record<string, string> = {},
): Promise<ApiResponse<T>> {
  if (!GAS_URL) {
    console.warn('[API] GAS_URL未設定');
    return { success: false, error: 'GAS_URL未設定' };
  }
  const token = getToken();
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  if (token) url.searchParams.set('token', token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  console.log(`[API GET] ${action} → ${url.toString().substring(0, 120)}...`);

  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    console.log(`[API GET] ${action} status=${res.status} body=${text.substring(0, 300)}`);
    try {
      const json = JSON.parse(text);
      return json;
    } catch {
      console.error(`[API GET] ${action} JSONパースエラー: ${text.substring(0, 200)}`);
      return { success: false, error: 'レスポンスがJSONではありません' };
    }
  } catch (error) {
    console.error(`[API GET] ${action} ネットワークエラー:`, error);
    return { success: false, error: String(error) };
  }
}

async function requestPost<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<ApiResponse<T>> {
  if (!GAS_URL) return { success: false, error: 'GAS_URL未設定' };
  const token = getToken();
  console.log(`[API POST] ${action}`);
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, token: token || '', data }),
    });
    const text = await res.text();
    console.log(`[API POST] ${action} status=${res.status} body=${text.substring(0, 300)}`);
    try {
      const json = JSON.parse(text);
      return json;
    } catch {
      console.error(`[API POST] ${action} JSONパースエラー: ${text.substring(0, 200)}`);
      return { success: false, error: 'レスポンスがJSONではありません' };
    }
  } catch (error) {
    console.error(`[API POST] ${action} ネットワークエラー:`, error);
    return { success: false, error: String(error) };
  }
}

export const api = {
  getDashboard: (params?: Record<string, string>) =>
    requestGet<DashboardData>('getDashboard', params),

  getProjects: (params?: Record<string, string>) =>
    requestGet<{ projects: Project[]; total: number }>('getProjects', params ?? { limit: '500' }),

  getProject: (id: string) =>
    requestGet<{ project: Project }>('getProject', { project_id: id }),

  createProject: (data: Partial<Project>) =>
    requestPost<Project>('createProject', data as Record<string, unknown>),

  updateProject: (id: string, data: Partial<Project>) =>
    requestPost<Project>('updateProject', { project_id: id, ...data } as Record<string, unknown>),

  deleteProject: (id: string) =>
    requestPost<void>('deleteProject', { project_id: id }),

  getPhotos: (projectId: string) =>
    requestGet<{ photos: Photo[] }>('getPhotos', { project_id: projectId }),

  uploadPhoto: (data: Record<string, unknown>) =>
    requestPost<Photo>('uploadPhoto', data),

  getExpenses: (params?: Record<string, string>) =>
    requestGet<{ expenses: Expense[]; total: number }>('getExpenses', params ?? { limit: '200' }),

  createExpense: (data: Record<string, unknown>) =>
    requestPost<Expense>('createExpense', data),

  getFollowups: (params?: Record<string, string>) =>
    requestGet<{ followups: Project[]; total: number; overdue_count: number }>('getFollowups', params),

  getInspections: (params?: Record<string, string>) =>
    requestGet<{ inspections: unknown[]; total: number }>('getInspections', params),

  getEmployees: () =>
    requestGet<{ employees: Employee[]; total: number }>('getEmployees'),

  createEmployee: (data: Record<string, unknown>) =>
    requestPost<Employee>('createEmployee', data),

  updateEmployee: (data: Record<string, unknown>) =>
    requestPost<Employee>('updateEmployee', data),

  savePermissions: (permissions: unknown[]) =>
    requestPost<void>('savePermissions', { permissions }),

  ocrReceipt: (data: Record<string, unknown>) =>
    requestPost<{ amount: number; store_name: string; date: string; category: string; items: string }>('ocrReceipt', data),

  createAttendance: (data: Record<string, unknown>) =>
    requestPost<{ date: string; type: string; time: string; status: string }>('createAttendance', data),

  getAttendanceStatus: () =>
    requestGet<{ status: string; clock_in: string; break_start: string; break_end: string; clock_out: string; total_work_minutes?: number }>('getAttendanceStatus'),

  createSession: (idToken: string) =>
    requestPost<{ session_token: string; user: { id: string; name: string; email: string; role: string } }>('createSession', { id_token: idToken }),

  getCompanySettings: () =>
    requestGet<Record<string, string>>('getCompanySettings'),

  saveCompanySettings: (data: Record<string, unknown>) =>
    requestPost<void>('saveCompanySettings', data),

  getUserMapSettings: () =>
    requestGet<Record<string, string>>('getUserMapSettings'),

  saveUserMapSettings: (data: Record<string, unknown>) =>
    requestPost<void>('saveUserMapSettings', data),

  getUserInfo: () =>
    requestGet<{ id: string; name: string; role: string; avatar_url?: string }>('getUserInfo'),

  getBonusOverview: () =>
    requestGet<unknown>('getBonusOverview'),

  updateExpenseAccounting: (expenseId: string, imported: boolean) =>
    requestPost<{ expense_id: string; accounting_imported: boolean }>('updateExpenseAccounting', { expense_id: expenseId, accounting_imported: imported }),

  uploadProfilePhoto: (photoData: string) =>
    requestPost<{ avatar_url: string; drive_url: string }>('uploadProfilePhoto', { photo_data: photoData }),

  getMeetings: (projectId: string) =>
    requestGet<{ meetings: MeetingRecord[]; total: number }>('getMeetings', { project_id: projectId }),

  createMeeting: (data: { project_id: string; meeting_date: string; meeting_type: string; attendees: string; content: string; next_action: string }) =>
    requestPost<{ id: number; project_id: string }>('createMeeting', data),

  getCostItems: (projectId: string) =>
    requestGet<{ cost_items: CostItem[]; total: number; total_cost: number }>('getCostItems', { project_id: projectId }),

  createCostItem: (data: { project_id: string; cost_date: string; category: string; vendor_name: string; description: string; amount: number }) =>
    requestPost<{ id: number; project_id: string }>('createCostItem', data),

  getMasters: () =>
    requestGet<MasterData>('getMasters'),

  saveMasters: (masterType: string, values: string[]) =>
    requestPost<{ master_type: string; count: number }>('saveMasters', { master_type: masterType, values }),

  formatText: (inputText: string, formatType: string = 'meeting') =>
    requestPost<{ formatted_text: string }>('formatText', { input_text: inputText, format_type: formatType }),

  getPagePermissions: () =>
    requestGet<PagePermissionsData>('getPagePermissions'),

  savePagePermissions: (data: { role_master?: Record<string, Record<string, boolean>>; user_permissions?: { user_id: string; pages: Record<string, boolean> }[] }) =>
    requestPost<{ message: string }>('savePagePermissions', data),

  getAccountPhotos: () =>
    requestGet<{ photos: AccountPhoto[]; max: number }>('getAccountPhotos'),

  uploadAccountPhoto: (photoData: string, name?: string) =>
    requestPost<{ photo: AccountPhoto; photos: AccountPhoto[]; count: number; max: number }>('uploadAccountPhoto', { photo_data: photoData, name: name || '' }),

  deleteAccountPhoto: (photoId: string) =>
    requestPost<{ photos: AccountPhoto[]; count: number; max: number }>('deleteAccountPhoto', { photo_id: photoId }),

  saveCustomerPhoto: (projectId: string, data: { photo_url?: string; photo_data?: string }) =>
    requestPost<{ photo_url: string }>('saveCustomerPhoto', { project_id: projectId, ...data }),

  getNotices: (params?: { limit?: number; offset?: number }) =>
    requestGet<{ notices: Notice[] }>('getNotices', params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : {}),

  createNotice: (data: { title?: string; body: string; category?: string; is_pinned?: boolean }) =>
    requestPost<Notice>('createNotice', data),
};

export interface MeetingRecord {
  id: number;
  project_id: string;
  meeting_date: string;
  meeting_type: string;
  attendees: string;
  content: string;
  next_action: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface CostItem {
  id: number;
  project_id: string;
  cost_date: string;
  category: string;
  vendor_name: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface PagePermissionsData {
  role_master: Record<string, Record<string, boolean>>;
  user_permissions: { user_id: string; pages: Record<string, boolean> }[];
}

export interface MasterData {
  category: MasterItem[];
  meeting_type: MasterItem[];
  work_type: MasterItem[];
  acquisition_route: MasterItem[];
  [key: string]: MasterItem[];
}

export interface MasterItem {
  id: number;
  value: string;
  sort_order: number;
}

export interface AccountPhoto {
  id: string;
  url: string;
  name: string;
  created_at: string;
}

export interface Notice {
  id: number;
  user_id: string;
  user_name: string;
  user_role: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
}
