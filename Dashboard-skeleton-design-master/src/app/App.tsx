import React, { useEffect, useState, useMemo } from "react";
import { Scale, LayoutDashboard, PlusCircle, CheckCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { jsPDF } from "jspdf";
import { createClient } from '@supabase/supabase-js';

// Conexão consolidada no próprio arquivo para evitar erro de build
const supabaseUrl = 'https://tcevgekilsfndtvchdiz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZXZnZWtpbHNmbnRkdHZjaGRpeiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgyNjUxMjAxLCJleHAiOjIwOTgyMjcyMDF9.qTYFS1DNu3S5EYhxQoANKCH-pFY3LfFTKMbo6IOk9JE';
export const supabase = createClient(supabaseUrl, supabaseKey);

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", muted: "#A0AEC0", text: "#FFFFFF", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

export default function App() {
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "" });

  useEffect(() => {
    const load = async () => { 
      const { data } = await supabase.from('fat_pesagens').select('*'); 
      setPesagens(data || []); 
    };
    load();
    const channel = supabase.channel('realtime:fat_pesagens').on('postgres_changes', { event: '*', schema: 'public', table: 'fat_pesagens' }, (payload) => {
      if (payload.eventType === 'INSERT') setPesagens((prev) => [...prev, payload.new]);
      else if (payload.eventType === 'UPDATE') setPesagens((prev) => prev.map(p => p.id === payload.new.id ? payload.new : p));
    }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const filt = useMemo(() => pesagens.filter(p => 
    (f.prod === "" || p.produto === f.prod) && (f.pag === "" || p.forma_pagamento === f.pag) &&
    (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF)
  ), [pesagens, f]);

  const dia = filt.filter(p => p.data === new Date().toISOString().split('T')[0]).reduce((a, b) => a + Number(b.valor_total || 0), 0);
  const pesoTotal = filt.reduce((a, b) => a + Number(b.peso_liquido || 0), 0);
  const mens = filt.filter(p => p.data?.startsWith(new Date().toISOString().slice(0, 7))).reduce((a, b) => a + Number(b.valor_total || 0), 0);
  const anu = filt.filter(p => p.data?.startsWith(new Date().getFullYear().toString())).reduce((a, b) => a + Number(b.valor_total || 0), 0);

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white">
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-4">
        <h2 className="font-bold text-sm flex items-center gap-2"><Scale size={16} color={C.blue}/> GRASEL</h2>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setAba("dashboard")} className="text-[10px] flex items-center gap-2"><LayoutDashboard size={12}/> DASHBOARD</button>
          <button onClick={() => setAba("entrada")} className="text-[10px] flex items-center gap-2"><PlusCircle size={12}/> ENTRADA</button>
          <button onClick={() => setAba("finalizacao")} className="text-[10px] flex items-center gap-2"><CheckCircle size={12}/> FINALIZAÇÃO</button>
        </nav>
      </aside>

      <main className="flex-1 p-4 overflow-y-auto">
        {aba === "dashboard" ? (
          <div className="grid grid-cols-5 gap-2">
            {[ {l: "DIÁRIA", v: `R$ ${dia.toFixed(0)}`}, {l: "PESO TOTAL", v: `${pesoTotal.toFixed(0)}kg`}, {l: "MENSAL", v: `R$ ${mens.toFixed(0)}`}, {l: "ANUAL", v: `R$ ${anu.toFixed(0)}`}, {l: "PESAGENS", v: filt.length} ].map((k, i) => (
              <div key={i} className="bg-[#161B23] p-3 rounded border border-[#ffffff07]"><p className="text-[8px] text-gray-400 uppercase">{k.l}</p><p className="font-bold text-sm">{k.v}</p></div>
            ))}
          </div>
        ) : aba === "entrada" ? (
          <form onSubmit={async (e) => { 
            e.preventDefault(); 
            await supabase.from('fat_pesagens').insert([{ placa: e.target.placa.value, produto: e.target.prod.value, peso_entrada: e.target.peso.value, status_pagamento: 'aberto' }]); 
            alert("Entrada registrada!"); 
          }} className="bg-[#161B23] p-6 rounded flex flex-col gap-4 max-w-sm">
            <input name="placa" placeholder="Placa" className="bg-[#1A2030] p-2 rounded" required />
            <select name="prod" className="bg-[#1A2030] p-2 rounded"><option>Milho ensacado</option><option>Milho granel</option><option>Quebradinho</option></select>
            <input name="peso" type="number" placeholder="Peso Entrada (kg)" className="bg-[#1A2030] p-2 rounded" required />
            <button className="bg-blue-600 p-2 rounded font-bold">REGISTRAR ENTRADA</button>
          </form>
        ) : (
          <div className="grid gap-2">
            {pesagens.filter(p => p.status_pagamento === 'aberto').map(p => (
              <div key={p.id} className="bg-[#161B23] p-4 rounded border border-[#ffffff07] flex gap-2 items-center">
                <span>{p.placa} | {p.produto}</span>
                <input id={`s-${p.id}`} type="number" placeholder="Peso Saída" className="bg-[#1A2030] p-1 rounded w-24"/>
                <input id={`v-${p.id}`} type="number" placeholder="Valor Saca" className="bg-[#1A2030] p-1 rounded w-24"/>
                <button onClick={async () => {
                  const s = document.getElementById(`s-${p.id}`).value;
                  const v = document.getElementById(`v-${p.id}`).value;
                  await supabase.from('fat_pesagens').update({ peso_saida: s, peso_liquido: Number(s)-Number(p.peso_entrada), valor_total: (Number(s)-Number(p.peso_entrada))/60 * Number(v), status_pagamento: 'finalizado' }).eq('id', p.id);
                }} className="bg-green-600 p-1 rounded">FINALIZAR</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}