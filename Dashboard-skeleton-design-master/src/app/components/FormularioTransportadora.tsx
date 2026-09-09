import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function FormularioTransportadora() {
  const [form, setForm] = useState({
    contrato_id: '',
    transportadora: '',
    nome_motorista: '',
    cpf_motorista: '',
    whatsapp_motorista: '',
    placa_cavalo: '',
    placa_carreta: '',
    tipo_veiculo: 'Bitrem'
  });

  const [contratos, setContratos] = useState<any[]>([]);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const carregarContratos = async () => {
      const { data, error } = await supabase
        .from('contratos_embarque')
        .select('id, numero_contrato, cliente, produto')
        .eq('status', 'Ativo');

      if (!error && data) {
        setContratos(data);
      }
    };
    carregarContratos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    const { error } = await supabase.from('ordens_carregamento').insert([
      {
        ...form,
        placa_cavalo: form.placa_cavalo.toUpperCase().trim(),
        placa_carreta: form.placa_carreta ? form.placa_carreta.toUpperCase().trim() : null,
        codigo_ordem: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'aguardando',
        checkin_realizado: false
      }
    ]);

    setCarregando(false);

    if (!error) {
      setSucesso(true);
      setForm({
        contrato_id: '',
        transportadora: '',
        nome_motorista: '',
        cpf_motorista: '',
        whatsapp_motorista: '',
        placa_cavalo: '',
        placa_carreta: '',
        tipo_veiculo: 'Bitrem'
      });
    } else {
      alert('Erro ao cadastrar agendamento. Verifique se o banco de dados aceita inserção pública (RLS).');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 text-white font-sans">
      <div className="bg-[#1E293B] p-6 sm:p-8 rounded-xl border border-slate-700 shadow-xl max-w-lg w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">Pré-Agendamento de Carga</h2>
          <p className="text-slate-400 text-sm mt-1">Informe os dados do veículo e motorista para liberar o check-in na portaria</p>
        </div>

        {sucesso ? (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 p-5 rounded-lg text-center space-y-3">
            <p className="font-bold text-lg">Agendamento Realizado!</p>
            <p className="text-sm text-emerald-200">
              O pré-cadastro está ativo no pátio. Ao chegar na fábrica, o motorista poderá realizar o check-in no QR Code informando a placa.
            </p>
            <button
              onClick={() => setSucesso(false)}
              className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Cadastrar Outro Veículo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                Contrato de Embarque *
              </label>
              <select
                required
                value={form.contrato_id}
                onChange={(e) => setForm({ ...form, contrato_id: e.target.value })}
                className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione um contrato...</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0F172A] text-white">
                    Contrato #{c.numero_contrato} - {c.cliente} ({c.produto})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                Transportadora
              </label>
              <input
                type="text"
                required
                value={form.transportadora}
                onChange={(e) => setForm({ ...form, transportadora: e.target.value })}
                className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Nome da Transportadora"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                  Nome do Motorista
                </label>
                <input
                  type="text"
                  required
                  value={form.nome_motorista}
                  onChange={(e) => setForm({ ...form, nome_motorista: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Nome Completo"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                  CPF Motorista
                </label>
                <input
                  type="text"
                  required
                  value={form.cpf_motorista}
                  onChange={(e) => setForm({ ...form, cpf_motorista: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                  Placa Cavalo
                </label>
                <input
                  type="text"
                  required
                  maxLength={7}
                  value={form.placa_cavalo}
                  onChange={(e) => setForm({ ...form, placa_cavalo: e.target.value.toUpperCase() })}
                  className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                  placeholder="ABC1D23"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                  Placa Carreta
                </label>
                <input
                  type="text"
                  maxLength={7}
                  value={form.placa_carreta}
                  onChange={(e) => setForm({ ...form, placa_carreta: e.target.value.toUpperCase() })}
                  className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                  placeholder="XYZ9876"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                  WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  value={form.whatsapp_motorista}
                  onChange={(e) => setForm({ ...form, whatsapp_motorista: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-slate-300 mb-1">
                  Tipo de Veículo
                </label>
                <select
                  value={form.tipo_veiculo}
                  onChange={(e) => setForm({ ...form, tipo_veiculo: e.target.value })}
                  className="w-full bg-[#0F172A] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Truck">Truck</option>
                  <option value="Bitrem">Bitrem</option>
                  <option value="Vanderléia">Vanderléia</option>
                  <option value="Rodotrem">Rodotrem</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-lg text-white transition-colors disabled:opacity-50"
            >
              {carregando ? 'Cadastrando Agendamento...' : 'Enviar Pré-Agendamento'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}