import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Loader2, LogOut, Trash2, Printer, DollarSign, Package, Calendar, Activity, RefreshCw, AlertTriangle, PlusCircle, MinusCircle, History, Truck, Filter, Search, CheckSquare } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from '@/lib/supabaseClient';
import jsPDF from "jspdf";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import AbaLogistica from './AbaLogistica.jsx';
import CheckinPortaria from './app/(public)/checkin/page.jsx';
import AgendamentoPage from './app/(public)/agendamento/page.jsx';

// ==========================================
// FUNÇÕES DE SUPORTE OFFLINE E CACHE LOCAL
// ==========================================

const QUEUE_KEY = 'grasel_offline_queue';
const CACHE_PREFIX = 'grasel_cache_';

export function setLocalCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar cache local:', e);
  }
}

export function getLocalCache(key, fallback = []) {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Erro ao ler cache local:', e);
    return fallback;
  }
}

export function enqueueOfflineAction(action) {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ ...action, id: Date.now() + Math.random().toString(36).substr(2, 9) });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.warn('⚠️ Operação salva offline. Sincronização pendente.');
  } catch (e) {
    console.error('Erro ao enfileirar ação offline:', e);
  }
}

export async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

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
        remainingQueue.push(action);
      }
    } catch (e) {
      console.error('Erro de rede durante sincronização:', e);
      remainingQueue.push(action);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
}

// ==========================================
// CONSTANTES E CONFIGURAÇÕES VISUAIS
// ==========================================

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

const COLUNAS_PATIO = [
  { id: 'aguardando', titulo: 'Aguardando Chegada', cor: 'border-yellow-500 text-yellow-400' },
  { id: 'em_patio', titulo: 'Em Pátio / Triagem', cor: 'border-blue-500 text-blue-400' },
  { id: 'carregando', titulo: 'Carregando', cor: 'border-purple-500 text-purple-400' },
  { id: 'concluido', titulo: 'Concluído / Saída', cor: 'border-green-500 text-green-400' }
];

const faviconSvg = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 85 22 C 75.5 11.5 61 5 45 5 C 22.9 5 5 22.9 5 45 C 5 67.1 22.9 85 45 85 C 60.5 85 74.2 76.2 81 63.5 L 68 63.5 C 62.5 71 54 75.5 45 75.5 C 28.2 75.5 14.5 61.8 14.5 45 C 14.5 28.2 28.2 14.5 45 14.5 C 57.5 14.5 68.2 22 73 32 L 85 22 Z" fill="#FFFFFF"/>
  <path d="M 14.5 45 C 14.5 61.8 28.2 75.5 45 75.5 C 32 75.5 14.5 61 14.5 45 Z" fill="#38BDF8"/>
  <path d="M 45 43 L 83 43 C 94 48 95 62 82 72 C 68 81 53 62 45 43 Z" fill="#38BDF8"/>
  <path d="M 47 45 C 62 50 75 58 83 67" stroke="#0B0F15" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`)}`;

const GraselLogo = () => (
  <div className="flex items-center gap-3 py-1.5 select-none">
    <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_2px_8px_rgba(56,189,248,0.2)] shrink-0 transition-transform hover:scale-105 duration-300">
      <path d="M 85 22 C 75.5 11.5 61 5 45 5 C 22.9 5 5 22.9 5 45 C 5 67.1 22.9 85 45 85 C 60.5 85 74.2 76.2 81 63.5 L 68 63.5 C 62.5 71 54 75.5 45 75.5 C 28.2 75.5 14.5 61.8 14.5 45 C 14.5 28.2 28.2 14.5 45 14.5 C 57.5 14.5 68.2 22 73 32 L 85 22 Z" fill="#FFFFFF" />
      <path d="M 14.5 45 C 14.5 61.8 28.2 75.5 45 75.5 C 32 75.5 14.5 61 14.5 45 Z" fill="#38BDF8" />
      <path d="M 45 43 L 83 43 C 94 48 95 62 82 72 C 68 81 53 62 45 43 Z" fill="#38BDF8" />
      <path d="M 47 45 C 62 50 75 58 83 67" stroke="#0B0F15" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
    <div className="flex flex-col justify-center">
      <span className="font-black text-xl text-white tracking-[0.18em] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">GRASEL</span>
      <span className="text-[8px] font-bold text-sky-400 tracking-[0.28em] leading-tight mt-1 uppercase opacity-90">GRÃOS E INSUMOS</span>
    </div>
  </div>
);

