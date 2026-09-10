import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Truck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const GraselLogo = () => (
  <div className="flex items-center justify-center gap-3 mb-6 select-none">
    <svg 
      width="42" 
      height="42" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="drop-shadow-[0_2px_8px_rgba(56,189,248,0.2)] shrink-0"
    >
      <path 
        d="M 85 22 C 75.5 11.5 61 5 45 5 C 22.9 5 5 22.9 5 45 C 5 67.1 22.9 85 45 85 C 60.5 85 74.2 76.2 81 63.5 L 68 63.5 C 62.5 71 54 75.5 45 75.5 C 28.2 75.5 14.5 61.8 14.5 45 C 14.5 28.2 28.2 14.5 45 14.5 C 57.5 14.5 68.2 22 73 32 L 85 22 Z" 
        fill="#FFFFFF" 
      />
      <path 
        d="M 14.5 45 C 14.5 61.8 28.2 75.5 45 75.5 C 32 75.5 14.5 61 14.5 45 Z" 
        fill="#38BDF8" 
      />
      <path 
        d="M 45 43 L 83 43 C 94 48 95 62 82 72 C 68 81 53 62 45 43 Z" 
        fill="#38BDF8" 
      />
      <path 
        d="M 47 45 C 62 50 75 58 83 67" 
        stroke="#0B0F15" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
    </svg>
    <div className="flex flex-col justify-center">
      <span 
        className="font-black text-xl text-white tracking-[0.18em] leading-none" 
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        GRASEL
      </span>
      <span className="text-[8px] font-bold text-sky-400 tracking-[0.28em] leading-tight mt-1 uppercase opacity-90">
        GRÃOS E INSUMOS
      </span>
    </div>
  </div>
);

export default function FormularioTransportadora() {
  const [placa, setPlaca] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const handleCheckin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem(null);

    const placaFormatada = placa.toUpperCase().trim();
    const whatsappLimpo = whatsapp.replace(/\D/g, '');

    // 1. Busca pré-agendamento em aberto para a placa
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

    // 2. Atualiza motorista e muda status para "em_patio" (Triagem / Aguardando Aprovação)
    const { error: updateError } = await supabase
      .from('ordens_carregamento')
      .update({
        nome_motorista: nome,
        whatsapp_motorista: whatsappLimpo,
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
        texto: `Check-in realizado! Veículo ${placaFormatada} registrado no pátio e aguardando liberação.`
      });
      setPlaca('');
      setNome('');
      setWhatsapp('');
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F15] flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-[#161B23] p-8 rounded-2xl border border-white/5 shadow-2xl max-w-md w-full">
        <GraselLogo />
        
        <h1 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Truck size={20} className="text-blue-400" /> Check-in na Portaria
        </h1>
        <p className="text-xs text-gray-400 mb-6">Informe seus dados para confirmar a chegada e entrar na triagem</p>

        {mensagem && (
          <div className={`p-3.5 rounded-xl mb-5 text-xs font-medium flex items-start gap-2.5 ${
            mensagem.tipo === 'sucesso' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            <span>{mensagem.texto}</span>
          </div>
        )}

        <form onSubmit={handleCheckin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Placa Cavalo</label>
            <input
              type="text"
              required
              maxLength={7}
              placeholder="ABC1D23"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().trim())}
              className="w-full bg-[#1A2030] p-3 rounded-xl border border-white/5 font-mono uppercase text-sm text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Nome do Motorista</label>
            <input
              type="text"
              required
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#1A2030] p-3 rounded-xl border border-white/5 text-sm text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">WhatsApp (DDD + Número)</label>
            <input
              type="tel"
              required
              placeholder="45999998888"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full bg-[#1A2030] p-3 rounded-xl border border-white/5 text-sm text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {carregando ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Validando agendamento...
              </>
            ) : (
              'Confirmar Chegada'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}