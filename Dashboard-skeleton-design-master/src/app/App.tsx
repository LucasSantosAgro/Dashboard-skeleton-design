import React, { useEffect, useState, useMemo } from "react";
import { Scale, LayoutDashboard, PlusCircle, CheckCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { jsPDF } from "jspdf";
import { createClient } from '@supabase/supabase-js';

// Configuração centralizada
const supabaseUrl = 'https://tcevgekilsfndtvchdiz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZXZnZWtpbHNmbnRkdHZjaGRpeiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgyNjUxMjAxLCJleHAiOjIwOTgyMjcyMDF9.qTYFS1DNu3S5EYhxQoANKCH-pFY3LfFTKMbo6IOk9JE';
export const supabase = createClient(supabaseUrl, supabaseKey);

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", text: "#FFFFFF" };
const COLORS = [C.blue, C.green, C.orange, C.purple];

export default function App() {
  const [session, setSession] = useState(null);
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_, session) => setSession(session));
    const load = async () => { const { data } = await supabase.from('fat_pesagens').select('*'); setPesagens(data || []); };
    load();
  }, []);

  const filt = useMemo(() => pesagens.filter(p => 
    (f.prod === "" || p.produto === f.prod) && (f.pag === "" || p.forma_pagamento === f.pag) &&
    (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF)
  ), [pesagens, f]);

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-white">
      <form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({ email: e.target.email.value, password: e.target.password.value }); }} className="bg-[#161B23] p-8 rounded border w-80">
        <h2 className="font-bold text-center mb-4">Login Operador</h2>
        <input name="email" type="email" placeholder="E-mail" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
        <input name="password" type="password" placeholder="Senha" className="w-full bg-[#1A2030] p-2 mb-4 rounded" required />
        <button className="w-full bg-blue-600 p-2 rounded font-bold">Entrar</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden">
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-4">
        <h2 className="font-bold flex items-center gap-2"><Scale size={16} color={C.blue}/> GRASEL</h2>
        <nav className="flex flex-col gap-2 text-[10px]">
          <button onClick={() => setAba("dashboard")} className="flex items-center gap-2"><LayoutDashboard size={12}/> DASHBOARD</button>
          <button onClick={() => setAba("entrada")} className="flex items-center gap-2"><PlusCircle size={12}/> ENTRADA</button>
          <button onClick={() => setAba("finalizacao")} className="flex items-center gap-2"><CheckCircle size={12}/> FINALIZAÇÃO</button>
        </nav>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {aba === "dashboard" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#161B23] p-4 rounded border">PESAGENS: {filt.length}</div>
              {/* Adicione aqui os outros KPIs do seu dashboard original */}
            </div>
          </div>
        ) : aba === "entrada" ? (
          <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('fat_pesagens').insert([{ placa: e.target.placa.value, produto: e.target.prod.value, peso_entrada: e.target.peso.value, status_pagamento: 'aberto' }]); alert("Registrado!"); }} className="bg-[#161B23] p-6 rounded flex flex-col gap-4 max-w-sm">
            <input name="placa" placeholder="Placa" className="bg-[#1A2030] p-2 rounded" required />
            <select name="prod" className="bg-[#1A2030] p-2 rounded">
              <option>Milho ensacado</option><option>Milho granel</option><option>Quebradinho</option>
            </select>
            <input name="peso" type="number" placeholder="Peso Entrada" className="bg-[#1A2030] p-2 rounded" required />
            <button className="bg-blue-600 p-2 rounded">REGISTRAR ENTRADA</button>
          </form>
        ) : (
          <div className="grid gap-2">
            {pesagens.filter(p => p.status_pagamento === 'aberto').map(p => (
              <div key={p.id} className="bg-[#161B23] p-4 rounded flex items-center gap-4">
                <span>{p.placa} | {p.produto}</span>
                <button onClick={async () => { await supabase.from('fat_pesagens').update({ status_pagamento: 'finalizado' }).eq('id', p.id); }} className="bg-green-600 p-2 rounded">FINALIZAR</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}