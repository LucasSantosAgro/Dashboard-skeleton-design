'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, X, BarChart3, CheckCircle2, Clock, Filter } from 'lucide-react';

const COLUNAS_PATIO = [
  { id: 'aguardando', titulo: 'Aguardando Chegada', cor: 'border-yellow-500 text-yellow-400' },
  { id: 'em_patio', titulo: 'Em Pátio / Triagem', cor: 'border-blue-500 text-blue-400' },
  { id: 'carregando', titulo: 'Carregando', cor: 'border-purple-500 text-purple-400' },
  { id: 'concluido', titulo: 'Concluído / Saída', cor: 'border-green-500 text-green-400' }
];

export function KanbanPatio() {
  const [ordens, setOrdens] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  
  const [filtroCnpj, setFiltroCnpj] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');

  const [modalAtivosAberto, setModalAtivosAberto] = useState(false);
  const [modalFinalizadosAberto, setModalFinalizadosAberto] = useState(false);
  const [contratoSelecionadoFiltro, setContratoSelecionadoFiltro] = useState(null);

  const processandoRef = useRef({});

  const buscarDados = useCallback(async () => {
    const { data: ordensData, error: erroOrdens } = await supabase
      .from('ordens_carregamento')
      .select('*, contratos_embarque(id, numero_contrato, quantidade_disponivel, produto, status, cliente, cnpj_cliente)')
      .order('created_at', { ascending: true });

    if (!erroOrdens && ordensData) setOrdens(ordensData);

    const { data: contratosData, error: erroContratos } = await supabase
      .from('contratos_embarque')
      .select('*');

    if (!erroContratos && contratosData) setContratos(contratosData);

    setCarregando(false);
  }, []);

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

    if (error) buscarDados();
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
        buscarDados();
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
        buscarDados();
        return;
      }

      const { data: contrato, error: erroBusca } = await supabase
        .from('contratos_embarque')
        .select('quantidade_disponivel, numero_contrato')
        .eq('id', idContratoReal)
        .single();

      if (erroBusca || !contrato) {
        console.error('Erro ao buscar contrato:', erroBusca);
        alert('Ordem finalizada, mais houve um erro ao localizar o contrato vinculado.');
        return;
      }

      const saldoAtual = Number(contrato.quantidade_disponivel) || 0;
      const novoSaldo = saldoAtual - pesoNumerico;
      const novoStatusContrato = novoSaldo <= 0 ? 'Finalizado' : 'Ativo';

      const { error: erroAtualizacaoContrato } = await supabase
        .from('contratos_embarque')
        .update({ 
          quantidade_disponivel: novoSaldo,
          status: novoStatusContrato
        })
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

      if (novoSaldo <= 0) {
        mensagem += `\n\n🔒 CONTRATO FINALIZADO AUTOMATICAMENTE!`;
      } else if (novoSaldo < 100000) {
        mensagem += `\n\n⚠️ ATENÇÃO: O saldo deste contrato está abaixo de 100.000 Kg!`;
      }

      alert(mensagem);

      setOrdens((prev) =>
        prev.map((ordem) => (ordem.id === id ? { ...ordem, ...dadosUpdateOrdem } : ordem))
      );
      buscarDados();
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
    buscarDados();

    const canalOrdens = supabase
      .channel('mudancas-patio')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordens_carregamento' },
        () => { buscarDados(); }
      )
      .subscribe();

    const canalContratos = supabase
      .channel('mudancas-contratos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos_embarque' },
        () => { buscarDados(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalOrdens);
      supabase.removeChannel(canalContratos);
    };
  }, [buscarDados]);

  const contratosAtivos = contratos.filter(c => c.status !== 'Finalizado' && Number(c.quantidade_disponivel) > 0);
  const contratosFinalizados = contratos.filter(c => c.status === 'Finalizado' || Number(c.quantidade_disponivel) <= 0);

  const ordensFiltradasParaGrafico = ordens.filter(ordem => {
    if (contratoSelecionadoFiltro) {
      const matchContrato = 
        ordem.contratos_embarque?.id === contratoSelecionadoFiltro || 
        ordem.contrato_id === contratoSelecionadoFiltro;
      if (!matchContrato) return false;
    }

    if (ordem.status === 'concluido') {
      if (filtroCnpj && !((ordem.cnpj_transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase()) || (ordem.transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase()))) {
        return false;
      }
      if (filtroContrato && !((ordem.contratos_embarque?.numero_contrato || '').toLowerCase().includes(filtroContrato.toLowerCase()))) {
        return false;
      }
      if (filtroProduto && !((ordem.contratos_embarque?.produto || '').toLowerCase().includes(filtroProduto.toLowerCase()))) {
        return false;
      }
    }
    return true;
  });

  const dadosGraficoProdutos = {};
  ordensFiltradasParaGrafico.forEach(ordem => {
    if (ordem.status === 'concluido' && ordem.peso_carregado) {
      const produto = ordem.contratos_embarque?.produto || ordem.produto || 'Não especificado';
      const peso = Number(ordem.peso_carregado) || 0;
      dadosGraficoProdutos[produto] = (dadosGraficoProdutos[produto] || 0) + peso;
    }
  });

  const produtosArrayGrafico = Object.keys(dadosGraficoProdutos).map(prod => ({
    produto: prod,
    peso: dadosGraficoProdutos[prod]
  }));

  const maiorPesoGrafico = Math.max(...produtosArrayGrafico.map(p => p.peso), 1);

  if (carregando) {
    return (
      <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" size={20} /> Carregando pátio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          onClick={() => setModalAtivosAberto(true)}
          className="bg-[#161B23] p-4 rounded-xl border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer shadow-md flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Contratos Ativos</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">{contratosAtivos.length}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Clique para ver dados e filtrar</p>
          </div>
          <div className="p-3 bg-blue-950/40 text-blue-400 border border-blue-500/20 rounded-xl">
            <Clock size={24} />
          </div>
        </div>

        <div 
          onClick={() => setModalFinalizadosAberto(true)}
          className="bg-[#161B23] p-4 rounded-xl border border-white/5 hover:border-green-500/50 transition-all cursor-pointer shadow-md flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-green-400">Contratos Finalizados</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">{contratosFinalizados.length}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Clique para ver dados e filtrar</p>
          </div>
          <div className="p-3 bg-green-950/40 text-green-400 border border-green-500/20 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {contratoSelecionadoFiltro && (
        <div className="bg-blue-950/30 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-blue-400" />
            <span>Filtrando pelo Contrato ID: <strong className="text-white">{contratoSelecionadoFiltro}</strong></span>
          </div>
          <button 
            onClick={() => setContratoSelecionadoFiltro(null)}
            className="text-gray-400 hover:text-white underline cursor-pointer"
          >
            Limpar Filtro de Contrato
          </button>
        </div>
      )}

      <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={18} />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Quantidade de Produtos Embarcados (Kg)</h3>
          </div>
          <span className="text-xs text-gray-400">Ajusta-se conforme filtros e contratos selecionados</span>
        </div>

        {produtosArrayGrafico.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-6 border border-dashed border-white/5 rounded-lg">
            Nenhum produto embarcado encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {produtosArrayGrafico.map((item) => {
              const porcentagem = (item.peso / maiorPesoGrafico) * 100;
              return (
                <div key={item.produto} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-white">{item.produto}</span>
                    <span className="text-green-400 font-bold">{item.peso.toLocaleString('pt-BR')} Kg</span>
                  </div>
                  <div className="w-full bg-[#1A2030] h-3 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-green-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(porcentagem, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUNAS_PATIO.map((coluna) => {
          let ordensColuna = ordens.filter((o) => o.status === coluna.id);

          if (contratoSelecionadoFiltro) {
            ordensColuna = ordensColuna.filter((o) => 
              o.contratos_embarque?.id === contratoSelecionadoFiltro || o.contrato_id === contratoSelecionadoFiltro
            );
          }

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

      {modalAtivosAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161B23] border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-base">Contratos Ativos ({contratosAtivos.length})</h3>
              <button onClick={() => setModalAtivosAberto(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {contratosAtivos.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-6">Nenhum contrato ativo no momento.</p>
              ) : (
                contratosAtivos.map(c => (
                  <div key={c.id} className="bg-[#1A2030] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-400 text-sm">Contrato: {c.numero_contrato}</span>
                        <span className="bg-blue-950/60 text-blue-300 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded font-medium">{c.produto}</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">Cliente: <strong className="text-white">{c.cliente}</strong></p>
                      {c.cnpj_cliente && <p className="text-xs text-gray-400">CNPJ: {c.cnpj_cliente}</p>}
                      <p className="text-xs text-green-400 mt-0.5">Disponível: <strong>{Number(c.quantidade_disponivel).toLocaleString('pt-BR')} Kg</strong></p>
                    </div>
                    <button
                      onClick={() => {
                        setContratoSelecionadoFiltro(c.id);
                        setModalAtivosAberto(false);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer w-full sm:w-auto text-center"
                    >
                      Filtrar por este
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {modalFinalizadosAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161B23] border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-base">Contratos Finalizados ({contratosFinalizados.length})</h3>
              <button onClick={() => setModalFinalizadosAberto(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {contratosFinalizados.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-6">Nenhum contrato finalizado no momento.</p>
              ) : (
                contratosFinalizados.map(c => (
                  <div key={c.id} className="bg-[#1A2030] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-400 text-sm">Contrato: {c.numero_contrato}</span>
                        <span className="bg-green-950/60 text-green-300 border border-green-500/20 text-[10px] px-2 py-0.5 rounded font-medium">{c.produto}</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">Cliente: <strong className="text-white">{c.cliente}</strong></p>
                      {c.cnpj_cliente && <p className="text-xs text-gray-400">CNPJ: {c.cnpj_cliente}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">Saldo Final: <strong>{Number(c.quantidade_disponivel).toLocaleString('pt-BR')} Kg</strong></p>
                    </div>
                    <button
                      onClick={() => {
                        setContratoSelecionadoFiltro(c.id);
                        setModalFinalizadosAberto(false);
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer w-full sm:w-auto text-center"
                    >
                      Filtrar por este
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}