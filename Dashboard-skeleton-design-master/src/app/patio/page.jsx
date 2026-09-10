'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const COLUNAS = [
  { id: 'aguardando_checkin', titulo: 'Pré-Agendado', cor: 'border-amber-500' },
  { id: 'em_patio_aguardando_liberacao', titulo: 'No Pátio - Aguardando Liberação', cor: 'border-blue-500' },
  { id: 'carregando', titulo: 'Carregando', cor: 'border-purple-500' },
  { id: 'carregamento_concluido', titulo: 'Carregamento Concluído', cor: 'border-green-500' }
];

export default function KanbanPatio() {
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const buscarOrdens = async () => {
    const { data, error } = await supabase
      .from('ordens_carregamento')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) setOrdens(data);
    setCarregando(false);
  };

  const atualizarStatus = async (id, novoStatus) => {
    setOrdens((prev) =>
      prev.map((ordem) => (ordem.id === id ? { ...ordem, status: novoStatus } : ordem))
    );

    const { error } = await supabase
      .from('ordens_carregamento')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) buscarOrdens();
  };

  useEffect(() => {
    buscarOrdens();

    const canal = supabase
      .channel('mudancas-patio')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordens_carregamento' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrdens((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setOrdens((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrdens((prev) => prev.filter((item) => item.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  if (carregando) return <div className="p-8 text-center text-gray-500">Carregando pátio...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Controle de Pátio</h1>
          <p className="text-sm text-gray-500">Gestão de veículos em tempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUNAS.map((coluna) => {
          const ordensColuna = ordens.filter((o) => o.status === coluna.id);
          return (
            <div key={coluna.id} className="bg-gray-50/50 rounded-xl p-4 border border-gray-200 flex flex-col h-[calc(100vh-180px)]">
              <div className={`flex justify-between items-center pb-3 mb-3 border-b-2 ${coluna.cor}`}>
                <h2 className="font-semibold text-gray-700 text-sm uppercase">{coluna.titulo}</h2>
                <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{ordensColuna.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {ordensColuna.map((ordem) => (
                  <div key={ordem.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between text-xs font-bold text-indigo-600 mb-1">
                      <span>#{ordem.codigo_ordem || ordem.id.substring(0, 6)}</span>
                      <span className="text-gray-400">{ordem.tipo_veiculo}</span>
                    </div>
                    <h3 className="font-bold text-gray-800">{ordem.transportadora}</h3>
                    <p className="text-sm text-gray-600">Mot: {ordem.nome_motorista}</p>
                    <div className="mt-3 pt-2 border-t text-xs text-gray-500 grid grid-cols-2">
                      <div><strong>Cavalo:</strong> {ordem.placa_cavalo}</div>
                      <div><strong>Carreta:</strong> {ordem.placa_carreta || 'N/A'}</div>
                    </div>
                    <div className="mt-3 pt-2 border-t">
                      {ordem.status === 'em_patio_aguardando_liberacao' && (
                        <button
                          onClick={() => atualizarStatus(ordem.id, 'carregando')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 rounded transition-colors"
                        >
                          Liberar para Carregamento
                        </button>
                      )}
                      {ordem.status === 'carregando' && (
                        <button
                          onClick={() => atualizarStatus(ordem.id, 'carregamento_concluido')}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded transition-colors"
                        >
                          Finalizar Carregamento
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}