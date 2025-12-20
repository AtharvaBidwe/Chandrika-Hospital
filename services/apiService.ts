
import { Patient, DailyPlan, XrayData } from '../types';
import { supabase } from './supabaseClient';

export const apiService = {
  // --- Patient Operations ---
  async getPatients(): Promise<Patient[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('startDate', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      return [];
    }
    return (data || []) as Patient[];
  },

  async savePatients(patients: Patient[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Ensure user_id is attached to every patient record before upsert
    const patientsToUpsert = patients.map(p => ({
      ...p,
      user_id: user.id
    }));

    const { error } = await supabase
      .from('patients')
      .upsert(patientsToUpsert, { onConflict: 'id' });

    if (error) {
      console.error('Error saving patients:', error);
    }
  },

  async addPatient(patient: Patient): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('patients')
      .insert([{ ...patient, user_id: user.id }]);

    if (error) {
      console.error('Error adding patient:', error);
    }
  },

  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return this.getPatients();

    const { error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .eq('user_id', user.id); // Security: ensure user owns the record

    if (error) {
      console.error('Error updating patient:', error);
    }
    return this.getPatients();
  },

  // --- Film Inventory Operations ---
  async getFilmCount(): Promise<number> {
    const { data, error } = await supabase
      .from('clinical_settings')
      .select('value')
      .eq('key', 'film_count')
      .single();

    if (error) {
      console.error('Error fetching film count:', error);
      return 50; 
    }
    return parseInt(data.value);
  },

  async updateFilmCount(count: number): Promise<void> {
    const { error } = await supabase
      .from('clinical_settings')
      .upsert({ key: 'film_count', value: count.toString() });

    if (error) {
      console.error('Error updating film count:', error);
    }
  }
};
