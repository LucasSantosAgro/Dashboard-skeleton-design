import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, LogOut, Trash2, Printer, DollarSign, Package, Calendar, Activity, RefreshCw, AlertTriangle, PlusCircle, MinusCircle, History } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

const GraselLogo = () => (
  <div className="flex items-center gap-3 py-1">
    <svg 
      width="40" 
      height="40" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] shrink-0"
    >
      <path 
        d="M78 22 C64 6 36 6 18 24 C2 40 2 68 18 84 C34 100 66 98 82 82 C88 76 92 68 94 58 L72 58 C70 63 66 68 62 72 C50 82 28 80 18 68 C8 56 10 36 22 24 C34 12 56 12 68 22 L78 22 Z" 
        fill="white" 
      />
      <path 
        d="M36 62 C32 46 44 32 68 28 C70 44 58 60 36 62 Z" 
        fill="white" 
      />
      <path 
        d="M38 60 C48 50 58 40 66 30" 
        stroke="#0B0F15" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
      />
      <path 
        d="M48 46 C56 38 64 32 66 30" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
      />
    </svg>

    <div className="flex flex-col">
      <span 
        className="font-black text-xl text-white tracking-[0.16em] leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
        style={{ fontFamily: 'Arial Black, system-ui, sans-serif' }}
      >
        GRASEL
      </span>
      <span className="text-[7.5px] font-extrabold text-blue-300 tracking-[0.24em] leading-tight mt-1 opacity-90 uppercase">
        GRÃOS E INSUMOS
      </span>
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
    if (Number(val) > 0) {
      setFormaPag("DINHEIRO");
    } else {
      setFormaPag("PIX");
    }
  };

  return (
    <form onSubmit={(e) => onFinalizar(p, e, { pesoSaida, valorSaca, valorRecebido, formaPag, pesoLiquido, qtdSacas, valorTotal, troco })} className="bg-[#161B23] p-4 rounded-xl flex flex-col gap-3 border border-white/5 hover:border-blue-500/20 transition-all shadow-lg">
      <div className="flex justify-between text-xs font-bold text-blue-400">
        <span>Placa: {p.placa}</span> <span>Produto: {p.produto}</span> <span>Entrada: {p.peso_entrada.toFixed(2)}kg</span>
      </div>
      <div className="flex gap-2">
        <input name="peso_saida" type="number" step="0.01" placeholder="Peso Saída (ex: 5660)" value={pesoSaida} onChange={(e) => setPesoSaida(e.target.value)} className="bg-[#1A2030] p-2 rounded-lg flex-1 text-sm outline-none border border-transparent focus:border-blue-500 transition-all" required />
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

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Operador");
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "", ano: "" });
  const [activeKpi, setActiveKpi] = useState("TODOS");
  const [saldoCaixa, setSaldoCaixa] = useState(0);

  const [valorAporte, setValorAporte] = useState("");
  const [valorSangria, setValorSangria] = useState("");
  const [motivoSangria, setMotivoSangria] = useState("");

  useEffect(() => {
    document.title = "Grasel Cerealista";
  }, []);

  const load = useCallback(async (userId) => {
    setLoading(true);
    const { data: pesagensData } = await supabase.from('fat_pesagens').select('*').neq('status_pagamento', 'EXCLUÍDO');
    const { data: caixaData } = await supabase.from('controle_caixa').select('saldo_atual').eq('id', 1).maybeSingle();
    const { data: movData } = await supabase.from('movimentacoes_caixa').select('*').order('created_at', { ascending: false });
    const { data: profile } = await supabase.from('profiles').select('nome').eq('id', userId).maybeSingle();
    
    setPesagens(pesagensData || []);
    setMovimentacoes(movData || []);
    setSaldoCaixa(Number(caixaData?.saldo_atual || 0));
    if (profile?.nome) setUserName(profile.nome);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) load(session.user.id); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
      setSession(session); 
      if (session) load(session.user.id); else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const registrarMovimentacao = async (tipo, valor, motivo, novoSaldo) => {
    await supabase.from('controle_caixa').upsert({ id: 1, saldo_atual: novoSaldo });
    await supabase.from('movimentacoes_caixa').insert([{
      tipo,
      valor,
      motivo,
      operador: userName,
      saldo_resultante: novoSaldo
    }]);
    setSaldoCaixa(novoSaldo);
    load(session.user.id);
  };

  const handleAdicionarTroco = async (e) => {
    e.preventDefault();
    const val = Number(valorAporte);
    if (val <= 0) return alert("Informe um valor válido de troco.");
    const novoSaldo = saldoCaixa + val;
    await registrarMovimentacao('ENTRADA_TROCO', val, 'Aporte / Adição de Troco no Caixa', novoSaldo);
    setValorAporte("");
    alert("Troco adicionado com sucesso!");
  };

  const handleSangriaGasto = async (e) => {
    e.preventDefault();
    const val = Number(valorSangria);
    if (val <= 0) return alert("Informe um valor válido.");
    if (!motivoSangria.trim()) return alert("Descreva o motivo do gasto/retirada.");
    if (val > saldoCaixa) return alert("Saldo de troco insuficiente para realizar esta retirada!");

    const novoSaldo = saldoCaixa - val;
    await registrarMovimentacao('SANGRIA_GASTO', val, motivoSangria, novoSaldo);
    setValorSangria("");
    setMotivoSangria("");
    alert("Retirada registrada com sucesso!");
  };

  const excluirPesagem = async (id) => {
    if (window.confirm("Confirmar o cancelamento desta pesagem?")) {
      const { error } = await supabase.from('fat_pesagens').update({ status_pagamento: 'EXCLUÍDO' }).eq('id', id);
      if (!error) load(session.user.id);
    }
  };

  const getNextComprovante = async () => {
    const { data } = await supabase.from('fat_pesagens').select('comprovante').order('comprovante', { ascending: false }).limit(1);
    const last = data && data[0] && data[0].comprovante ? parseInt(data[0].comprovante.split('-')[1]) : 0;
    return `CP-${(last + 1).toString().padStart(6, '0')}`;
  };

  const registrarEntrada = async (e) => {
    e.preventDefault();
    const nextComp = await getNextComprovante();
    const { error } = await supabase.from('fat_pesagens').insert([{ 
        comprovante: nextComp, 
        placa: e.target.placa.value.toUpperCase(), 
        produto: e.target.prod.value, 
        peso_entrada: Number(e.target.peso.value), 
        data: new Date().toISOString().split('T')[0], 
        status_pagamento: 'ABERTO', 
        operador_entrada: userName 
    }]);
    if (error) alert(error.message); else { alert("Registrado com Sucesso: " + nextComp); e.target.reset(); load(session.user.id); }
  };

  const finalizarPesagem = async (p, e, calcData) => {
    e.preventDefault();
    const { pesoSaida, valorSaca, formaPag, pesoLiquido, qtdSacas, valorTotal, troco } = calcData;

    if (formaPag === "DINHEIRO") {
      if (troco > saldoCaixa) {
        alert("OPERAÇÃO CANCELADA: Saldo de troco insuficiente em caixa!");
        return;
      }
      const novoSaldo = saldoCaixa - troco;
      await registrarMovimentacao('SAIDA_TROCO', troco, `Troco referente ao comprovante ${p.comprovante}`, novoSaldo);
    }

    const payload = {
      peso_saida: Number(pesoSaida), 
      peso_liquido: pesoLiquido, 
      sacas: qtdSacas, 
      valor_unitario: Number(valorSaca), 
      valor_total: valorTotal, 
      valor_troco: troco, 
      forma_pagamento: formaPag, 
      status_pagamento: 'FECHADO', 
      operador_saida: userName 
    };

    const { error } = await supabase.from('fat_pesagens').update(payload).eq('id', p.id);

    if (!error) {
      load(session.user.id);
      gerarPDF({ ...p, ...payload }, userName);
    }
  };

  const filt = useMemo(() => pesagens.filter(p => 
    (f.prod === "" || p.produto === f.prod) && 
    (f.pag === "" || p.forma_pagamento === f.pag) && 
    (!f.dataI || p.data >= f.dataI) && 
    (!f.dataF || p.data <= f.dataF) && 
    (!f.mes || p.data?.slice(5, 7) === f.mes) && 
    (!f.ano || p.data?.slice(0, 4) === f.ano)
  ), [pesagens, f]);
  
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
  const mens = filt.filter(p => p.data?.slice(0, 7) === (f.ano && f.mes ? `${f.ano}-${f.mes}` : new Date().toISOString().slice(0, 7))).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const anu = filt.filter(p => p.data?.startsWith(f.ano || new Date().getFullYear().toString())).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const pesoTotal = filt.reduce((a, b) => a + (Number(b.peso_liquido) || 0), 0);
  const totalTroco = filt.reduce((a, b) => a + (Number(b.valor_troco) || 0), 0);

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-blue-500"><Loader2 className="animate-spin" size={40}/></div>;

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15]">
      <div className="w-96 p-8 bg-[#161B23] rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center">
        <GraselLogo />
        <div className="w-full mt-6">
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden font-sans">
      <aside className="w-56 border-r border-white/5 p-4 flex flex-col gap-3 shrink-0 bg-[#0E131B]">
        <div className="mb-2">
          <GraselLogo />
        </div>
        
        <nav className="flex flex-col gap-1">
          <button onClick={() => setAba("dashboard")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'dashboard' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>DASHBOARD</button>
          <button onClick={() => setAba("entrada")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'entrada' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>NOVA ENTRADA</button>
          <button onClick={() => setAba("saida")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'saida' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>SAÍDA & CAIXA</button>
        </nav>
        
        <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-[10px] text-gray-400 mb-1 font-semibold">{userName}</p>
            <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors"><LogOut size={12}/> SAIR</button>
        </div>

        <hr className="border-white/5 my-1" />
        <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase mb-1">Filtros</p>
        <div className="flex flex-col gap-1.5">
          <input type="date" className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, dataI: e.target.value})}/>
          <input type="date" className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, dataF: e.target.value})}/>
          <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, mes: e.target.value})}><option value="">Mês</option>{Array.from({length: 12}, (_, i) => <option key={i+1} value={(i+1).toString().padStart(2, '0')}>{i+1}</option>)}</select>
          <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, ano: e.target.value})}><option value="">Ano</option>{[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, prod: e.target.value})}><option value="">Produto</option> {[...new Set(pesagens.map(p => p.produto))].filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}</select>
          <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, pag: e.target.value})}><option value="">Pagamento</option><option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option></select>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto bg-[#0B0F15]">
        {aba === "dashboard" && (
           <div className="flex flex-col gap-6">
               <div className="grid grid-cols-6 gap-3">
                 {[ 
                   {l: "DIÁRIA", v: `R$ ${dia.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: Calendar, color: "from-blue-500/10 to-transparent", text: "text-blue-400"}, 
                   {l: "PESO TOTAL", v: `${pesoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}kg`, icon: Package, color: "from-purple-500/10 to-transparent", text: "text-purple-400"}, 
                   {l: "MENSAL", v: `R$ ${mens.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: DollarSign, color: "from-emerald-500/10 to-transparent", text: "text-emerald-400"}, 
                   {l: "ANUAL", v: `R$ ${anu.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: Activity, color: "from-indigo-500/10 to-transparent", text: "text-indigo-400"}, 
                   {l: "TROCO PAGO", v: `R$ ${totalTroco.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: RefreshCw, color: "from-amber-500/10 to-transparent", text: "text-amber-400"}, 
                   {l: "TODOS", v: filt.length.toFixed(0), icon: DollarSign, color: "from-gray-500/10 to-transparent", text: "text-gray-300"} 
                 ].map((k, i) => {
                   const IconComponent = k.icon;
                   const isActive = activeKpi === k.l;
                   return (
                     <button 
                       key={i} 
                       onClick={() => setActiveKpi(k.l)} 
                       className={`relative p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 overflow-hidden bg-gradient-to-b ${k.color} ${
                         isActive 
                           ? 'bg-[#1A2030] border-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02]' 
                           : 'bg-[#161B23] border-white/5 hover:border-white/10 hover:bg-[#1A2030]/50'
                       }`}
                     >
                       <div className="flex justify-between items-start mb-2">
                         <p className="text-[9px] text-gray-400 font-bold tracking-wider uppercase">{k.l}</p>
                         <IconComponent size={14} className={k.text} />
                       </div>
                       <p className="font-extrabold text-sm tracking-tight">{k.v}</p>
                     </button>
                   );
                 })}
               </div>

               <div className="grid grid-cols-2 gap-4 h-[240px]">
                  <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <p className="text-[11px] font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                      PAGAMENTOS ({activeKpi})
                    </p>
                    <div className="h-[170px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={[
                              {name: 'PIX', value: dataForCharts.filter(p=>p.forma_pagamento==='PIX').reduce((a,b)=>a+(Number(b.valor_total)||0),0)}, 
                              {name: 'DINHEIRO', value: dataForCharts.filter(p=>p.forma_pagamento==='DINHEIRO').reduce((a,b)=>a+(Number(b.valor_total)||0),0)}
                            ]} 
                            innerRadius={40} 
                            outerRadius={60} 
                            paddingAngle={4}
                            labelLine={false} 
                            label={renderCustomizedLabel} 
                            dataKey="value"
                          >
                            {COLORS.map((c, i) => <Cell key={i} fill={c} stroke="transparent" />)}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                          />
                          <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <p className="text-[11px] font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                      PRODUTOS ({activeKpi})
                    </p>
                    <div className="h-[170px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={Object.entries(dataForCharts.reduce((acc, p) => { acc[p.produto] = (acc[p.produto] || 0) + (Number(p.valor_total) || 0); return acc; }, {})).map(([name, value]) => ({ name, value }))} 
                            innerRadius={40} 
                            outerRadius={60} 
                            paddingAngle={4}
                            labelLine={false} 
                            label={renderCustomizedLabel} 
                            dataKey="value"
                          >
                            {COLORS.map((c, i) => <Cell key={i} fill={c} stroke="transparent" />)}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                          />
                          <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
               </div>

               <div className="bg-[#161B23] rounded-xl border border-white/5 p-4 shadow-xl">
                    <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-gray-400 border-b border-white/5 font-semibold uppercase tracking-wider text-[9px]">
                            {["Data", "Comp.", "Produto", "Peso", "Valor", "Troco", "Pag.", "Ação"].map(h => <th key={h} className="p-2.5">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[...filt].sort((a,b) => (b.comprovante || '').localeCompare(a.comprovante || '')).slice(0, 10).map((p, i) => (
                            <tr key={p.id || i} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-2.5 text-gray-300">{p.data}</td>
                              <td className="p-2.5 font-medium text-gray-200">{p.comprovante}</td>
                              <td className="p-2.5 text-gray-300">{p.produto}</td>
                              <td className="p-2.5 font-medium text-gray-200">{Number(p.peso_liquido||0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}kg</td>
                              <td className="p-2.5 font-bold text-emerald-400">R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              <td className="p-2.5 font-medium text-amber-400">R$ {Number(p.valor_troco || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.forma_pagamento === 'PIX' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                  {p.forma_pagamento}
                                </span>
                              </td>
                              <td className="p-2.5">
                                 <button onClick={() => gerarPDF(p, p.operador_saida)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5 font-medium cursor-pointer transition-colors">
                                   <Printer size={13}/> Imprimir
                                 </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                    </table>
               </div>
           </div>
        )}

        {aba === "entrada" && (
             <form onSubmit={registrarEntrada} className="bg-[#161B23] p-6 rounded-2xl max-w-md border border-white/5 flex flex-col gap-4 shadow-2xl">
              <h2 className="font-bold text-base tracking-wide">Nova Entrada de Veículo</h2>
              <input name="placa" placeholder="Placa do Veículo" className="w-full bg-[#1A2030] p-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 transition-all" required />
              <select name="prod" className="w-full bg-[#1A2030] p-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 transition-all" required>
                <option value="Milho ensacado">Milho ensacado</option>
                <option value="Milho granel">Milho granel</option>
                <option value="Quebradinho">Quebradinho</option>
              </select>
              <input name="peso" type="number" step="0.01" placeholder="Peso Entrada em KG (ex: 5000)" className="w-full bg-[#1A2030] p-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 transition-all" required />
              <button className="bg-blue-600 hover:bg-blue-500 w-full p-3 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-blue-600/20">REGISTRAR ENTRADA</button>
          </form>
        )}

        {aba === "saida" && (
          <div className="flex flex-col gap-6">
            <div className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl transition-all ${saldoCaixa < 50 ? 'bg-red-500/10 border-red-500/40' : 'bg-[#161B23] border-blue-500/20'}`}>
               <div>
                 {saldoCaixa < 50 && (
                   <p className="text-red-400 font-bold text-xs mb-1 flex items-center gap-1.5 animate-pulse">
                     <AlertTriangle size={14} /> ATENÇÃO: SALDO DE TROCO BAIXO (MENOR QUE R$ 50,00)
                   </p>
                 )}
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SALDO EM CAIXA (TROCO)</p>
                 <p className={`text-3xl font-extrabold tracking-tight ${saldoCaixa < 50 ? 'text-red-400' : 'text-blue-400'}`}>
                   R$ {saldoCaixa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </p>
               </div>

               <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                 <form onSubmit={handleAdicionarTroco} className="flex gap-2 items-center bg-[#1A2030] p-1.5 rounded-xl border border-white/5 flex-1 md:flex-none">
                   <input 
                     type="number" 
                     step="0.01" 
                     placeholder="Aporte R$" 
                     value={valorAporte}
                     onChange={(e) => setValorAporte(e.target.value)}
                     className="bg-transparent p-1.5 text-xs w-28 outline-none text-white" 
                   />
                   <button className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0">
                     <PlusCircle size={14}/> Adicionar Troco
                   </button>
                 </form>

                 <form onSubmit={handleSangriaGasto} className="flex gap-2 items-center bg-[#1A2030] p-1.5 rounded-xl border border-white/5 flex-1 md:flex-none">
                   <input 
                     type="number" 
                     step="0.01" 
                     placeholder="Gasto R$" 
                     value={valorSangria}
                     onChange={(e) => setValorSangria(e.target.value)}
                     className="bg-transparent p-1.5 text-xs w-24 outline-none text-white" 
                   />
                   <input 
                     type="text" 
                     placeholder="Motivo / Descrição" 
                     value={motivoSangria}
                     onChange={(e) => setMotivoSangria(e.target.value)}
                     className="bg-transparent p-1.5 text-xs w-36 outline-none text-white border-l border-white/10" 
                   />
                   <button className="bg-amber-600 hover:bg-amber-500 text-white p-2 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0">
                     <MinusCircle size={14}/> Registrar Sangria
                   </button>
                 </form>
               </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-sm tracking-wide text-gray-300">Pesagens Abertas para Saída</h3>
              {pesagens.filter(p => p.status_pagamento === 'ABERTO').map(p => (
                <PesagemItem key={p.id} p={p} onFinalizar={finalizarPesagem} onExcluir={excluirPesagem} saldoCaixa={saldoCaixa} />
              ))}
              {pesagens.filter(p => p.status_pagamento === 'ABERTO').length === 0 && (
                <p className="text-gray-500 text-xs text-center py-6 font-medium bg-[#161B23] rounded-xl border border-white/5">Nenhuma pesagem aberta aguardando saída.</p>
              )}
            </div>

            <div className="bg-[#161B23] rounded-xl border border-white/5 p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <History size={16} className="text-blue-400"/>
                <h3 className="font-bold text-xs tracking-wider uppercase">Histórico de Movimentações de Caixa</h3>
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/5 font-semibold uppercase tracking-wider text-[9px]">
                      <th className="p-2">Data/Hora</th>
                      <th className="p-2">Operador</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Descrição / Motivo</th>
                      <th className="p-2">Valor</th>
                      <th className="p-2">Saldo Resultante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {movimentacoes.slice(0, 15).map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-2 text-gray-400">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                        <td className="p-2 text-gray-200 font-medium">{m.operador}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                            m.tipo === 'ENTRADA_TROCO' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : m.tipo === 'SANGRIA_GASTO'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {m.tipo === 'ENTRADA_TROCO' ? 'ENTRADA DE TROCO' : m.tipo === 'SANGRIA_GASTO' ? 'SANGRIA / GASTO' : 'TROCO EM SAÍDA'}
                          </span>
                        </td>
                        <td className="p-2 text-gray-300">{m.motivo || '-'}</td>
                        <td className={`p-2 font-bold ${m.tipo === 'ENTRADA_TROCO' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.tipo === 'ENTRADA_TROCO' ? '+' : '-'} R$ {Number(m.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="p-2 font-medium text-gray-300">R$ {Number(m.saldo_resultante).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                    {movimentacoes.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-gray-500 text-xs">Nenhuma movimentação de caixa registrada até o momento.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}