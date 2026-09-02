import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';

export default function AbaLogistica() {
  const [tipoUsuario, setTipoUsuario] = useState('GESTOR'); 
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  const [viagensFinalizadas, setViagensFinalizadas] = useState([]);
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [viagensEmTransitoList, setViagensEmTransitoList] = useState([]); 
  const [carregando, setCarregando] = useState(true);

  // Controle de Hover em CSS Inline
  const [isHoveredCardEmTransito, setIsHoveredCardEmTransito] = useState(false);
  const [isHoveredCardCustoTotal, setIsHoveredCardCustoTotal] = useState(false);

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
  const [modalEmTransitoAberto, setModalEmTransitoAberto] = useState(false); 
  const [modalCustoTotalAberto, setModalCustoTotalAberto] = useState(false);
  const [viagemSelecionada, setViagemSelecionada] = useState(null);

  // Filtros
  const [filtroEmTransitoBusca, setFiltroEmTransitoBusca] = useState(''); 

  // Formulários auxiliares
  const [formAbast, setFormAbast] = useState({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' });
  const [formDesp, setFormDesp] = useState({ tipo: 'Pedágio', valor: '', descricao: '' });
  const [formFim, setFormFim] = useState({ kmFinal: '', pesoDescarga: '', localDescarga: '' });

  useEffect(() => {
    verificarUsuarioEObterDados();
  }, []);

  const verificarUsuarioEObterDados = async () => {
    setCarregando(true);
    try {
      // 1. Obter usuário logado no Supabase
      const { data: { user } } = await supabase.auth.getUser();
      setUsuarioAtual(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role || user.user_metadata?.role || 'MOTORISTA';
        setTipoUsuario(role.toUpperCase() === 'GESTOR' ? 'GESTOR' : 'MOTORISTA');
      }

      // 2. Carregar Diários de Bordo
      const { data: viagensData, error: errViagens } = await supabase
        .from('diario_bordo')
        .select(`
          *,
          despesas_viagem (*)
        `)
        .order('created_at', { ascending: false });

      if (errViagens) throw errViagens;

      if (viagensData) {
        const emTransito = viagensData.filter(v => v.status === 'EM_TRANSITO' || !v.status);
        const finalizadas = viagensData.filter(v => v.status === 'FINALIZADA');

        setViagemAtiva(emTransito.length > 0 ? emTransito[0] : null); 
        setViagensEmTransitoList(emTransito); 
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
      setViagensEmTransitoList(prev => [data[0], ...prev]);
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

    if (data && data.length > 0) {
      setViagemAtiva(prev => ({
        ...prev,
        despesas_viagem: [...(prev.despesas_viagem || []), ...data]
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
    setViagensEmTransitoList(prev => prev.filter(v => v.id !== viagemAtiva.id));
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
      const { error: errDespesas } = await supabase
        .from('despesas_viagem')
        .delete()
        .eq('viagem_id', id);

      if (errDespesas) throw errDespesas;

      const { error: errViagem } = await supabase
        .from('diario_bordo')
        .delete()
        .eq('id', id);

      if (errViagem) throw errViagem;

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
  const viagensEmTransitoCount = viagensEmTransitoList.length;
  
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
  const kpisPorPlaca = useMemo(() => {
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

  // Cálculos do Card do Motorista
  const totalGastoAbastecimento = viagemAtiva?.valor_combustivel || 0;
  const totalLitrosAbastecimento = viagemAtiva?.litros_combustivel || 0;
  const totalGastoOutrasDespesas = (viagemAtiva?.despesas_viagem || []).reduce((acc, d) => acc + (d.valor || 0), 0);
  const qtdOutrasDespesas = viagemAtiva?.despesas_viagem?.length || 0;

  // Filtro de Busca Modal Em Trânsito Protegido
  const viagensEmTransitoFiltradas = viagensEmTransitoList.filter(v => {
    const placaStr = v.placa ? String(v.placa).toLowerCase() : '';
    const operadorStr = v.operador ? String(v.operador).toLowerCase() : '';
    const busca = filtroEmTransitoBusca.toLowerCase();
    return placaStr.includes(busca) || operadorStr.includes(busca);
  });

  return (
    <div style={{ padding: '24px', color: '#fff', fontFamily: 'sans-serif', minHeight: '100vh', background: '#0b132b' }}>
      
      {/* Cabeçalho */}
      <div style={{ marginBottom: '20px', background: '#1c2541', padding: '16px 20px', borderRadius: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>
          {tipoUsuario === 'GESTOR' ? '📊 Dashboard Logístico' : '🚚 Diário de Bordo'}
        </h2>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          {tipoUsuario === 'GESTOR' ? 'Visão Geral e KPIs da Frota' : 'Lançamento de Viagens e Operação'}
        </span>
      </div>

      {/* VISÃO EXCLUSIVA DO GESTOR */}
      {tipoUsuario === 'GESTOR' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div 
              onClick={() => setModalEmTransitoAberto(true)} 
              onMouseEnter={() => setIsHoveredCardEmTransito(true)}
              onMouseLeave={() => setIsHoveredCardEmTransito(false)}
              style={{ 
                background: '#1c2541', 
                padding: '20px', 
                borderRadius: '12px', 
                border: `1px solid ${isHoveredCardEmTransito ? '#eab308' : '#334155'}`, 
                cursor: 'pointer', 
                transition: '0.2s' 
              }}
            >
              <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '14px' }}>Viagens em Trânsito</p>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px' }}>👆 Clique para detalhes</span>
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
            <div 
              onClick={() => setModalCustoTotalAberto(true)}
              onMouseEnter={() => setIsHoveredCardCustoTotal(true)}
              onMouseLeave={() => setIsHoveredCardCustoTotal(false)}
              style={{ 
                background: '#1c2541', 
                padding: '20px', 
                borderRadius: '12px', 
                border: `1px solid ${isHoveredCardCustoTotal ? '#f87171' : '#334155'}`, 
                cursor: 'pointer',
                transition: '0.2s'
              }}
            >
              <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '14px' }}>Custo Operacional Total</p>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px' }}>👆 Clique para ver por placa</span>
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
            /* Layout Viagem Ativa */
            <div style={{ background: '#161e31', padding: '20px', borderRadius: '12px', border: '1px solid #23304a', marginBottom: '30px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  VIAGEM EM TRÂNSITO
                </span>
                <span style={{ color: '#64748b', fontSize: '13px' }}>ID #{viagemAtiva.id}</span>
              </div>

              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#cbd5e1', fontWeight: 'normal' }}>
                Placa: <strong style={{ color: '#38bdf8' }}>{viagemAtiva.placa}</strong> | Motorista: <strong style={{ color: '#38bdf8' }}>{(viagemAtiva.operador || 'LUCAS SANTOS').toUpperCase()}</strong>
              </h3>

              <div style={{ background: '#0e1626', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '13px', marginBottom: '12px' }}>
                  <div>📍 <strong>Embarque:</strong> {viagemAtiva.local_carregamento}</div>
                  <div>🎯 <strong>Destino:</strong> {viagemAtiva.cliente_destino || 'N/D'}</div>
                  <div>📦 <strong>Produto:</strong> {viagemAtiva.produto || 'N/D'}</div>
                  <div>⚖️ <strong>Peso Carga:</strong> {viagemAtiva.peso_carregado || '0'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  🏎️ <strong>KM Inicial:</strong> {viagemAtiva.km_inicial} km
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                
                {/* Card Abastecimentos */}
                <div style={{ border: '1px solid #d97706', borderRadius: '8px', padding: '16px', background: '#0e1626' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '14px' }}>
                      ⛽ Abastecimentos ({viagemAtiva.valor_combustivel ? 1 : 0})
                    </span>
                    <button onClick={() => setModalAbastecimentoAberto(true)} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                      Ver / Editar
                    </button>
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    <div><strong>Total Gasto:</strong> R$ {totalGastoAbastecimento.toFixed(2)}</div>
                    <div><strong>Total Litros:</strong> {totalLitrosAbastecimento.toFixed(2)} L</div>
                  </div>
                </div>

                {/* Card Outros Gastos */}
                <div style={{ border: '1px solid #9333ea', borderRadius: '8px', padding: '16px', background: '#0e1626' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '14px' }}>
                      💸 Outros Gastos ({qtdOutrasDespesas})
                    </span>
                    <button onClick={() => setModalListaDespesasAberto(true)} style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                      Ver / Editar
                    </button>
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    <div><strong>Total Gastos:</strong> R$ {totalGastoOutrasDespesas.toFixed(2)}</div>
                  </div>
                </div>

              </div>

              {/* Botões Inferiores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <button onClick={() => setModalAbastecimentoAberto(true)} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  ⛽ + Novo Abastecimento
                </button>
                <button onClick={() => setModalDespesaAberto(true)} style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  💸 + Nova Despesa
                </button>
                <button onClick={() => setModalFinalizarAberto(true)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  🏁 Finalizar Viagem
                </button>
              </div>

            </div>
          )}
        </>
      )}

      {/* HISTÓRICO DE VIAGENS FINALIZADAS */}
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

      {/* MODAL - CUSTO OPERACIONAL TOTAL POR PLACA (GESTÃO) */}
      {modalCustoTotalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161e31', padding: '24px', borderRadius: '12px', width: '750px', border: '1px solid #23304a', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#f87171', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💰 Detalhamento de Custo Operacional por Placa
              </h3>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {kpisPorPlaca.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nenhum custo registrado em viagens finalizadas.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '12px' }}>Placa</th>
                      <th style={{ padding: '12px' }}>Qtd. Viagens</th>
                      <th style={{ padding: '12px' }}>Gasto Combustível</th>
                      <th style={{ padding: '12px' }}>Outras Despesas</th>
                      <th style={{ padding: '12px' }}>Custo Total Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpisPorPlaca.map((kpi, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>{kpi.placa}</td>
                        <td style={{ padding: '12px' }}>{kpi.qtdViagens}</td>
                        <td style={{ padding: '12px', color: '#f87171' }}>R$ {kpi.gastoCombustivelTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px', color: '#fbbf24' }}>R$ {kpi.gastoOutrasDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#f43f5e' }}>R$ {kpi.gastoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <button onClick={() => setModalCustoTotalAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - VIAGENS EM TRÂNSITO (GESTOR) */}
      {modalEmTransitoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161e31', padding: '24px', borderRadius: '12px', width: '800px', border: '1px solid #23304a', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#eab308', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚚 Frota em Trânsito ({viagensEmTransitoCount})
              </h3>
              <input 
                type="text" 
                placeholder="Filtrar por placa ou motorista..." 
                value={filtroEmTransitoBusca}
                onChange={(e) => setFiltroEmTransitoBusca(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0e1626', color: '#fff', width: '250px' }}
              />
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {viagensEmTransitoFiltradas.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nenhuma viagem ativa encontrada no filtro.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '12px' }}>Placa</th>
                      <th style={{ padding: '12px' }}>Motorista</th>
                      <th style={{ padding: '12px' }}>Origem</th>
                      <th style={{ padding: '12px' }}>Destino / Produto</th>
                      <th style={{ padding: '12px' }}>KM Inicial</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viagensEmTransitoFiltradas.map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#eab308' }}>{v.placa}</td>
                        <td style={{ padding: '12px', color: '#cbd5e1' }}>{v.operador || 'N/D'}</td>
                        <td style={{ padding: '12px' }}>{v.local_carregamento}</td>
                        <td style={{ padding: '12px' }}>{v.cliente_destino || 'N/D'} <br/><span style={{ fontSize: '12px', color: '#64748b' }}>{v.produto}</span></td>
                        <td style={{ padding: '12px' }}>{v.km_inicial}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => { 
                              setViagemSelecionada(v); 
                              setModalDetalhesAberto(true); 
                            }} 
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <button onClick={() => setModalEmTransitoAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR ABASTECIMENTO */}
      {modalAbastecimentoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161e31', padding: '24px', borderRadius: '12px', width: '420px', border: '1px solid #23304a' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f59e0b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⛽ Adicionar Abastecimento
            </h3>
            <form onSubmit={handleSalvarAbastecimento}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Posto de Combustível</label>
                <input type="text" placeholder="Nome do Posto" value={formAbast.postoCombustivel} onChange={e => setFormAbast({...formAbast, postoCombustivel: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Número da Nota Fiscal</label>
                <input type="text" placeholder="Nº NF" value={formAbast.numeroNotaCombustivel} onChange={e => setFormAbast({...formAbast, numeroNotaCombustivel: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Valor Total (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formAbast.valorCombustivel} onChange={e => setFormAbast({...formAbast, valorCombustivel: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Litros</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formAbast.litrosCombustivel} onChange={e => setFormAbast({...formAbast, litrosCombustivel: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>KM do Abastecimento</label>
                <input type="number" step="0.1" placeholder="Ex: 150250" value={formAbast.kmAbastecimento} onChange={e => setFormAbast({...formAbast, kmAbastecimento: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Foto da Nota Fiscal</label>
                <input type="file" accept="image/*" style={{ fontSize: '12px', color: '#94a3b8' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button type="submit" style={{ background: '#d97706', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Salvar</button>
                <button type="button" onClick={() => setModalAbastecimentoAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DESPESAS */}
      {modalDespesaAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161e31', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid #23304a' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#c084fc' }}>💸 Nova Despesa de Viagem</h3>
            <form onSubmit={handleSalvarDespesa}>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Tipo</label><input type="text" placeholder="Ex: Pedágio, Borracharia" value={formDesp.tipo} onChange={e => setFormDesp({...formDesp, tipo: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required /></div>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Valor (R$)</label><input type="number" step="0.01" value={formDesp.valor} onChange={e => setFormDesp({...formDesp, valor: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required /></div>
              <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Descrição</label><input type="text" value={formDesp.descricao} onChange={e => setFormDesp({...formDesp, descricao: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><button type="submit" style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button><button type="button" onClick={() => setModalDespesaAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE DESPESAS */}
      {modalListaDespesasAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161e31', padding: '24px', borderRadius: '12px', width: '500px', border: '1px solid #23304a', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>💸 Despesas Vinculadas</h3>
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
            <div style={{ marginTop: '20px', textAlign: 'right' }}><button onClick={() => setModalListaDespesasAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Fechar</button></div>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR VIAGEM */}
      {modalFinalizarAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161e31', padding: '24px', borderRadius: '12px', width: '420px', border: '1px solid #23304a' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#22c55e', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏁 Finalizar Viagem
            </h3>
            <form onSubmit={handleConcluirViagem}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>KM Final de Chegada</label>
                <input type="number" placeholder="KM Chegada" value={formFim.kmFinal} onChange={e => setFormFim({...formFim, kmFinal: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Local Descarga</label>
                <input type="text" placeholder="Local de destino / Descarga" value={formFim.localDescarga} onChange={e => setFormFim({...formFim, localDescarga: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Peso Descarga</label>
                <input type="number" step="0.01" placeholder="Ex: 25000" value={formFim.pesoDescarga} onChange={e => setFormFim({...formFim, pesoDescarga: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', fontWeight: 'bold' }}>Comprovante de Descarga (Foto)</label>
                <input type="file" accept="image/*" style={{ fontSize: '12px', color: '#94a3b8' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Finalizar</button>
                <button type="button" onClick={() => setModalFinalizarAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {modalDetalhesAberto && viagemSelecionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161e31', padding: '30px', borderRadius: '12px', width: '600px', border: '1px solid #23304a', maxHeight: '85vh', overflowY: 'auto', color: '#fff' }}>
            <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>Detalhes do Diário - {viagemSelecionada.placa}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px', marginBottom: '20px' }}>
              <div><b>Operador:</b> {viagemSelecionada.operador || 'N/D'}</div>
              <div><b>Status:</b> {viagemSelecionada.status === 'EM_TRANSITO' ? 'Em Trânsito 🚚' : 'Finalizada 🏁'}</div>
              <div><b>KM Rodados:</b> {(viagemSelecionada.km_final && viagemSelecionada.km_inicial) ? (viagemSelecionada.km_final - viagemSelecionada.km_inicial) : 'N/D'} km</div>
              <div><b>Carregamento:</b> {viagemSelecionada.local_carregamento}</div>
              <div><b>Descarga:</b> {viagemSelecionada.local_descarga || 'N/D'}</div>
              <div><b>Produto:</b> {viagemSelecionada.produto || 'N/D'}</div>
              <div><b>Destino:</b> {viagemSelecionada.cliente_destino || 'N/D'}</div>
              <div><b>Peso Carregado:</b> {viagemSelecionada.peso_carregado?.toLocaleString()} kg</div>
              <div><b>Peso Descarga:</b> {viagemSelecionada.peso_descarga?.toLocaleString()} kg</div>
            </div>

            <h4 style={{ color: '#0ea5e9', marginBottom: '8px' }}>Combustível / Abastecimentos</h4>
            <div style={{ background: '#0e1626', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              <div><b>Posto:</b> {viagemSelecionada.posto_combustivel || 'Não informado'}</div>
              <div><b>Nº NF:</b> {viagemSelecionada.numero_nota_combustivel || 'Não informado'}</div>
              <div><b>KM Abastecimento:</b> {viagemSelecionada.km_abastecimento || 'Não informado'}</div>
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
              <button onClick={() => setModalDetalhesAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}