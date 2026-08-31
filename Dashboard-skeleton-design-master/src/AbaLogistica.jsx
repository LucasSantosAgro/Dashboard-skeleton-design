import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

export default function AbaLogistica() {
  const [tipoUsuario, setTipoUsuario] = useState('GESTOR'); // 'GESTOR' ou 'MOTORISTA'

  const [viagensFinalizadas, setViagensFinalizadas] = useState([]);
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Formulário Nova Viagem
  const [formViagem, setFormViagem] = useState({
    placa: '',
    operador: 'Lucas Santos',
    kmInicial: '',
    localCarregamento: '',
    clienteDestino: '',
    produto: '',
    pesoCarregado: ''
  });

  // Modais
  const [modalAbastecimentoAberto, setModalAbastecimentoAberto] = useState(false);
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [modalListaDespesasAberto, setModalListaDespesasAberto] = useState(false);
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [viagemSelecionada, setViagemSelecionada] = useState(null);

  // Formulários auxiliares
  const [formAbast, setFormAbast] = useState({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' });
  const [formDesp, setFormDesp] = useState({ tipo: 'Pedágio', valor: '', descricao: '' });
  const [formFim, setFormFim] = useState({ kmFinal: '', pesoDescarga: '', localDescarga: '' });

  useEffect(() => {
    carregarDadosSupabase();
  }, []);

  const carregarDadosSupabase = async () => {
    setCarregando(true);
    try {
      const { data: viagensData, error: errViagens } = await supabase
        .from('diario_bordo')
        .select(`
          *,
          despesas_viagem (*)
        `)
        .order('created_at', { ascending: false });

      if (errViagens) throw errViagens;

      if (viagensData) {
        const ativa = viagensData.find(v => v.status === 'EM_TRANSITO' || !v.status);
        const finalizadas = viagensData.filter(v => v.status === 'FINALIZADA');

        setViagemAtiva(ativa || null);
        setViagensFinalizadas(finalizadas);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do Supabase:', error.message);
    } finally {
      setCarregando(false);
    }
  };

  // Ações do Motorista: Iniciar Viagem
  const handleIniciarViagem = async (e) => {
    e.preventDefault();
    if (!formViagem.placa || !formViagem.kmInicial || !formViagem.localCarregamento) {
      alert('Preencha os campos obrigatórios da viagem.');
      return;
    }

    const novaViagemPayload = {
      placa: formViagem.placa,
      operador: formViagem.operador,
      km_inicial: Number(formViagem.kmInicial),
      local_carregamento: formViagem.localCarregamento,
      cliente_destino: formViagem.clienteDestino,
      produto: formViagem.produto,
      peso_carregado: Number(formViagem.pesoCarregado),
      status: 'EM_TRANSITO'
    };

    const { data, error } = await supabase
      .from('diario_bordo')
      .insert([novaViagemPayload])
      .select(`*, despesas_viagem (*)`);

    if (error) {
      alert('Erro ao iniciar viagem: ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      setViagemAtiva(data[0]);
      setFormViagem({ placa: '', operador: 'Lucas Santos', kmInicial: '', localCarregamento: '', clienteDestino: '', produto: '', pesoCarregado: '' });
    }
  };

  // Registrar Abastecimento
  const handleSalvarAbastecimento = async (e) => {
    e.preventDefault();
    if (!viagemAtiva) return;

    const payload = {
      km_abastecimento: Number(formAbast.kmAbastecimento),
      litros_combustivel: Number(formAbast.litrosCombustivel),
      valor_combustivel: Number(formAbast.valorCombustivel),
      posto_combustivel: formAbast.postoCombustivel,
      numero_nota_combustivel: formAbast.numeroNotaCombustivel
    };

    const { data, error } = await supabase
      .from('diario_bordo')
      .update(payload)
      .eq('id', viagemAtiva.id)
      .select(`*, despesas_viagem (*)`);

    if (error) {
      alert('Erro ao salvar abastecimento: ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      setViagemAtiva(data[0]);
      setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' });
      setModalAbastecimentoAberto(false);
    }
  };

  // Registrar Despesa
  const handleSalvarDespesa = async (e) => {
    e.preventDefault();
    if (!viagemAtiva) return;

    const payload = {
      viagem_id: viagemAtiva.id,
      tipo: formDesp.tipo,
      valor: Number(formDesp.valor),
      descricao: formDesp.descricao
    };

    const { data, error } = await supabase
      .from('despesas_viagem')
      .insert([payload])
      .select();

    if (error) {
      alert('Erro ao salvar despesa: ' + error.message);
      return;
    }

    if (data) {
      setViagemAtiva(prev => ({
        ...prev,
        despesas_viagem: [...(prev.despesas_viagem || []), data[0]]
      }));
      setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' });
      setModalDespesaAberto(false);
    }
  };

  // Concluir Viagem
  const handleConcluirViagem = async (e) => {
    e.preventDefault();
    const kmFinalNum = Number(formFim.kmFinal);
    const pesoDescNum = Number(formFim.pesoDescarga);

    if (kmFinalNum < viagemAtiva.km_inicial) {
      alert('O KM Final não pode ser menor que o KM Inicial.');
      return;
    }

    const dadosAtualizados = {
      km_final: kmFinalNum,
      peso_descarga: pesoDescNum,
      local_descarga: formFim.localDescarga,
      status: 'FINALIZADA'
    };

    const { error } = await supabase
      .from('diario_bordo')
      .update(dadosAtualizados)
      .eq('id', viagemAtiva.id);

    if (error) {
      alert('Erro ao finalizar viagem: ' + error.message);
      return;
    }

    const viagemConcluida = { ...viagemAtiva, ...dadosAtualizados };
    setViagensFinalizadas(prev => [viagemConcluida, ...prev]);
    setViagemAtiva(null);
    setModalFinalizarAberto(false);
    setFormFim({ kmFinal: '', pesoDescarga: '', localDescarga: '' });
  };

  // Excluir Viagem
  const handleExcluirViagem = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este registro do histórico?')) {
      return;
    }

    try {
      // Exclui primeiro as despesas associadas à viagem
      const { error: errDespesas } = await supabase
        .from('despesas_viagem')
        .delete()
        .eq('viagem_id', id);

      if (errDespesas) throw errDespesas;

      // Exclui a viagem da tabela principal
      const { error: errViagem } = await supabase
        .from('diario_bordo')
        .delete()
        .eq('id', id);

      if (errViagem) throw errViagem;

      // Atualiza o estado local removendo a viagem excluída
      setViagensFinalizadas(prev => prev.filter(v => v.id !== id));
      if (modalDetalhesAberto) {
        setModalDetalhesAberto(false);
        setViagemSelecionada(null);
      }
    } catch (error) {
      alert('Erro ao excluir registro: ' + error.message);
    }
  };

  // Cálculos do Dashboard Geral
  const totalViagens = viagensFinalizadas.length;
  const viagensEmTransitoCount = viagemAtiva ? 1 : 0;
  
  const kmTotalRodados = viagensFinalizadas.reduce((acc, v) => {
    const rodados = (v.km_final && v.km_inicial) ? (v.km_final - v.km_inicial) : 0;
    return acc + rodados;
  }, 0);

  const custoOperacionalTotal = viagensFinalizadas.reduce((acc, v) => {
    const combustivel = v.valor_combustivel || 0;
    const outrasDespesas = (v.despesas_viagem || []).reduce((sum, d) => sum + (d.valor || 0), 0);
    return acc + combustivel + outrasDespesas;
  }, 0);

  // KPIS POR PLACA (GESTÃO)
  const kpisPorPlaca = React.useMemo(() => {
    const mapa = {};
    viagensFinalizadas.forEach(v => {
      const placa = v.placa || 'N/D';
      if (!mapa[placa]) {
        mapa[placa] = {
          placa,
          qtdViagens: 0,
          kmTotal: 0,
          litrosTotal: 0,
          gastoCombustivelTotal: 0,
          gastoOutrasDespesas: 0,
          gastoTotal: 0
        };
      }
      mapa[placa].qtdViagens += 1;
      const kmRodados = (v.km_final && v.km_inicial) ? (v.km_final - v.km_inicial) : 0;
      mapa[placa].kmTotal += kmRodados;
      
      const valComb = v.valor_combustivel || 0;
      const litComb = v.litros_combustivel || 0;
      const valDesp = (v.despesas_viagem || []).reduce((sum, d) => sum + (d.valor || 0), 0);

      mapa[placa].gastoCombustivelTotal += valComb;
      mapa[placa].litrosTotal += litComb;
      mapa[placa].gastoOutrasDespesas += valDesp;
      mapa[placa].gastoTotal += (valComb + valDesp);
    });

    return Object.values(mapa).map(item => {
      const mediaKmPorLitro = item.litrosTotal > 0 ? (item.kmTotal / item.litrosTotal).toFixed(2) : '0.00';
      const custoMedioPorViagem = item.qtdViagens > 0 ? (item.gastoTotal / item.qtdViagens).toFixed(2) : '0.00';
      const combustivelMedioPorViagem = item.qtdViagens > 0 ? (item.gastoCombustivelTotal / item.qtdViagens).toFixed(2) : '0.00';
      const despesaMediaPorViagem = item.qtdViagens > 0 ? (item.gastoOutrasDespesas / item.qtdViagens).toFixed(2) : '0.00';

      return {
        ...item,
        mediaKmPorLitro,
        custoMedioPorViagem,
        combustivelMedioPorViagem,
        despesaMediaPorViagem
      };
    });
  }, [viagensFinalizadas]);

  if (carregando) {
    return <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>Carregando dados do Supabase...</div>;
  }

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'sans-serif', minHeight: '100vh', background: '#0b132b' }}>
      
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#1c2541', padding: '12px 20px', borderRadius: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            {tipoUsuario === 'GESTOR' ? '📊 Dashboard Logístico' : '🚚 Diário de Bordo'}
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {tipoUsuario === 'GESTOR' ? 'Visão Geral e KPIs da Frota' : 'Lançamento de Viagens e Operação'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: '#0b132b', padding: '4px', borderRadius: '6px', border: '1px solid #334155' }}>
          <button
            onClick={() => setTipoUsuario('GESTOR')}
            style={{
              background: tipoUsuario === 'GESTOR' ? '#2563eb' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            📊 Visão Gestor
          </button>
          <button
            onClick={() => setTipoUsuario('MOTORISTA')}
            style={{
              background: tipoUsuario === 'MOTORISTA' ? '#2563eb' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            🚚 Modo Motorista
          </button>
        </div>
      </div>

      {/* VISÃO EXCLUSIVA DO GESTOR */}
      {tipoUsuario === 'GESTOR' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div style={{ background: '#1c2541', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '14px' }}>Viagens em Trânsito</p>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#eab308' }}>{viagensEmTransitoCount}</h3>
            </div>
            <div style={{ background: '#1c2541', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '14px' }}>Viagens Finalizadas</p>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#60a5fa' }}>{totalViagens}</h3>
            </div>
            <div style={{ background: '#1c2541', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '14px' }}>KM Total Rodados</p>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#4ade80' }}>{kmTotalRodados.toLocaleString()} km</h3>
            </div>
            <div style={{ background: '#1c2541', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '14px' }}>Custo Operacional Total</p>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#f87171' }}>R$ {custoOperacionalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>

          <div style={{ marginBottom: '40px', background: '#131b2e', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#e2e8f0' }}>📊 Indicadores de Desempenho e Custos por Placa</h3>
            {kpisPorPlaca.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Nenhum dado registrado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '10px' }}>Placa</th>
                      <th style={{ padding: '10px' }}>Viagens</th>
                      <th style={{ padding: '10px' }}>KM Total</th>
                      <th style={{ padding: '10px' }}>Média Km/L</th>
                      <th style={{ padding: '10px' }}>Gasto Comb. / Viagem</th>
                      <th style={{ padding: '10px' }}>Despesas / Viagem</th>
                      <th style={{ padding: '10px' }}>Custo Médio Total / Viagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpisPorPlaca.map((kpi, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>{kpi.placa}</td>
                        <td style={{ padding: '12px' }}>{kpi.qtdViagens}</td>
                        <td style={{ padding: '12px' }}>{kpi.kmTotal.toLocaleString()} km</td>
                        <td style={{ padding: '12px', color: Number(kpi.mediaKmPorLitro) > 0 ? '#4ade80' : '#cbd5e1' }}>{kpi.mediaKmPorLitro} km/L</td>
                        <td style={{ padding: '12px', color: '#f87171' }}>R$ {Number(kpi.combustivelMedioPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px', color: '#fbbf24' }}>R$ {Number(kpi.despesaMediaPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#f43f5e' }}>R$ {Number(kpi.custoMedioPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* VISÃO EXCLUSIVA DO MOTORISTA */}
      {tipoUsuario === 'MOTORISTA' && (
        <>
          {!viagemAtiva ? (
            <div style={{ background: '#1c2541', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#e2e8f0' }}>🚀 Iniciar Novo Diário de Bordo</h3>
              <form onSubmit={handleIniciarViagem} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Placa</label>
                  <input type="text" placeholder="Ex: ABC-1234" value={formViagem.placa} onChange={e => setFormViagem({...formViagem, placa: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Operador / Motorista</label>
                  <input type="text" value={formViagem.operador} onChange={e => setFormViagem({...formViagem, operador: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>KM Inicial</label>
                  <input type="number" placeholder="Ex: 150000" value={formViagem.kmInicial} onChange={e => setFormViagem({...formViagem, kmInicial: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Local de Carregamento</label>
                  <input type="text" placeholder="Origem / Fazenda" value={formViagem.localCarregamento} onChange={e => setFormViagem({...formViagem, localCarregamento: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Cliente Destino</label>
                  <input type="text" placeholder="Cidade / Cliente" value={formViagem.clienteDestino} onChange={e => setFormViagem({...formViagem, clienteDestino: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Produto</label>
                  <input type="text" placeholder="Ex: Soja, Milho" value={formViagem.produto} onChange={e => setFormViagem({...formViagem, produto: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Peso Carregado (Kg)</label>
                  <input type="number" step="0.01" placeholder="Ex: 50000" value={formViagem.pesoCarregado} onChange={e => setFormViagem({...formViagem, pesoCarregado: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Iniciar Diário</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ background: '#1c2541', padding: '24px', borderRadius: '12px', border: '1px solid #3b82f6', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <span style={{ background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>EM TRÂNSITO</span>
                  <h3 style={{ margin: '8px 0 0 0', fontSize: '18px' }}>Veículo: {viagemAtiva.placa} ({viagemAtiva.produto || 'Carga Geral'})</h3>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setModalAbastecimentoAberto(true)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>⛽ Abastecimento</button>
                  <button onClick={() => setModalDespesaAberto(true)} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💰 + Despesa</button>
                  <button onClick={() => setModalListaDespesasAberto(true)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Ver Despesas ({viagemAtiva.despesas_viagem?.length || 0})</button>
                  <button onClick={() => setModalFinalizarAberto(true)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🏁 Finalizar Viagem</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', background: '#0b132b', padding: '15px', borderRadius: '8px', fontSize: '14px' }}>
                <div><span style={{ color: '#94a3b8' }}>Operador:</span> <br/><b>{viagemAtiva.operador || 'N/D'}</b></div>
                <div><span style={{ color: '#94a3b8' }}>KM Inicial:</span> <br/><b>{viagemAtiva.km_inicial} km</b></div>
                <div><span style={{ color: '#94a3b8' }}>Carregamento:</span> <br/><b>{viagemAtiva.local_carregamento}</b></div>
                <div><span style={{ color: '#94a3b8' }}>Destino:</span> <br/><b>{viagemAtiva.cliente_destino || 'Não informado'}</b></div>
                <div><span style={{ color: '#94a3b8' }}>Peso Inicial:</span> <br/><b>{viagemAtiva.peso_carregado ? `${viagemAtiva.peso_carregado} kg` : 'N/D'}</b></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* HISTÓRICO DE VIAGENS FINALIZADAS (COMPARTILHADO) */}
      <div style={{ background: '#1c2541', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#e2e8f0' }}>📖 Histórico de Diários Finalizados</h3>
        {viagensFinalizadas.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhuma viagem finalizada registrada.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px' }}>Placa</th>
                  <th style={{ padding: '12px' }}>Operador</th>
                  <th style={{ padding: '12px' }}>Produto / Origem</th>
                  <th style={{ padding: '12px' }}>KM Rodados</th>
                  <th style={{ padding: '12px' }}>Pesos (Carregado / Descarga)</th>
                  <th style={{ padding: '12px' }}>Dif. Peso</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {viagensFinalizadas.map(v => {
                  const kmRodados = (v.km_final && v.km_inicial) ? (v.km_final - v.km_inicial) : 0;
                  const difPeso = (v.peso_descarga && v.peso_carregado) ? (v.peso_descarga - v.peso_carregado) : 0;
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>{v.placa}</td>
                      <td style={{ padding: '12px' }}>{v.operador || 'N/D'}</td>
                      <td style={{ padding: '12px' }}>{v.produto || 'Geral'}<br/><span style={{ fontSize: '11px', color: '#94a3b8' }}>📍 {v.local_carregamento}</span></td>
                      <td style={{ padding: '12px' }}>{kmRodados} km</td>
                      <td style={{ padding: '12px' }}>{v.peso_carregado?.toLocaleString()} / {v.peso_descarga?.toLocaleString()} kg</td>
                      <td style={{ padding: '12px', color: difPeso < 0 ? '#f87171' : '#4ade80' }}>{difPeso} kg</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => { setViagemSelecionada(v); setModalDetalhesAberto(true); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Detalhes</button>
                          <button onClick={() => handleExcluirViagem(v.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAIS (ABASTECIMENTO, DESPESAS, FINALIZAR E DETALHES) */}
      {modalAbastecimentoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1c2541', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>⛽ Dados de Combustível</h3>
            <form onSubmit={handleSalvarAbastecimento}>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>KM Abastecimento</label><input type="number" step="0.1" value={formAbast.kmAbastecimento} onChange={e => setFormAbast({...formAbast, kmAbastecimento: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Litros</label><input type="number" step="0.01" value={formAbast.litrosCombustivel} onChange={e => setFormAbast({...formAbast, litrosCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Valor Total (R$)</label><input type="number" step="0.01" value={formAbast.valorCombustivel} onChange={e => setFormAbast({...formAbast, valorCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Posto de Combustível</label><input type="text" value={formAbast.postoCombustivel} onChange={e => setFormAbast({...formAbast, postoCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} /></div>
              <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Número da Nota</label><input type="text" value={formAbast.numeroNotaCombustivel} onChange={e => setFormAbast({...formAbast, numeroNotaCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalAbastecimentoAberto(false)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button><button type="submit" style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {modalDespesaAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1c2541', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>💰 Nova Despesa de Viagem</h3>
            <form onSubmit={handleSalvarDespesa}>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tipo</label><input type="text" placeholder="Ex: Pedágio, Borracharia" value={formDesp.tipo} onChange={e => setFormDesp({...formDesp, tipo: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Valor (R$)</label><input type="number" step="0.01" value={formDesp.valor} onChange={e => setFormDesp({...formDesp, valor: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required /></div>
              <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Descrição</label><input type="text" value={formDesp.descricao} onChange={e => setFormDesp({...formDesp, descricao: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalDespesaAberto(false)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button><button type="submit" style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {modalListaDespesasAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1c2541', padding: '30px', borderRadius: '12px', width: '500px', border: '1px solid #334155', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>💰 Despesas Vinculadas</h3>
            {(!viagemAtiva?.despesas_viagem || viagemAtiva.despesas_viagem.length === 0) ? (
              <p style={{ color: '#94a3b8' }}>Nenhuma despesa registrada.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead><tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}><th style={{ padding: '8px' }}>Tipo</th><th style={{ padding: '8px' }}>Descrição</th><th style={{ padding: '8px' }}>Valor</th></tr></thead>
                <tbody>
                  {viagemAtiva.despesas_viagem.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '8px' }}>{d.tipo}</td><td style={{ padding: '8px' }}>{d.descricao || '-'}</td><td style={{ padding: '8px', color: '#f87171' }}>R$ {Number(d.valor).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: '20px', textAlign: 'right' }}><button onClick={() => setModalListaDespesasAberto(false)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Fechar</button></div>
          </div>
        </div>
      )}

      {modalFinalizarAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1c2541', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>🏁 Finalizar Diário de Bordo</h3>
            <form onSubmit={handleConcluirViagem}>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>KM Final (Inicial: {viagemAtiva?.km_inicial})</label><input type="number" value={formFim.kmFinal} onChange={e => setFormFim({...formFim, kmFinal: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} required /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Local de Descarga</label><input type="text" value={formFim.localDescarga} onChange={e => setFormFim({...formFim, localDescarga: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} /></div>
              <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Peso de Descarga (Kg)</label><input type="number" step="0.01" value={formFim.pesoDescarga} onChange={e => setFormFim({...formFim, pesoDescarga: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}><button type="button" onClick={() => setModalFinalizarAberto(false)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button><button type="submit" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Concluir</button></div>
            </form>
          </div>
        </div>
      )}

      {modalDetalhesAberto && viagemSelecionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1c2541', padding: '30px', borderRadius: '12px', width: '600px', border: '1px solid #334155', maxHeight: '85vh', overflowY: 'auto', color: '#fff' }}>
            <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>Detalhes do Diário - {viagemSelecionada.placa}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px', marginBottom: '20px' }}>
              <div><b>Operador:</b> {viagemSelecionada.operador || 'N/D'}</div>
              <div><b>KM Rodados:</b> {(viagemSelecionada.km_final && viagemSelecionada.km_inicial) ? (viagemSelecionada.km_final - viagemSelecionada.km_inicial) : 'N/D'} km</div>
              <div><b>Carregamento:</b> {viagemSelecionada.local_carregamento}</div>
              <div><b>Descarga:</b> {viagemSelecionada.local_descarga || 'N/D'}</div>
              <div><b>Produto:</b> {viagemSelecionada.produto || 'N/D'}</div>
              <div><b>Destino:</b> {viagemSelecionada.cliente_destino || 'N/D'}</div>
              <div><b>Peso Carregado:</b> {viagemSelecionada.peso_carregado?.toLocaleString()} kg</div>
              <div><b>Peso Descarga:</b> {viagemSelecionada.peso_descarga?.toLocaleString()} kg</div>
            </div>

            <h4 style={{ color: '#0ea5e9', marginBottom: '8px' }}>Combustível</h4>
            <div style={{ background: '#0b132b', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              <div><b>Posto:</b> {viagemSelecionada.posto_combustivel || 'Não informado'}</div>
              <div><b>Litros:</b> {viagemSelecionada.litros_combustivel || 0} L</div>
              <div><b>Valor Total:</b> R$ {(viagemSelecionada.valor_combustivel || 0).toFixed(2)}</div>
            </div>

            <h4 style={{ color: '#fbbf24', marginBottom: '8px' }}>Despesas Adicionais</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
              <thead><tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}><th style={{ padding: '6px' }}>Tipo</th><th style={{ padding: '6px' }}>Descrição</th><th style={{ padding: '6px' }}>Valor</th></tr></thead>
              <tbody>
                {(viagemSelecionada.despesas_viagem || []).map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '6px' }}>{d.tipo}</td><td style={{ padding: '6px' }}>{d.descricao || '-'}</td><td style={{ padding: '6px', color: '#f87171' }}>R$ {Number(d.valor).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button onClick={() => setModalDetalhesAberto(false)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}