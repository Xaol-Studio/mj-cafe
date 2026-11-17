/**
 * Configuración de Conexión con Supabase (Cloud SQL) para MJ Café
 * Proyecto: MJ Café - FES Cuautitlán Campo 4
 */

const SUPABASE_CONFIG = {
  url: window.SUPABASE_URL || localStorage.getItem('mj_supabase_url') || '',
  anonKey: window.SUPABASE_ANON_KEY || localStorage.getItem('mj_supabase_anon_key') || '',

  isConfigured() {
    return Boolean(this.url && this.anonKey && this.url.startsWith('https://'));
  },

  guardar(url, key) {
    this.url = (url || '').trim().replace(/\/$/, '');
    this.anonKey = (key || '').trim();
    localStorage.setItem('mj_supabase_url', this.url);
    localStorage.setItem('mj_supabase_anon_key', this.anonKey);
  },

  limpiar() {
    this.url = '';
    this.anonKey = '';
    localStorage.removeItem('mj_supabase_url');
    localStorage.removeItem('mj_supabase_anon_key');
  }
};
