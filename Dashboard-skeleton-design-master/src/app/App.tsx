import React, { useEffect, useState, useMemo } from "react";
import { Scale, Loader2 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('fat_pesagens').select('*');
    setPesagens(data || []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) load(); else setLoading(false);
    });
    supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (session) load();
    });
  }, []);

  const getNextComprovante = async () => {
    const { data } = await supabase.from('fat_pesagens').select('comprovante').order('comprovante', { ascending: false }).limit(1);
    const last = data && data[0] ? parseInt(data[0].comprovante.split('-')[1]) : 0;
    return `CP-${(last + 1).toString().padStart(6, '0')}`;
  };

  const registrarEntrada = async (e) => {
    e.preventDefault();
    const nextComp = await getNextComprovante();
    const { error } = await supabase.from('fat_pesagens').insert([{
      comprovante: nextComp,
      placa: e.target.placa.value,
      produto: e.target.prod.value,
      peso_entrada: Number(e.target.peso.value),
      data: new Date().toISOString().split('T')[0],
      status_pagamento: 'ABERTO'
    }]);
    if (error) alert(error.message); else { alert("Registrado: " + nextComp); e.target.reset(); load(); }
  };

  const finalizarPesagem = async (p, e) => {
    e.preventDefault();
    const pesoSaida = Number(e.target.peso_saida.value);
    const pesoLiquido = pesoSaida - p.peso_entrada;
    const qtdSacas = pesoLiquido / 60;
    const valUnit = Number(e.target.valor_saca.value);
    const valTotal = qtdSacas * valUnit;

    const { error } = await supabase.from('fat_pesagens').update({
      peso_saida: pesoSaida, peso_liquido: pesoLiquido, sacas: qtdSacas, valor_unitario: valUnit,
      valor_total: valTotal, forma_pagamento: e.target.pag.value, status_pagamento: 'FECHADO'
    }).eq('id', p.id);

    if (!error) {
      load();
      const doc = new jsPDF();
      const info = [
        `Comprovante: ${p.comprovante}`, `Placa: ${p.placa}`, `Peso Entrada: ${p.peso_entrada}kg`,
        `Peso Saida: ${pesoSaida}kg`, `Peso Liquido: ${pesoLiquido.toFixed(2)}kg`, `Qtd Sacas: ${qtdSacas.toFixed(2)}`,
        `Valor p/ Saca: R$ ${valUnit.toFixed(2)}`, `Valor Total: R$ ${valTotal.toFixed(2)}`, `Pagamento: ${e.target.pag.value}`
      ];
      [10, 150].forEach(y => {
        doc.text("COMPROVANTE GRASEL", 10, y);
        info.forEach((txt, i) => doc.text(txt, 10, y + 10 + (i * 7)));
      });
      doc.save(`comp_${p.comprovante}.pdf`);
    }
  };

  const filt = useMemo(() => pesagens.filter(p => (f.prod === "" || p.produto === f.prod) && (f.pag === "" || p.forma_pagamento === f.pag) && (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF) && (!f.mes || p.data?.startsWith(f.mes))), [pesagens, f]);

  const pesoTotal = filt.reduce((a, b) => a + (Number(b.peso_liquido) || 0), 0);
  const dia = filt.filter(p => p.data === new Date().toISOString().split('T')[0]).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const mens = filt.filter(p => p.data?.startsWith(new Date().toISOString().slice(0, 7))).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const anu = filt.filter(p => p.data?.startsWith(new Date().getFullYear().toString())).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const pProd = Object.entries(filt.reduce((acc, p) => { acc[p.produto] = (acc[p.produto] || 0) + (Number(p.valor_total) || 0); return acc; }, {})).map(([name, value]) => ({ name, value }));
  const pPag = [{name: 'PIX', value: filt.filter(p => p.forma_pagamento === 'PIX').reduce((a, b) => a + (Number(b.valor_total) || 0), 0)}, {name: 'DINHEIRO', value: filt.filter(p => p.forma_pagamento === 'DINHEIRO').reduce((a, b) => a + (Number(b.valor_total) || 0), 0)}];

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-blue-500"><Loader2 className="animate-spin" size={40}/></div>;
  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-white">
      <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email: e.target.email.value, password: e.target.password.value }); }} className="bg-[#161B23] p-8 rounded border w-80">
        <input name="email" type="email" placeholder="E-mail" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
        <input name="password" type="password" placeholder="Senha" className="w-full bg-[#1A2030] p-2 mb-4 rounded" required />
        <button className="w-full bg-blue-600 p-2 rounded">Entrar</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden">
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-2 shrink-0">
        <h2 className="font-bold text-sm mb-4"><Scale size={16} className="inline mr-2 text-blue-500"/> GRASEL</h2>
        <button onClick={() => setAba("dashboard")} className="text-xs text-left">DASHBOARD</button>
        <button onClick={() => setAba("entrada")} className="text-xs text-left">NOVA ENTRADA</button>
        <button onClick={() => setAba("saida")} className="text-xs text-left">SAÍDA</button>
        <hr className="border-[#ffffff07] my-2" />
        <input type="date" className="bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, dataI: e.target.value})}/>
        <input type="date" className="bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, dataF: e.target.value})}/>
        <select className="bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, prod: e.target.value})}>
            <option value="">Produto</option> {[...new Set(pesagens.map(p => p.produto))].filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, pag: e.target.value})}>
            <option value="">Pagamento</option><option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option>
        </select>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        {aba === "dashboard" && (
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-5 gap-2">
                  {[ {l: "DIÁRIA", v: `R$ ${dia.toFixed(0)}`}, {l: "PESO TOTAL", v: `${pesoTotal.toFixed(0)}kg`}, {l: "MENSAL", v: `R$ ${mens.toFixed(0)}`}, {l: "ANUAL", v: `R$ ${anu.toFixed(0)}`}, {l: "PESAGENS", v: filt.length} ].map((k, i) => (
                    <div key={i} className="bg-[#161B23] p-3 rounded border border-[#ffffff07]"><p className="text-[8px] text-gray-400 uppercase">{k.l}</p><p className="font-bold text-sm">{k.v}</p></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 h-[200px]">
                    <div className="bg-[#161B23] p-2 rounded border border-[#ffffff07] flex flex-col"><p className="text-[10px] mb-1">PAGAMENTOS</p><ResponsiveContainer><PieChart><Pie data={pPag} innerRadius={35} outerRadius={50} dataKey="value">{pPag.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                    <div className="bg-[#161B23] p-2 rounded border border-[#ffffff07] flex flex-col"><p className="text-[10px] mb-1">RECEITA POR PRODUTO</p><ResponsiveContainer><PieChart><Pie data={pProd} innerRadius={35} outerRadius={50} dataKey="value">{pProd.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                </div>
                <div className="bg-[#161B23] rounded border border-[#ffffff07] p-3">
                    <table className="w-full text-left text-[10px]">
                        <thead><tr className="text-gray-500 border-b border-[#ffffff07]">{["Data", "Comp.", "Produto", "Peso", "Valor", "Pag."].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
                        <tbody>{filt.slice().reverse().slice(0, 10).map((p, i) => <tr key={i} className="border-b border-[#ffffff05]"><td className="p-2">{p.data}</td><td className="p-2">{p.comprovante}</td><td className="p-2">{p.produto}</td><td className="p-2">{p.peso_liquido}kg</td><td className="p-2 font-bold text-green-400">R$ {Number(p.valor_total || 0).toFixed(0)}</td><td className="p-2">{p.forma_pagamento}</td></tr>)}</tbody>
                    </table>
                </div>
            </div>
        )}
        {aba === "entrada" && (
          <form onSubmit={registrarEntrada} className="bg-[#161B23] p-6 rounded max-w-md border border-[#ffffff07]">
            <h2 className="mb-4 font-bold">Nova Entrada</h2>
            <input name="placa" placeholder="Placa" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
            <select name="prod" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required>
              <option value="Milho ensacado">Milho ensacado</option><option value="Milho granel">Milho granel</option><option value="Quebradinho">Quebradinho</option>
            </select>
            <input name="peso" type="number" placeholder="Peso Entrada" className="w-full bg-[#1A2030] p-2 mb-4 rounded" required />
            <button className="bg-blue-600 w-full p-2 rounded font-bold">REGISTRAR ENTRADA</button>
          </form>
        )}
        {aba === "saida" && (
          <div className="grid gap-4">
            {pesagens.filter(p => p.status_pagamento === 'ABERTO').map(p => (
              <form key={p.id} onSubmit={(e) => finalizarPesagem(p, e)} className="bg-[#161B23] p-4 rounded flex flex-col gap-2 border border-[#ffffff07] text-[11px]">
                <div className="flex justify-between font-bold text-blue-400"><span>Placa: {p.placa}</span> <span>Produto: {p.produto}</span> <span>Entrada: {p.peso_entrada}kg</span></div>
                <div className="flex gap-2">
                  <input name="peso_saida" type="number" placeholder="Peso Saída" className="bg-[#1A2030] p-1 rounded flex-1" required />
                  <input name="valor_saca" type="number" placeholder="R$ Saca" className="bg-[#1A2030] p-1 rounded flex-1" required />
                  <select name="pag" className="bg-[#1A2030] p-1 rounded"><option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option></select>
                  <button className="bg-green-600 p-1 px-4 rounded font-bold">FINALIZAR</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}