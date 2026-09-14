'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

const COLUNAS_PATIO = [
  { id: 'aguardando', titulo: 'Aguardando Chegada', cor: 'border-yellow-500 text-yellow-400' },
  { id: 'em_patio', titulo: 'Em Pátio / Triagem', cor: 'border-blue-500 text-blue-400' },
  { id: 'carregando', titulo: 'Carregando', cor: 'border-purple-500 text-purple-400' },
  { id: 'concluido', titulo: 'Concluído / Saída', cor: 'border-green-500 text-green-400' }
];

export function KanbanPatio() {
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  
  // Estados para os filtros da interface e contrato selecionado
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState('');
  const [filtroCnpj, setFiltroCnpj] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');

  const processandoRef = useRef({});

  const buscarOrdens = useCallback(async () => {
    let query = supabase
      .from('ordens_carregamento')
      .select('*, contratos_embarque(id, numero_contrato, quantidade_disponivel, produto)');

    // Se houver um contrato selecionado no filtro da interface, aplica o filtro
    if (contratoSelecionadoId) {
      query = query.eq('contrato_id', contratoSelecionadoId);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (!error && data) {
      setOrdens(data);
    }
    setCarregando(false);
  }, [contratoSelecionadoId]);

  const atualizarStatus = async (id, novoStatus) => {
    const dadosUpdate = { status: novoStatus };
    
    if (novoStatus === 'em_patio') {
      dadosUpdate.data_chegada_portaria = new Date().toISOString();
    }

    setOrdens((prev) =>
      prev.map((ordem) => (ordem.id === id ? { ...ordem, ...dadosUpdate } : ordem))
    );

    const { error } = await supabase
      .from('ordens_carregamento')
      .update(dadosUpdate)
      .eq('id', id);

    if (error) buscarOrdens();
  };

  const atualizarConclusaoCarregamento = async (id, notaFiscal, pesoCarregado, contratoId) => {
    if (processandoRef.current[id]) return;
    processandoRef.current[id] = true;
    setProcessandoId(id);

    try {
      const { data: ordemAtual, error: erroBuscaOrdem } = await supabase
        .from('ordens_carregamento')
        .select('status, peso_carregado, contrato_id')
        .eq('id', id)
        .single();

      if (erroBuscaOrdem || !ordemAtual) {
        alert('Erro ao localizar a ordem de carregamento.');
        return;
      }

      if (ordemAtual.status === 'concluido' || (ordemAtual.peso_carregado !== null && Number(ordemAtual.peso_carregado) > 0)) {
        alert('⚠️ Ação bloqueada: Esta ordem de carregamento já foi finalizada anteriormente e o saldo do contrato já sofreu a baixa.');
        buscarOrdens();
        return;
      }

      const idContratoReal = contratoId || ordemAtual.contrato_id || ordens.find(o => o.id === id)?.contrato_id || ordens.find(o => o.id === id)?.contratos_embarque?.id;

      if (!idContratoReal) {
        alert('Aviso: Esta ordem de carregamento não possui nenhum contrato vinculado! O saldo não pode ser abatido.');
        return;
      }

      const pesoNumerico = Number(pesoCarregado) || 0;
      const dadosUpdateOrdem = {
        status: 'concluido',
        nota_fiscal: notaFiscal,
        peso_carregado: pesoNumerico
      };

      const { data: ordemAtualizada, error: erroOrdem } = await supabase
        .from('ordens_carregamento')
        .update(dadosUpdateOrdem)
        .eq('id', id)
        .eq('status', 'carregando')
        .select();

      if (erroOrdem || !ordemAtualizada || ordemAtualizada.length === 0) {
        alert('Erro ou conflito: Esta ordem pode já ter sido processada em outra aba ou dispositivo.');
        buscarOrdens();
        return;
      }

      const { data: contrato, error: erroBusca } = await supabase
        .from('contratos_embarque')
        .select('quantidade_disponivel, numero_contrato')
        .eq('id', idContratoReal)
        .single();

      if (erroBusca || !contrato) {
        console.error('Erro ao buscar contrato:', erroBusca);
        alert('Ordem finalizada, mas houve um erro ao localizar o contrato vinculado.');
        return;
      }

      const saldoAtual = Number(contrato.quantidade_disponivel) || 0;
      const novoSaldo = saldoAtual - pesoNumerico;

      const { error: erroAtualizacaoContrato } = await supabase
        .from('contratos_embarque')
        .update({ quantidade_disponivel: novoSaldo })
        .eq('id', idContratoReal);

      if (erroAtualizacaoContrato) {
        console.error('Erro ao atualizar saldo do contrato:', erroAtualizacaoContrato);
        alert(`Erro ao atualizar o contrato: ${erroAtualizacaoContrato.message}`);
        return;
      }

      let mensagem = `Carregamento concluído com sucesso!\n\n` +
                     `• Contrato: ${contrato.numero_contrato}\n` +
                     `• Baixa efetuada: -${pesoNumerico.toLocaleString('pt-BR')} Kg\n` +
                     `• Saldo restante: ${novoSaldo.toLocaleString('pt-BR')} Kg`;

      if (novoSaldo < 100000) {
        mensagem += `\n\n⚠️ ATENÇÃO: O saldo deste contrato está abaixo de 100.000 Kg!`;
      }

      alert(mensagem);

      setOrdens((prev) =>
        prev.map((ordem) => (ordem.id === id ? { ...ordem, ...dadosUpdateOrdem } : ordem))
      );
      buscarOrdens();
    } finally {
      processandoRef.current[id] = false;
      setProcessandoId(null);
    }
  };

  const formatarDataHora = (dataIso) => {
    if (!dataIso) return 'N/A';
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    buscarOrdens();

    const canal = supabase
      .channel('mudancas-patio')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordens_carregamento' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            buscarOrdens();
          } else if (payload.eventType === 'UPDATE') {
            setOrdens((prev) =>
              prev.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrdens((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [buscarOrdens]);

  if (carregando) {
    return (
      <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" size={20} /> Carregando pátio...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUNAS_PATIO.map((coluna) => {
        let ordensColuna = ordens.filter((o) => o.status === coluna.id);

        // Aplicação dos filtros restritivos apenas na coluna de Concluídos
        if (coluna.id === 'concluido') {
          if (filtroCnpj) {
            ordensColuna = ordensColuna.filter((o) => 
              (o.cnpj_transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase()) ||
              (o.transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase())
            );
          }
          if (filtroContrato) {
            ordensColuna = ordensColuna.filter((o) => 
              (o.contratos_embarque?.numero_contrato || '').toLowerCase().includes(filtroContrato.toLowerCase())
            );
          }
          if (filtroProduto) {
            ordensColuna = ordensColuna.filter((o) => 
              (o.contratos_embarque?.produto || '').toLowerCase().includes(filtroProduto.toLowerCase())
            );
          }
        }

        return (
          <div key={coluna.id} className="bg-[#161B23] rounded-xl p-4 border border-white/5 flex flex-col h-[calc(100vh-280px)] min-h-[450px]">
            <div className={`flex justify-between items-center pb-3 mb-3 border-b-2 ${coluna.cor}`}>
              <h2 className="font-bold text-xs uppercase tracking-wider">{coluna.titulo}</h2>
              <span className="bg-[#1A2030] text-gray-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                {ordensColuna.length}
              </span>
            </div>

            {/* Painel de Filtros dedicado na coluna de Concluídos */}
            {coluna.id === 'concluido' && (
              <div className="mb-3 p-2.5 bg-[#1A2030] rounded-lg border border-white/10 space-y-2">
                <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Filtros de Concluídos</div>
                <input
                  type="text"
                  placeholder="Filtrar por CNPJ / Transportadora"
                  value={filtroCnpj}
                  onChange={(e) => setFiltroCnpj(e.target.value)}
                  className="w-full p-1.5 text-xs bg-[#161B23] border border-white/10 text-white rounded outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  placeholder="Filtrar por Contrato"
                  value={filtroContrato}
                  onChange={(e) => setFiltroContrato(e.target.value)}
                  className="w-full p-1.5 text-xs bg-[#161B23] border border-white/10 text-white rounded outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  placeholder="Filtrar por Produto"
                  value={filtroProduto}
                  onChange={(e) => setFiltroProduto(e.target.value)}
                  className="w-full p-1.5 text-xs bg-[#161B23] border border-white/10 text-white rounded outline-none focus:border-green-500"
                />
                {(filtroCnpj || filtroContrato || filtroProduto) && (
                  <button
                    onClick={() => { setFiltroCnpj(''); setFiltroContrato(''); setFiltroProduto(''); }}
                    className="w-full text-[11px] text-gray-400 hover:text-white py-0.5 transition-colors cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {ordensColuna.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8 border border-dashed border-white/5 rounded-lg">
                  Nenhum veículo nesta etapa
                </div>
              ) : (
                ordensColuna.map((ordem) => (
                  <div key={ordem.id} className="bg-[#1A2030] p-4 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all shadow-md">
                    <div className="flex justify-between text-xs font-bold text-blue-400 mb-1">
                      <span>#{ordem.codigo_ordem || ordem.id.substring(0, 6)}</span>
                      <span className="text-gray-400 text-[11px] font-normal">{ordem.tipo_veiculo}</span>
                    </div>
                    
                    {ordem.contratos_embarque?.numero_contrato && (
                      <div className="mb-2 text-[11px] bg-blue-950/40 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-medium inline-block">
                        Contrato: {ordem.contratos_embarque.numero_contrato}
                      </div>
                    )}

                    {ordem.contratos_embarque?.produto && (
                      <div className="mb-2 ml-1 text-[11px] bg-purple-950/40 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-medium inline-block">
                        Produto: {ordem.contratos_embarque.produto}
                      </div>
                    )}

                    <h3 className="font-bold text-white text-sm">{ordem.transportadora}</h3>
                    {ordem.cnpj_transportadora && (
                      <p className="text-[11px] text-gray-400">CNPJ: {ordem.cnpj_transportadora}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-1">Mot: <span className="text-white font-medium">{ordem.nome_motorista}</span></p>

                    {ordem.data_chegada_portaria && (
                      <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-blue-400 font-medium">
                        ⏱️ Check-in: {formatarDataHora(ordem.data_chegada_portaria)}
                      </div>
                    )}

                    {ordem.peso_carregado && (
                      <div className="mt-1 text-[11px] text-green-400 font-medium">
                        ⚖️ Carregado: {Number(ordem.peso_carregado).toLocaleString('pt-BR')} Kg {ordem.nota_fiscal ? `| NF: ${ordem.nota_fiscal}` : ''}
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-gray-400 grid grid-cols-2 gap-1">
                      <div><strong>Cavalo:</strong> <span className="text-gray-200">{ordem.placa_cavalo}</span></div>
                      <div><strong>Carreta:</strong> <span className="text-gray-200">{ordem.placa_carreta || 'N/A'}</span></div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5">
                      {ordem.status === 'aguardando' && (
                        <button onClick={() => atualizarStatus(ordem.id, 'em_patio')} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg font-semibold transition-colors cursor-pointer">
                          Aprovar Entrada
                        </button>
                      )}
                      {ordem.status === 'em_patio' && (
                        <button onClick={() => atualizarStatus(ordem.id, 'carregando')} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-1.5 rounded-lg font-semibold transition-colors cursor-pointer">
                          Iniciar Carregamento
                        </button>
                      )}
                      {ordem.status === 'carregando' && (
                        <div className="mt-3 pt-2 border-t border-white/5 space-y-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">Nota Fiscal</label>
                            <input
                              type="text"
                              placeholder="Número da NF"
                              defaultValue={ordem.nota_fiscal || ''}
                              id={`nf-${ordem.id}`}
                              disabled={processandoId === ordem.id}
                              className="w-full p-2 text-xs bg-[#161B23] border border-white/10 text-white rounded-lg outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">Peso Carregado (KG/Ton)</label>
                            <input
                              type="number"
                              placeholder="Ex: 35000"
                              defaultValue={ordem.peso_carregado || ''}
                              id={`peso-${ordem.id}`}
                              disabled={processandoId === ordem.id}
                              className="w-full p-2 text-xs bg-[#161B23] border border-white/10 text-white rounded-lg outline-none focus:border-blue-500"
                            />
                          </div>
                          <button
                            disabled={processandoId === ordem.id}
                            onClick={() => {
                              const nfInput = document.getElementById(`nf-${ordem.id}`);
                              const pesoInput = document.getElementById(`peso-${ordem.id}`);
                              const nf = nfInput ? nfInput.value : '';
                              const peso = pesoInput ? parseFloat(pesoInput.value) || 0 : 0;
                              
                              if (!nf || peso <= 0) {
                                alert('Preencha a Nota Fiscal e o Peso Carregado corretamente!');
                                return;
                              }

                              atualizarConclusaoCarregamento(ordem.id, nf, peso, ordem.contrato_id || ordem.contratos_embarque?.id);
                            }}
                            className={`w-full text-xs font-bold py-2 rounded-lg mt-2 transition-colors shadow-md flex items-center justify-center gap-2 ${
                              processandoId === ordem.id 
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer shadow-green-900/20'
                            }`}
                          >
                            {processandoId === ordem.id ? (
                              <>
                                <Loader2 className="animate-spin" size={14} /> Processando baixa...
                              </>
                            ) : (
                              'Finalizar e Baixar do Contrato'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}