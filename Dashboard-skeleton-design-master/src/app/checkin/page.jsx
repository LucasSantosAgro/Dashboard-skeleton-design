'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CheckinPortaria() {
  const [placa, setPlaca] = useState('');
  const [cpf, setCpf] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const handleCheckin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem(null);

    const placaFormatada = placa.toUpperCase().trim();

    // 1. Busca pré-agendamento ativo no Supabase
    const { data, error } = await supabase
      .from('ordens_carregamento')
      .select('*')
      .eq('placa_cavalo', placaFormatada)
      .eq('status', 'aguardando')
      .single();

    if (error || !data) {
      setMensagem({
        tipo: 'erro',
        texto: 'Pré-agendamento não localizado para esta placa. Dirija-se à recepção.'
      });
      setCarregando(false);
      return;
    }

    // 2. Atualiza a ordem e move para a fila do pátio
    const { error: updateError } = await supabase
      .from('ordens_carregamento')
      .update({
        checkin_realizado: true,
        data_chegada_portaria: new Date().toISOString(),
        status: 'em_patio'
      })
      .eq('id', data.id);

    if (updateError) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao registrar check-in. Tente novamente.' });
    } else {
      setMensagem({
        tipo: 'sucesso',
        texto: `Check-in realizado com sucesso! Veículo ${placaFormatada} entrou na fila de pesagem.`
      });
      setPlaca('');
      setCpf('');
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 text-white">
        <h1 className="text-xl font-bold text-sky-400 mb-1">Check-in na Portaria</h1>
        <p className="text-sm text-gray-400 mb-4">Confirme sua chegada para entrar na fila do pátio</p>

        {mensagem && (
          <div className={`p-3 rounded mb-4 text-sm font-medium ${
            mensagem.tipo === 'sucesso' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleCheckin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Placa Cavalo</label>
            <input
              type="text"
              required
              maxLength={7}
              placeholder="ABC1D23"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().trim())}
              className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded font-mono uppercase text-lg text-white focus:border-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">CPF do Motorista</label>
            <input
              type="text"
              required
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded text-lg text-white focus:border-sky-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-sky-500 hover:bg-sky-400 text-gray-950 font-bold py-2.5 rounded transition-colors cursor-pointer"
          >
            {carregando ? 'Validando...' : 'Confirmar Chegada'}
          </button>
        </form>
      </div>
    </div>
  );
}