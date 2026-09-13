import { supabase } from './supabaseClient';

const QUEUE_KEY = 'grasel_offline_queue';
const CACHE_PREFIX = 'grasel_cache_';

// Salva dados no cache local
export function setLocalCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar cache local:', e);
  }
}

// Lê dados do cache local
export function getLocalCache(key, fallback = []) {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Erro ao ler cache local:', e);
    return fallback;
  }
}

// Adiciona uma operação pendente na fila offline
export function enqueueOfflineAction(action) {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ ...action, id: Date.now() + Math.random().toString(36).substr(2, 9) });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.warn('⚠️ Operação salva offline. Será sincronizada ao reconectar.');
  } catch (e) {
    console.error('Erro ao enfileirar ação offline:', e);
  }
}

// Processa a fila de sincronização quando a conexão retorna
export async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

  console.sync('🔄 Conexão restabelecida. Sincronizando dados com o Supabase...');
  const remainingQueue = [];

  for (const action of queue) {
    try {
      const { table, type, payload, match } = action;
      let error = null;

      if (type === 'INSERT') {
        const res = await supabase.from(table).insert([payload]);
        error = res.error;
      } else if (type === 'UPDATE') {
        const res = await supabase.from(table).update(payload).match(match);
        error = res.error;
      } else if (type === 'DELETE') {
        const res = await supabase.from(table).delete().match(match);
        error = res.error;
      }

      if (error) {
        console.error(`Erro ao sincronizar ação ${type} na tabela ${table}:`, error);
        remainingQueue.push(action); // Mantém na fila se falhou
      }
    } catch (e) {
      console.error('Erro de rede durante sincronização:', e);
      remainingQueue.push(action);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
  if (remainingQueue.length === 0) {
    console.log('✅ Todos os dados offline foram sincronizados com sucesso!');
  }
}