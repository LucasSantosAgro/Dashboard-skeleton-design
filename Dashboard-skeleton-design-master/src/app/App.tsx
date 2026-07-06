import React, { useEffect, useState, useMemo } from "react";
import { Scale, LayoutDashboard, PlusCircle, CheckCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { createClient } from '@supabase/supabase-js';

// Conexão integrada para eliminar erros de caminho de arquivo
const supabaseUrl = 'https://tcevgekilsfndtvchdiz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZXZnZWtpbHNmbnRkdHZjaGRpeiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgyNjUxMjAxLCJleHAiOjIwOTgyMjcyMDF9.qTYFS1DNu3S5EYhxQoANKCH-pFY3LfFTKMbo6IOk9JE';
export const supabase = createClient(supabaseUrl, supabaseKey);

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", text: "#FFFFFF" };
const COLORS = [C.blue, C.green, C.orange, C.purple];

export default function App() {
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  
  useEffect(() => {
    const fetchPesagens = async () => {
      const { data } = await supabase.from('fat_pesagens').select('*');
      setPesagens(data || []);
    };
    fetchPesagens();
  }, []);

  const handleEntrada = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('fat_pesagens').insert([{ 
      placa: e.target.placa.value, 
      produto: e.target.prod.value, 
      peso_entrada: e.target.peso.value, 
      status_pagamento: 'aberto' 
    }]);
    if (error) alert("Erro: " + error.message); else alert("Entrada registrada!");
  };

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white">
      <aside className="w-48 p-4 border-r border-[#ffffff07]">
        <h2 className="font-bold mb-4">GRASEL</h2>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setAba("dashboard")}>DASHBOARD</button>
          <button onClick={() => setAba("entrada")}>ENTRADA</button>
          <button onClick={() => setAba("finalizacao")}>FINALIZAÇÃO</button>
        </nav>
      </aside>

      <main className="flex-1 p-6">
        {aba === "entrada" ? (
          <form onSubmit={handleEntrada} className="bg-[#161B23] p-6 rounded flex flex-col gap-4 max-w-sm">
            <input name="placa" placeholder="Placa" className="bg-[#1A2030] p-2 rounded" required />
            <select name="prod" className="bg-[#1A2030] p-2 rounded">
              <option>Milho ensacado</option>
              <option>Milho granel</option>
              <option>Quebradinho</option>
            </select>
            <input name="peso" type="number" placeholder="Peso Entrada (kg)" className="bg-[#1A2030] p-2 rounded" required />
            <button className="bg-blue-600 p-2 rounded">REGISTRAR</button>
          </form>
        ) : aba === "finalizacao" ? (
          <div className="flex flex-col gap-2">
            {pesagens.filter(p => p.status_pagamento === 'aberto').map(p => (
              <div key={p.id} className="bg-[#161B23] p-4 rounded flex gap-4 items-center">
                <span>{p.placa} - {p.produto}</span>
                <button onClick={async () => {
                   await supabase.from('fat_pesagens').update({ status_pagamento: 'finalizado' }).eq('id', p.id);
                   alert("Finalizado!");
                }} className="bg-green-600 p-2 rounded">FINALIZAR</button>
              </div>
            ))}
          </div>
        ) : (
          <div>Dashboard (Seus gráficos e KPIs voltam aqui)</div>
        )}
      </main>
    </div>
  );
}