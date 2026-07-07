import React, { useEffect, useState, useMemo } from "react";
import { Scale, PlusCircle, CheckCircle, BarChart3 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", muted: "#A0AEC0", text: "#FFFFFF", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

export default function App() {
  const [session, setSession] = useState(null);
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (session) {
      async function load() {
        const { data } = await supabase.from('fat_pesagens').select('*');
        setPesagens(data || []);
      }
      load();
    }
  }, [session]);

  const registrarEntrada = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('fat_pesagens').insert([{
      comprovante: e.target.comp.value,
      placa: e.target.placa.value,
      produto: e.target.prod.value,
      peso_entrada: Number(e.target.peso.value),
      data: new Date().toISOString().split('T')[0]
    }]);
    if (error) alert(error.message); else { alert("Entrada registrada!"); e.target.reset(); }
  };

  const finalizarPesagem = async (p, e) => {
    e.preventDefault();
    const pesoSaida = Number(e.target.peso_saida.value);
    const pesoLiquido = pesoSaida - p.peso_entrada;
    const qtdSacas = pesoLiquido / 60;
    const valTotal = qtdSacas * Number(e.target.valor_saca.value);

    const { error } = await supabase.from('fat_pesagens').update({
      peso_saida: pesoSaida,
      peso_liquido: pesoLiquido,
      sacas: qtdSacas,
      valor_unitario: Number(e.target.valor_saca.value),
      valor_total: valTotal,
      forma_pagamento: e.target.pag.value,
      status_pagamento: 'FECHADO'
    }).eq('id', p.id);

    if (!error) {
      const doc = new jsPDF();
      doc.text("COMPROVANTE GRASEL", 10, 10);
      doc.text(`Placa: ${p.placa} | Prod: ${p.produto}`, 10, 20);
      doc.text(`Peso Liq: ${pesoLiquido.toFixed(2)}kg | Sacas: ${qtdSacas.toFixed(0)}`, 10, 30);
      doc.text(`Total: R$ ${valTotal.toFixed(2)}`, 10, 40);
      doc.save(`comp_${p.comprovante}.pdf`);
    }
  };

  const filt = useMemo(() => pesagens.filter(p => 
    (f.prod === "" || p.produto === f.prod) && (f.pag === "" || p.forma_pagamento === f.pag) &&
    (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF) && (!f.mes || p.data?.startsWith(f.mes))
  ), [pesagens, f]);

  const pesoTotal = filt.reduce((a, b) => a + (Number(b.peso_liquido) || 0), 0);
  const now = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const dia = filt.filter(p => p.data === now).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const mens = filt.filter(p => p.data?.startsWith(thisMonth)).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const anu = filt.filter(p => p.data?.startsWith(new Date().getFullYear().toString())).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  
  const pProd = Object.entries(filt.reduce((acc, p) => { acc[p.produto] = (acc[p.produto] || 0) + (Number(p.valor_total) || 0); return acc; }, {})).map(([name, value]) => ({ name, value }));
  const pPag = [
    {name: 'PIX', value: filt.filter(p => p.forma_pagamento === 'PIX').reduce((a, b) => a + (Number(b.valor_total) || 0), 0)},
    {name: 'DINHEIRO', value: filt.filter(p => p.forma_pagamento === 'DINHEIRO').reduce((a, b) => a + (Number(b.valor_total) || 0), 0)}
  ];

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-white">
      <form onSubmit={async (e) => { 
        e.preventDefault(); 
        const { error } = await supabase.auth.signInWithPassword({ email: e.target.email.value, password: e.target.password.value });
        if (error) alert("Erro de Login: " + error.message);
      }} className="bg-[#161B23] p-8 rounded border border-gray-700 w-80">
        <h2 className="font-bold text-center mb-4">Login Operador</h2>
        <input name="email" type="email" placeholder="E-mail" className="w-full bg-[#1A2030] p-2 mb-2 rounded border border-gray-600" required />
        <input name="password" type="password" placeholder="Senha" className="w-full bg-[#1A2030] p-2 mb-4 rounded border border-gray-600" required />
        <button className="w-full bg-blue-600 p-2 rounded font-bold hover:bg-blue-500">Entrar</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden">
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-2">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2"><Scale size={16} color={C.blue}/> GRASEL</h2>
        <button className="flex items-center gap-2 text-xs" onClick={() => setAba("dashboard")}><BarChart3 size={16}/> DASHBOARD</button>
        <button className="flex items-center gap-2 text-xs" onClick={() => setAba("entrada")}><PlusCircle size={16}/> NOVA ENTRADA</button>
        <button className="flex items-center gap-2 text-xs" onClick={() => setAba("saida")}><CheckCircle size={16}/> SAÍDA</button>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {aba === "dashboard" && (
           <div className="flex flex-col gap-4">
            <div className="grid grid-cols-5 gap-2">
              {[ {l: "DIÁRIA", v: `R$ ${dia.toFixed(0)}`}, {l: "PESO TOTAL", v: `${pesoTotal.toFixed(0)}kg`}, {l: "MENSAL", v: `R$ ${mens.toFixed(0)}`}, {l: "ANUAL", v: `R$ ${anu.toFixed(0)}`}, {l: "PESAGENS", v: filt.length} ].map((k, i) => (
                <div key={i} className="bg-[#161B23] p-3 rounded border border-[#ffffff07]">
                  <p className="text-[8px] text-gray-400 uppercase">{k.l}</p>
                  <p className="font-bold text-sm">{