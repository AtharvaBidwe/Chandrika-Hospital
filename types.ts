
export type SessionStatus = 'pending' | 'completed' | 'missed';
export type ServiceType = 'physiotherapy' | 'x-ray';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export const CLINIC_CONFIG = {
  name: "Chandrika Hospital",
  shortName: "Chandrika",
  clinicianName: "Dr. Prafulla Bidwe",
  credentials: "MBBS • BJ MEDICAL PUNE",
  primaryColor: "indigo",
  lowFilmThreshold: 10
};

export interface TherapySession {
  id: string;
  name: string;
  duration: number; // in minutes
  notes: string;
  status: SessionStatus;
}

export interface DailyPlan {
  id: string;
  date: string; // ISO string
  sessions: TherapySession[];
}

export interface XrayData {
  issue: string;
  bodyParts: string[];
  status: 'ordered' | 'captured' | 'reported';
  orderDate: string;
  imageUrl?: string;
  aiReport?: string;
  filmConsumed?: boolean; // Safeguard flag
  filmsUsedCount?: number; // Precise count used for this specific record
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  address: string;
  condition: string;
  registrationDate: string; // ISO date string (YYYY-MM-DD)
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'archived';
  serviceType: ServiceType;
  selectedDays: DayOfWeek[]; 
  dailyPlans: DailyPlan[];
  xrayData?: XrayData;
}
