import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Truck, Fuel, DollarSign, MapPin, CheckCircle, Clock, PlusCircle, Filter, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function AbaLogistica({ userName }) {
  const [viagens, setViagens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do Formulário de Nova Viagem
  const [formViagem, setFormViagem] = useState({
    placa: "",
    local_carregamento: "",
    produto: "Milho granel",
    peso_carregado: "",
    cliente_destino: "",
    km_inicial: "",
    litros_combustivel: "",
    numero_nota_combustivel: "",
    valor_combustivel: "",
    outros_gastos: "",
    descricao_outros_gastos: ""
  });

  // Estados para Finalizar Viagem (Modal/Card)
  const [viagemEmEdicao, setViagemEmEdicao] = useState(null);
  const [formDescarga, setFormDescarga] = useState({
    local_descarga: "",
    peso_descarga: ""
  });

  // Filtros
  const [fPlaca, setFPlaca] = useState("");
  const [fStatus, setFStatus] = useState("");

  const carregarViagens = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("diario_bordo")
      .select("*")
      .order("created_at", { ascending: false });
    setViagens(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarViagens();
  }, [carregarViagens]);

  const handleCadastrarViagem = async (e) => {
    e.preventDefault();
    const payload = {
      ...formViagem,
      placa: formViagem.placa.toUpperCase(),
      peso_carregado: Number(formViagem.peso_carregado) || 0,
      km_inicial: Number(formViagem.km_inicial) || 0,
      litros_combustivel: Number(formViagem.litros_combustivel) || 0,
      valor_combustivel: Number(formViagem.valor_combustivel) || 0,
      outros_gastos: Number(formViagem.outros_gastos) || 0,
      status: "EM_TRANSITO",
      operador: userName
    };

    const { error } = await supabase.from("diario_bordo").insert([payload]);

    if (error) {
      alert("Erro ao registrar viagem: " + error.message);
    } else {
      alert("Viagem/Diário de bordo registrado com sucesso!");
      setFormViagem({
        placa: "",
        local_carregamento: "",
        produto: "Milho granel",
        peso_carregado: "",
        cliente_destino: "",
        km_inicial: "",
        litros_combustivel: "",
        numero_nota_combustivel: "",
        valor_combustivel: "",
        outros_gastos: "",
        descricao_outros_gastos: ""
      });
      carregarViagens();
    }
  };

  const handleFinalizarViagem = async (e) => {
    e.preventDefault();
    if (!viagemEmEdicao) return;

    const { error } = await supabase
      .from("diario_bordo")
      .update({
        local_descarga: formDescarga.local_descarga,
        peso_descarga: Number(formDescarga.peso_descarga) || 0,
        status: "FINALIZADO"
      })
      .eq("id", viagemEmEdicao.id);

    if (error) {
      alert("Erro ao finalizar viagem: " + error.message);
    } else {
      alert("Descarregamento registrado e viagem finalizada!");
      setViagemEmEdicao(null);
      setFormDescarga({ local_descarga: "", peso_descarga: "" });
      carregarViagens();
    }
  };

  const viagensFiltradas = useMemo(() => {
    return viagens.filter(v => {
      const matchPlaca = !fPlaca || v.placa.includes(fPlaca.toUpperCase());
      const matchStatus = !fStatus || v.status === fStatus;
      return matchPlaca && matchStatus;
    });
  }, [viagens, fPlaca, fStatus]);

  return (
    <div className="flex flex-col gap-6">
      {/* CADASTRO DE NOVA VIAGEM / DIÁRIO DE BORDO */}
      <form onSubmit={handleCadastrarViagem} className="bg-[#161B23] p-5 rounded-2xl border border-white/5 flex flex-col gap-4 shadow-xl">
        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
          <Truck size={18} /> Novo Registro de Viagem & Diário de Bordo
        </h3>

        {/* DADOS DO CARREGAMENTO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Placa</label>
            <input 
              required
              placeholder="Ex: RHG6B10" 
              value={formViagem.placa} 
              onChange={e => setFormViagem({...formViagem, placa: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Local Carregamento</label>
            <input 
              required
              placeholder="Ex: Silo Matriz" 
              value={formViagem.local_carregamento} 
              onChange={e => setFormViagem({...formViagem, local_carregamento: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Produto</label>
            <input 
              required
              placeholder="Ex: Milho granel" 
              value={formViagem.produto} 
              onChange={e => setFormViagem({...formViagem, produto: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Peso Carregado (KG)</label>
            <input 
              required
              type="number"
              step="0.01"
              placeholder="Ex: 32500" 
              value={formViagem.peso_carregado} 
              onChange={e => setFormViagem({...formViagem, peso_carregado: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Cliente Destino</label>
            <input 
              required
              placeholder="Ex: Granja Silva" 
              value={formViagem.cliente_destino} 
              onChange={e => setFormViagem({...formViagem, cliente_destino: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 mt-1" 
            />
          </div>
        </div>

        {/* DIÁRIO DE BORDO - ABASTECIMENTO E CUSTOS */}
        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 pt-2 border-t border-white/5">
          <Fuel size={14} /> Abastecimento & Despesas de Viagem
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">KM Inicial / Atual</label>
            <input 
              type="number"
              placeholder="Ex: 145200" 
              value={formViagem.km_inicial} 
              onChange={e => setFormViagem({...formViagem, km_inicial: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Litros Combustível</label>
            <input 
              type="number"
              step="0.01"
              placeholder="Ex: 180.5" 
              value={formViagem.litros_combustivel} 
              onChange={e => setFormViagem({...formViagem, litros_combustivel: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Nº Nota Combustível</label>
            <input 
              placeholder="Ex: NF-8854" 
              value={formViagem.numero_nota_combustivel} 
              onChange={e => setFormViagem({...formViagem, numero_nota_combustivel: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Combustível (R$)</label>
            <input 
              type="number"
              step="0.01"
              placeholder="Ex: 1050.00" 
              value={formViagem.valor_combustivel} 
              onChange={e => setFormViagem({...formViagem, valor_combustivel: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Outros Gastos (R$)</label>
            <input 
              type="number"
              step="0.01"
              placeholder="Ex: 80.00 (Pedágio)" 
              value={formViagem.outros_gastos} 
              onChange={e => setFormViagem({...formViagem, outros_gastos: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500 mt-1" 
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição Outros Gastos</label>
            <input 
              placeholder="Ex: Pedágio / Chapeiro" 
              value={formViagem.descricao_outros_gastos} 
              onChange={e => setFormViagem({...formViagem, descricao_outros_gastos: e.target.value})}
              className="w-full bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500 mt-1" 
            />
          </div>
        </div>

        <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs p-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/20 mt-2 flex items-center justify-center gap-2">
          <PlusCircle size={16} /> REGISTRAR SAÍDA DA VIAGEM
        </button>
      </form>

      {/* MODAL DE REGISTRO DE DESCARGA */}
      {viagemEmEdicao && (
        <form onSubmit={handleFinalizarViagem} className="bg-[#1A2030] p-5 rounded-2xl border border-emerald-500/40 flex flex-col gap-3 shadow-2xl animate-in fade-in">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle size={16} /> Registrar Descarregamento - Placa: {viagemEmEdicao.placa}
            </h4>
            <button type="button" onClick={() => setViagemEmEdicao(null)} className="text-xs text-gray-400 hover:text-white">
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Local de Descarga</label>
              <input 
                required
                placeholder="Ex: Fábrica Guairá" 
                value={formDescarga.local_descarga} 
                onChange={e => setFormDescarga({...formDescarga, local_descarga: e.target.value})}
                className="w-full bg-[#161B23] p-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-emerald-500 mt-1" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Peso de Descarga (KG)</label>
              <input 
                required
                type="number"
                step="0.01"
                placeholder="Ex: 32420" 
                value={formDescarga.peso_descarga} 
                onChange={e => setFormDescarga({...formDescarga, peso_descarga: e.target.value})}
                className="w-full bg-[#161B23] p-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-emerald-500 mt-1" 
              />
            </div>
          </div>

          <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 mt-1">
            FINALIZAR VIAGEM
          </button>
        </form>
      )}

      {/* HISTÓRICO E TABELA DE VIAGENS */}
      <div className="bg-[#161B23] rounded-2xl border border-white/5 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-white/5 pb-3">
          <h4 className="text-xs font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
            <MapPin size={16} className="text-blue-400" /> Operações de Logística
          </h4>

          {/* Filtros Rápidos */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input 
              placeholder="Buscar por placa..." 
              value={fPlaca} 
              onChange={e => setFPlaca(e.target.value)} 
              className="bg-[#1A2030] p-1.5 px-3 rounded-lg text-xs outline-none border border-transparent focus:border-blue-500"
            />
            <select 
              value={fStatus} 
              onChange={e => setFStatus(e.target.value)} 
              className="bg-[#1A2030] p-1.5 rounded-lg text-xs outline-none border border-transparent focus:border-blue-500 text-gray-300"
            >
              <option value="">Todos os Status</option>
              <option value="EM_TRANSITO">Em Trânsito</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-gray-400 border-b border-white/5 font-semibold uppercase tracking-wider text-[9px]">
                {["Data", "Placa", "Produto", "Origem -> Destino", "Peso Carga / Descarga", "Diferença", "Custo Viagem", "Status", "Ação"].map(h => <th key={h} className="p-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {viagensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-500">
                    Nenhuma operação registrada.
                  </td>
                </tr>
              ) : (
                viagensFiltradas.map(v => {
                  const custoTotal = (Number(v.valor_combustivel) || 0) + (Number(v.outros_gastos) || 0);
                  const quebra = v.peso_descarga ? (Number(v.peso_descarga) - Number(v.peso_carregado)) : 0;

                  return (
                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-2.5 text-gray-400">{new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="p-2.5 font-bold text-white">{v.placa}</td>
                      <td className="p-2.5 text-gray-300">{v.produto}</td>
                      <td className="p-2.5 text-gray-300">
                        {v.local_carregamento} &rarr; <span className="text-blue-400">{v.cliente_destino}</span>
                      </td>
                      <td className="p-2.5 text-gray-200">
                        <b>{Number(v.peso_carregado).toLocaleString('pt-BR')}kg</b> / {v.peso_descarga ? `${Number(v.peso_descarga).toLocaleString('pt-BR')}kg` : '-'}
                      </td>
                      <td className="p-2.5 font-bold">
                        {v.peso_descarga ? (
                          <span className={quebra < 0 ? "text-red-400" : "text-emerald-400"}>
                            {quebra > 0 ? `+${quebra}kg` : `${quebra}kg`}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-2.5 text-amber-400 font-bold">
                        R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          v.status === 'EM_TRANSITO' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {v.status === 'EM_TRANSITO' ? 'EM TRÂNSITO' : 'FINALIZADO'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {v.status === 'EM_TRANSITO' ? (
                          <button 
                            onClick={() => {
                              setViagemEmEdicao(v);
                              setFormDescarga({ local_descarga: v.cliente_destino, peso_descarga: "" });
                            }} 
                            className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white p-1 px-2 rounded font-bold text-[10px] transition-colors"
                          >
                            Dar Descarga
                          </button>
                        ) : (
                          <span className="text-gray-500 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}