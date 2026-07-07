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

  async function load() {
    const { data } = await supabase.from('fat_pesagens').select('*');
    setPesagens(data || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session]);

  const registrarEntrada = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('fat_pesagens').insert([{
      comprovante: `CP-${Date.now().toString().slice(-6)}`,
      placa: e.target.placa.value,
      produto: e.target.prod.value,
      peso_entrada: Number(e.target.peso.value),
      data: new Date().toISOString().split('T')[0],
      status_pagamento: 'ABERTO'
    }]);
    if (error) alert(error.message); 
    else { alert("Entrada registrada!"); e.target.reset(); load(); }
  };

  const finalizarPesagem = async (p, e) => {
    e.preventDefault();
    const pesoSaida = Number(e.target.peso_saida.value);
    const pesoLiquido = pesoSaida - p.peso_entrada;
    const qtdSacas = pesoLiquido / 60;
    const valTotal = qtdSacas * Number(e.target.valor_saca.value);

    const { error } = await supabase.from('fat_pesagens').update({
      peso_saida: pesoSaida, peso_liquido: pesoLiquido, sacas: qtdSacas, valor_unitario: Number(e.target.valor_saca.value),
      valor_total: valTotal, forma_pagamento: e.target.pag.value, status_pagamento: 'FECHADO'
    }).eq('id', p.id);

    if (!error) {
      load();
      const doc = new jsPDF();
      doc.text("COMPROVANTE GRASEL", 10, 10);
      doc.text(`Comprovante: ${p.comprovante}`, 10, 20);
      doc.text(`Placa: ${p.placa} | Produto: ${p.produto}`, 10, 30);
      doc.text(`Peso Liquido: ${pesoLiquido.toFixed(2)}kg`, 10, 40);
      doc.text(`Valor Total: R$ ${valTotal.toFixed(2)}`, 10, 50);
      doc.save(`comp_${p.comprovante}.pdf`);
    }
  };

  const filt = useMemo(() => pesagens.filter(p => (f.prod === "" || p.produto === f.prod) && (f.pag === "" || p.forma_pagamento === f.pag) && (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF) && (!f.mes || p.data?.startsWith(f.mes))), [pesagens, f]);

  const dia = filt.filter(p => p.data === new Date().toISOString().split('T')[0]).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  
  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-white">
      <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email: e.target.email.value, password: e.target.password.value }); if (error) alert(error.message); }} className="bg-[#161B23] p-8 rounded border border-gray-700 w-80">
        <input name="email" type="email" placeholder="E-mail" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
        <input name="password" type="password" placeholder="Senha" className="w-full bg-[#1A2030] p-2 mb-4 rounded" required />
        <button className="w-full bg-blue-600 p-2 rounded">Entrar</button>
      </form>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden">
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-2">
        <h2 className="font-bold text-sm mb-4"><Scale size={16} className="inline mr-2 text-blue-500"/> GRASEL</h2>
        <button onClick={() => setAba("dashboard")} className="text-xs text-left">DASHBOARD</button>
        <button onClick={() => setAba("entrada")} className="text-xs text-left">NOVA ENTRADA</button>
        <button onClick={() => setAba("saida")} className="text-xs text-left">SAÍDA</button>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        {aba === "dashboard" && <div className="p-4 bg-[#161B23] rounded">Receita Diária: R$ {dia.toFixed(0)}</div>}
        {aba === "entrada" && (
          <form onSubmit={registrarEntrada} className="bg-[#161B23] p-6 rounded max-w-md border border-[#ffffff07]">
            <input name="placa" placeholder="Placa" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
            <select name="prod" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required>
              <option value="Milho ensacado">Milho ensacado</option>
              <option value="Milho granel">Milho granel</option>
              <option value="Quebradinho">Quebradinho</option>
            </select>
            <input name="peso" type="number" placeholder="Peso Entrada" className="w-full bg-[#1A2030] p-2 mb-4 rounded" required />
            <button className="bg-blue-600 w-full p-2 rounded">REGISTRAR ENTRADA</button>
          </form>
        )}
        {aba === "saida" && (
          <div className="grid gap-4">
            {pesagens.filter(p => p.status_pagamento === 'ABERTO').map(p => (
              <form key={p.id} onSubmit={(e) => finalizarPesagem(p, e)} className="bg-[#161B23] p-4 rounded flex gap-2">
                <span className="text-xs w-20">{p.placa}</span>
                <input name="peso_saida" type="number" placeholder="Peso Saída" className="bg-[#1A2030] p-1 rounded w-24" required />
                <input name="valor_saca" type="number" placeholder="Valor Saca" className="bg-[#1A2030] p-1 rounded w-24" required />
                <select name="pag" className="bg-[#1A2030] p-1 rounded"><option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option></select>
                <button className="bg-green-600 p-1 px-4 rounded text-xs">FINALIZAR</button>
              </form>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}