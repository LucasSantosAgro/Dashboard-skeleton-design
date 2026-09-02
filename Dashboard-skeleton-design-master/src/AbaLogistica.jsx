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
    pesoCarregado: '',
    notaFiscal: ''
  });

  // Modais
  const [modalAbastecimentoAberto, setModalAbastecimentoAberto] = useState(false);
  const [modalListaAbastecimentosAberto, setModalListaAbastecimentosAberto] = useState(false);
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [modalListaDespesasAberto, setModalListaDespesasAberto] = useState(false);
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalEmTransitoAberto, setModalEmTransitoAberto] = useState(false); 
  const [modalCustoTotalAberto, setModalCustoTotalAberto] = useState(false);
  const [viagemSelecionada, setViagemSelecionada] = useState(null);

  // Estados para Edição Existente
  const [despesaEditandoId, setDespesaEditandoId] = useState(null);
  const [abastecimentoEditandoId, setAbastecimentoEditandoId] = useState(null);

  // Filtros
  const [filtroEmTransitoBusca, setFiltroEmTransitoBusca] = useState(''); 

  // Filtros do Gestor
  const [filtroModo, setFiltroModo] = useState('TODOS');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroPlacaGestor, setFiltroPlacaGestor] = useState('');

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
      const { data: { user } } = await supabase.auth.getUser();
      setUsuarioAtual(user);

      let currentRole = 'MOTORISTA';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role || user.user_metadata?.role || 'MOTORISTA';
        currentRole = role.toUpperCase() === 'GESTOR' ? 'GESTOR' : 'MOTORISTA';
        setTipoUsuario(currentRole);
      }

      let query = supabase
        .from('diario_bordo')
        .select(`
          *,
          despesas_viagem (*),
          abastecimentos_viagem (*)
        `)
        .order('created_at', { ascending: false });

      const { data: viagensData, error: errViagens } = await query;

      if (errViagens) throw errViagens;

      if (viagensData) {
        let emTransito = viagensData.filter(v => v.status === 'EM_TRANSITO' || !v.status);
        let finalizadas = viagensData.filter(v => v.status === 'FINALIZADA');

        if (currentRole === 'MOTORISTA' && user) {
          finalizadas = finalizadas.filter(v => v.user_id === user.id || v.operador === formViagem.operador);
          emTransito = emTransito.filter(v => v.user_id === user.id || v.operador === formViagem.operador);
        }

        const ativa = emTransito.length > 0 ? emTransito[0] : null;
        setViagemAtiva(ativa); 
        setViagensEmTransitoList(emTransito); 
        setViagensFinalizadas(finalizadas);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do Supabase:', error.message);
    } finally {
      setCarregando(false);
    }
  };

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
      nota_fiscal: formViagem.notaFiscal,
      status: 'EM_TRANSITO',
      user_id: usuarioAtual?.id || null
    };

    const { data, error } = await supabase
      .from('diario_bordo')
      .insert([novaViagemPayload])
      .select(`*, despesas_viagem (*), abastecimentos_viagem (*)`);

    if (error) {
      alert('Erro ao iniciar viagem: ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      setViagemAtiva(data[0]);
      setViagensEmTransitoList(prev => [data[0], ...prev]);
      setFormViagem({ placa: '', operador: 'Lucas Santos', kmInicial: '', localCarregamento: '', clienteDestino: '', produto: '', pesoCarregado: '', notaFiscal: '' });
      setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' });
    }
  };

  const handleSalvarAbastecimento = async (e) => {
    e.preventDefault();
    if (!viagemAtiva) return;

    const payload = {
      viagem_id: viagemAtiva.id,
      km_abastecimento: Number(formAbast.kmAbastecimento),
      litros_combustivel: Number(formAbast.litrosCombustivel),
      valor_combustivel: Number(formAbast.valorCombustivel),
      posto_combustivel: formAbast.postoCombustivel,
      numero_nota_combustivel: formAbast.numeroNotaCombustivel
    };

    if (abastecimentoEditandoId) {
      const { data, error } = await supabase
        .from('abastecimentos_viagem')
        .update(payload)
        .eq('id', abastecimentoEditandoId)
        .select();

      if (error) {
        const { data: dataLegado, error: errLegado } = await supabase
          .from('diario_bordo')
          .update(payload)
          .eq('id', viagemAtiva.id)
          .select(`*, despesas_viagem (*), abastecimentos_viagem (*)`);

        if (errLegado) {
          alert('Erro ao atualizar abastecimento: ' + errLegado.message);
          return;
        }
        if (dataLegado && dataLegado.length > 0) setViagemAtiva(dataLegado[0]);
      } else if (data && data.length > 0) {
        setViagemAtiva(prev => ({
          ...prev,
          abastecimentos_viagem: (prev.abastecimentos_viagem || []).map(a => a.id === abastecimentoEditandoId ? data[0] : a)
        }));
      }
    } else {
      const { data, error } = await supabase
        .from('abastecimentos_viagem')
        .insert([payload])
        .select();

      if (error) {
        const { data: dataLegado, error: errLegado } = await supabase
          .from('diario_bordo')
          .update(payload)
          .eq('id', viagemAtiva.id)
          .select(`*, despesas_viagem (*), abastecimentos_viagem (*)`);

        if (errLegado) {
          alert('Erro ao salvar abastecimento: ' + errLegado.message);
          return;
        }
        if (dataLegado && dataLegado.length > 0) setViagemAtiva(dataLegado[0]);
      } else if (data && data.length > 0) {
        setViagemAtiva(prev => ({
          ...prev,
          abastecimentos_viagem: [...(prev.abastecimentos_viagem || []), ...data]
        }));
      }
    }

    setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' });
    setAbastecimentoEditandoId(null);
    setModalAbastecimentoAberto(false);
  };

  const handleEditarAbastecimentoItem = (abast) => {
    setAbastecimentoEditandoId(abast.id);
    setFormAbast({
      kmAbastecimento: abast.km_abastecimento || '',
      litrosCombustivel: abast.litros_combustivel || '',
      valorCombustivel: abast.valor_combustivel || '',
      postoCombustivel: abast.posto_combustivel || '',
      numeroNotaCombustivel: abast.numero_nota_combustivel || ''
    });
    setModalAbastecimentoAberto(true);
  };

  const handleExcluirAbastecimentoItem = async (abastId) => {
    if (!window.confirm('Deseja excluir este registro de abastecimento?')) return;

    const { error } = await supabase
      .from('abastecimentos_viagem')
      .delete()
      .eq('id', abastId);

    if (error) {
      alert('Erro ao excluir abastecimento: ' + error.message);
      return;
    }

    setViagemAtiva(prev => ({
      ...prev,
      abastecimentos_viagem: (prev.abastecimentos_viagem || []).filter(a => a.id !== abastId)
    }));
  };

  const handleSalvarDespesa = async (e) => {
    e.preventDefault();
    if (!viagemAtiva) return;

    const payload = {
      viagem_id: viagemAtiva.id,
      tipo: formDesp.tipo,
      valor: Number(formDesp.valor),
      descricao: formDesp.descricao
    };

    if (despesaEditandoId) {
      const { data, error } = await supabase
        .from('despesas_viagem')
        .update(payload)
        .eq('id', despesaEditandoId)
        .select();

      if (error) {
        alert('Erro ao atualizar despesa: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        setViagemAtiva(prev => ({
          ...prev,
          despesas_viagem: (prev.despesas_viagem || []).map(d => d.id === despesaEditandoId ? data[0] : d)
        }));
        setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' });
        setDespesaEditandoId(null);
        setModalDespesaAberto(false);
      }
    } else {
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
    }
  };

  const handleEditarDespesaItem = (despesa) => {
    setDespesaEditandoId(despesa.id);
    setFormDesp({
      tipo: despesa.tipo || 'Pedágio',
      valor: despesa.valor || '',
      descricao: despesa.descricao || ''
    });
    setModalDespesaAberto(true);
  };

  const handleExcluirDespesaItem = async (despesaId) => {
    if (!window.confirm('Deseja excluir este lançamento de despesa?')) return;

    const { error } = await supabase
      .from('despesas_viagem')
      .delete()
      .eq('id', despesaId);

    if (error) {
      alert('Erro ao excluir despesa: ' + error.message);
      return;
    }

    setViagemAtiva(prev => ({
      ...prev,
      despesas_viagem: (prev.despesas_viagem || []).filter(d => d.id !== despesaId)
    }));
  };

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
      status: 'FINALIZADA',
      finished_at: new Date().toISOString()
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

  const handleExcluirViagem = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este registro do histórico?')) {
      return;
    }

    try {
      await supabase.from('despesas_viagem').delete().eq('viagem_id', id);
      await supabase.from('abastecimentos_viagem').delete().eq('viagem_id', id);

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

  const getTotaisAbastecimento = (viagem) => {
    if (!viagem) return { totalGasto: 0, totalLitros: 0, quantidade: 0, lista: [] };
    if (viagem.abastecimentos_viagem && viagem.abastecimentos_viagem.length > 0) {
      const totalGasto = viagem.abastecimentos_viagem.reduce((acc, a) => acc + (Number(a.valor_combustivel) || 0), 0);
      const totalLitros = viagem.abastecimentos_viagem.reduce((acc, a) => acc + (Number(a.litros_combustivel) || 0), 0);
      return { totalGasto, totalLitros, quantidade: viagem.abastecimentos_viagem.length, lista: viagem.abastecimentos_viagem };
    }
    const totalGasto = Number(viagem.valor_combustivel) || 0;
    const totalLitros = Number(viagem.litros_combustivel) || 0;
    const quantidade = totalGasto > 0 ? 1 : 0;
    const lista = quantidade > 0 ? [{
      id: 'legado',
      posto_combustivel: viagem.posto_combustivel,
      numero_nota_combustivel: viagem.numero_nota_combustivel,
      km_abastecimento: viagem.km_abastecimento,
      litros_combustivel: viagem.litros_combustivel,
      valor_combustivel: viagem.valor_combustivel
    }] : [];
    return { totalGasto, totalLitros, quantidade, lista };
  };

  const viagensFinalizadasFiltradas = useMemo(() => {
    if (tipoUsuario !== 'GESTOR') return viagensFinalizadas;

    return viagensFinalizadas.filter(v => {
      if (filtroPlacaGestor && !v.placa?.toLowerCase().includes(filtroPlacaGestor.toLowerCase())) {
        return false;
      }

      const dataRef = v.finished_at || v.created_at;
      if (!dataRef) return true;
      const dataObj = new Date(dataRef);

      if (filtroModo === 'PERIODO') {
        if (filtroDataInicio) {
          const dInicio = new Date(filtroDataInicio + 'T00:00:00');
          if (dataObj < dInicio) return false;
        }
        if (filtroDataFim) {
          const dFim = new Date(filtroDataFim + 'T23:59:59');
          if (dataObj > dFim) return false;
        }
      } else if (filtroModo === 'MES_ANO') {
        if (filtroMes !== '') {
          if (dataObj.getMonth() !== parseInt(filtroMes, 10)) return false;
        }
        if (filtroAno !== '') {
          if (dataObj.getFullYear() !== parseInt(filtroAno, 10)) return false;
        }
      } else if (filtroModo === 'ANO') {
        if (filtroAno !== '') {
          if (dataObj.getFullYear() !== parseInt(filtroAno, 10)) return false;
        }
      }

      return true;
    });
  }, [viagensFinalizadas, tipoUsuario, filtroModo, filtroDataInicio, filtroDataFim, filtroMes, filtroAno, filtroPlacaGestor]);

  const totalViagens = viagensFinalizadasFiltradas.length;
  const viagensEmTransitoCount = viagensEmTransitoList.length;
  
  const kmTotalRodados = viagensFinalizadasFiltradas.reduce((acc, v) => {
    const rodados = (v.km_final && v.km_inicial) ? (v.km_final - v.km_inicial) : 0;
    return acc + rodados;
  }, 0);

  const custoOperacionalTotal = viagensFinalizadasFiltradas.reduce((acc, v) => {
    const { totalGasto: combustivel } = getTotaisAbastecimento(v);
    const outrasDespesas = (v.despesas_viagem || []).reduce((sum, d) => sum + (d.valor || 0), 0);
    return acc + combustivel + outrasDespesas;
  }, 0);

  const kpisPorPlaca = useMemo(() => {
    const mapa = {};
    viagensFinalizadasFiltradas.forEach(v => {
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
      
      const { totalGasto: valComb, totalLitros: litComb } = getTotaisAbastecimento(v);
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
  }, [viagensFinalizadasFiltradas]);

  if (carregando) {
    return <div style={{ padding: '20px', color: '#fff', textAlign: 'center' }}>Carregando dados do Supabase...</div>;
  }

  const abastInfoAtiva = getTotaisAbastecimento(viagemAtiva);
  const totalGastoAbastecimento = abastInfoAtiva.totalGasto;
  const totalLitrosAbastecimento = abastInfoAtiva.totalLitros;
  const qtdAbastecimentos = abastInfoAtiva.quantidade;

  const totalGastoOutrasDespesas = (viagemAtiva?.despesas_viagem || []).reduce((acc, d) => acc + (d.valor || 0), 0);
  const qtdOutrasDespesas = viagemAtiva?.despesas_viagem?.length || 0;

  const viagensEmTransitoFiltradas = viagensEmTransitoList.filter(v => {
    const placaStr = v.placa ? String(v.placa).toLowerCase() : '';
    const operadorStr = v.operador ? String(v.operador).toLowerCase() : '';
    const busca = filtroEmTransitoBusca.toLowerCase();
    return placaStr.includes(busca) || operadorStr.includes(busca);
  });

  const formatarData = (isoString) => {
    if (!isoString) return 'N/D';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const limparFiltros = () => {
    setFiltroModo('TODOS');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroMes('');
    setFiltroAno('');
    setFiltroPlacaGestor('');
  };

  return (
    <div style={{ padding: '12px', color: '#fff', fontFamily: 'sans-serif', minHeight: '100vh', background: '#0b132b', boxSizing: 'border-box' }}>
      
      {/* Cabeçalho */}
      <div style={{ marginBottom: '16px', background: '#1c2541', padding: '16px', borderRadius: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>
          {tipoUsuario === 'GESTOR' ? '📊 Dashboard Logístico' : '🚚 Diário de Bordo'}
        </h2>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          {tipoUsuario === 'GESTOR' ? 'Visão Geral e KPIs da Frota' : 'Lançamento de Viagens e Operação'}
        </span>
      </div>

      {/* VISÃO EXCLUSIVA DO GESTOR */}
      {tipoUsuario === 'GESTOR' && (
        <>
          {/* PAINEL DE FILTROS DO GESTOR */}
          <div style={{ background: '#1c2541', padding: '16px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '14px' }}>
                🔍 Filtros do Dashboard
              </span>
              {(filtroModo !== 'TODOS' || filtroPlacaGestor) && (
                <button onClick={limparFiltros} style={{ background: '#334155', color: '#94a3b8', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  Limpar Filtros
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Período:</label>
                <select 
                  value={filtroModo} 
                  onChange={e => setFiltroModo(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="TODOS">Todo o Histórico</option>
                  <option value="PERIODO">Intervalo</option>
                  <option value="MES_ANO">Mês / Ano</option>
                  <option value="ANO">Apenas Ano</option>
                </select>
              </div>

              {filtroModo === 'PERIODO' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Início:</label>
                    <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Fim:</label>
                    <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              {filtroModo === 'MES_ANO' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Mês:</label>
                  <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
                    <option value="">Selecione...</option>
                    <option value="0">Janeiro</option>
                    <option value="1">Fevereiro</option>
                    <option value="2">Março</option>
                    <option value="3">Abril</option>
                    <option value="4">Maio</option>
                    <option value="5">Junho</option>
                    <option value="6">Julho</option>
                    <option value="7">Agosto</option>
                    <option value="8">Setembro</option>
                    <option value="9">Outubro</option>
                    <option value="10">Novembro</option>
                    <option value="11">Dezembro</option>
                  </select>
                </div>
              )}

              {(filtroModo === 'MES_ANO' || filtroModo === 'ANO') && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Ano:</label>
                  <input type="number" placeholder="2026" value={filtroAno} onChange={e => setFiltroAno(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Placa:</label>
                <input type="text" placeholder="ABC-1234" value={filtroPlacaGestor} onChange={e => setFiltroPlacaGestor(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Cards KPI Responsivos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div 
              onClick={() => setModalEmTransitoAberto(true)} 
              onMouseEnter={() => setIsHoveredCardEmTransito(true)}
              onMouseLeave={() => setIsHoveredCardEmTransito(false)}
              style={{ background: '#1c2541', padding: '16px', borderRadius: '12px', border: `1px solid ${isHoveredCardEmTransito ? '#eab308' : '#334155'}`, cursor: 'pointer', transition: '0.2s' }}
            >
              <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '13px' }}>Em Trânsito</p>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>👆 Clique p/ detalhes</span>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#eab308' }}>{viagensEmTransitoCount}</h3>
            </div>
            <div style={{ background: '#1c2541', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '13px' }}>Viagens Finalizadas</p>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#60a5fa' }}>{totalViagens}</h3>
            </div>
            <div style={{ background: '#1c2541', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '13px' }}>KM Rodados</p>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#4ade80' }}>{kmTotalRodados.toLocaleString()} km</h3>
            </div>
            <div 
              onClick={() => setModalCustoTotalAberto(true)}
              onMouseEnter={() => setIsHoveredCardCustoTotal(true)}
              onMouseLeave={() => setIsHoveredCardCustoTotal(false)}
              style={{ background: '#1c2541', padding: '16px', borderRadius: '12px', border: `1px solid ${isHoveredCardCustoTotal ? '#f87171' : '#334155'}`, cursor: 'pointer', transition: '0.2s' }}
            >
              <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '13px' }}>Custo Total</p>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>👆 Clique p/ detalhes</span>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#f87171' }}>R$ {custoOperacionalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>

          <div style={{ marginBottom: '24px', background: '#131b2e', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#e2e8f0' }}>📊 Desempenho e Custos por Placa</h3>
            {kpisPorPlaca.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>Nenhum dado registrado para o filtro selecionado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '8px' }}>Placa</th>
                      <th style={{ padding: '8px' }}>Viagens</th>
                      <th style={{ padding: '8px' }}>KM Total</th>
                      <th style={{ padding: '8px' }}>Média Km/L</th>
                      <th style={{ padding: '8px' }}>Gasto Comb.</th>
                      <th style={{ padding: '8px' }}>Despesas</th>
                      <th style={{ padding: '8px' }}>Custo Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpisPorPlaca.map((kpi, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#60a5fa' }}>{kpi.placa}</td>
                        <td style={{ padding: '10px' }}>{kpi.qtdViagens}</td>
                        <td style={{ padding: '10px' }}>{kpi.kmTotal.toLocaleString()} km</td>
                        <td style={{ padding: '10px', color: Number(kpi.mediaKmPorLitro) > 0 ? '#4ade80' : '#cbd5e1' }}>{kpi.mediaKmPorLitro}</td>
                        <td style={{ padding: '10px', color: '#f87171' }}>R$ {Number(kpi.combustivelMedioPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '10px', color: '#fbbf24' }}>R$ {Number(kpi.despesaMediaPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#f43f5e' }}>R$ {Number(kpi.custoMedioPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
            <div style={{ background: '#1c2541', padding: '16px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#e2e8f0' }}>🚀 Iniciar Novo Diário de Bordo</h3>
              <form onSubmit={handleIniciarViagem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Placa</label>
                  <input type="text" placeholder="ABC-1234" value={formViagem.placa} onChange={e => setFormViagem({...formViagem, placa: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Operador</label>
                  <input type="text" value={formViagem.operador} onChange={e => setFormViagem({...formViagem, operador: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>KM Inicial</label>
                  <input type="number" placeholder="150000" value={formViagem.kmInicial} onChange={e => setFormViagem({...formViagem, kmInicial: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Origem / Carregamento</label>
                  <input type="text" placeholder="Fazenda / Local" value={formViagem.localCarregamento} onChange={e => setFormViagem({...formViagem, localCarregamento: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Destino</label>
                  <input type="text" placeholder="Cliente / Cidade" value={formViagem.clienteDestino} onChange={e => setFormViagem({...formViagem, clienteDestino: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Produto</label>
                  <input type="text" placeholder="Soja, Milho..." value={formViagem.produto} onChange={e => setFormViagem({...formViagem, produto: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Peso (Kg)</label>
                  <input type="number" step="0.01" placeholder="50000" value={formViagem.pesoCarregado} onChange={e => setFormViagem({...formViagem, pesoCarregado: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nota Fiscal</label>
                  <input type="text" placeholder="Nº NF" value={formViagem.notaFiscal} onChange={e => setFormViagem({...formViagem, notaFiscal: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0b132b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>Iniciar Diário</button>
                </div>
              </form>
            </div>
          ) : (
            /* Layout Viagem Ativa */
            <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', border: '1px solid #23304a', marginBottom: '24px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ background: '#2563eb', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  EM TRÂNSITO
                </span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>ID #{viagemAtiva.id}</span>
              </div>

              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#cbd5e1', fontWeight: 'normal' }}>
                Placa: <strong style={{ color: '#38bdf8' }}>{viagemAtiva.placa}</strong>
              </h3>

              <div style={{ background: '#0e1626', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
                  <div>📍 <strong>Origem:</strong> {viagemAtiva.local_carregamento}</div>
                  <div>🎯 <strong>Destino:</strong> {viagemAtiva.cliente_destino || 'N/D'}</div>
                  <div>📦 <strong>Produto:</strong> {viagemAtiva.produto || 'N/D'}</div>
                  <div>⚖️ <strong>Peso:</strong> {viagemAtiva.peso_carregado || '0'} kg</div>
                  <div>📄 <strong>NF:</strong> {viagemAtiva.nota_fiscal || 'N/D'}</div>
                </div>
                <div style={{ fontSize: '12px' }}>
                  🏎️ <strong>KM Inicial:</strong> {viagemAtiva.km_inicial} km
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                
                {/* Card Abastecimentos */}
                <div style={{ border: '1px solid #d97706', borderRadius: '8px', padding: '12px', background: '#0e1626' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '13px' }}>
                      ⛽ Combustível ({qtdAbastecimentos})
                    </span>
                    <button onClick={() => setModalListaAbastecimentosAberto(true)} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                      Ver/Editar
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    <div><strong>Gasto:</strong> R$ {totalGastoAbastecimento.toFixed(2)}</div>
                    <div><strong>Litros:</strong> {totalLitrosAbastecimento.toFixed(2)} L</div>
                  </div>
                </div>

                {/* Card Outros Gastos */}
                <div style={{ border: '1px solid #9333ea', borderRadius: '8px', padding: '12px', background: '#0e1626' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '13px' }}>
                      💸 Despesas ({qtdOutrasDespesas})
                    </span>
                    <button onClick={() => setModalListaDespesasAberto(true)} style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                      Ver/Editar
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    <div><strong>Gasto:</strong> R$ {totalGastoOutrasDespesas.toFixed(2)}</div>
                  </div>
                </div>

              </div>

              {/* Botões Inferiores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                <button onClick={() => { setAbastecimentoEditandoId(null); setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' }); setModalAbastecimentoAberto(true); }} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  ⛽ + Abastecimento
                </button>
                <button onClick={() => { setDespesaEditandoId(null); setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' }); setModalDespesaAberto(true); }} style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  💸 + Despesa
                </button>
                <button onClick={() => setModalFinalizarAberto(true)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  🏁 Finalizar
                </button>
              </div>

            </div>
          )}
        </>
      )}

      {/* HISTÓRICO DE VIAGENS FINALIZADAS */}
      <div style={{ background: '#1c2541', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#e2e8f0' }}>📖 Histórico de Diários</h3>
        {viagensFinalizadasFiltradas.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Nenhuma viagem finalizada encontrada com os filtros selecionados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '650px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>Datas</th>
                  <th style={{ padding: '8px' }}>Placa</th>
                  <th style={{ padding: '8px' }}>Operador</th>
                  <th style={{ padding: '8px' }}>Produto / Origem</th>
                  <th style={{ padding: '8px' }}>KM</th>
                  <th style={{ padding: '8px' }}>Pesos</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {viagensFinalizadasFiltradas.map(v => {
                  const kmRodados = (v.km_final && v.km_inicial) ? (v.km_final - v.km_inicial) : 0;
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', fontSize: '11px', color: '#cbd5e1' }}>
                        Início: {formatarData(v.created_at)}<br/>
                        Fim: {formatarData(v.finished_at || v.updated_at)}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#60a5fa' }}>{v.placa}</td>
                      <td style={{ padding: '8px' }}>{v.operador || 'N/D'}</td>
                      <td style={{ padding: '8px' }}>{v.produto || 'Geral'}<br/><span style={{ fontSize: '10px', color: '#94a3b8' }}>📍 {v.local_carregamento}</span></td>
                      <td style={{ padding: '8px' }}>{kmRodados} km</td>
                      <td style={{ padding: '8px', fontSize: '11px' }}>{v.peso_carregado?.toLocaleString()} / {v.peso_descarga?.toLocaleString()} kg</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => { setViagemSelecionada(v); setModalDetalhesAberto(true); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Det.</button>
                          {tipoUsuario === 'GESTOR' && (
                            <button onClick={() => handleExcluirViagem(v.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Excl.</button>
                          )}
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

      {/* MODAL - CUSTO OPERACIONAL TOTAL POR PLACA */}
      {modalCustoTotalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '750px', border: '1px solid #23304a', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f87171', fontSize: '18px' }}>💰 Custo Operacional por Placa</h3>
            
            <div style={{ overflowY: 'auto', flex: 1, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '450px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>Placa</th>
                    <th style={{ padding: '8px' }}>Viagens</th>
                    <th style={{ padding: '8px' }}>Combustível</th>
                    <th style={{ padding: '8px' }}>Despesas</th>
                    <th style={{ padding: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {kpisPorPlaca.map((kpi, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#60a5fa' }}>{kpi.placa}</td>
                      <td style={{ padding: '8px' }}>{kpi.qtdViagens}</td>
                      <td style={{ padding: '8px', color: '#f87171' }}>R$ {kpi.gastoCombustivelTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px', color: '#fbbf24' }}>R$ {kpi.gastoOutrasDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#f43f5e' }}>R$ {kpi.gastoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              <button onClick={() => setModalCustoTotalAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - VIAGENS EM TRÂNSITO */}
      {modalEmTransitoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '800px', border: '1px solid #23304a', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, color: '#eab308', fontSize: '18px' }}>🚚 Frota em Trânsito ({viagensEmTransitoCount})</h3>
              <input 
                type="text" 
                placeholder="Filtrar placa/motorista..." 
                value={filtroEmTransitoBusca}
                onChange={(e) => setFiltroEmTransitoBusca(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', background: '#0e1626', color: '#fff', fontSize: '12px' }}
              />
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>Placa</th>
                    <th style={{ padding: '8px' }}>Motorista</th>
                    <th style={{ padding: '8px' }}>Origem/Destino</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {viagensEmTransitoFiltradas.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#eab308' }}>{v.placa}</td>
                      <td style={{ padding: '8px', color: '#cbd5e1' }}>{v.operador || 'N/D'}</td>
                      <td style={{ padding: '8px' }}>De: {v.local_carregamento}<br/>Para: {v.cliente_destino || 'N/D'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button onClick={() => { setViagemSelecionada(v); setModalDetalhesAberto(true); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              <button onClick={() => setModalEmTransitoAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE ABASTECIMENTOS */}
      {modalListaAbastecimentosAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid #23304a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>⛽ Abastecimentos</h3>
              <button onClick={() => { setModalListaAbastecimentosAberto(false); setAbastecimentoEditandoId(null); setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' }); setModalAbastecimentoAberto(true); }} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                + Novo
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '6px' }}>Posto/NF</th>
                    <th style={{ padding: '6px' }}>KM</th>
                    <th style={{ padding: '6px' }}>Litros</th>
                    <th style={{ padding: '6px' }}>Valor Total</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {abastInfoAtiva.lista.map((a, idx) => (
                    <tr key={a.id || idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '6px' }}>{a.posto_combustivel || '-'}<br/><span style={{ fontSize: '10px', color: '#64748b' }}>NF: {a.numero_nota_combustivel || '-'}</span></td>
                      <td style={{ padding: '6px' }}>{a.km_abastecimento || '-'}</td>
                      <td style={{ padding: '6px' }}>{Number(a.litros_combustivel || 0).toFixed(2)} L</td>
                      <td style={{ padding: '6px', color: '#f59e0b', fontWeight: 'bold' }}>R$ {Number(a.valor_combustivel || 0).toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => handleEditarAbastecimentoItem(a)} style={{ background: '#eab308', color: '#000', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Editar</button>
                          {a.id !== 'legado' && (
                            <button onClick={() => handleExcluirAbastecimentoItem(a.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Excl.</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button onClick={() => setModalListaAbastecimentosAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR / EDITAR ABASTECIMENTO */}
      {modalAbastecimentoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '420px', border: '1px solid #23304a' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#f59e0b', fontSize: '16px' }}>
              ⛽ {abastecimentoEditandoId ? 'Editar Abastecimento' : 'Novo Abastecimento'}
            </h3>
            <form onSubmit={handleSalvarAbastecimento}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Posto de Combustível</label>
                <input type="text" placeholder="Nome do Posto" value={formAbast.postoCombustivel} onChange={e => setFormAbast({...formAbast, postoCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Número da Nota Fiscal</label>
                <input type="text" placeholder="Nº NF" value={formAbast.numeroNotaCombustivel} onChange={e => setFormAbast({...formAbast, numeroNotaCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Valor (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formAbast.valorCombustivel} onChange={e => setFormAbast({...formAbast, valorCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Litros</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formAbast.litrosCombustivel} onChange={e => setFormAbast({...formAbast, litrosCombustivel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>KM Abastecimento</label>
                <input type="number" step="0.1" placeholder="150250" value={formAbast.kmAbastecimento} onChange={e => setFormAbast({...formAbast, kmAbastecimento: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                <button type="submit" style={{ background: '#d97706', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  {abastecimentoEditandoId ? 'Atualizar' : 'Salvar'}
                </button>
                <button type="button" onClick={() => { setModalAbastecimentoAberto(false); setAbastecimentoEditandoId(null); }} style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR DESPESA */}
      {modalDespesaAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid #23304a' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#c084fc', fontSize: '16px' }}>
              {despesaEditandoId ? '✏️ Editar Despesa' : '💸 Nova Despesa'}
            </h3>
            <form onSubmit={handleSalvarDespesa}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Tipo</label>
                <input type="text" placeholder="Pedágio, Borracharia..." value={formDesp.tipo} onChange={e => setFormDesp({...formDesp, tipo: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Valor (R$)</label>
                <input type="number" step="0.01" value={formDesp.valor} onChange={e => setFormDesp({...formDesp, valor: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Descrição</label>
                <input type="text" value={formDesp.descricao} onChange={e => setFormDesp({...formDesp, descricao: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button type="submit" style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  {despesaEditandoId ? 'Atualizar' : 'Salvar'}
                </button>
                <button type="button" onClick={() => { setModalDespesaAberto(false); setDespesaEditandoId(null); }} style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE DESPESAS */}
      {modalListaDespesasAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '550px', border: '1px solid #23304a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>💸 Despesas da Viagem</h3>
              <button onClick={() => { setModalListaDespesasAberto(false); setDespesaEditandoId(null); setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' }); setModalDespesaAberto(true); }} style={{ background: '#9333ea', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                + Adicionar
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '350px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '6px' }}>Tipo</th>
                    <th style={{ padding: '6px' }}>Descrição</th>
                    <th style={{ padding: '6px' }}>Valor</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(viagemAtiva?.despesas_viagem || []).map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '6px' }}>{d.tipo}</td>
                      <td style={{ padding: '6px' }}>{d.descricao || '-'}</td>
                      <td style={{ padding: '6px', color: '#f87171', fontWeight: 'bold' }}>R$ {Number(d.valor).toFixed(2)}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => handleEditarDespesaItem(d)} style={{ background: '#eab308', color: '#000', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Editar</button>
                          <button onClick={() => handleExcluirDespesaItem(d.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Excl.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button onClick={() => setModalListaDespesasAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR VIAGEM */}
      {modalFinalizarAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '420px', border: '1px solid #23304a' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#22c55e', fontSize: '16px' }}>
              🏁 Finalizar Viagem
            </h3>
            <form onSubmit={handleConcluirViagem}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>KM Final de Chegada</label>
                <input type="number" placeholder="KM Chegada" value={formFim.kmFinal} onChange={e => setFormFim({...formFim, kmFinal: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Local Descarga</label>
                <input type="text" placeholder="Local / Cliente" value={formFim.localDescarga} onChange={e => setFormFim({...formFim, localDescarga: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Peso Descarga (Kg)</label>
                <input type="number" step="0.01" placeholder="25000" value={formFim.pesoDescarga} onChange={e => setFormFim({...formFim, pesoDescarga: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0e1626', border: '1px solid #2563eb', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Finalizar</button>
                <button type="button" onClick={() => setModalFinalizarAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {modalDetalhesAberto && viagemSelecionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px', boxSizing: 'border-box' }}>
          <div style={{ background: '#161e31', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid #23304a', maxHeight: '90vh', overflowY: 'auto', color: '#fff' }}>
            <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #334155', paddingBottom: '8px', fontSize: '16px' }}>Detalhes - {viagemSelecionada.placa}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
              <div><b>Operador:</b> {viagemSelecionada.operador || 'N/D'}</div>
              <div><b>Status:</b> {viagemSelecionada.status === 'EM_TRANSITO' ? 'Em Trânsito 🚚' : 'Finalizada 🏁'}</div>
              <div><b>Data Início:</b> {formatarData(viagemSelecionada.created_at)}</div>
              <div><b>Data Final:</b> {formatarData(viagemSelecionada.finished_at || viagemSelecionada.updated_at)}</div>
              <div><b>KM Rodados:</b> {(viagemSelecionada.km_final && viagemSelecionada.km_inicial) ? (viagemSelecionada.km_final - viagemSelecionada.km_inicial) : 'N/D'} km</div>
              <div><b>Carregamento:</b> {viagemSelecionada.local_carregamento}</div>
              <div><b>Descarga:</b> {viagemSelecionada.local_descarga || 'N/D'}</div>
              <div><b>Produto:</b> {viagemSelecionada.produto || 'N/D'}</div>
              <div><b>Destino:</b> {viagemSelecionada.cliente_destino || 'N/D'}</div>
              <div><b>Nota Fiscal:</b> {viagemSelecionada.nota_fiscal || 'N/D'}</div>
              <div><b>Peso Carregado:</b> {viagemSelecionada.peso_carregado?.toLocaleString()} kg</div>
              <div><b>Peso Descarga:</b> {viagemSelecionada.peso_descarga?.toLocaleString()} kg</div>
            </div>

            <h4 style={{ color: '#0ea5e9', marginBottom: '6px', fontSize: '13px' }}>Abastecimentos</h4>
            <div style={{ background: '#0e1626', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
              {getTotaisAbastecimento(viagemSelecionada).lista.length === 0 ? (
                <div>Sem abastecimentos registrados.</div>
              ) : (
                getTotaisAbastecimento(viagemSelecionada).lista.map((ab, idx) => (
                  <div key={idx} style={{ marginBottom: '6px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                    <div><b>Posto:</b> {ab.posto_combustivel || '-'} | <b>NF:</b> {ab.numero_nota_combustivel || '-'}</div>
                    <div><b>KM:</b> {ab.km_abastecimento || '-'} | <b>L:</b> {ab.litros_combustivel || 0} | <b>Valor:</b> R$ {Number(ab.valor_combustivel || 0).toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>

            <h4 style={{ color: '#fbbf24', marginBottom: '6px', fontSize: '13px' }}>Despesas Adicionais</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead><tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}><th style={{ padding: '4px' }}>Tipo</th><th style={{ padding: '4px' }}>Descrição</th><th style={{ padding: '4px' }}>Valor</th></tr></thead>
              <tbody>
                {(viagemSelecionada.despesas_viagem || []).map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '4px' }}>{d.tipo}</td><td style={{ padding: '4px' }}>{d.descricao || '-'}</td><td style={{ padding: '4px', color: '#f87171' }}>R$ {Number(d.valor).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button onClick={() => setModalDetalhesAberto(false)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}