const gerarPDF = (p, operador) => {
  const doc = new jsPDF();
  const agora = new Date().toLocaleString('pt-BR');
  const info = [
    `Data/Hora Emissão: ${agora}`,
    `Op. Saída: ${operador || 'N/A'}`,
    `Comprovante: ${p.comprovante || ''}`,
    `Placa: ${p.placa || ''}`,
    `Peso Entrada: ${Number(p.peso_entrada || 0).toFixed(2)}kg`,
    `Peso Saída: ${Number(p.peso_saida || 0).toFixed(2)}kg`,
    `Peso Líquido: ${Number(p.peso_liquido || 0).toFixed(2)}kg`,
    `Qtd Sacas: ${Number(p.sacas || 0).toFixed(2)}`,
    `Valor p/ Saca: R$ ${Number(p.valor_unitario || 0).toFixed(2)}`,
    `Valor Total: R$ ${Number(p.valor_total || 0).toFixed(2)}`,
    `Pagamento: ${p.forma_pagamento || ''}`
  ];

  [10, 150].forEach(y => {
    doc.setFontSize(12);
    doc.text("COMPROVANTE GRASEL", 10, y);
    doc.setFontSize(10);
    info.forEach((txt, i) => doc.text(txt, 10, y + 8 + (i * 6)));
    const assinaturaY = y + 85;
    doc.line(10, assinaturaY, 90, assinaturaY);
    doc.line(110, assinaturaY, 190, assinaturaY);
    doc.text("Assinatura do Cliente", 10, assinaturaY + 5);
    doc.text("Assinatura do Operador", 110, assinaturaY + 5);
  });

  doc.save(`comp_${p.comprovante}.pdf`);
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="#9CA3AF" fontSize="10" fontWeight="600" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const PesagemItem = ({ p, onFinalizar, onExcluir, saldoCaixa }) => {
  const [pesoSaida, setPesoSaida] = useState("");
  const [valorSaca, setValorSaca] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");
  const [formaPag, setFormaPag] = useState("PIX");
  
  const pesoLiquido = Math.max(0, Number(pesoSaida) - p.peso_entrada);
  const qtdSacas = pesoLiquido / 60;
  const valorTotal = qtdSacas * Number(valorSaca);
  const troco = formaPag === "DINHEIRO" ? Math.max(0, Number(valorRecebido) - valorTotal) : 0;
  const trocoInvalido = formaPag === "DINHEIRO" && troco > saldoCaixa;

  const handleRecebidoChange = (e) => {
    const val = e.target.value;
    setValorRecebido(val);
    setFormaPag(Number(val) > 0 ? "DINHEIRO" : "PIX");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (Number(pesoSaida) < p.peso_entrada) {
      alert("O peso de saída não pode ser menor que o peso de entrada!");
      return;
    }
    onFinalizar(p, e, { pesoSaida, valorSaca, valorRecebido, formaPag, pesoLiquido, qtdSacas, valorTotal, troco });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#161B23] p-4 rounded-xl flex flex-col gap-3 border border-white/5 hover:border-blue-500/25 transition-all shadow-lg">
      <div className="flex justify-between text-xs font-bold text-blue-400">
        <span>Placa: {p.placa}</span> <span>Produto: {p.produto}</span> <span>Entrada: {p.peso_entrada.toFixed(2)}kg</span>
      </div>
      <div className="flex gap-2">
        <input name="peso_saida" type="number" step="10" min={p.peso_entrada} placeholder="Peso Saída" value={pesoSaida} onChange={(e) => setPesoSaida(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg flex-1 text-sm outline-none border border-transparent focus:border-blue-500 transition-all" required />
        <input name="valor_saca" type="number" step="0.01" placeholder="R$ Saca" value={valorSaca} onChange={(e) => setValorSaca(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg flex-1 text-sm outline-none border border-transparent focus:border-blue-500 transition-all" required />
        <input name="recebido" type="number" step="0.01" placeholder="Vlr Recebido" value={valorRecebido} onChange={handleRecebidoChange} className="bg-[#1A2030] p-2 rounded-lg flex-1 text-sm outline-none border border-transparent focus:border-blue-500 transition-all" />
        <select name="pag" value={formaPag} onChange={(e) => setFormaPag(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500"><option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option></select>
        <button disabled={trocoInvalido} className={`p-2 px-5 rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-md ${trocoInvalido ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'}`}>FINALIZAR</button>
        <button type="button" onClick={() => onExcluir(p.id)} className="bg-red-900/40 hover:bg-red-800 p-2 px-3 rounded-lg cursor-pointer transition-colors"><Trash2 size={16} color="#EF4444"/></button>
      </div>
      <div className="flex gap-6 text-[11px] text-gray-400 border-t border-white/5 pt-2 font-medium items-center justify-between">
        <div className="flex gap-6">
          <span>Líquido: <b className="text-white">{pesoLiquido.toFixed(2)}kg</b></span>
          <span>Sacas: <b className="text-white">{qtdSacas.toFixed(2)}</b></span>
          <span>Total: <b className="text-green-400">R$ {valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</b></span>
          {formaPag === "DINHEIRO" && (
             <span>Troco: <b className={trocoInvalido ? "text-red-400 font-bold" : "text-amber-400"}>R$ {troco.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</b></span>
          )}
        </div>
        {trocoInvalido && (
          <span className="text-red-400 text-[10px] font-bold flex items-center gap-1">
            <AlertTriangle size={12} /> Saldo de caixa insuficiente para troco!
          </span>
        )}
      </div>
    </form>
  );
};

export function KanbanPatio() {
  const [ordens, setOrdens] = useState(() => getLocalCache('ordens_carregamento', []));
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  const processandoRef = useRef({});

  const buscarOrdens = useCallback(async () => {
    const cached = getLocalCache('ordens_carregamento', []);
    if (cached.length > 0) setOrdens(cached);
    if (!navigator.onLine) { setCarregando(false); return; }

    const { data, error } = await supabase
      .from('ordens_carregamento')
      .select('*, contratos_embarque(id, numero_contrato, quantidade_disponivel)')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setOrdens(data);
      setLocalCache('ordens_carregamento', data);
    }
    setCarregando(false);
  }, []);

  const atualizarStatus = async (id, novoStatus) => {
    const dadosUpdate = { status: novoStatus };
    if (novoStatus === 'em_patio') dadosUpdate.data_chegada_portaria = new Date().toISOString();

    setOrdens((prev) => {
      const updated = prev.map((ordem) => (ordem.id === id ? { ...ordem, ...dadosUpdate } : ordem));
      setLocalCache('ordens_carregamento', updated);
      return updated;
    });

    if (navigator.onLine) {
      const { error } = await supabase.from('ordens_carregamento').update(dadosUpdate).eq('id', id);
      if (error) enqueueOfflineAction({ table: 'ordens_carregamento', type: 'UPDATE', payload: dadosUpdate, match: { id } });
    } else {
      enqueueOfflineAction({ table: 'ordens_carregamento', type: 'UPDATE', payload: dadosUpdate, match: { id } });
    }
  };

  const atualizarConclusaoCarregamento = async (id, notaFiscal, pesoCarregado, contratoId) => {
    if (processandoRef.current[id]) return;
    processandoRef.current[id] = true;
    setProcessandoId(id);

    try {
      const idContratoReal = contratoId || ordens.find(o => o.id === id)?.contrato_id || ordens.find(o => o.id === id)?.contratos_embarque?.id;
      if (!idContratoReal) {
        alert('Aviso: Esta ordem não possui contrato vinculado!');
        return;
      }

      const dadosUpdateOrdem = { status: 'concluido', nota_fiscal: notaFiscal, peso_carregado: Number(pesoCarregado) };

      setOrdens((prev) => {
        const updated = prev.map((ordem) => (ordem.id === id ? { ...ordem, ...dadosUpdateOrdem } : ordem));
        setLocalCache('ordens_carregamento', updated);
        return updated;
      });

      if (navigator.onLine) {
        await supabase.from('ordens_carregamento').update(dadosUpdateOrdem).eq('id', id);
        const { data: contrato } = await supabase.from('contratos_embarque').select('quantidade_disponivel, numero_contrato').eq('id', idContratoReal).single();
        if (contrato) {
          const novoSaldo = (Number(contrato.quantidade_disponivel) || 0) - (Number(pesoCarregado) || 0);
          await supabase.from('contratos_embarque').update({ quantidade_disponivel: novoSaldo }).eq('id', idContratoReal);
          alert(`Carregamento concluído!\nContrato: ${contrato.numero_contrato}\nSaldo restante: ${novoSaldo.toLocaleString('pt-BR')} Kg`);
        }
      } else {
        enqueueOfflineAction({ table: 'ordens_carregamento', type: 'UPDATE', payload: dadosUpdateOrdem, match: { id } });
        enqueueOfflineAction({ table: 'contratos_embarque', type: 'UPDATE', payload: { peso_carregado_offline: Number(pesoCarregado) }, match: { id: idContratoReal } });
        alert('⚠️ Operação salva offline.');
      }
      buscarOrdens();
    } finally {
      processandoRef.current[id] = false;
      setProcessandoId(null);
    }
  };

  useEffect(() => {
    buscarOrdens();
    if (!navigator.onLine) return;

    const canal = supabase.channel('mudancas-patio').on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_carregamento' }, () => buscarOrdens()).subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [buscarOrdens]);

  if (carregando) return <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Carregando pátio...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUNAS_PATIO.map((coluna) => {
        const ordensColuna = ordens.filter((o) => o.status === coluna.id);
        return (
          <div key={coluna.id} className="bg-[#161B23] rounded-xl p-4 border border-white/5 flex flex-col h-[calc(100vh-280px)] min-h-[450px]">
            <div className={`flex justify-between items-center pb-3 mb-3 border-b-2 ${coluna.cor}`}>
              <h2 className="font-bold text-xs uppercase tracking-wider">{coluna.titulo}</h2>
              <span className="bg-[#1A2030] text-gray-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/10">{ordensColuna.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {ordensColuna.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8 border border-dashed border-white/5 rounded-lg">Nenhum veículo nesta etapa</div>
              ) : (
                ordensColuna.map((ordem) => (
                  <div key={ordem.id} className="bg-[#1A2030] p-4 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all shadow-md">
                    <div className="flex justify-between text-xs font-bold text-blue-400 mb-1">
                      <span>#{ordem.codigo_ordem || ordem.id.substring(0, 6)}</span>
                      <span className="text-gray-400 text-[11px] font-normal">{ordem.tipo_veiculo}</span>
                    </div>
                    {ordem.contratos_embarque?.numero_contrato && (
                      <div className="mb-2 text-[11px] bg-blue-950/40 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-medium inline-block">
                        Contrato: {ordem.contratos_embarque.numero_contrato}
                      </div>
                    )}
                    <h3 className="font-bold text-white text-sm">{ordem.transportadora}</h3>
                    <p className="text-xs text-gray-300 mt-1">Mot: <span className="text-white font-medium">{ordem.nome_motorista}</span></p>
                    <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-gray-400 grid grid-cols-2 gap-1">
                      <div><strong>Cavalo:</strong> <span className="text-gray-200">{ordem.placa_cavalo}</span></div>
                      <div><strong>Carreta:</strong> <span className="text-gray-200">{ordem.placa_carreta || 'N/A'}</span></div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5">
                      {ordem.status === 'aguardando' && (
                        <button onClick={() => atualizarStatus(ordem.id, 'em_patio')} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg font-semibold transition-colors cursor-pointer">Aprovar Entrada</button>
                      )}
                      {ordem.status === 'em_patio' && (
                        <button onClick={() => atualizarStatus(ordem.id, 'carregando')} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-1.5 rounded-lg font-semibold transition-colors cursor-pointer">Iniciar Carregamento</button>
                      )}
                      {ordem.status === 'carregando' && (
                        <div className="mt-3 pt-2 border-t border-white/5 space-y-2">
                          <input type="text" placeholder="Número da NF" defaultValue={ordem.nota_fiscal || ''} id={`nf-${ordem.id}`} disabled={processandoId === ordem.id} className="w-full p-2 text-xs bg-[#161B23] border border-white/10 text-white rounded-lg outline-none focus:border-blue-500" />
                          <input type="number" placeholder="Peso Carregado (KG)" defaultValue={ordem.peso_carregado || ''} id={`peso-${ordem.id}`} disabled={processandoId === ordem.id} className="w-full p-2 text-xs bg-[#161B23] border border-white/10 text-white rounded-lg outline-none focus:border-blue-500" />
                          <button disabled={processandoId === ordem.id} onClick={() => {
                            const nf = document.getElementById(`nf-${ordem.id}`)?.value || '';
                            const peso = parseFloat(document.getElementById(`peso-${ordem.id}`)?.value) || 0;
                            if (!nf || peso <= 0) return alert('Preencha a NF e o Peso!');
                            atualizarConclusaoCarregamento(ordem.id, nf, peso, ordem.contrato_id || ordem.contratos_embarque?.id);
                          }} className="w-full text-xs font-bold py-2 rounded-lg mt-2 bg-green-600 hover:bg-green-500 text-white cursor-pointer shadow-md">
                            {processandoId === ordem.id ? <><Loader2 className="animate-spin inline" size={14} /> Processando...</> : 'Finalizar e Baixar do Contrato'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Operador");
  const [userRole, setUserRole] = useState("gestor");
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState(() => getLocalCache('pesagens', []));
  const [movimentacoes, setMovimentacoes] = useState(() => getLocalCache('movimentacoes', []));
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "", ano: "" });
  const [activeKpi, setActiveKpi] = useState("TODOS");
  const [saldoCaixa, setSaldoCaixa] = useState(() => Number(getLocalCache('saldo_caixa', 0)));

  const [valorAporte, setValorAporte] = useState("");
  const [valorSangria, setValorSangria] = useState("");
  const [motivoSangria, setMotivoSangria] = useState("");

  const [fCaixaTipo, setFCaixaTipo] = useState("");
  const [fCaixaDataI, setFCaixaDataI] = useState("");
  const [fCaixaDataF, setFCaixaDataF] = useState("");
  const [fCaixaOperador, setFCaixaOperador] = useState("");
  const [fCaixaBusca, setFCaixaBusca] = useState("");

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublicCheckin = path.includes("/checkin") || (typeof window !== 'undefined' && window.location.search.includes("public=checkin"));
  const isPublicAgendamento = path.includes("/agendamento") || (typeof window !== 'undefined' && window.location.search.includes("public=agendamento"));

  useEffect(() => {
    document.title = "Grasel Cerealista";
    let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = faviconSvg;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const load = useCallback(async (userId) => {
    setLoading(true);
    if (getLocalCache('pesagens', []).length) setPesagens(getLocalCache('pesagens', []));
    if (getLocalCache('movimentacoes', []).length) setMovimentacoes(getLocalCache('movimentacoes', []));
    setSaldoCaixa(Number(getLocalCache('saldo_caixa', 0)));

    if (!navigator.onLine) { setLoading(false); return; }

    try {
      const [{ data: pesagensData }, { data: caixaData }, { data: movData }, { data: profile }] = await Promise.all([
        supabase.from('fat_pesagens').select('*').neq('status_pagamento', 'EXCLUÍDO'),
        supabase.from('controle_caixa').select('saldo_atual').eq('id', 1).maybeSingle(),
        supabase.from('movimentacoes_caixa').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      ]);
      
      if (pesagensData) { setPesagens(pesagensData); setLocalCache('pesagens', pesagensData); }
      if (movData) { setMovimentacoes(movData); setLocalCache('movimentacoes', movData); }
      if (caixaData) { setSaldoCaixa(Number(caixaData.saldo_atual || 0)); setLocalCache('saldo_caixa', Number(caixaData.saldo_atual || 0)); }
      if (profile) {
        if (profile.nome) setUserName(profile.nome);
        const role = (profile.role || profile.perfil || 'gestor').toLowerCase();
        setUserRole(role);
        if (role === 'motorista') setAba('logistica');
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isPublicCheckin || isPublicAgendamento) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) load(session.user.id); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
      setSession(session); 
      if (session) load(session.user.id); else setLoading(false);
    });

    const handleOnline = async () => { await syncOfflineQueue(); if (session?.user?.id) load(session.user.id); };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) syncOfflineQueue();

    return () => { subscription.unsubscribe(); window.removeEventListener('online', handleOnline); };
  }, [load, isPublicCheckin, isPublicAgendamento]);

  const registrarMovimentacao = async (tipo, valor, motivo, novoSaldo) => {
    setSaldoCaixa(novoSaldo);
    setLocalCache('saldo_caixa', novoSaldo);
    const novaMov = { id: Date.now() + Math.random().toString(36).substr(2, 9), tipo, valor, motivo, operador: userName, saldo_resultante: novoSaldo, created_at: new Date().toISOString() };

    setMovimentacoes(prev => {
      const updated = [novaMov, ...prev];
      setLocalCache('movimentacoes', updated);
      return updated;
    });

    if (navigator.onLine) {
      try {
        await supabase.from('controle_caixa').upsert({ id: 1, saldo_atual: novoSaldo });
        await supabase.from('movimentacoes_caixa').insert([{ tipo, valor, motivo, operador: userName, saldo_resultante: novoSaldo }]);
      } catch {
        enqueueOfflineAction({ table: 'controle_caixa', type: 'UPDATE', payload: { saldo_atual: novoSaldo }, match: { id: 1 } });
        enqueueOfflineAction({ table: 'movimentacoes_caixa', type: 'INSERT', payload: { tipo, valor, motivo, operador: userName, saldo_resultante: novoSaldo } });
      }
    } else {
      enqueueOfflineAction({ table: 'controle_caixa', type: 'UPDATE', payload: { saldo_atual: novoSaldo }, match: { id: 1 } });
      enqueueOfflineAction({ table: 'movimentacoes_caixa', type: 'INSERT', payload: { tipo, valor, motivo, operador: userName, saldo_resultante: novoSaldo } });
    }
  };

  const handleAdicionarTroco = async (e) => {
    e.preventDefault();
    const val = Number(valorAporte);
    if (val <= 0) return alert("Informe um valor válido.");
    await registrarMovimentacao('ENTRADA_TROCO', val, 'Aporte de Troco', saldoCaixa + val);
    setValorAporte("");
    alert("Troco adicionado!");
  };

  const handleSangriaGasto = async (e) => {
    e.preventDefault();
    const val = Number(valorSangria);
    if (val <= 0 || !motivoSangria.trim()) return alert("Preencha todos os campos.");
    if (val > saldoCaixa) return alert("Saldo insuficiente!");
    await registrarMovimentacao('SANGRIA_GASTO', val, motivoSangria, saldoCaixa - val);
    setValorSangria(""); setMotivoSangria("");
    alert("Retirada registrada!");
  };

  const excluirPesagem = async (id) => {
    if (window.confirm("Confirmar exclusão?")) {
      setPesagens(prev => {
        const updated = prev.map(p => p.id === id ? { ...p, status_pagamento: 'EXCLUÍDO' } : p);
        setLocalCache('pesagens', updated);
        return updated;
      });
      if (navigator.onLine) await supabase.from('fat_pesagens').update({ status_pagamento: 'EXCLUÍDO' }).eq('id', id);
      else enqueueOfflineAction({ table: 'fat_pesagens', type: 'UPDATE', payload: { status_pagamento: 'EXCLUÍDO' }, match: { id } });
    }
  };

  const registrarEntrada = async (e) => {
    e.preventDefault();
    const all = getLocalCache('pesagens', pesagens);
    const last = all[0]?.comprovante ? parseInt(all[0].comprovante.split('-')[1]) : 0;
    const nextComp = `CP-${(last + 1).toString().padStart(6, '0')}`;
    
    const nova = { id: Date.now() + Math.random().toString(36).substr(2, 9), comprovante: nextComp, placa: e.target.placa.value.toUpperCase(), produto: e.target.prod.value, peso_entrada: Number(e.target.peso.value), data: new Date().toISOString().split('T')[0], status_pagamento: 'ABERTO', operador_entrada: userName };

    setPesagens(prev => { const up = [nova, ...prev]; setLocalCache('pesagens', up); return up; });
    if (navigator.onLine) await supabase.from('fat_pesagens').insert([nova]);
    else enqueueOfflineAction({ table: 'fat_pesagens', type: 'INSERT', payload: nova });

    alert("Registrado: " + nextComp);
    e.target.reset();
  };

  const finalizarPesagem = async (p, e, calc) => {
    e.preventDefault();
    const { pesoSaida, valorSaca, formaPag, pesoLiquido, qtdSacas, valorTotal, troco } = calc;

    if (formaPag === "DINHEIRO") {
      if (troco > saldoCaixa) return alert("Saldo de troco insuficiente!");
      await registrarMovimentacao('SAIDA_TROCO', troco, `Troco comp. ${p.comprovante}`, saldoCaixa - troco);
    }

    const payload = { peso_saida: Number(pesoSaida), peso_liquido: pesoLiquido, sacas: qtdSacas, valor_unitario: Number(valorSaca), valor_total: valorTotal, valor_troco: troco, forma_pagamento: formaPag, status_pagamento: 'FECHADO', operador_saida: userName };

    setPesagens(prev => { const up = prev.map(i => i.id === p.id ? { ...i, ...payload } : i); setLocalCache('pesagens', up); return up; });
    if (navigator.onLine) await supabase.from('fat_pesagens').update(payload).eq('id', p.id);
    else enqueueOfflineAction({ table: 'fat_pesagens', type: 'UPDATE', payload, match: { id: p.id } });

    gerarPDF({ ...p, ...payload }, userName);
  };

  const filt = useMemo(() => pesagens.filter(p => 
    p.status_pagamento !== 'EXCLUÍDO' &&
    (!f.prod || p.produto === f.prod) && (!f.pag || p.forma_pagamento === f.pag) && 
    (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF) && 
    (!f.mes || p.data?.slice(5, 7) === f.mes) && (!f.ano || p.data?.slice(0, 4) === f.ano)
  ), [pesagens, f]);

  const movimentacoesFiltradas = useMemo(() => movimentacoes.filter(m => {
    const d = m.created_at ? m.created_at.split('T')[0] : '';
    return (!fCaixaTipo || m.tipo === fCaixaTipo) && (!fCaixaDataI || d >= fCaixaDataI) && (!fCaixaDataF || d <= fCaixaDataF) && (!fCaixaBusca || (m.motivo || "").toLowerCase().includes(fCaixaBusca.toLowerCase()));
  }), [movimentacoes, fCaixaTipo, fCaixaDataI, fCaixaDataF, fCaixaBusca]);

  const dataForCharts = useMemo(() => {
    let base = filt;
    const now = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().slice(0, 7);
    const year = new Date().getFullYear().toString();
    if (activeKpi === "DIÁRIA") base = filt.filter(p => p.data === now);
    else if (activeKpi === "MENSAL") base = filt.filter(p => p.data?.startsWith(month));
    else if (activeKpi === "ANUAL") base = filt.filter(p => p.data?.startsWith(year));
    return base;
  }, [filt, activeKpi]);

  const dia = filt.filter(p => p.data === new Date().toISOString().split('T')[0]).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const mens = filt.filter(p => p.data?.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const anu = filt.filter(p => p.data?.startsWith(new Date().getFullYear().toString())).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const pesoTotal = filt.reduce((a, b) => a + (Number(b.peso_liquido) || 0), 0);
  const totalTroco = filt.reduce((a, b) => a + (Number(b.valor_troco) || 0), 0);
  const pesagensAbertas = useMemo(() => pesagens.filter(p => p.status_pagamento === 'ABERTO'), [pesagens]);

  if (isPublicCheckin) return <CheckinPortaria />;
  if (isPublicAgendamento) return <AgendamentoPage />;
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-blue-500"><Loader2 className="animate-spin" size={40}/></div>;

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15]">
      <div className="w-96 p-8 bg-[#161B23] rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center">
        <GraselLogo />
        <div className="w-full mt-6"><Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} /></div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden font-sans">
      <aside className="w-56 border-r border-white/5 p-4 flex flex-col gap-3 shrink-0 bg-[#0E131B]">
        <GraselLogo />
        <nav className="flex flex-col gap-1 mt-2">
          {userRole !== 'motorista' && (
            <>
              <button onClick={() => setAba("dashboard")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'dashboard' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}>DASHBOARD</button>
              <button onClick={() => setAba("entrada")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'entrada' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}>NOVA ENTRADA</button>
              <button onClick={() => setAba("saida")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'saida' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}>SAÍDA DE VEÍCULOS</button>
              <button onClick={() => setAba("caixa")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'caixa' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}>CONTROLE DE CAIXA</button>
            </>
          )}
          <button onClick={() => setAba("logistica")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'logistica' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}>
            {userRole === 'motorista' ? 'MEU DIÁRIO / LOGÍSTICA' : 'LOGÍSTICA / DIÁRIO'}
          </button>
          {userRole !== 'motorista' && (
            <button onClick={() => setAba("patio")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all flex items-center gap-2 ${aba === 'patio' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white'}`}>
              <CheckSquare size={14} /> CONTROLE DE PÁTIO
            </button>
          )}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-white/5">
          <p className="text-[10px] text-gray-400 font-semibold">{userName}</p>
          <p className="text-[9px] text-blue-400 mb-2 uppercase font-bold">{userRole}</p>
          <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"><LogOut size={12}/> SAIR</button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto bg-[#0B0F15]">
        {userRole === 'motorista' ? <AbaLogistica session={session} userName={userName} /> : (
          <>
            {aba === "dashboard" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-6 gap-3">
                  {[
                    { l: "DIÁRIA", v: `R$ ${dia.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, icon: Calendar, text: "text-blue-400" },
                    { l: "PESO TOTAL", v: `${pesoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}kg`, icon: Package, text: "text-purple-400" },
                    { l: "MENSAL", v: `R$ ${mens.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, icon: DollarSign, text: "text-emerald-400" },
                    { l: "ANUAL", v: `R$ ${anu.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, icon: Activity, text: "text-indigo-400" },
                    { l: "TROCO PAGO", v: `R$ ${totalTroco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, icon: RefreshCw, text: "text-amber-400" },
                    { l: "TODOS", v: filt.length.toFixed(0), icon: DollarSign, text: "text-gray-300" }
                  ].map((k, i) => {
                    const Icon = k.icon;
                    const isActive = activeKpi === k.l;
                    return (
                      <button key={i} onClick={() => setActiveKpi(k.l)} className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${isActive ? 'bg-[#1A2030] border-blue-500 shadow-lg' : 'bg-[#161B23] border-white/5 hover:border-white/10'}`}>
                        <div className="flex justify-between items-start mb-2"><p className="text-[9px] text-gray-400 font-bold uppercase">{k.l}</p><Icon size={14} className={k.text} /></div>
                        <p className="font-extrabold text-sm tracking-tight">{k.v}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4 h-[240px]">
                  <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 flex flex-col justify-between shadow-xl">
                    <p className="text-[11px] font-bold text-gray-300 uppercase">PAGAMENTOS ({activeKpi})</p>
                    <div className="h-[170px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{name: 'PIX', value: dataForCharts.filter(p=>p.forma_pagamento==='PIX').reduce((a,b)=>a+(Number(b.valor_total)||0),0)}, {name: 'DINHEIRO', value: dataForCharts.filter(p=>p.forma_pagamento==='DINHEIRO').reduce((a,b)=>a+(Number(b.valor_total)||0),0)}]} innerRadius={40} outerRadius={60} paddingAngle={4} labelLine={false} label={renderCustomizedLabel} dataKey="value">
                            {COLORS.map((c, i) => <Cell key={i} fill={c} stroke="transparent" />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} />
                          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 flex flex-col justify-between shadow-xl">
                    <p className="text-[11px] font-bold text-gray-300 uppercase">PRODUTOS ({activeKpi})</p>
                    <div className="h-[170px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={Object.entries(dataForCharts.reduce((acc, p) => { acc[p.produto] = (acc[p.produto] || 0) + (Number(p.valor_total) || 0); return acc; }, {})).map(([name, value]) => ({ name, value }))} innerRadius={40} outerRadius={60} paddingAngle={4} labelLine={false} label={renderCustomizedLabel} dataKey="value">
                            {COLORS.map((c, i) => <Cell key={i} fill={c} stroke="transparent" />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', fontSize: '11px' }} formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} />
                          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161B23] rounded-xl border border-white/5 p-4 shadow-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-gray-400 border-b border-white/5 font-semibold uppercase text-[9px]">
                        {["Data", "Comp.", "Produto", "Peso", "Valor", "Troco", "Pag.", "Ação"].map(h => <th key={h} className="p-2.5">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[...filt].sort((a,b) => (b.comprovante || '').localeCompare(a.comprovante || '')).slice(0, 10).map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 text-gray-300">{p.data}</td>
                          <td className="p-2.5 font-medium text-gray-200">{p.comprovante}</td>
                          <td className="p-2.5 text-gray-300">{p.produto}</td>
                          <td className="p-2.5 text-gray-200">{Number(p.peso_liquido||0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}kg</td>
                          <td className="p-2.5 font-bold text-emerald-400">R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          <td className="p-2.5 text-amber-400">R$ {Number(p.valor_troco || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          <td className="p-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400">{p.forma_pagamento}</span></td>
                          <td className="p-2.5"><button onClick={() => gerarPDF(p, p.operador_saida)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"><Printer size={13}/> Imprimir</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {aba === "entrada" && (
              <div className="max-w-xl mx-auto bg-[#161B23] p-6 rounded-2xl border border-white/5 shadow-2xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400"><Truck size={20} /> Registrar Entrada de Veículo</h2>
                <form onSubmit={registrarEntrada} className="flex flex-col gap-4">
                  <input name="placa" placeholder="Placa (Ex: ABC-1234)" required className="w-full bg-[#1A2030] p-3 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500 uppercase" />
                  <select name="prod" required className="w-full bg-[#1A2030] p-3 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500">
                    <option value="">Selecione o produto...</option>
                    <option value="Milho ensacado">Milho ensacado</option>
                    <option value="Milho Granel">Milho Granel</option>
                    <option value="Quebradinho">Quebradinho</option>
                  </select>
                  <input name="peso" type="number" step="10" placeholder="Peso de Entrada (kg)" required className="w-full bg-[#1A2030] p-3 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500" />
                  <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-lg text-sm cursor-pointer shadow-lg">REGISTRAR ENTRADA</button>
                </form>
              </div>
            )}

            {aba === "saida" && (
              <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400 mb-2"><Truck size={20} /> Pesagens em Aberto ({pesagensAbertas.length})</h2>
                {pesagensAbertas.length === 0 ? <div className="bg-[#161B23] p-8 rounded-xl text-center text-gray-500">Nenhum veículo aguardando saída.</div> :
                  pesagensAbertas.map(p => <PesagemItem key={p.id} p={p} onFinalizar={finalizarPesagem} onExcluir={excluirPesagem} saldoCaixa={saldoCaixa} />)
                }
              </div>
            )}

            {aba === "caixa" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#161B23] p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1">Saldo Atual de Troco</p>
                      <p className="text-2xl font-black text-emerald-400">R$ {saldoCaixa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                  <form onSubmit={handleAdicionarTroco} className="bg-[#161B23] p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col justify-between gap-2">
                    <p className="text-xs font-bold text-blue-400 flex items-center gap-1.5"><PlusCircle size={16}/> ADICIONAR TROCO</p>
                    <input type="number" step="0.01" placeholder="Valor R$" value={valorAporte} onChange={e => setValorAporte(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg text-sm outline-none border border-transparent focus:border-blue-500" required />
                    <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2 rounded-lg text-xs cursor-pointer">INSERIR</button>
                  </form>
                  <form onSubmit={handleSangriaGasto} className="bg-[#161B23] p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-2">
                    <p className="text-xs font-bold text-red-400 flex items-center gap-1.5"><MinusCircle size={16}/> SANGRIA / GASTO</p>
                    <input type="number" step="0.01" placeholder="Valor R$" value={valorSangria} onChange={e => setValorSangria(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg text-sm outline-none border border-transparent focus:border-red-500" required />
                    <input type="text" placeholder="Motivo" value={motivoSangria} onChange={e => setMotivoSangria(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg text-sm outline-none border border-transparent focus:border-red-500" required />
                    <button className="bg-red-600 hover:bg-red-500 text-white font-bold p-2 rounded-lg text-xs cursor-pointer">REGISTRAR</button>
                  </form>
                </div>

                <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 flex flex-wrap gap-3 items-center">
                  <select value={fCaixaTipo} onChange={e => setFCaixaTipo(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg text-xs text-gray-300 outline-none">
                    <option value="">Todos os Tipos</option>
                    <option value="ENTRADA_TROCO">Entrada (Aporte)</option>
                    <option value="SAIDA_TROCO">Saída (Troco Venda)</option>
                    <option value="SANGRIA_GASTO">Sangria / Gasto</option>
                  </select>
                  <input type="date" value={fCaixaDataI} onChange={e => setFCaixaDataI(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg text-xs text-gray-300 outline-none" />
                  <input type="date" value={fCaixaDataF} onChange={e => setFCaixaDataF(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg text-xs text-gray-300 outline-none" />
                </div>

                <div className="bg-[#161B23] rounded-xl border border-white/5 p-4 shadow-xl overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-gray-400 border-b border-white/5 font-semibold uppercase text-[9px]">
                        {["Data/Hora", "Tipo", "Motivo", "Operador", "Valor", "Saldo Resultante"].map(h => <th key={h} className="p-2.5">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {movimentacoesFiltradas.length === 0 ? <tr><td colSpan="6" className="p-4 text-center text-gray-500">Nenhuma movimentação.</td></tr> :
                        movimentacoesFiltradas.map((m, i) => (
                          <tr key={m.id || i} className="hover:bg-white/[0.02]">
                            <td className="p-2.5 text-gray-300">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                            <td className="p-2.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400">{m.tipo}</span></td>
                            <td className="p-2.5 text-gray-200">{m.motivo}</td>
                            <td className="p-2.5 text-gray-300">{m.operador}</td>
                            <td className={`p-2.5 font-bold ${m.tipo === 'ENTRADA_TROCO' ? 'text-emerald-400' : 'text-red-400'}`}>R$ {Number(m.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="p-2.5 text-gray-200">R$ {Number(m.saldo_resultante || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {aba === "patio" && <KanbanPatio />}
          </>
        )}
      </main>
    </div>
  );
}