export type Language = 
  | 'en'  // English
  | 'hi'  // हिन्दी (Hindi) - ~43.6%
  | 'bn'  // বাংলা (Bengali) - ~8.0%
  | 'mr'  // मराठी (Marathi) - ~6.9%
  | 'te'  // తెలుగు (Telugu) - ~6.7%
  | 'ta'  // தமிழ் (Tamil) - ~5.7%
  | 'gu'  // ગુજરાતી (Gujarati) - ~4.6%
  | 'ur'  // اردو (Urdu) - ~4.2%
  | 'kn'  // ಕನ್ನಡ (Kannada) - ~3.6%
  | 'or'  // ଓଡ଼ିଆ (Odia) - ~3.1%
  | 'pa'; // ਪੰਜਾਬੀ (Punjabi) - ~2.7%

export type ActiveView = 
  | 'home'
  | 'dashboard' 
  | 'tracking' 
  | 'booking' 
  | 'centres' 
  | 'procurement' 
  | 'history' 
  | 'notifications' 
  | 'profile'
  | 'auth';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  lat?: number; // Backward compatibility alias for UI pins
  lng?: number; // Backward compatibility alias for UI pins
}

export interface VillageLocation {
  village?: string;
  tehsil?: string; // Mandal / Tehsil
  district?: string;
  state?: string;
  pincode?: string;
  coordinates?: LocationCoordinates;
}

export interface FarmerProfile {
  farmerId: string;
  fullName: string;
  mobileNumber: string;
  location: VillageLocation;
  landHoldingAcres?: number;
  registeredDate: string;
  bankAccountMasked?: string;
}

export interface CropInfo {
  id: string;
  name: string;
  hindiName?: string;
  punjabiName?: string;
  marathiName?: string;
  mspPerQuintal: number; // Minimum Support Price in INR (from rate_per_unit)
  minPrice?: number | null;
  maxPrice?: number | null;
  ratePerUnit?: number | null;
  season?: 'Kharif' | 'Rabi' | 'Zaid';
  unit: string;
}

export type QueueLoadLevel = 'Low' | 'Moderate' | 'High';

export interface ProcurementCentre {
  id: string;
  name: string;
  code?: string;
  officerInCharge?: string;
  contactNumber?: string;
  location: {
    address?: string;
    village?: string;
    district?: string;
    state?: string;
    coordinates?: LocationCoordinates;
  };
  distanceKm?: number;
  acceptedCropIds: string[];
  operatingHours: {
    opens: string;
    closes: string;
    lunchBreak?: string;
    days?: string;
  };
  currentQueue: {
    activeVehicles: number;
    loadLevel: QueueLoadLevel;
    estimatedWaitMins: number;
  };
  availableSlots?: number;
}

export type SlotTimeWindow = string;

export interface TimeSlot {
  id: string;
  centreId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  isAvailable: boolean;
  timeWindow?: SlotTimeWindow;
  formattedTimeWindow?: string;
  availableCapacityQuintals?: number;
  maxCapacityQuintals?: number;
}

export interface RecommendedCentreItem {
  centre: ProcurementCentre;
  distanceKm: number | null;
  accepted: boolean;
  currentQueue: number;
  estWaitUnits: number;
  loadPercent: number;
  hasSlots: boolean;
  score: number;
  reasons: string[];
}

export type BookingStatus = 
  | 'CONFIRMED' 
  | 'IN_QUEUE' 
  | 'CHECKED_IN'
  | 'TURN_APPROACHING' 
  | 'PROCESSING' 
  | 'WEIGHING'
  | 'QUALITY_CHECK'
  | 'PAYMENT_PENDING'
  | 'COMPLETED' 
  | 'NO_SHOW'
  | 'CANCELLED' 
  | 'RESCHEDULED';

