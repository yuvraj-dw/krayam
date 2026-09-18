/**
 * KRAYAM Agri-Procurement API Client Layer
 * Connected to FastAPI Backend (https://hizru.me)
 * OpenAPI / Swagger spec: https://hizru.me/openapi.json
 */

import {
  FarmerProfile,
  Booking,
  ProcurementCentre,
  CropInfo,
  ProcurementRecord,
  PaymentRecord,
  AppNotification,
  SlotTimeWindow,
  OperatorProfile,
  TimeSlot,
  RecommendedCentreItem
} from '../types';
import { formatSlotWindow } from '../utils/geo';

// Normalize Base URL to ensure /api/v1 routing
export function resolveApiBaseUrl(): string {
  const envUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'https://hizru.me/api'
  ).trim();

  // Strip trailing /docs or /docs/
  let clean = envUrl.replace(/\/docs\/?$/, '').replace(/\/+$/, '');

  // If user provided https://hizru.me/api -> https://hizru.me/api/v1
  if (clean.endsWith('/api')) {
    return `${clean}/v1`;
  }
  // If user provided https://hizru.me -> https://hizru.me/api/v1
  if (!clean.endsWith('/api/v1')) {
    return `${clean}/api/v1`;
  }

  return clean;
}

export const API_BASE_URL = resolveApiBaseUrl();

// --- Standardized API Error Handling ---
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN_ERROR';

export class ApiError extends Error {
  public code: ApiErrorCode;
  public status?: number;
  public details?: any;

