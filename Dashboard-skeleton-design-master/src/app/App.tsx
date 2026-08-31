import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, LogOut, Trash2, Printer, DollarSign, Package, Calendar, Activity, RefreshCw, AlertTriangle, PlusCircle, MinusCircle, History, Truck, Filter, Search, Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import AbaLogistica from "../AbaLogistica";

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

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
    <svg 
      width="42" 
      height="42" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="drop-shadow-[0_2px_8px_rgba(56,189,248,0.2)] shrink-0 transition-transform hover:scale-105 duration-300"
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
        className="font-black text-xl text-white tracking-[0.18em] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" 
        style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        GRASEL
      </span>
      <span className="text-[8px] font-bold text-sky-400 tracking-[0.28em] leading-tight mt-1 uppercase opacity-90">
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
    <form onSubmit={(e) => onFinalizar(p, e, { pesoSaida, valorSaca, valorRecebido, formaPag, pesoLiquido, qtdSacas, valorTotal, troco })} className="bg-[#161B23] p-4 rounded-xl flex flex-col gap-3 border border-white/5 hover:border-blue-500/25 transition-all shadow-lg">
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
  const [userRole, setUserRole] = useState("gestor");
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "", ano: "" });
  const [activeKpi, setActiveKpi] = useState("TODOS");
  const [saldoCaixa, setSaldoCaixa] = useState(0);

  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroLogin, setErroLogin] = useState("");
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [valorAporte, setValorAporte] = useState("");
  const [valorSangria, setValorSangria] = useState("");
  const [motivoSangria, setMotivoSangria] = useState("");

  const [fCaixaTipo, setFCaixaTipo] = useState("");
  const [fCaixaDataI, setFCaixaDataI] = useState("");
  const [fCaixaDataF, setFCaixaDataF] = useState("");
  const [fCaixaOperador, setFCaixaOperador] = useState("");
  const [fCaixaBusca, setFCaixaBusca] = useState("");

  useEffect(() => {
    document.title = "Grasel Cerealista";

    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = faviconSvg;
  }, []);

  const load = useCallback(async (userId) => {
    setLoading(true);
    const { data: pesagensData } = await supabase.from('fat_pesagens').select('*').neq('status_pagamento', 'EXCLUÍDO');
    const { data: caixaData } = await supabase.from('controle_caixa').select('saldo_atual').eq('id', 1).maybeSingle();
    const { data: movData } = await supabase.from('movimentacoes_caixa').select('*').order('created_at', { ascending: false });
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    
    setPesagens(pesagensData || []);
    setMovimentacoes(movData || []);
    setSaldoCaixa(Number(caixaData?.saldo_atual || 0));
    
    if (profile) {
      if (profile.nome) setUserName(profile.nome);
      const roleDetectado = profile.role || profile.perfil || 'gestor';
      setUserRole(roleDetectado.toLowerCase());
      
      if (roleDetectado.toLowerCase() === 'motorista') {
        setAba('logistica');
      }
    }
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

  const handleLoginCustomizado = async (e) => {
    e.preventDefault();
    setErroLogin("");
    setCarregandoLogin(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: senhaLogin,
    });

    if (error) {
      setErroLogin("E-mail ou senha inválidos. Verifique suas credenciais.");
      setCarregandoLogin(false);
    }
  };

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

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(m => {
      const dataMov = m.created_at ? m.created_at.split('T')[0] : '';
      const matchTipo = fCaixaTipo === "" || m.tipo === fCaixaTipo;
      const matchDataI = !fCaixaDataI || dataMov >= fCaixaDataI;
      const matchDataF = !fCaixaDataF || dataMov <= fCaixaDataF;
      const matchOperador = fCaixaOperador === "" || m.operador === fCaixaOperador;
      const matchBusca = fCaixaBusca === "" || (m.motivo || "").toLowerCase().includes(fCaixaBusca.toLowerCase());
      return matchTipo && matchDataI && matchDataF && matchOperador && matchBusca;
    });
  }, [movimentacoes, fCaixaTipo, fCaixaDataI, fCaixaDataF, fCaixaOperador, fCaixaBusca]);

  const operadoresCaixa = useMemo(() => {
    return [...new Set(movimentacoes.map(m => m.operador))].filter(Boolean);
  }, [movimentacoes]);

  const resumoCaixaFiltro = useMemo(() => {
    const totalAportes = movimentacoesFiltradas.filter(m => m.tipo === 'ENTRADA_TROCO').reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
    const totalSaidas = movimentacoesFiltradas.filter(m => m.tipo === 'SAIDA_TROCO' || m.tipo === 'SANGRIA_GASTO').reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
    return { totalAportes, totalSaidas };
  }, [movimentacoesFiltradas]);

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

  const pesagensAbertas = useMemo(() => pesagens.filter(p => p.status_pagamento === 'ABERTO'), [pesagens]);
  const isMotorista = userRole === 'motorista';

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-blue-500"><Loader2 className="animate-spin" size={40}/></div>;

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15] p-4">
      <div className="w-full max-w-md p-8 bg-[#161B23] rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center">
        <GraselLogo />
        <p className="text-xs text-gray-400 mt-2 text-center">Acesse sua conta para gerenciar o sistema</p>

        {erroLogin && (
          <div className="w-full mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{erroLogin}</span>
          </div>
        )}

        <form onSubmit={handleLoginCustomizado} className="w-full mt-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">E-mail</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Mail size={16} />
              </div>
              <input 
                type="email" 
                value={emailLogin} 
                onChange={(e) => setEmailLogin(e.target.value)} 
                placeholder="seu.email@grasel.com" 
                required 
                className="w-full bg-[#1A2030] pl-10 pr-3 py-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 text-white placeholder-gray-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Lock size={16} />
              </div>
              <input 
                type={mostrarSenha ? "text" : "password"} 
                value={senhaLogin} 
                onChange={(e) => setSenhaLogin(e.target.value)} 
                placeholder="••••••••" 
                required 
                className="w-full bg-[#1A2030] pl-10 pr-10 py-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 text-white placeholder-gray-500 transition-all"
              />
              <button 
                type="button" 
                onClick={() => setMostrarSenha(!mostrarSenha)} 
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={carregandoLogin} 
            className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregandoLogin ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>ENTRAR NO SISTEMA</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white font-sans overflow-hidden">
      {/* BARRA LATERAL */}
      <aside className="w-56 bg-[#161B23] border-r border-white/5 flex flex-col justify-between p-4 shrink-0">
        <div className="flex flex-col gap-6">
          <GraselLogo />
          
          <nav className="flex flex-col gap-1.5 mt-2">
            {!isMotorista && (
              <>
                <button 
                  onClick={() => setAba("dashboard")} 
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${aba === "dashboard" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                >
                  <Activity size={18} /> Dashboard
                </button>
                <button 
                  onClick={() => setAba("entrada")} 
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${aba === "entrada" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                >
                  <PlusCircle size={18} /> Nova Entrada
                </button>
                <button 
                  onClick={() => setAba("saida")} 
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${aba === "saida" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                >
                  <Truck size={18} /> Saída de Veículos
                  {pesagensAbertas.length > 0 && (
                    <span className="ml-auto bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {pesagensAbertas.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setAba("caixa")} 
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${aba === "caixa" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                >
                  <DollarSign size={18} /> Controle de Caixa
                </button>
              </>
            )}

            <button 
              onClick={() => setAba("logistica")} 
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${aba === "logistica" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              <Package size={18} /> {isMotorista ? "MEU DIÁRIO / LOGÍSTICA" : "LOGÍSTICA / DIÁRIO"}
            </button>
          </nav>

          {!isMotorista && (
            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Filtros Globais</span>
              <select value={f.prod} onChange={(e) => setF({...f, prod: e.target.value})} className="bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 text-gray-300">
                <option value="">Todos Produtos</option>
                <option value="Soja">Soja</option>
                <option value="Milho">Milho</option>
                <option value="Trigo">Trigo</option>
              </select>
              <select value={f.pag} onChange={(e) => setF({...f, pag: e.target.value})} className="bg-[#1A2030] p-2 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 text-gray-300">
                <option value="">Todos Pagamentos</option>
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
              </select>
              <div className="flex gap-2">
                <input type="date" value={f.dataI} onChange={(e) => setF({...f, dataI: e.target.value})} className="bg-[#1A2030] p-2 rounded-xl text-[11px] outline-none w-full text-gray-300"/>
                <input type="date" value={f.dataF} onChange={(e) => setF({...f, dataF: e.target.value})} className="bg-[#1A2030] p-2 rounded-xl text-[11px] outline-none w-full text-gray-300"/>
              </div>
              <button onClick={() => setF({prod:"", pag:"", dataI:"", dataF:"", mes:"", ano:""})} className="text-[10px] text-blue-400 hover:underline text-left px-1">Limpar Filtros</button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
              {userName.slice(0, 2)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-white truncate">{userName}</span>
              <span className="text-[10px] text-gray-400 capitalize">{userRole}</span>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs font-bold px-1 py-1 transition-colors cursor-pointer">
            <LogOut size={14}/> Sair da Conta
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
        {aba === "logistica" ? (
          <AbaLogistica />
        ) : isMotorista ? (
          <div className="flex h-full items-center justify-center flex-col gap-3">
            <Package size={48} className="text-blue-500 opacity-50" />
            <p className="text-sm font-medium text-gray-400">Acesse a aba de Logística pelo menu lateral.</p>
          </div>
        ) : (
          <>
            {aba === "dashboard" && (
              <div className="flex flex-col gap-8 animate-fadeIn">
                <div className="grid grid-cols-6 gap-4">
                  <div onClick={() => setActiveKpi("DIÁRIA")} className={`bg-[#161B23] p-4 rounded-2xl border cursor-pointer transition-all ${activeKpi === "DIÁRIA" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/5 hover:border-white/10"}`}>
                    <span className="text-[11px] text-gray-400 font-semibold block">Venda Diária</span>
                    <span className="text-xl font-black text-white mt-1 block">R$ {dia.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div onClick={() => setActiveKpi("TODOS")} className={`bg-[#161B23] p-4 rounded-2xl border cursor-pointer transition-all ${activeKpi === "TODOS" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/5 hover:border-white/10"}`}>
                    <span className="text-[11px] text-gray-400 font-semibold block">Peso Total (kg)</span>
                    <span className="text-xl font-black text-white mt-1 block">{pesoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div onClick={() => setActiveKpi("MENSAL")} className={`bg-[#161B23] p-4 rounded-2xl border cursor-pointer transition-all ${activeKpi === "MENSAL" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/5 hover:border-white/10"}`}>
                    <span className="text-[11px] text-gray-400 font-semibold block">Venda Mensal</span>
                    <span className="text-xl font-black text-white mt-1 block">R$ {mens.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div onClick={() => setActiveKpi("ANUAL")} className={`bg-[#161B23] p-4 rounded-2xl border cursor-pointer transition-all ${activeKpi === "ANUAL" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-white/5 hover:border-white/10"}`}>
                    <span className="text-[11px] text-gray-400 font-semibold block">Venda Anual</span>
                    <span className="text-xl font-black text-white mt-1 block">R$ {anu.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-[#161B23] p-4 rounded-2xl border border-white/5">
                    <span className="text-[11px] text-gray-400 font-semibold block">Troco Pago</span>
                    <span className="text-xl font-black text-amber-400 mt-1 block">R$ {totalTroco.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-[#161B23] p-4 rounded-2xl border border-white/5">
                    <span className="text-[11px] text-gray-400 font-semibold block">Total Registros</span>
                    <span className="text-xl font-black text-blue-400 mt-1 block">{filt.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5 flex flex-col items-center">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 w-full text-left">Formas de Pagamento ({activeKpi})</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={["PIX", "DINHEIRO"].map(pag => ({ name: pag, value: dataForCharts.filter(p => p.forma_pagamento === pag).reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={renderCustomizedLabel}>
                            {COLORS.map((color, index) => (<Cell key={`cell-${index}`} fill={color} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#161B23', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5 flex flex-col items-center">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 w-full text-left">Distribuição por Produtos ({activeKpi})</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={["Soja", "Milho", "Trigo"].map(prod => ({ name: prod, value: dataForCharts.filter(p => p.produto === prod).reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={renderCustomizedLabel}>
                            {COLORS.map((color, index) => (<Cell key={`cell-prod-${index}`} fill={color} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#161B23', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161B23] rounded-2xl border border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-white/5 font-bold text-xs uppercase tracking-wider text-gray-400">Últimos Registros Fechados</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1A2030] text-gray-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Data</th>
                          <th className="p-3">Comprovante</th>
                          <th className="p-3">Placa</th>
                          <th className="p-3">Produto</th>
                          <th className="p-3">Líquido (kg)</th>
                          <th className="p-3">Total</th>
                          <th className="p-3">Pagamento</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filt.slice(0, 5).map(p => (
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 text-gray-400">{p.data}</td>
                            <td className="p-3 font-bold text-blue-400">{p.comprovante}</td>
                            <td className="p-3 font-semibold">{p.placa}</td>
                            <td className="p-3 text-gray-300">{p.produto}</td>
                            <td className="p-3">{Number(p.peso_liquido || 0).toFixed(2)}</td>
                            <td className="p-3 text-green-400 font-bold">R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            <td className="p-3"><span className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold">{p.forma_pagamento || 'N/A'}</span></td>
                            <td className="p-3 flex justify-center gap-2">
                              <button onClick={() => gerarPDF(p, userName)} className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer" title="Imprimir PDF"><Printer size={14}/></button>
                              <button onClick={() => excluirPesagem(p.id)} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer" title="Excluir"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {aba === "entrada" && (
              <div className="max-w-xl mx-auto w-full bg-[#161B23] p-8 rounded-2xl border border-white/5 shadow-2xl mt-10">
                <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                  <PlusCircle className="text-blue-500" size={20}/> Nova Entrada de Veículo
                </h2>
                <form onSubmit={registrarEntrada} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Placa do Veículo</label>
                    <input name="placa" type="text" placeholder="EX: ABC-1234" required className="w-full bg-[#1A2030] p-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 uppercase text-white placeholder-gray-600"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Produto</label>
                    <select name="prod" className="w-full bg-[#1A2030] p-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 text-white">
                      <option value="Soja">Soja</option>
                      <option value="Milho">Milho</option>
                      <option value="Trigo">Trigo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Peso de Entrada (kg)</label>
                    <input name="peso" type="number" step="0.01" placeholder="Ex: 15000" required className="w-full bg-[#1A2030] p-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 text-white placeholder-gray-600"/>
                  </div>
                  <button className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20 cursor-pointer">
                    REGISTRAR ENTRADA
                  </button>
                </form>
              </div>
            )}

            {aba === "saida" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Truck className="text-blue-500" size={20}/> Veículos no Pátio / Aguardando Saída
                  </h2>
                  <span className="text-xs font-semibold text-gray-400">Total abertos: {pesagensAbertas.length}</span>
                </div>

                {pesagensAbertas.length === 0 ? (
                  <div className="bg-[#161B23] p-12 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
                    <Truck size={36} className="opacity-30" />
                    <p className="text-sm font-medium">Nenhum veículo aguardando saída no momento.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {pesagensAbertas.map(p => (
                      <PesagemItem key={p.id} p={p} onFinalizar={finalizarPesagem} onExcluir={excluirPesagem} saldoCaixa={saldoCaixa} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {aba === "caixa" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo Atual em Caixa (Troco)</span>
                    <span className="text-3xl font-black text-green-400 mt-2">R$ {saldoCaixa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Aportes (Filtro)</span>
                    <span className="text-3xl font-black text-blue-400 mt-2">R$ {resumoCaixaFiltro.totalAportes.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Saídas/Gastos (Filtro)</span>
                    <span className="text-3xl font-black text-amber-400 mt-2">R$ {resumoCaixaFiltro.totalSaidas.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <PlusCircle size={16} className="text-green-500" /> Adicionar Troco / Aporte
                    </h3>
                    <form onSubmit={handleAdicionarTroco} className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Valor do Aporte (R$)</label>
                        <input type="number" step="0.01" value={valorAporte} onChange={(e) => setValorAporte(e.target.value)} placeholder="Ex: 500.00" required className="w-full bg-[#1A2030] p-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 text-white"/>
                      </div>
                      <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-green-900/20">
                        CONFIRMAR ADIÇÃO DE TROCO
                      </button>
                    </form>
                  </div>

                  <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <MinusCircle size={16} className="text-red-500" /> Sangria / Gasto de Caixa
                    </h3>
                    <form onSubmit={handleSangriaGasto} className="flex flex-col gap-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Valor (R$)</label>
                          <input type="number" step="0.01" value={valorSangria} onChange={(e) => setValorSangria(e.target.value)} placeholder="Ex: 100.00" required className="w-full bg-[#1A2030] p-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 text-white"/>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Motivo / Descrição</label>
                        <input type="text" value={motivoSangria} onChange={(e) => setMotivoSangria(e.target.value)} placeholder="Ex: Pagamento de taxa de limpeza" required className="w-full bg-[#1A2030] p-3 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 text-white"/>
                      </div>
                      <button className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-red-900/20">
                        REGISTRAR RETIRADA
                      </button>
                    </form>
                  </div>
                </div>

                <div className="bg-[#161B23] p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <History size={16} className="text-blue-500" /> Histórico de Movimentações de Caixa
                    </h3>
                  </div>

                  <div className="grid grid-cols-5 gap-3 pt-2">
                    <select value={fCaixaTipo} onChange={(e) => setFCaixaTipo(e.target.value)} className="bg-[#1A2030] p-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 text-gray-300">
                      <option value="">Todos Tipos</option>
                      <option value="ENTRADA_TROCO">Entrada / Aporte</option>
                      <option value="SAIDA_TROCO">Saída (Troco Pesagem)</option>
                      <option value="SANGRIA_GASTO">Sangria / Gasto</option>
                    </select>
                    <input type="date" value={fCaixaDataI} onChange={(e) => setFCaixaDataI(e.target.value)} className="bg-[#1A2030] p-2.5 rounded-xl text-xs outline-none text-gray-300"/>
                    <input type="date" value={fCaixaDataF} onChange={(e) => setFCaixaDataF(e.target.value)} className="bg-[#1A2030] p-2.5 rounded-xl text-xs outline-none text-gray-300"/>
                    <select value={fCaixaOperador} onChange={(e) => setFCaixaOperador(e.target.value)} className="bg-[#1A2030] p-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 text-gray-300">
                      <option value="">Todos Operadores</option>
                      {operadoresCaixa.map(op => (<option key={op} value={op}>{op}</option>))}
                    </select>
                    <input type="text" placeholder="Buscar motivo..." value={fCaixaBusca} onChange={(e) => setFCaixaBusca(e.target.value)} className="bg-[#1A2030] p-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-blue-500 text-white placeholder-gray-500"/>
                  </div>

                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1A2030] text-gray-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Data/Hora</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Motivo / Descrição</th>
                          <th className="p-3">Operador</th>
                          <th className="p-3">Valor</th>
                          <th className="p-3">Saldo Resultante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {movimentacoesFiltradas.length === 0 ? (
                          <tr><td colSpan="6" className="p-6 text-center text-gray-500">Nenhuma movimentação encontrada com os filtros selecionados.</td></tr>
                        ) : (
                          movimentacoesFiltradas.map(m => (
                            <tr key={m.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 text-gray-400">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                              <td className="p-3 font-bold">
                                {m.tipo === 'ENTRADA_TROCO' && <span className="text-green-400">ENTRADA / APORTE</span>}
                                {m.tipo === 'SAIDA_TROCO' && <span className="text-amber-400">SAÍDA (TROCO)</span>}
                                {m.tipo === 'SANGRIA_GASTO' && <span className="text-red-400">SANGRIA / GASTO</span>}
                              </td>
                              <td className="p-3 text-gray-300">{m.motivo}</td>
                              <td className="p-3 text-gray-400">{m.operador}</td>
                              <td className={`p-3 font-bold ${m.tipo === 'ENTRADA_TROCO' ? 'text-green-400' : 'text-red-400'}`}>
                                {m.tipo === 'ENTRADA_TROCO' ? '+' : '-'} R$ {Number(m.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                              </td>
                              <td className="p-3 font-semibold text-white">R$ {Number(m.saldo_resultante || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}