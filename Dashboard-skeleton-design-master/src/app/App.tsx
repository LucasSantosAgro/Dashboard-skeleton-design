import React, { useEffect, useState, useMemo } from "react";
import { Scale, PlusCircle, CheckCircle, BarChart3 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", muted: "#A0AEC0", text: "#FFFFFF", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

export default function App() {
  const [session, setSession] = useState(null);
  const [aba, setAba] = useState("dashboard"); // Nova aba de navegação
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

  // --- FUNÇÕES DE LÓGICA ---
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

  // --- FILTROS E KPIs (Mantidos intactos) ---
  const filt = useMemo(() => pesagens.filter(p => 
    (f.prod === "" || p.produto === f.prod) && (f.pag === "" || p.forma_pagamento === f.pag) &&
    (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF) && (!f.mes || p.data?.startsWith(f.mes))
  ), [pesagens, f]);

  // ... (seus cálculos de pesoTotal, dia, mens, anu, pProd, pPag seguem iguais) ...

  if (!session) return (/* Seu form de login igual */);

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden">
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-2">
        <button className="flex items-center gap-2 mb-4" onClick={() => setAba("dashboard")}><BarChart3 size={16}/> DASHBOARD</button>
        <button className="flex items-center gap-2" onClick={() => setAba("entrada")}><PlusCircle size={16}/> NOVA ENTRADA</button>
        <button className="flex items-center gap-2" onClick={() => setAba("saida")}><CheckCircle size={16}/> SAÍDA</button>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {aba === "dashboard" && (
           /* ... (Seu conteúdo anterior do dashboard) ... */
        )}

        {aba === "entrada" && (
          <form onSubmit={registrarEntrada} className="bg-[#161B23] p-6 rounded border border-[#ffffff07] max-w-md">
            <h2 className="mb-4 font-bold">Registrar Entrada</h2>
            <input name="comp" placeholder="Comprovante" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
            <input name="placa" placeholder="Placa" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
            <input name="prod" placeholder="Produto" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
            <input name="peso" type="number" placeholder="Peso Entrada" className="w-full bg-[#1A2030] p-2 mb-4 rounded" required />
            <button className="bg-blue-600 w-full p-2 rounded">SALVAR ENTRADA</button>
          </form>
        )}

        {aba === "saida" && (
          <div className="grid gap-4">
            {pesagens.filter(p => p.status_pagamento === 'ABERTO').map(p => (
              <form key={p.id} onSubmit={(e) => finalizarPesagem(p, e)} className="bg-[#161B23] p-4 rounded flex gap-4 items-center">
                <p className="font-bold">{p.placa}</p>
                <input name="peso_saida" type="number" placeholder="Peso Saída" className="bg-[#1A2030] p-1 rounded" required />
                <input name="valor_saca" type="number" placeholder="Valor Saca" className="bg-[#1A2030] p-1 rounded" required />
                <select name="pag" className="bg-[#1A2030] p-1 rounded"><option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option></select>
                <button className="bg-green-600 p-1 px-4 rounded text-xs">FINALIZAR E PDF</button>
              </form>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}