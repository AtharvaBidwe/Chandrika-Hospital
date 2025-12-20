import { Patient } from '../types';
import { supabase } from './supabaseClient';

// Helper to map DB snake_case to JS camelCase
const mapFromDb = (db: any): Patient => ({
  id: db.id,
  name: db.name,
  age: db.age,
  phone: db.phone,
  address: db.address,
  condition: db.condition,
  status: db.status,
  serviceType: db.service_type,
  startDate: db.start_date,
  endDate: db.end_date,
  selectedDays: db.selected_days || [],
  dailyPlans: db.daily_plans || [],
  xrayData: db.xray_data
});

// Helper to map JS camelCase to DB snake_case
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
  start_date: p.startDate,
  end_date: p.endDate,
  selected_days: p.selectedDays,
  daily_plans: p.dailyPlans,
  xray_data: p.xrayData
});

export const apiService = {
  async getPatients(): Promise<Patient[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapFromDb);
    } catch (e) {
      console.error("Fetch Patients Failed:", e);
      return [];
    }
  },

  async addPatient(patient: Patient): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const dbData = mapToDb(patient, user.id);
      const { error } = await supabase.from('patients').insert([dbData]);

      if (error) throw error;
    } catch (e) {
      console.error("Add Patient Failed:", e);
      throw e;
    }
  },

  async savePatients(patients: Patient[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const dbRows = patients.map(p => mapToDb(p, user.id));
      const { error } = await supabase.from('patients').upsert(dbRows, { onConflict: 'id' });

      if (error) throw error;
    } catch (e) {
      console.error("Sync Patients Failed:", e);
      throw e;
    }
  },

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.getPatients();

      // Simple partial update map
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.condition) dbUpdates.condition = updates.condition;

      const { error } = await supabase
        .from('patients')
        .update(dbUpdates)
        .eq('id', patientId)
        .eq('user_id', user.id);

      if (error) throw error;
      return this.getPatients();
    } catch (e) {
      console.error("Update Status Failed:", e);
      return this.getPatients();
    }
  },

  async getFilmCount(): Promise<number> {
    try {
      const { data, error } = await supabase.from('clinical_settings').select('value').eq('key', 'film_count').single();
      if (error) return 50;
      return parseInt(data.value);
    } catch (e) {
      return 50;
    }
  },

  async updateFilmCount(count: number): Promise<void> {
    try {
      await supabase.from('clinical_settings').upsert({ key: 'film_count', value: count.toString() });
    } catch (e) {
      console.error("Film Update Failed:", e);
    }
  }
};