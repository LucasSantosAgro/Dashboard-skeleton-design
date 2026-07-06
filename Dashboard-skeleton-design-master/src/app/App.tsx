import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Ajuste o caminho conforme seu projeto

export default function App() {
  const [pesagens, setPesagens] = useState([]);
  const [view, setView] = useState('DASHBOARD');

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
    if (ultimas && ultimas.length > 0) {
      const num = parseInt(ultimas[0].comprovante.split('-')[1]);
      proximoNumero = num + 1;
    }
    const novoComp = `CP-${proximoNumero.toString().padStart(6, '0')}`;

    const { error } = await supabase.from('fat_pesagens').insert([{ 
      placa: e.target.placa.value, 
      produto: e.target.prod.value, 
      peso_entrada: e.target.peso.value, 
      status_pagamento: 'aberto',
      comprovante: novoComp,
      data: new Date().toISOString().split('T')[0]
    }]);

    if (error) alert("Erro: " + error.message);
    else { alert("Registrado!"); fetchPesagens(); }
  };

  const handleFinalizar = async (id, pesoEntrada, pesoSaida, valorUnitario) => {
    const pesoLiquido = pesoSaida - pesoEntrada;
    const valorTotal = pesoLiquido * valorUnitario;

    const { error } = await supabase
      .from('fat_pesagens')
      .update({ 
        peso_saida: pesoSaida,
        peso_liquido: pesoLiquido,
        valor_total: valorTotal,
        status_pagamento: 'fechado'
      })
      .eq('id', id);

    if (error) alert("Erro ao finalizar: " + error.message);
    else { alert("Finalizado!"); fetchPesagens(); }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <nav className="w-64 bg-black p-4">
        <button onClick={() => setView('DASHBOARD')} className="block py-2">DASHBOARD</button>
        <button onClick={() => setView('ENTRADA')} className="block py-2">ENTRADA</button>
        <button onClick={() => setView('FINALIZACAO')} className="block py-2">FINALIZAÇÃO</button>
      </nav>

      <main className="flex-1 p-8">
        {view === 'ENTRADA' && (
          <form onSubmit={handleRegistrarEntrada} className="space-y-4">
            <input name="placa" placeholder="Placa" className="text-black p-2 w-full" required />
            <input name="prod" placeholder="Produto" className="text-black p-2 w-full" required />
            <input name="peso" type="number" placeholder="Peso Entrada" className="text-black p-2 w-full" required />
            <button type="submit" className="bg-green-600 p-2 w-full">REGISTRAR ENTRADA</button>
          </form>
        )}

        {view === 'FINALIZACAO' && (
          <div className="space-y-4">
            {pesagens.filter(p => p.status_pagamento === 'aberto').map(p => (
              <div key={p.id} className="bg-gray-800 p-4 rounded">
                <p>Comprovante: {p.comprovante} | Placa: {p.placa}</p>
                <input id={`saida-${p.id}`} type="number" placeholder="Peso Saída" className="text-black p-1" />
                <input id={`valor-${p.id}`} type="number" placeholder="Valor Unit." className="text-black p-1 ml-2" />
                <button 
                  onClick={() => handleFinalizar(p.id, p.peso_entrada, document.getElementById(`saida-${p.id}`).value, document.getElementById(`valor-${p.id}`).value)}
                  className="bg-blue-600 p-1 ml-2"
                >FINALIZAR</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}