export interface Booking {
  id: string; // e.g. BK-2026-9481 or server booking_id
  uuid?: string; // Server internal UUID id
  farmerId: string;
  farmerName: string;
  farmerMobile: string;
  cropId: string;
  cropName: string;
  quantityQuintals: number;
  unit?: string;
  expectedDate: string; // YYYY-MM-DD
  centreId: string;
  centreName: string;
  centreLocation: string;
  slotId?: string | null;
  slot: SlotTimeWindow;
  status: BookingStatus;
  createdAt: string;
  updatedAt?: string;
  queueEntryId?: string;
  queuePosition?: number;
  farmersAhead?: number;
  estimatedWaitMinutes?: number;
  isRescheduled?: boolean;
  rescheduleCount?: number;
}

export type ProcurementStatus = 'Scheduled' | 'Weighed' | 'Quality Graded' | 'Accepted' | 'Rejected' | 'completed' | 'processing';

export type PaymentStatus = 
  | 'initiated' 
  | 'pending_verification' 
  | 'confirmed' 
  | 'failed' 
  | 'cancelled'
  | 'Pending' 
  | 'Processing' 
  | 'Credited'
  | 'Failed'
  | 'pending'
  | 'verified'
  | 'credited';

export interface ProcurementRecord {
  id: string;
  uuid?: string;
  bookingId: string;
  farmerId: string;
  farmerName?: string;
  farmerMobile?: string;
  cropName: string;
  date: string;
  centreName: string;
  bookedQuantity: number;
  acceptedQuantity: number;
  unit?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  mspRate?: number;
  grossAmount?: number;
  deductions?: number;
  deductionReason?: string;
  qualityGrade: string;
  procurementStatus: ProcurementStatus;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  paymentId?: string;
  qrCodeUrl?: string;
  createdAt?: string;
}

export interface PaymentRecord {
  id: string;
  uuid?: string;
  transactionId: string;
  procurementId: string;
  bookingId: string;
  farmerId: string;
  farmerName?: string;
  farmerMobile?: string;
  cropName: string;
  quantity?: number;
  rate?: number;
  amount: number;
  date: string;
  paymentStatus: PaymentStatus;
  bankAccountMasked?: string;
  utrNumber?: string;
  anomalyFlags?: string[];
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  confirmedAt?: string | null;
}

export type NotificationType = 
  | 'BOOKING' 
  | 'QUEUE' 
  | 'PROCUREMENT' 
  | 'PAYMENT' 
  | 'ANNOUNCEMENT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  referenceId?: string;
  priority?: 'normal' | 'urgent';
}

export type UserRole = 'farmer' | 'operator';

export type OperatorView = 
  | 'dashboard' 
  | 'bookings' 
  | 'queue' 
  | 'procurement' 
  | 'payments' 
  | 'analytics' 
  | 'offline';

export interface OperatorProfile {
  operatorId: string;
  name: string;
  designation: string;
  centreId: string;
  centreName: string;
  mobile: string;
  shift: string;
}

export interface SyncOperation {
  id: string;
  actionType: 
    | 'CHECK_IN' 
    | 'CALL_NEXT' 
    | 'START_PROCESSING' 
    | 'COMPLETE_PROCESSING'
    | 'COMPLETE_PROCUREMENT' 
    | 'CONFIRM_PAYMENT' 
    | 'MARK_NO_SHOW' 
    | 'CANCEL_BOOKING' 
    | 'RESCHEDULE';
  timestamp: string;
  bookingId: string;
  details: string;
  payload?: any;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount?: number;
  lastError?: string;
}

export interface AiCenterInsight {
  predictedWaitMins: number;
  expectedArrivalsToday: number;
  expectedCenterLoadPct: number;
  highLoadWarnings: string[];
  suggestedLoadDistribution: string;
  slotRecommendations: { slot: string; recommendation: string; loadLevel: string }[];
  anomalies: { id: string; type: string; message: string; severity: 'low' | 'medium' | 'high' }[];
}
