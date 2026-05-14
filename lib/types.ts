// ─── Core domain types for Rello v2 ─────────────────────────────────────────

export type AgentType = 'follow_up' | 'booking' | 'rescheduling'
export type AgentStatus = 'active' | 'inactive'
export type BookingStatus = 'pending' | 'confirmed' | 'rescheduled' | 'cancelled' | 'no_show'
export type MessageDirection = 'inbound' | 'outbound'
export type EventType = 'sms' | 'missed_call'

// ─── Supabase table row types ─────────────────────────────────────────────────

export interface Business {
  id: string
  owner_id: string // Supabase auth user id
  name: string
  phone: string
  address: string | null
  timezone: string // e.g. 'Pacific/Auckland'
  trading_hours: TradingHours
  booking_buffer_minutes: number
  cancellation_cutoff_hours: number
  clicksend_number: string | null
  twilio_number: string | null
  google_calendar_token: GoogleCalendarToken | null
  notification_email: string | null
  created_at: string
  updated_at: string
}

export interface TradingHours {
  monday: DayHours | null
  tuesday: DayHours | null
  wednesday: DayHours | null
  thursday: DayHours | null
  friday: DayHours | null
  saturday: DayHours | null
  sunday: DayHours | null
}

export interface DayHours {
  open: string   // '09:00'
  close: string  // '17:00'
}

export interface GoogleCalendarToken {
  access_token: string
  refresh_token: string
  expiry_date: number
  calendar_id: string
}

export interface Agent {
  id: string
  business_id: string
  type: AgentType
  name: string
  brief: string           // prompt written by business owner
  is_active: boolean
  working_hours: TradingHours | null  // null = follow business hours
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  business_id: string
  customer_phone: string
  customer_name: string | null
  last_message_at: string
  agent_type: AgentType | null  // which agent last handled it
  is_overridden: boolean        // owner took over manually
  no_show_count: number
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  business_id: string
  direction: MessageDirection
  body: string
  agent_type: AgentType | null  // null = sent by business owner
  sent_at: string
}

export interface Booking {
  id: string
  business_id: string
  conversation_id: string
  customer_phone: string
  customer_name: string | null
  service: string | null
  scheduled_at: string  // UTC ISO string
  duration_minutes: number
  status: BookingStatus
  google_calendar_event_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InboundEvent {
  id: string
  business_id: string
  type: EventType
  from_phone: string
  body: string | null  // null for missed_call
  raw_payload: Record<string, unknown>
  processed: boolean
  created_at: string
}

// ─── Orchestrator types ───────────────────────────────────────────────────────

export interface OrchestratorInput {
  event: InboundEvent
  business: Business
  agents: Agent[]
  conversation: Conversation | null
  recentMessages: Message[]
}

export interface OrchestratorDecision {
  agentType: AgentType
  context: string           // summary passed to the specialist agent
  shouldEscalate: boolean
  escalationReason?: string
}

export interface AgentResponse {
  reply: string
  bookingAction?: BookingAction
  escalate: boolean
  escalationReason?: string
}

export interface BookingAction {
  type: 'create' | 'reschedule' | 'cancel' | 'confirm'
  scheduledAt?: string  // UTC ISO
  service?: string
  durationMinutes?: number
  bookingId?: string    // for reschedule/cancel/confirm
}
