import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// force update - Atualização de infraestrutura
// Configuração consolidada (substitua com suas chaves reais do painel API do Supabase)
const supabaseUrl = 'https://tcevgekilsfndtvchdiz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZXZnZWtpbHNmbnRkdHZjaGRpeiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgyNjUxMjAxLCJleHAiOjIwOTgyMjcyMDF9.qTYFS1DNu3S5EYhxQoANKCH-pFY3LfFTKMbo6IOk9JE';
export const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [pesagens, setPesagens] = useState([]);
  const [view, setView] = useState('DASHBOARD (v2)');

  useEffect(() => {
    fetchPesagens();
  }, []);

  const fetchPesagens = async () => {
    const { data } = await supabase.from('fat_pesagens').select('*');
    if (data) setPesagens(data);
  };

  const handleRegistrarEntrada = async (e) => {
    e.preventDefault();
    
    // Busca o último comprovante para sequência
    const { data: ultimas } = await supabase
      .from('fat_pesagens')
      .select('comprovante')
      .order('id', { ascending: false })
      .limit(1);

    let proximoNumero = 1;
    if (ultimas && ultimas.length > 0 && ultimas[0].comprovante) {
      const num = parseInt(ultimas[0].comprovante.split('-')[1]);
      proximoNumero = num + 1;
    }
    const novoComp = `CP-${proximoNumero.toString().padStart(6, '0')}`;

    const { error } = await supabase.from('fat_pesagens').insert([{ 
      placa: e.target.placa.value, 
      produto: e.target.prod.value, 
      peso_entrada: parseFloat(e.target.peso.value), 
      status_pagamento: 'aberto',
      comprovante: novoComp,
      data: new Date().toISOString().split('T')[0]
    }]);

    if (error) alert("Erro ao registrar: " + error.message);
    else { alert("Registrado! Comprovante: " + novoComp); fetchPesagens(); }
  };

  const handleFinalizar = async (id, pesoEntrada, pesoSaida, valorUnitario) => {
    const pSaida = parseFloat(pesoSaida);
    const vUnit = parseFloat(valorUnitario);
    const pesoLiquido = pSaida - pesoEntrada;
    const valorTotal = pesoLiquido * vUnit;

    const { error } = await supabase
      .from('fat_pesagens')
      .update({ 
        peso_saida: pSaida,
        peso_liquido: pesoLiquido,
        valor_total: valorTotal,
        status_pagamento: 'fechado'
      })
      .eq('id', id);

    if (error) alert("Erro ao finalizar: " + error.message);
    else { alert("Finalizado com sucesso!"); fetchPesagens(); }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <nav className="w-64 bg-black p-4">
        <button onClick={() => setView('DASHBOARD (v2)')} className="block py-2 w-full text-left hover:text-blue-400">DASHBOARD (v2)</button>
        <button onClick={() => setView('ENTRADA')} className="block py-2 w-full text-left hover:text-blue-400">ENTRADA</button>
        <button onClick={() => setView('FINALIZACAO')} className="block py-2 w-full text-left hover:text-blue-400">FINALIZAÇÃO</button>
      </nav>

      <main className="flex-1 p-8">
        {view === 'ENTRADA' && (
          <form onSubmit={handleRegistrarEntrada} className="space-y-4 max-w-md">
            <h2 className="text-xl font-bold">Registrar Entrada</h2>
            <input name="placa" placeholder="Placa" className="text-black p-2 w-full" required />
            <input name="prod" placeholder="Produto" className="text-black p-2 w-full" required />
            <input name="peso" type="number" step="0.01" placeholder="Peso Entrada" className="text-black p-2 w-full" required />
            <button type="submit" className="bg-green-600 p-2 w-full rounded">REGISTRAR ENTRADA</button>
          </form>
        )}

        {view === 'FINALIZACAO' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Pesagens em Aberto</h2>
            {pesagens.filter(p => p.status_pagamento === 'aberto').map(p => (
              <div key={p.id} className="bg-gray-800 p-4 rounded flex items-center gap-4">
                <p><strong>{p.comprovante}</strong> | Placa: {p.placa}</p>
                <input id={`saida-${p.id}`} type="number" step="0.01" placeholder="Saída" className="text-black p-1 w-24" />
                <input id={`valor-${p.id}`} type="number" step="0.01" placeholder="Valor Unit." className="text-black p-1 w-24" />
                <button 
                  onClick={() => handleFinalizar(p.id, p.peso_entrada, document.getElementById(`saida-${p.id}`).value, document.getElementById(`valor-${p.id}`).value)}
                  className="bg-blue-600 p-1 px-4 rounded"
                >FINALIZAR</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}