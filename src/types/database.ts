export type OrgPlan = "trial" | "starter" | "pro" | "business";
export type OrgRole = "owner" | "manager" | "staff";
export type AppointmentStatus = "talep" | "onaylandi" | "tamamlandi" | "iptal" | "gelmedi";
export type AppointmentSource = "web" | "whatsapp" | "instagram" | "telefon" | "yuzyuze";
export type CampaignType = "birthday" | "inactive" | "custom";
export type BadgeType = "superstar" | "speedmaster" | "customer_fav" | "rising_star";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  type: string;
  locale: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  logo_url: string | null;
  cover_url: string | null;
  instagram_handle: string | null;
  whatsapp_number: string | null;
  working_hours_json: Record<string, { open: string; close: string } | null>;
  plan: OrgPlan;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  max_staff: number;
  max_appointments_monthly: number;
  feature_ai: boolean;
  feature_campaigns: boolean;
  feature_gamification: boolean;
  feature_api: boolean;
  feature_whitelabel: boolean;
  wa_token: string | null;
  wa_phone_number_id: string | null;
  ig_page_access_token: string | null;
  ig_page_id: string | null;
  custom_reminder_message: string | null;
  custom_cancellation_message: string | null;
  whatsapp_notifications_enabled: boolean;
  settings_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  staff_id: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  org_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  working_days: number[];
  start_time: string;
  end_time: string;
  commission_rate: number;
  display_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category_tag: string;
  contributes_loyalty: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Customer {
  id: string;
  org_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  notes: string | null;
  tags: string[];
  loyalty_punches: number;
  loyalty_redeems: number;
  score: number;
  score_breakdown: Record<string, number>;
  total_spend: number;
  visit_count: number;
  last_visit_at: string | null;
  referred_by_customer_id: string | null;
  referral_count: number;
  source: string;
  kvkk_consent: boolean;
  kvkk_consent_at: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  org_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  staff_id: string;
  service_id: string;
  appointment_at: string;
  duration_minutes: number;
  price: number;
  tip: number;
  status: AppointmentStatus;
  source: AppointmentSource;
  note: string | null;
  internal_note: string | null;
  payment_method: string | null;
  cancel_token: string;
  cancel_reason: string | null;
  reminder_sent_at: string | null;
  reminder2_sent_at: string | null;
  loyalty_punch_added: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  staff?: Staff;
  service?: Service;
  customer?: Customer;
}

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  type: CampaignType;
  message_template: string;
  channel: string;
  segment_json: Record<string, unknown>;
  status: string;
  sent_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface StaffPerformanceWeekly {
  id: string;
  org_id: string;
  staff_id: string;
  week_start: string;
  appointments_done: number;
  total_revenue: number;
  no_show_count: number;
  repeat_customers: number;
  score: number;
  rank: number;
  is_top: boolean;
  staff?: Staff;
}

export interface StaffBadge {
  id: string;
  org_id: string;
  staff_id: string;
  badge_type: BadgeType;
  badge_month: string;
  awarded_at: string;
  staff?: Staff;
}

export interface DashboardStats {
  today_revenue: number;
  today_appointments: number;
  week_revenue: number;
  week_appointments: number;
  month_revenue: number;
  new_customers_month: number;
  no_show_rate: number;
}
