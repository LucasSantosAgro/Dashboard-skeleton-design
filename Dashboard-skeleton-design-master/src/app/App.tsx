import React, { useEffect, useState, useMemo } from "react";
import { Scale } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", muted: "#A0AEC0", text: "#FFFFFF", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

export default function App() {
  const [session, setSession] = useState(null);
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
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-2 shrink-0">
        <h2 className="font-bold text-sm flex items-center gap-2"><Scale size={16} color={C.blue}/> GRASEL</h2>
        <input type="date" className="w-full bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, dataI: e.target.value})}/>
        <input type="date" className="w-full bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, dataF: e.target.value})}/>
        <input type="month" className="w-full bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, mes: e.target.value})}/>
        <select className="w-full bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, prod: e.target.value})}>
            <option value="">Produto</option>
            {[...new Set(pesagens.map(p => p.produto))].filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="w-full bg-[#1A2030] p-1 rounded text-[10px]" onChange={e => setF({...f, pag: e.target.value})}>
            <option value="">Pagamento</option>
            <option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option>
        </select>
      </aside>

      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        <div className="grid grid-cols-5 gap-2 shrink-0">
          {[ {l: "DIÁRIA", v: `R$ ${dia.toFixed(0)}`}, {l: "PESO TOTAL", v: `${pesoTotal.toFixed(0)}kg`}, {l: "MENSAL", v: `R$ ${mens.toFixed(0)}`}, {l: "ANUAL", v: `R$ ${anu.toFixed(0)}`}, {l: "PESAGENS", v: filt.length} ].map((k, i) => (
            <div key={i} className="bg-[#161B23] p-3 rounded border border-[#ffffff07]">
              <p className="text-[8px] text-gray-400 uppercase">{k.l}</p>
              <p className="font-bold text-sm">{k.v}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 h-[200px] shrink-0">
          <div className="bg-[#161B23] p-2 rounded border border-[#ffffff07] flex flex-col">
            <p className="text-[10px] mb-1">PAGAMENTOS</p>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pPag} innerRadius={35} outerRadius={50} dataKey="value">
                  {pPag.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                <Legend iconSize={6} wrapperStyle={{fontSize: '8px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[#161B23] p-2 rounded border border-[#ffffff07] flex flex-col">
            <p className="text-[10px] mb-1">RECEITA POR PRODUTO</p>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pProd} innerRadius={35} outerRadius={50} dataKey="value">
                  {pProd.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                <Legend iconSize={6} wrapperStyle={{fontSize: '8px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#161B23] rounded border border-[#ffffff07] p-3 flex-1 overflow-y-auto">
          <table className="w-full text-left text-[10px]">
            <thead className="text-gray-500 border-b border-[#ffffff07]">
              <tr>{["Data", "Comp.", "Produto", "Peso", "Valor", "Pag."].map(h => <th key={h} className="p-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filt.slice().reverse().slice(0, 10).map((p, i) => (
                <tr key={p.id || i} className="border-b border-[#ffffff05]">
                  <td className="p-2">{p.data}</td><td className="p-2">{p.comprovante}</td><td className="p-2">{p.produto}</td>
                  <td className="p-2">{p.peso_liquido}kg</td><td className="p-2 text-green-400 font-bold">R$ {Number(p.valor_total || 0).toFixed(0)}</td>
                  <td className="p-2">{p.forma_pagamento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}