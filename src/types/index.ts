// User & Auth
export type UserRole = 'admin' | 'manager' | 'sales' | 'office';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  avatar_url?: string;
  line_user_id?: string;
  status: 'active' | 'retired';
}

// Project (案件)
export type ProjectStatus =
  | 'inquiry'
  | 'estimate'
  | 'followup_status'
  | 'contract'
  | 'in_progress'
  | 'completed'
  | 'lost';

export interface Project {
  id: string;
  project_number: string;
  customer_name: string;
  customer_name_kana?: string;
  postal_code?: string;
  address: string;
  phone: string;
  email?: string;
  work_description: string;
  work_type: string[]; // Multiple selection
  estimated_amount: number;
  contract_amount?: number;
  acquisition_route: string;
  assigned_to: string;
  assigned_to_name?: string;
  status: ProjectStatus;
  inquiry_date: string;
  contract_date?: string;
  planned_budget?: number;
  actual_budget?: number;
  actual_cost?: number;
  gross_profit?: number;
  gross_profit_rate?: number;
  thankyou_flag?: boolean;
  followup_flag?: boolean;
  inspection_flag?: boolean;
  lat?: number;
  lng?: number;
  drive_folder_id?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

// KPI
export interface DashboardKPI {
  assigned_projects_count: number;
  assigned_projects_amount: number;
  sent_estimates_count: number;
  sent_estimates_amount: number;
  contract_count: number;
  contract_amount: number;
  contract_rate: number;
  average_contract_amount: number;
  gross_profit_rate: number;
  gross_profit_amount: number;
  cpa: number;
  cpo: number;
}

export interface KPIComparison {
  assigned_projects_count_change: number;
  contract_amount_change: number;
  contract_rate_change: number;
}

// Bonus Progress
export interface BonusProgress {
  period_label: string;
  period_months: string;
  fixed_cost: number;
  gross_profit: number;
  surplus: number;
  bonus_estimate: number;
  target_amount: number;
  achievement_rate: number;
  distribution_rate: number;
}

// Charts
export interface MonthlySalesData {
  month: string;
  amount: number;
}

export interface AcquisitionRouteData {
  route: string;
  count: number;
  amount: number;
}

export interface WorkTypeData {
  type: string;
  count: number;
  amount: number;
}

// Dashboard Response
export interface DashboardData {
  user_id: string;
  user_name: string;
  period: { start_date: string; end_date: string };
  kpi: DashboardKPI;
  comparison: KPIComparison;
  bonus_progress: BonusProgress | null;
  charts: {
    monthly_sales: MonthlySalesData[];
    acquisition_route: AcquisitionRouteData[];
    work_type: WorkTypeData[];
  };
}

// Expense (経費)
export interface Expense {
  id: string;
  project_id?: string;
  project_number?: string;
  amount: number;
  date: string;
  category: string;
  memo?: string;
  receipt_url?: string;
  user_id: string;
  created_at: string;
}

// Followup (追客)
export interface Followup {
  id: string;
  project_id: string;
  project_number: string;
  customer_name: string;
  status: 'pending' | 'completed' | 'skipped';
  due_date: string;
  last_contact_date?: string;
  action_type: string;
  memo?: string;
  assigned_to: string;
}

// Inspection (点検)
export interface Inspection {
  id: string;
  project_id: string;
  project_number: string;
  customer_name: string;
  inspection_type: string; // '1年点検', '3年点検', etc.
  scheduled_date: string;
  status: 'scheduled' | 'completed' | 'overdue';
  notes?: string;
}

// Photo
export interface Photo {
  id: string;
  project_id: string;
  url: string;
  thumbnail_url?: string;
  photo_type:
    | 'before'
    | 'inspection'
    | 'pre_construction'
    | 'undercoat'
    | 'during'
    | 'after'
    | 'completed'
    | 'other';
  memo?: string;
  taken_date?: string;
  created_at: string;
}

// Budget Item
export interface BudgetItem {
  id: string;
  project_id: string;
  item_name: string;
  planned_amount: number;
  planned_vendor?: string;
  actual_amount?: number;
  actual_vendor?: string;
  difference?: number;
}

// Meeting Record (商談記録)
export interface Meeting {
  id: string;
  project_id: string;
  date: string;
  author: string;
  title: string;
  summary: string;
  content?: string;
}

// Bonus Calculation (社長用)
export interface BonusEmployee {
  name: string;
  user_id: string;
  fixed_cost: number;
  gross_profit: number;
  surplus: number;
  achievement: 'achieved' | 'barely' | 'not_achieved';
  bonus_target: number;
  final_bonus: number;
}

// Employee
export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  join_date: string;
  status: 'active' | 'retired';
  line_user_id?: string;
  retired_date?: string;
  retired_reason?: string;
}

// Permission
export interface UserPermission {
  user_id: string;
  user_name: string;
  role: UserRole;
  status: 'active' | 'retired';
  pages: {
    dashboard: boolean;
    projects: boolean;
    expense: boolean;
    followup: boolean;
    inspection: boolean;
    map: boolean;
    thankyou: boolean;
    bonus: boolean;
    admin: boolean;
    sp_register: boolean;
  };
}

// Notification
export interface AppNotification {
  id: string;
  type: 'line_message' | 'project' | 'inspection' | 'followup' | 'photo';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Thank You Letter
export interface ThankYouCustomer {
  id: string;
  name: string;
  last_work: string;
  annual_contact: string;
  status: string;
  selected?: boolean;
}
