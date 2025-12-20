import { Patient, DailyPlan, XrayData } from '../types';
import { supabase } from './supabaseClient';

export const apiService = {
  // --- Patient Operations ---
  async getPatients(): Promise<Patient[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("API: No authenticated user found. Ensure you are logged in.");
        return [];
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('startDate', { ascending: false });

      if (error) {
        console.error('Supabase FETCH Error:', error.code, error.message, error.details);
        throw error;
      }
      
      return (data || []) as Patient[];
    } catch (e) {
      console.error("Critical API Failure (getPatients):", e);
      return [];
    }
  },

  async savePatients(patients: Patient[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("API: Save failed - No active session.");
        throw new Error("No user session for saving.");
      }

      const patientsToUpsert = patients.map(p => ({
        ...p,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('patients')
        .upsert(patientsToUpsert, { onConflict: 'id' });

      if (error) {
        console.error('Supabase UPSERT Error:', error.code, error.message, error.details);
        // If error is 42501, it's an RLS (Policy) violation
        if (error.code === '42501') {
          console.error("RLS POLICY VIOLATION: The database is blocking this save. Check your Supabase Policies.");
        }
        throw error;
      }
    } catch (e) {
      console.error("Critical API Failure (savePatients):", e);
      throw e;
    }
  },

  async addPatient(patient: Patient): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user session for adding.");

      const { error } = await supabase
        .from('patients')
        .insert([{ ...patient, user_id: user.id }]);

      if (error) {
        console.error('Supabase INSERT Error:', error.code, error.message, error.details);
        throw error;
      }
    } catch (e) {
      console.error("Critical API Failure (addPatient):", e);
      throw e;
    }
  },

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.getPatients();

      const { error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase UPDATE Error:', error.code, error.message);
        throw error;
      }
      return this.getPatients();
    } catch (e) {
      console.error("Critical API Failure (updatePatient):", e);
      return this.getPatients();
    }
  },

  // --- Film Inventory Operations ---
  async getFilmCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('clinical_settings')
        .select('value')
        .eq('key', 'film_count')
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Row not found
           await this.updateFilmCount(50);
           return 50;
        }
        return 50; 
      }
      return parseInt(data.value);
    } catch (e) {
      return 50;
    }
  },

  async updateFilmCount(count: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('clinical_settings')
        .upsert({ key: 'film_count', value: count.toString() });

      if (error) throw error;
    } catch (e) {
      console.error("Failed to update film count", e);
    }
  }
};