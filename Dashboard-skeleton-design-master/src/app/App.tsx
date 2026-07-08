import React, { useEffect, useState, useMemo } from "react";
import { Scale, Loader2, AlertCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "" });
  const [activeKpi, setActiveKpi] = useState("TODOS");
  const [saldoCaixa, setSaldoCaixa] = useState(0);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [{ data: pD, error: pErr }, { data: cD, error: cErr }] = await Promise.all([
        supabase.from('fat_pesagens').select('*'),
        supabase.from('controle_caixa').select('saldo_atual').eq('id', 1).single()
      ]);
      if (pErr) throw pErr;
      setPesagens(pD || []);
      setSaldoCaixa(cD?.saldo_atual || 0);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) load(); else setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => { setSession(s); if (s) load(); });
    return () => subscription.unsubscribe();
  }, []);

  const updateSaldoCaixa = async (novoSaldo) => {
    setSaldoCaixa(novoSaldo);
    await supabase.from('controle_caixa').upsert({ id: 1, saldo_atual: novoSaldo });
  };

  const registrarEntrada = async (e) => {
    e.preventDefault();
    const { data } = await supabase.from('fat_pesagens').select('comprovante').order('comprovante', { ascending: false }).limit(1);
    const last = data && data[0] ? parseInt(data[0].comprovante.split('-')[1]) : 0;
    const nextComp = `CP-${(last + 1).toString().padStart(6, '0')}`;
    const { error } = await supabase.from('fat_pesagens').insert([{ comprovante: nextComp, placa: e.target.placa.value, produto: e.target.prod.value, peso_entrada: Number(e.target.peso.value), data: new Date().toISOString().split('T')[0], status_pagamento: 'ABERTO' }]);
    if (error) alert(error.message); else { alert("Registrado: " + nextComp); e.target.reset(); load(); }
  };

  const finalizarPesagem = async (p, e) => {
    e.preventDefault();
    const pesoSaida = Number(e.target.peso_saida.value);
    const pesoLiquido = pesoSaida - p.peso_entrada;
    const qtdSacas = pesoLiquido / 60;
    const valTotal = qtdSacas * Number(e.target.valor_saca.value);
    const troco = e.target.pag.value === "DINHEIRO" ? Math.max(0, (Number(e.target.recebido.value) || 0) - valTotal) : 0;
    if (e.target.pag.value === "DINHEIRO") await updateSaldoCaixa(saldoCaixa - troco);
    const { error } = await supabase.from('fat_pesagens').update({ peso_saida: pesoSaida, peso_liquido: pesoLiquido, sacas: qtdSacas, valor_total: valTotal, valor_troco: troco, forma_pagamento: e.target.pag.value, status_pagamento: 'FECHADO' }).eq('id', p.id);
    if (!error) { load(); alert("Finalizado!"); }
  };

  const filt = useMemo(() => pesagens.filter(p => (f.prod === "" || p.produto === f.prod) && (f.pag === "" || p.forma_pagamento === f.pag) && (!f.dataI || p.data >= f.dataI) && (!f.dataF || p.data <= f.dataF)), [pesagens, f]);
  const dataForCharts = useMemo(() => { let base = filt; const now = new Date().toISOString().split('T')[0]; if (activeKpi === "DIÁRIA") base = filt.filter(p => p.data === now); return base; }, [filt, activeKpi]);

  if (!session) return <div className="flex h-screen items-center justify-center bg-[#0B0F15]"><div className="w-80 p-6 bg-[#161B23] rounded"><Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} /></div></div>;
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-blue-500"><Loader2 className="animate-spin" size={40}/></div>;
  if (error) return <div className="flex flex-col h-screen items-center justify-center bg-[#0B0F15] text-red-500"><AlertCircle size={40}/><p>{error}</p></div>;

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white">
      <aside className="w-48 border-r border-[#ffffff07] p-4 flex flex-col gap-2">
        <h2 className="font-bold text-sm mb-4">GRASEL</h2>
        <button onClick={() => setAba("dashboard")} className="text-xs text-left">DASHBOARD</button>
        <button onClick={() => setAba("entrada")} className="text-xs text-left">NOVA ENTRADA</button>
        <button onClick={() => setAba("saida")} className="text-xs text-left">SAÍDA</button>
        <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-red-500 mt-auto">SAIR</button>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        {aba === "dashboard" && (
           <div className="grid grid-cols-2 gap-4 h-[220px]">
             <div className="bg-[#161B23] p-2 rounded">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={[{name: 'PIX', value: 10}, {name: 'DINHEIRO', value: 20}]} dataKey="value" nameKey="name" label={(p) => `${p.name}: ${p.percent * 100}%`}>
                     {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>
        )}
        {aba === "entrada" && (
            <form onSubmit={registrarEntrada} className="bg-[#161B23] p-6 rounded max-w-md">
                <input name="placa" placeholder="Placa" className="w-full bg-[#1A2030] p-2 mb-2 rounded" required />
                <select name="prod" className="w-full bg-[#1A2030] p-2 mb-2 rounded"><option value="Milho">Milho</option></select>
                <input name="peso" type="number" placeholder="Peso" className="w-full bg-[#1A2030] p-2 mb-4 rounded" required />
                <button className="bg-blue-600 w-full p-2 rounded">REGISTRAR</button>
            </form>
        )}
        {aba === "saida" && (
          <div className="flex flex-col gap-4">
            {pesagens.filter(p => p.status_pagamento === 'ABERTO').map(p => (
              <form key={p.id} onSubmit={(e) => finalizarPesagem(p, e)} className="bg-[#161B23] p-4 rounded">
                <p>Placa: {p.placa}</p>
                <input name="peso_saida" placeholder="Saída" className="bg-[#1A2030] p-1 rounded" required />
                <input name="valor_saca" placeholder="R$ Saca" className="bg-[#1A2030] p-1 rounded" required />
                <button className="bg-green-600 p-1 rounded">FINALIZAR</button>
              </form>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}