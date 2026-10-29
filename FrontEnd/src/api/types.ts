export interface ApiError {
  message: string;
}

export interface ApiResult<T> {
  data: T;
  error: ApiError | null;
}

export interface Club {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  default_monthly_fee: number;
  fee_due_day: number;
  version: number;
  cover_url?: string;
  logo_url?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  language: string;
}

export interface Membership {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
}

export interface Workspace {
  clubs: Club[];
  memberships: Membership[];
  profile: Profile | null;
}

export interface Player {
  id: string;
  club_id: string;
  name: string;
  phone: string | null;
  active: boolean;
  shirt_number: number | null;
  position: string;
  category: string;
  monthly_fee: number;
  scholarship: "none" | "partial" | "full";
  discount_percent: number;
  joined_at: string;
  birth_date: string | null;
  notes: string;
  inactivated_at?: string | null;
  version: number;
}

export interface StaffMember {
  id: string;
  club_id: string;
  name: string;
  phone: string | null;
  role_title: string;
  email: string | null;
  active: boolean;
  version: number;
}

export interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  category: string | null;
  responsible?: string | null;
  description?: string | null;
  status: string;
  attendance_closed: boolean;
  series_id?: string | null;
  deleted_at?: string | null;
  delete_reason?: string | null;
  version: number;
}

export interface Attendance {
  id: string;
  event_id: string;
  player_id: string;
  status: "present" | "absent" | "justified" | "excluded";
  version: number;
}

export interface Metric {
  id: string;
  name: string;
  unit: string;
  description?: string | null;
  version: number;
}

export interface Measurement {
  id: string;
  player_id: string;
  type_id: string;
  value: number;
  measured_at: string;
  notes?: string | null;
  version: number;
}

export interface MembershipFee {
  id: string;
  player_id: string;
  competence: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  version: number;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  category: string;
  kind: "income" | "expense";
  amount: number;
  due_date: string;
  paid_at?: string | null;
  status: string;
  method?: string | null;
  version: number;
}

export interface AuditEntry {
  id: string;
  entity: string;
  operation: string;
  created_at: string;
  user_id?: string;
  before?: unknown;
  after?: unknown;
}

export interface ClubMember extends Membership {}

export interface ClubData {
  players: Player[];
  staff: StaffMember[];
  events: ClubEvent[];
  attendance: Attendance[];
  metrics: Metric[];
  measurements: Measurement[];
  fees: MembershipFee[];
  transactions: FinancialTransaction[];
  audit: AuditEntry[];
  members: ClubMember[];
}

export type Database = {
  public: {
    Tables: {
      clubs: { Row: Club };
      players: { Row: Player };
      staff_members: { Row: StaffMember };
      events: { Row: ClubEvent };
      membership_fees: { Row: MembershipFee };
    };
    Enums: {
      attendance_status: Attendance["status"];
    };
  };
};
