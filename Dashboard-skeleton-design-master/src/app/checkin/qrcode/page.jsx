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

    // 1. Busca pré-agendamento ativo aguardando check-in no Supabase
    const { data, error } = await supabase
      .from('ordens_carregamento')
      .select('*')
      .eq('placa_cavalo', placaFormatada)
      .eq('status', 'aguardando_checkin')
      .single();

    if (error || !data) {
      setMensagem({
        tipo: 'erro',
        texto: 'Pré-agendamento não encontrado para esta placa ou check-in já realizado.'
      });
      setCarregando(false);
      return;
    }

    // 2. Atualiza a ordem e move para o status em pátio aguardando liberação
    const { error: updateError } = await supabase
      .from('ordens_carregamento')
      .update({
        checkin_realizado: true,
        data_chegada_portaria: new Date().toISOString(),
        status: 'em_patio_aguardando_liberacao'
      })
      .eq('id', data.id);

    if (updateError) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao registrar check-in. Tente novamente.' });
    } else {
      setMensagem({
        tipo: 'sucesso',
        texto: `Check-in realizado com sucesso! Veículo ${placaFormatada} registrado no pátio.`
      });
      setPlaca('');
      setCpf('');
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Check-in na Portaria</h1>
        <p className="text-sm text-gray-500 mb-4">Confirme sua chegada para entrar na fila do pátio</p>

        {mensagem && (
          <div className={`p-3 rounded mb-4 text-sm font-medium ${
            mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleCheckin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Placa Cavalo</label>
            <input
              type="text"
              required
              maxLength={7}
              placeholder="ABC1D23"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().trim())}
              className="w-full p-2 border border-gray-300 rounded font-mono uppercase text-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">CPF do Motorista</label>
            <input
              type="text"
              required
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded transition-colors"
          >
            {carregando ? 'Validando...' : 'Confirmar Chegada'}
          </button>
        </form>
      </div>
    </div>
  );
}