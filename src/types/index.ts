export type UserRole = "admin" | "client";

export type TradingDay = {
  open: string;
  close: string;
  enabled: boolean;
};

export type TradingHours = {
  monday: TradingDay;
  tuesday: TradingDay;
  wednesday: TradingDay;
  thursday: TradingDay;
  friday: TradingDay;
  saturday: TradingDay;
  sunday: TradingDay;
};

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  industry: string;
  phone: string;
  sms_number: string | null;
  timezone: string;
  trading_hours: TradingHours;
  followup_enabled: boolean;
  booking_enabled: boolean;
  reschedule_enabled: boolean;
  followup_name: string;
  booking_name: string;
  reschedule_name: string;
  followup_brief: string;
  booking_brief: string;
  reschedule_brief: string;
  notify_email_escalation: boolean;
  notify_email_booking: boolean;
  notify_sms_escalation: boolean;
  google_calendar_token: string | null;
  google_calendar_email: string | null;
  google_calendar_id: string | null;
  created_at: string;
};

export type Call = {
  id: string;
  business_id: string;
  caller_number: string;
  called_at: string;
  followup_sent: boolean;
  followup_sent_at: string | null;
};

export type AgentType = "followup" | "booking" | "rescheduling";
export type ConversationStatus = "active" | "escalated" | "resolved" | "manual";

export type Conversation = {
  id: string;
  business_id: string;
  call_id: string | null;
  customer_number: string;
  customer_name: string | null;
  agent_type: AgentType;
  status: ConversationStatus;
  manual_override: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
};

export type MessageRole = "agent" | "customer";

export type Message = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";

export type Booking = {
  id: string;
  business_id: string;
  conversation_id: string | null;
  customer_name: string;
  customer_number: string;
  service: string;
  scheduled_at: string;
  status: BookingStatus;
  calendar_event_id: string | null;
  created_at: string;
};

export type ActivityItem = {
  id: string;
  type: "booking_confirmed" | "followup_sent" | "missed_call" | "rescheduled" | "escalated";
  description: string;
  customer_number?: string;
  created_at: string;
};

export type DashboardData = {
  kpis: {
    calls_handled: number;
    bookings_confirmed: number;
    followups_sent: number;
  };
  agents: {
    followup: { name: string; enabled: boolean; messages_today: number; last_active: string | null };
    booking: { name: string; enabled: boolean; messages_today: number; last_active: string | null };
    rescheduling: { name: string; enabled: boolean; messages_today: number; last_active: string | null };
  };
  activity: ActivityItem[];
  upcoming_bookings: Booking[];
};

export type AnalyticsData = {
  chart: { date: string; bookings: number; calls: number }[];
  metrics: {
    bookings_confirmed: number;
    calls_handled: number;
    followups_sent: number;
    avg_response_seconds: number;
    conversion_rate: number;
  };
  bookings: Booking[];
};