  constructor(message: string, code: ApiErrorCode = 'UNKNOWN_ERROR', status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
export interface BackendHealthResponse {
  status: string;
}

export interface BackendCentreCrop {
  id: string;
  crop_name: string;
  rate_per_unit: number | null;
  min_price_per_unit: number | null;
  max_price_per_unit: number | null;
  unit: string;
  is_active: boolean;
}

export interface BackendCentre {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  capacity: number;
  operating_start: string;
  operating_end: string;
  is_active: boolean;
  crops: BackendCentreCrop[];
  created_at: string;
}

export interface BackendSlot {
  id: string;
  centre_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  current_bookings: number;
  is_available: boolean;
}

export interface BackendBooking {
  id: string;
  booking_id: string;
  farmer_id: string;
  centre_id?: string | null;
  slot_id?: string | null;
  crop: string;
  quantity: number;
  unit: string;
  expected_date: string;
  is_walk_in: boolean;
  status: 'pending' | 'confirmed' | 'checked_in' | 'processing' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface BackendFarmer {
  id: string;
  phone: string;
  name: string;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  farmer_id?: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface BackendQRCodeResponse {
  type: string;
  reference_id: string;
  qr_data: string;
  svg: string;
  data_url: string;
}

export interface BackendQueueEntry {
  id: string;
  booking_id: string;
  centre_id: string;
  position: number;
  status: string;
  checked_in_at?: string | null;
  called_at?: string | null;
}

export interface BackendQueueSummary {
  centre_id: string;
  waiting: BackendQueueEntry[];
  total_waiting: number;
  current_position?: number | null;
  estimated_wait_minutes?: number | null;
}

export interface BackendProcurement {
  id: string;
  procurement_id: string;
  booking_id: string;
  accepted_quantity: number;
  unit_price: number;
  quality_grade?: string | null;
  unit: string;
  quality_notes?: string | null;
  processing_start?: string | null;
  processing_end?: string | null;
  status: string;
  created_at: string;
}

export interface BackendPayment {
  id: string;
  payment_id: string;
  procurement_id: string;
  booking_id?: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_phone?: string;
  quantity: number;
  rate: number;
  amount: number;
  status: 'initiated' | 'pending_verification' | 'confirmed' | 'failed' | 'cancelled' | 'pending' | 'verified' | 'credited';
  verified_by?: string | null;
  verified_at?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  anomaly_flags?: string[];
}

export interface BackendOperator {
  id: string;
  name: string;
  phone: string;
  centre_id: string;
  is_active: boolean;
}

export interface BackendNotificationItem {
  id: string;
  farmer_id?: string;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface BackendQueueOverview {
  waiting_count: number;
  called_count: number;
  processing_count: number;
  estimated_wait_minutes: number;
}

export interface BackendProcurementOverview {
  completed_today_count: number;
  total_tonnage_today: number;
}

export interface BackendPaymentOverview {
  pending_count: number;
  pending_amount: number;
  flagged_count: number;
}

export interface BackendCapacityOverview {
  daily_capacity: number;
  utilization_percent: number;
}

export interface BackendSyncOverview {
  max_outbox_id: number;
}

export interface OperatorDashboardData {
  centre_id: string;
  today: string;
  bookings_today_total: number;
  queue: BackendQueueOverview;
  procurement: BackendProcurementOverview;
  payments: BackendPaymentOverview;
  capacity: BackendCapacityOverview;
  sync: BackendSyncOverview;
}

export interface BackendAnalyticsSummary {
  centre_id: string;
  from_date: string;
  to_date: string;
  farmers_served: number;
  total_quantity_procured: number;
  avg_waiting_minutes: number | null;
  avg_processing_minutes: number | null;
  no_shows: number;
  cancellations: number;
  pending_payments_count: number;
  pending_payments_amount: number;
  completed_payments_count: number;
  completed_payments_amount: number;
  arrivals_by_hour?: Record<string, number>;
  peak_hour?: number | null;
}

export interface BackendAnalyticsForecast {
  centre_id: string;
  date: string;
  capacity: number;
  active_bookings: number;
  booked_quantity: number;
  historical_avg_arrivals: number;
  expected_arrivals: number;
  expected_load_percent: number;
  predicted_wait_minutes: number;
  warnings: string[];
}

export interface SyncCentreInfo {
  id: string;
  name: string;
  code: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity: number;
  operating_start: string;
  operating_end: string;
  is_active: boolean;
}

export interface SyncCropInfo {
  id: string;
  name: string;
  category: string;
  variety?: string;
  season?: string;
  is_active: boolean;
}

export interface SyncSlotInfo {
  id: string;
  centre_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  current_bookings: number;
  is_available: boolean;
}

export interface SyncSnapshotResponse {
  centre: SyncCentreInfo;
  crops: SyncCropInfo[];
  slots: SyncSlotInfo[];
  bookings: BackendBooking[];
  waitlist: BackendQueueEntry[];
}

export interface OutboxEventResponse {
  id: number;
  centre_id?: string | null;
  farmer_id?: string | null;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  data?: Record<string, any> | null;
  actor_type?: string | null;
  actor_id?: string | null;
  client_event_id?: string | null;
  created_at: string;
}

export interface SyncPullResponse {
  events: OutboxEventResponse[];
  next_cursor: number;
  has_more: boolean;
}

export interface SyncEventIn {
  client_event_id: string;
  type: string;
  expected_current_state?: Record<string, any>;
  payload?: Record<string, any>;
}

export interface SyncEventResult {
  client_event_id: string;
  status: 'accepted' | 'duplicate' | 'conflicting' | 'rejected';
  error?: string | null;
  server_current_state?: Record<string, any> | null;
}

export interface SyncBatchRequest {
  events: SyncEventIn[];
}

export interface SyncBatchResponse {
  results: SyncEventResult[];
}

class ApiClient {
  public baseUrl: string;
  private token: string | null = null;
  private operatorToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('krayam_auth_token');
    this.operatorToken = localStorage.getItem('krayam_operator_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('krayam_auth_token', token);
    } else {
      localStorage.removeItem('krayam_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setOperatorToken(token: string | null) {
    this.operatorToken = token;
    if (token) {
      localStorage.setItem('krayam_operator_token', token);
    } else {
      localStorage.removeItem('krayam_operator_token');
    }
  }

  public getOperatorToken(): string | null {
    return this.operatorToken;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}, useOperatorToken = false): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const authToken = useOperatorToken
      ? (this.operatorToken || this.token)
      : (this.token || this.operatorToken);

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s request timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = '';
        if (typeof errorData.detail === 'string') {
          message = errorData.detail;
        } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
          message = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else if (errorData.error?.message) {
          message = errorData.error.message;
        } else if (errorData.message) {
          message = errorData.message;
        } else {
          message = `HTTP Error ${response.status}: ${response.statusText}`;
        }

        let errorCode: ApiErrorCode = 'UNKNOWN_ERROR';
        if (response.status === 401 || response.status === 403) {
          errorCode = 'AUTH_ERROR';
        } else if (response.status === 404) {
          errorCode = 'NOT_FOUND';
        } else if (response.status === 422) {
          errorCode = 'VALIDATION_ERROR';
        } else if (response.status >= 500) {
          errorCode = 'SERVER_ERROR';
        }

        throw new ApiError(message, errorCode, response.status, errorData);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err instanceof ApiError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new ApiError('Request timed out while connecting to the backend. Please try again.', 'NETWORK_ERROR');
      }
      const isNetErr = (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err.message === 'Failed to fetch' ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to load') ||
        err.message?.includes('network');
      const msg = isNetErr
        ? 'Unable to connect to the server. Please try again.'
        : (err.message || 'Unable to connect to the server. Please try again.');
      throw new ApiError(msg, 'NETWORK_ERROR');
    }
  }

  // --- Health Check ---
  public async healthCheck(): Promise<{ ok: boolean; status: string }> {
    const data = await this.request<BackendHealthResponse>('/health', { method: 'GET' });
    return { ok: data.status === 'ok', status: data.status };
  }

  // --- Authentication Endpoints ---
  public auth = {
    sendOtp: async (phone: string): Promise<{ success: boolean; message: string }> => {
      let cleanPhone = phone.replace(/[^\d+]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.length === 10) {
          cleanPhone = `+91${cleanPhone}`;
        }
      }
      if (!/^\+91[6-9]\d{9}$/.test(cleanPhone) && !/^\+\d{10,15}$/.test(cleanPhone)) {
        throw new ApiError('Please enter a valid 10-digit Indian mobile number.', 'VALIDATION_ERROR');
      }
      const data = await this.request<{ message?: string; success?: boolean; status?: string }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone }),
      });
      if (!data || (!data.message && data.success !== true && data.status !== 'ok')) {
        throw new ApiError('Backend did not confirm OTP generation. Please try again.', 'SERVER_ERROR');
      }
      return { success: true, message: data.message || 'OTP sent successfully' };
    },

    verifyOtp: async (phone: string, code: string): Promise<{
      token: string;
      farmerId: string | null;
      isRegistered: boolean;
      farmerProfile?: FarmerProfile;
    }> => {
      let cleanPhone = phone.replace(/[^\d+]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.length === 10) {
          cleanPhone = `+91${cleanPhone}`;
        }
      }
      const cleanCode = code.trim();
      if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
        throw new ApiError('Please enter a valid 6-digit OTP code.', 'VALIDATION_ERROR');
      }
      const data = await this.request<{
        access_token: string;
        token_type: string;
        farmer_id: string | null;
        is_registered: boolean;
      }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone, code: cleanCode }),
      });

      this.setToken(data.access_token);
      this.setOperatorToken(null);
      try {
        localStorage.removeItem('krayam_operator_profile');
      } catch {}

      let farmerProfile: FarmerProfile | undefined;
      if (data.is_registered) {
        try {
          const profile = await this.auth.getMe();
          if (profile) farmerProfile = profile;
        } catch {
          // If profile fetch fails immediately, it can be retried by state manager
        }
      }

      return {
        token: data.access_token,
        farmerId: data.farmer_id,
        isRegistered: data.is_registered,
        farmerProfile,
      };
    },

    register: async (farmerData: {
      name: string;
      village?: string;
      district?: string;
      state?: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    }): Promise<FarmerProfile> => {
      const backendFarmer = await this.request<BackendFarmer>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(farmerData),
      });
      return this.transformFarmer(backendFarmer);
    },

    getMe: async (): Promise<FarmerProfile | null> => {
      try {
        const backendFarmer = await this.request<BackendFarmer>('/farmers/me', { method: 'GET' });
        return this.transformFarmer(backendFarmer);
      } catch (err: any) {
        if (err.status === 401 || (err.message && err.message.includes('401'))) {
          this.setToken(null);
        }
        throw err;
      }
    },

    updateMe: async (data: {
      name?: string;
      village?: string;
      district?: string;
      state?: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    }): Promise<FarmerProfile> => {
      const updated = await this.request<BackendFarmer>('/farmers/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return this.transformFarmer(updated);
    },

    logout: (): void => {
      this.setToken(null);
      this.setOperatorToken(null);
      try {
        localStorage.removeItem('krayam_operator_profile');
      } catch (e) {
        // ignore
      }
    },

    operatorLogin: async (phone: string, password: string): Promise<{
      token: string;
      operator: OperatorProfile;
    }> => {
      // Clear any prior farmer session so operator authentication is isolated
      this.setToken(null);

      const data = await this.request<{
        access_token: string;
        token_type: string;
        operator: BackendOperator;
      }>('/operator/login', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim(), password }),
      });

      this.setOperatorToken(data.access_token);

      const opProfile: OperatorProfile = {
        operatorId: data.operator.id,
        name: data.operator.name,
        designation: 'Mandi Procurement Supervisor',
        centreId: data.operator.centre_id,
        centreName: 'APMC Mandi Centre',
        mobile: data.operator.phone,
        shift: 'Day Shift (08:00 AM - 06:00 PM)',
      };

      try {
        localStorage.setItem('krayam_operator_profile', JSON.stringify(opProfile));
      } catch (e) {
        // ignore
      }

      return {
        token: data.access_token,
        operator: opProfile,
      };
    },

    operatorRegister: async (payload: {
      name: string;
      phone: string;
      password: string;
      centre_id: string;
      serviceKey?: string;
    }): Promise<BackendOperator> => {
      const headers: Record<string, string> = {};
      if (payload.serviceKey?.trim()) {
        headers['x-service-key'] = payload.serviceKey.trim();
      }
      return await this.request<BackendOperator>('/operator/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: payload.name.trim(),
          phone: payload.phone.trim(),
          password: payload.password,
          centre_id: payload.centre_id,
        }),
      });
    },
  };

  // --- Centres & Slots Endpoints ---
  public centres = {
    getAll: async (crop?: string): Promise<ProcurementCentre[]> => {
      const endpoint = crop ? `/centres?crop=${encodeURIComponent(crop)}` : '/centres';
      const backendCentres = await this.request<BackendCentre[]>(endpoint, { method: 'GET' });
      return backendCentres.map((c) => this.transformCentre(c));
    },

    getById: async (centreId: string): Promise<ProcurementCentre> => {
      const backendCentre = await this.request<BackendCentre>(`/centres/${centreId}`, { method: 'GET' });
      return this.transformCentre(backendCentre);
    },

    getSlots: async (centreId: string, onDate?: string): Promise<BackendSlot[]> => {
      const url = `/slots?centre_id=${encodeURIComponent(centreId)}${
        onDate ? `&on_date=${encodeURIComponent(onDate)}` : ''
      }`;
      return await this.request<BackendSlot[]>(url, { method: 'GET' });
    },
  };

  // --- Bookings Endpoints ---
  public bookings = {
    getMyBookings: async (): Promise<Booking[]> => {
      const data = await this.request<BackendBooking[]>('/bookings', { method: 'GET' });
      return data.map((b) => this.transformBooking(b));
    },

    getById: async (bookingId: string): Promise<Booking> => {
      const cleanId = bookingId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (!isUuid) {
        throw new ApiError('Unable to identify this booking. Please refresh your bookings and try again.', 'VALIDATION_ERROR');
      }
      const b = await this.request<BackendBooking>(`/bookings/${cleanId}`, { method: 'GET' });
      return this.transformBooking(b);
    },

    create: async (payload: {
      crop: string;
      quantity: number;
      unit?: string;
      expectedDate: string;
      centreId?: string | null;
      slotId?: string | null;
      slotWindow?: SlotTimeWindow;
    }): Promise<Booking> => {
      const backendBooking = await this.request<BackendBooking>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          crop: payload.crop,
          quantity: payload.quantity,
          unit: payload.unit || 'quintal',
          expected_date: payload.expectedDate,
          centre_id: payload.centreId || null,
          slot_id: payload.slotId || null,
        }),
      });

      return this.transformBooking(backendBooking, undefined, payload.slotWindow);
    },

    cancel: async (bookingId: string, useOperatorToken?: boolean): Promise<Booking> => {
      const cleanId = bookingId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (!isUuid) {
        throw new ApiError('Unable to identify this booking. Please refresh your bookings and try again.', 'VALIDATION_ERROR');
      }
      const shouldUseOperator = useOperatorToken !== undefined ? useOperatorToken : Boolean(this.operatorToken);
      const b = await this.request<BackendBooking>(
        `/bookings/${cleanId}/cancel`,
        { method: 'POST' },
        shouldUseOperator
      );
      return this.transformBooking(b);
    },

    reschedule: async (bookingId: string, data: {
      expectedDate?: string;
      centreId?: string | null;
      slotId?: string | null;
      slotWindow?: SlotTimeWindow;
    }, useOperatorToken?: boolean): Promise<Booking> => {
      const cleanId = bookingId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (!isUuid) {
        throw new ApiError('Unable to identify this booking. Please refresh your bookings and try again.', 'VALIDATION_ERROR');
      }
      const shouldUseOperator = useOperatorToken !== undefined ? useOperatorToken : Boolean(this.operatorToken);
      const b = await this.request<BackendBooking>(`/bookings/${cleanId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          expected_date: data.expectedDate,
          centre_id: data.centreId || null,
          slot_id: data.slotId || null,
        }),
      }, shouldUseOperator);
      return this.transformBooking(b, undefined, data.slotWindow);
    },

    getQr: async (bookingId: string): Promise<BackendQRCodeResponse> => {
      const cleanId = bookingId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (!isUuid) {
        throw new ApiError('Unable to identify this booking. Please refresh your bookings and try again.', 'VALIDATION_ERROR');
      }
      return await this.request<BackendQRCodeResponse>(`/bookings/${cleanId}/qr`, { method: 'GET' });
    },

    recommend: async (crop: string, expectedDate: string): Promise<RecommendedCentreItem[]> => {
      const data = await this.request<any[]>(
        `/bookings/recommend?crop=${encodeURIComponent(crop)}&expected_date=${encodeURIComponent(expectedDate)}`,
        { method: 'POST' }
      );
      return (data || []).map((item) => ({
        centre: this.transformCentre(item.centre),
        distanceKm: item.distance_km !== undefined && item.distance_km !== null ? item.distance_km : null,
        accepted: item.accepted ?? true,
        currentQueue: item.current_queue ?? 0,
        estWaitUnits: item.est_wait_units ?? 0,
        loadPercent: item.load_percent ?? 0,
        hasSlots: item.has_slots ?? false,
        score: item.score ?? 0,
        reasons: item.reasons || [],
      }));
    },
  };

  // --- Queue Operations ---
  public queue = {
    getSummary: async (centreId: string): Promise<BackendQueueSummary> => {
      return await this.request<BackendQueueSummary>(`/operator/queue/${centreId}`, { method: 'GET' }, true);
    },

    checkIn: async (bookingId: string): Promise<BackendQueueEntry> => {
      const cleanId = bookingId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (!isUuid) {
        throw new ApiError('Unable to identify this booking. Please refresh your bookings and try again.', 'VALIDATION_ERROR');
      }
      return await this.request<BackendQueueEntry>('/operator/check-in', {
        method: 'POST',
        body: JSON.stringify({ booking_id: cleanId }),
      }, true);
    },

    callNext: async (): Promise<BackendQueueEntry | null> => {
      return await this.request<BackendQueueEntry | null>('/operator/call-next', { method: 'POST' }, true);
    },

    startProcessing: async (queueEntryId: string): Promise<BackendQueueEntry> => {
      return await this.request<BackendQueueEntry>(`/operator/queue/${queueEntryId}/start`, { method: 'POST' }, true);
    },

    completeProcessing: async (queueEntryId: string): Promise<BackendQueueEntry> => {
      return await this.request<BackendQueueEntry>(`/operator/queue/${queueEntryId}/complete`, { method: 'POST' }, true);
    },

    markNoShow: async (queueEntryId: string): Promise<BackendQueueEntry> => {
      return await this.request<BackendQueueEntry>(`/operator/queue/${queueEntryId}/no-show`, { method: 'POST' }, true);
    },
  };

  // --- Procurements Endpoints ---
  public procurements = {
    record: async (payload: {
      booking_id: string;
      accepted_quantity: number;
      unit_price: number;
      quality_grade?: string;
      unit?: string;
      quality_notes?: string;
    }): Promise<BackendProcurement> => {
      const cleanBookingId = payload.booking_id.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanBookingId);
      if (!isUuid) {
        throw new ApiError('Unable to identify this booking. Please refresh your bookings and try again.', 'VALIDATION_ERROR');
      }
      return await this.request<BackendProcurement>('/operator/procurements', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: cleanBookingId,
          accepted_quantity: payload.accepted_quantity,
          unit_price: payload.unit_price,
          quality_grade: payload.quality_grade,
          unit: payload.unit || 'quintal',
          quality_notes: payload.quality_notes,
        }),
      }, true);
    },

    getQr: async (id: string): Promise<BackendQRCodeResponse> => {
      return await this.request<BackendQRCodeResponse>(`/operator/procurements/${id}/qr`, { method: 'GET' }, true);
    },

    initiatePayment: async (procurementId: string): Promise<BackendPayment> => {
      return await this.request<BackendPayment>(`/operator/procurements/${procurementId}/payment`, {
        method: 'POST',
      }, true);
    },

    review: async (procurementId: string): Promise<any> => {
      return await this.request<any>(`/operator/procurements/${procurementId}/review`, { method: 'GET' }, true);
    },

    getReceiptUrl: (identifier: string): string => {
      const rootUrl = resolveApiBaseUrl().replace(/\/api\/v1\/?$/, '');
      return `${rootUrl}/r/${encodeURIComponent(identifier)}`;
    },
  };

  // --- Payments Endpoints ---
  public payments = {
    getAll: async (params: { status?: string; limit?: number; offset?: number } = {}): Promise<{
      items: BackendPayment[];
      total: number;
      limit: number;
      offset: number;
    }> => {
      const q = new URLSearchParams();
      if (params.status) q.append('status', params.status);
      if (params.limit) q.append('limit', String(params.limit));
      if (params.offset) q.append('offset', String(params.offset));
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return await this.request<{
        items: BackendPayment[];
        total: number;
        limit: number;
        offset: number;
      }>(`/operator/payments${queryStr}`, { method: 'GET' }, true);
    },

    verify: async (paymentId: string, confirmed = true, verifiedBy = 'Operator'): Promise<BackendPayment> => {
      return await this.request<BackendPayment>(`/operator/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ confirmed, verified_by: verifiedBy }),
      }, true);
    },
  };

  // --- Notifications Endpoints ---
  public notifications = {
    getAll: async (params: { is_read?: boolean; limit?: number; offset?: number } = {}): Promise<AppNotification[]> => {
      const q = new URLSearchParams();
      if (params.is_read !== undefined) q.append('is_read', String(params.is_read));
      if (params.limit) q.append('limit', String(params.limit));
      if (params.offset) q.append('offset', String(params.offset));

      const queryStr = q.toString() ? `?${q.toString()}` : '';
      const res = await this.request<{ items: BackendNotificationItem[]; total: number; unread_count: number }>(
        `/farmers/me/notifications${queryStr}`,
        { method: 'GET' }
      );

      return (res.items || []).map((item) => ({
        id: item.id,
        type: item.event_type === 'PAYMENT' ? 'PAYMENT' : item.event_type === 'QUEUE' ? 'QUEUE' : 'BOOKING',
        title: item.title,
        message: item.message,
        timestamp: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: item.is_read,
      }));
    },

    markRead: async (notificationId: string): Promise<void> => {
      await this.request(`/farmers/me/notifications/${notificationId}/read`, { method: 'PATCH' });
    },

    markAllRead: async (): Promise<void> => {
      await this.request('/farmers/me/notifications/read-all', { method: 'POST' });
    },
  };

  // --- Operator Dashboard & Analytics ---
  public operator = {
    getDashboard: async (): Promise<OperatorDashboardData> => {
      return await this.request<OperatorDashboardData>('/operator/dashboard', { method: 'GET' }, true);
    },

    getBookings: async (params: any = {}): Promise<Booking[]> => {
      const q = new URLSearchParams(params).toString();
      const endpoint = q ? `/operator/bookings?${q}` : '/operator/bookings';
      const data = await this.request<{ items: any[]; total: number }>(endpoint, { method: 'GET' }, true);
      return (data.items || []).map((item) => {
        const rawStatus = (item.status || 'confirmed').toLowerCase();
        const statusMap: Record<string, Booking['status']> = {
          pending: 'CONFIRMED',
          confirmed: 'CONFIRMED',
          checked_in: 'CHECKED_IN',
          processing: 'PROCESSING',
          completed: 'COMPLETED',
          cancelled: 'CANCELLED',
          no_show: 'NO_SHOW',
          rescheduled: 'RESCHEDULED',
          expired: 'CANCELLED',
        };
        return {
          id: item.booking_id || item.id,
          uuid: item.id,
          farmerId: item.farmer_code || item.farmer_id || '',
          farmerName: item.farmer_name || 'Farmer',
          farmerMobile: item.farmer_phone || '',
          cropId: (item.crop || 'grain').toLowerCase(),
          cropName: item.crop || 'Crop',
          quantityQuintals: item.quantity,
          unit: item.unit || 'quintal',
          expectedDate: item.expected_date,
          centreId: item.centre_id || '',
          centreName: 'Procurement Mandi',
          centreLocation: 'APMC Yard',
          slotId: item.slot_id || null,
          slot: 'Operating Window',
          status: statusMap[rawStatus] || 'CONFIRMED',
          createdAt: item.created_at,
        };
      });
    },

    getAnalytics: async (from?: string, to?: string): Promise<BackendAnalyticsSummary> => {
      const q = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
      const endpoint = q ? `/operator/analytics?${q}` : '/operator/analytics';
      return await this.request<BackendAnalyticsSummary>(endpoint, { method: 'GET' }, true);
    },
  };

  // --- Analytics & AI Forecasting ---
  public analytics = {
    getSummary: async (centreId: string, from: string, to: string): Promise<BackendAnalyticsSummary> => {
      const q = new URLSearchParams({
        centre_id: centreId,
        from,
        to,
      }).toString();
      return await this.request<BackendAnalyticsSummary>(`/analytics/summary?${q}`, { method: 'GET' }, true);
    },

    getForecast: async (centreId: string, date?: string): Promise<BackendAnalyticsForecast> => {
      const q = new URLSearchParams({
        centre_id: centreId,
        ...(date ? { date } : {}),
      }).toString();
      return await this.request<BackendAnalyticsForecast>(`/analytics/forecast?${q}`, { method: 'GET' }, true);
    },
  };

  // --- Crops Endpoints ---
  public crops = {
    getAll: async (): Promise<CropInfo[]> => {
      try {
        const backendCentres = await this.request<BackendCentre[]>('/centres', { method: 'GET' });
        const cropMap = new Map<string, CropInfo>();
        
        backendCentres.forEach((centre) => {
          (centre.crops || []).forEach((crop) => {
            const cropKey = crop.crop_name.trim();
            if (!cropMap.has(cropKey)) {
              cropMap.set(cropKey, {
                id: crop.id || `crop-${cropKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                name: cropKey,
                mspPerQuintal: crop.rate_per_unit || 0,
                minPrice: crop.min_price_per_unit,
                maxPrice: crop.max_price_per_unit,
                ratePerUnit: crop.rate_per_unit,
                unit: crop.unit || 'quintal',
              });
            }
          });
        });

        return Array.from(cropMap.values());
      } catch (err: any) {
        throw new ApiError(err.message || 'Failed to fetch crops catalog', 'SERVER_ERROR');
      }
    },
  };

  // --- Slots Endpoints ---
  public slots = {
    getByCentreAndDate: async (centreId: string, onDate?: string): Promise<TimeSlot[]> => {
      const backendSlots = await this.centres.getSlots(centreId, onDate);
      return backendSlots.map((s) => ({
        id: s.id,
        centreId: s.centre_id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        maxBookings: s.max_bookings,
        currentBookings: s.current_bookings,
        isAvailable: s.is_available && s.current_bookings < s.max_bookings,
        timeWindow: formatSlotWindow(s.start_time, s.end_time),
        formattedTimeWindow: formatSlotWindow(s.start_time, s.end_time),
      }));
    },
  };

  public ai = {
    getForecast: (centreId: string, date?: string) => this.analytics.getForecast(centreId, date),
    getCenterInsights: (centreId: string) => this.analytics.getForecast(centreId),
  };

  public farmers = {
    getMe: () => this.auth.getMe(),
    updateMe: (data: {
      name?: string;
      village?: string;
      district?: string;
      state?: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    }) => this.auth.updateMe(data),
  };

  // --- Sync Endpoints ---
  public sync = {
    getSnapshot: async (centreId: string): Promise<SyncSnapshotResponse> => {
      return this.request<SyncSnapshotResponse>(`/sync/${centreId}/snapshot`, {
        method: 'GET',
      });
    },

    pullEvents: async (centreId: string, cursor = 0, limit = 200): Promise<SyncPullResponse> => {
      return this.request<SyncPullResponse>(`/sync/${centreId}/events?cursor=${cursor}&limit=${limit}`, {
        method: 'GET',
      });
    },

    applyEvents: async (centreId: string, events: SyncEventIn[]): Promise<SyncBatchResponse> => {
      return this.request<SyncBatchResponse>(`/sync/${centreId}/events`, {
        method: 'POST',
        body: JSON.stringify({ events }),
      });
    },
  };

  // --- SMS Endpoints (Root Webhook /sms/incoming) ---
  public sms = {
    sendIncoming: async (
      message: string,
      sender = '+919876543210',
      recipient = '+919999999999'
    ): Promise<{ status: string; [key: string]: any }> => {
      const rootUrl = this.baseUrl.replace(/\/api\/v1\/?$/, '');
      const response = await fetch(`${rootUrl}/sms/incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          sender: sender.trim(),
          recipient: recipient.trim(),
        }),
      });

      if (!response.ok) {
        let errMessage = `SMS request failed: ${response.statusText}`;
        try {
          const errData = await response.json();
          errMessage = errData.error?.message || errData.message || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      return response.json();
    },
  };

  // --- Health Check / Network Reachability ---
  public async checkBackendHealth(): Promise<boolean> {
    try {
      const res = await this.request<{ status: string }>('/health', {
        method: 'GET',
      });
      return res?.status === 'ok';
    } catch {
      return false;
    }
  }

  // --- Transformers (Backend Schema -> Frontend UI Models) ---
  public transformCentre(c: BackendCentre): ProcurementCentre {
    const acceptedCropIds = (c.crops || []).map((crop) => crop.crop_name);

    return {
      id: c.id,
      name: c.name,
      code: c.code,
      officerInCharge: c.code ? `Mandi Secretary (${c.code})` : undefined,
      contactNumber: undefined,
      location: {
        address: c.address || `${c.village || ''}, ${c.district || ''}, ${c.state || ''}`.trim(),
        village: c.village || undefined,
        district: c.district || undefined,
        state: c.state || undefined,
        coordinates: {
          latitude: c.latitude,
          longitude: c.longitude,
          lat: c.latitude,
          lng: c.longitude,
        },
      },
      distanceKm: undefined,
      acceptedCropIds: acceptedCropIds.length > 0 ? acceptedCropIds : [],
      operatingHours: {
        opens: (c.operating_start || '08:00:00').slice(0, 5),
        closes: (c.operating_end || '18:00:00').slice(0, 5),
        days: 'Mon - Sat',
      },
      currentQueue: {
        activeVehicles: 0,
        loadLevel: 'Low',
        estimatedWaitMins: 0,
      },
      availableSlots: c.capacity || 0,
    };
  }

  public transformFarmer(f: BackendFarmer): FarmerProfile {
    const lat = f.latitude ?? undefined;
    const lng = f.longitude ?? undefined;
    const coords = (lat !== undefined && lng !== undefined)
      ? { latitude: lat, longitude: lng, lat, lng }
      : undefined;

    return {
      farmerId: f.farmer_id || f.id || '',
      fullName: f.name || 'Farmer',
      mobileNumber: f.phone || '',
      location: {
        village: f.village || undefined,
        tehsil: undefined,
        district: f.district || undefined,
        state: f.state || undefined,
        pincode: f.pincode || undefined,
        coordinates: coords,
      },
      landHoldingAcres: undefined,
      registeredDate: f.created_at ? new Date(f.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) : 'Active',
      bankAccountMasked: 'Direct Benefit Transfer (Aadhaar / PFMS Linked)',
    };
  }

  public transformBooking(
    b: BackendBooking,
    centreName = 'Procurement Centre',
    slotWindow?: SlotTimeWindow
  ): Booking {
    const statusMap: Record<string, Booking['status']> = {
      pending: 'CONFIRMED',
      confirmed: 'CONFIRMED',
      checked_in: 'CHECKED_IN',
      processing: 'PROCESSING',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
      no_show: 'NO_SHOW',
      rescheduled: 'RESCHEDULED',
      expired: 'CANCELLED',
    };

    const status = statusMap[b.status] || 'CONFIRMED';

    return {
      id: b.booking_id || b.id,
      uuid: b.id,
      farmerId: b.farmer_id,
      farmerName: 'Farmer',
      farmerMobile: '',
      cropId: b.crop.toLowerCase(),
      cropName: b.crop,
      quantityQuintals: b.quantity,
      unit: b.unit || 'quintal',
      expectedDate: b.expected_date,
      centreId: b.centre_id || '',
      centreName: centreName,
      centreLocation: 'Procurement Centre Yard',
      slotId: b.slot_id || null,
      slot: slotWindow || 'Standard Mandi Operating Window',
      status,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      queuePosition: undefined,
      farmersAhead: undefined,
      estimatedWaitMinutes: undefined,
    };
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
