
import { Patient } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'chandrika_v2_patients';
const LOCAL_FILM_KEY = 'chandrika_v2_films';

const mapFromDb = (db: any): Patient => ({
  id: db.id,
  name: db.name,
  age: db.age,
  phone: db.phone,
  address: db.address,
  condition: db.condition,
  status: db.status,
  serviceType: db.service_type,
  registrationDate: db.registration_date,
  startDate: db.start_date,
  endDate: db.end_date,
  selectedDays: Array.isArray(db.selected_days) ? db.selected_days : (db.selected_days ? JSON.parse(db.selected_days) : []),
  dailyPlans: Array.isArray(db.daily_plans) ? db.daily_plans : (db.daily_plans ? JSON.parse(db.daily_plans) : []),
  xrayData: typeof db.xray_data === 'string' ? JSON.parse(db.xray_data) : db.xray_data
});

const mapToDb = (p: Patient, userId: string) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  age: p.age,
  phone: p.phone,
  address: p.address,
  condition: p.condition,
  status: p.status,
  service_type: p.serviceType,
  registration_date: p.registrationDate,
  start_date: p.startDate,
  end_date: p.endDate,
  selected_days: p.selectedDays, // Supabase handles jsonb arrays directly
  daily_plans: p.dailyPlans,
  xray_data: p.xrayData
});

export const apiService = {
  async getPatients(): Promise<Patient[]> {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    let patients: Patient[] = local ? JSON.parse(local) : [];

    if (!isSupabaseConfigured()) return patients;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return patients;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const cloudPatients = (data || []).map(mapFromDb);
      
      if (cloudPatients.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudPatients));
        return cloudPatients;
      }
      return patients;
    } catch (e) {
      console.error("Fetch Cloud Failed:", e);
      return patients;
    }
  },

  async addPatient(patient: Patient): Promise<void> {
    const local = await this.getPatients();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([patient, ...local]));

    if (!isSupabaseConfigured()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const dbData = mapToDb(patient, session.user.id);
      const { error } = await supabase.from('patients').upsert(dbData);
      if (error) throw error;
    } catch (e) {
      console.error("Cloud Save Failed:", e);
      throw e;
    }
  },

  async savePatients(patients: Patient[]): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(patients));

    if (!isSupabaseConfigured()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dbRows = patients.map(p => mapToDb(p, user.id));
      const { error } = await supabase.from('patients').upsert(dbRows);
      if (error) throw error;
    } catch (e) {
      console.error("Batch Cloud Sync Failed:", e);
      throw e;
    }
  },

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient[]> {
    const current = await this.getPatients();
    const updated = current.map(p => p.id === patientId ? { ...p, ...updates } : p);
    await this.savePatients(updated);
    return updated;
  },

  async deletePatient(patientId: string): Promise<void> {
    const current = await this.getPatients();
    const filtered = current.filter(p => p.id !== patientId);
    await this.savePatients(filtered);

    if (isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from('patients').delete().eq('id', patientId).eq('user_id', user.id);
          if (error) throw error;
        }
      } catch (e) { 
        console.error(e);
        throw e;
      }
    }
  },

  async getFilmCount(): Promise<number> {
    const local = localStorage.getItem(LOCAL_FILM_KEY);
    const count = local ? parseInt(local) : 50;

    if (!isSupabaseConfigured()) return count;

    try {
      const { data } = await supabase.from('clinical_settings').select('value').eq('key', 'film_count').single();
      if (data) return parseInt(data.value);
      return count;
    } catch (e) { return count; }
  },

  async updateFilmCount(count: number): Promise<void> {
    localStorage.setItem(LOCAL_FILM_KEY, count.toString());
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('clinical_settings').upsert({ key: 'film_count', value: count.toString() });
        if (error) throw error;
      } catch (e) { 
        console.error(e);
        throw e;
      }
    }
  }
};
