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

  // Formulário Edição Completa pelo Gestor
  const [formEdicaoGestor, setFormEdicaoGestor] = useState({
    placa: '',
    operador: '',
    km_inicial: '',
    km_final: '',
    local_carregamento: '',
    local_descarga: '',
    cliente_destino: '',
    produto: '',
    peso_carregado: '',
    peso_descarga: '',
    nota_fiscal: ''
  });

  useEffect(() => {
    verificarUsuarioEObterDados();
  }, []);

  useEffect(() => {
    if (viagemSelecionada) {
      setFormEdicaoGestor({
        placa: viagemSelecionada.placa || '',
        operador: viagemSelecionada.operador || '',
        km_inicial: viagemSelecionada.km_inicial ?? '',
        km_final: viagemSelecionada.km_final ?? '',
        local_carregamento: viagemSelecionada.local_carregamento || '',
        local_descarga: viagemSelecionada.local_descarga || '',
        cliente_destino: viagemSelecionada.cliente_destino || '',
        produto: viagemSelecionada.produto || '',
        peso_carregado: viagemSelecionada.peso_carregado ?? '',
        peso_descarga: viagemSelecionada.peso_descarga ?? '',
        nota_fiscal: viagemSelecionada.nota_fiscal || ''
      });
    }
  }, [viagemSelecionada]);

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

  const handleSalvarAbastecimentoModal = async (e, alvoViagem = null) => {
    if (e) e.preventDefault();
    const target = alvoViagem || viagemAtiva;
    if (!target) return;

    const payload = {
      viagem_id: target.id,
      km_abastecimento: Number(formAbast.kmAbastecimento),
      litros_combustivel: Number(formAbast.litrosCombustivel),
      valor_combustivel: Number(formAbast.valorCombustivel),
      posto_combustivel: formAbast.postoCombustivel,
      numero_nota_combustivel: formAbast.numeroNotaCombustivel
    };

    if (abastecimentoEditandoId && abastecimentoEditandoId !== 'legado') {
      const { data, error } = await supabase
        .from('abastecimentos_viagem')
        .update(payload)
        .eq('id', abastecimentoEditandoId)
        .select();

      if (error) {
        alert('Erro ao atualizar abastecimento: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        const itemAtualizado = data[0];
        const atualizarLista = (prevList) => (prevList || []).map(a => a.id === abastecimentoEditandoId ? itemAtualizado : a);

        if (viagemAtiva && viagemAtiva.id === target.id) {
          setViagemAtiva(prev => ({ ...prev, abastecimentos_viagem: atualizarLista(prev.abastecimentos_viagem) }));
        }
        if (viagemSelecionada && viagemSelecionada.id === target.id) {
          setViagemSelecionada(prev => ({ ...prev, abastecimentos_viagem: atualizarLista(prev.abastecimentos_viagem) }));
        }
        setViagensFinalizadas(prev => prev.map(v => v.id === target.id ? { ...v, abastecimentos_viagem: atualizarLista(v.abastecimentos_viagem) } : v));
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
          .eq('id', target.id)
          .select(`*, despesas_viagem (*), abastecimentos_viagem (*)`);

        if (errLegado) {
          alert('Erro ao salvar abastecimento: ' + errLegado.message);
          return;
        }
        if (dataLegado && dataLegado.length > 0) {
          const vAtual = dataLegado[0];
          if (viagemAtiva && viagemAtiva.id === target.id) setViagemAtiva(vAtual);
          if (viagemSelecionada && viagemSelecionada.id === target.id) setViagemSelecionada(vAtual);
          setViagensFinalizadas(prev => prev.map(v => v.id === target.id ? vAtual : v));
        }
      } else if (data && data.length > 0) {
        const novoItem = data[0];
        const adicionarLista = (prevList) => [...(prevList || []), novoItem];

        if (viagemAtiva && viagemAtiva.id === target.id) {
          setViagemAtiva(prev => ({ ...prev, abastecimentos_viagem: adicionarLista(prev.abastecimentos_viagem) }));
        }
        if (viagemSelecionada && viagemSelecionada.id === target.id) {
          setViagemSelecionada(prev => ({ ...prev, abastecimentos_viagem: adicionarLista(prev.abastecimentos_viagem) }));
        }
        setViagensFinalizadas(prev => prev.map(v => v.id === target.id ? { ...v, abastecimentos_viagem: adicionarLista(v.abastecimentos_viagem) } : v));
      }
    }

    setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' });
    setAbastecimentoEditandoId(null);
    setModalAbastecimentoAberto(false);
  };

  const handleSalvarAbastecimento = (e) => {
    handleSalvarAbastecimentoModal(e, modalDetalhesAberto ? viagemSelecionada : viagemAtiva);
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

  const handleExcluirAbastecimentoItem = async (abastId, viagemAlvo = null) => {
    if (!window.confirm('Deseja excluir este registro de abastecimento?')) return;
    const target = viagemAlvo || viagemAtiva;

    const { error } = await supabase
      .from('abastecimentos_viagem')
      .delete()
      .eq('id', abastId);

    if (error) {
      alert('Erro ao excluir abastecimento: ' + error.message);
      return;
    }

    const removerLista = (prevList) => (prevList || []).filter(a => a.id !== abastId);

    if (viagemAtiva && viagemAtiva.id === target?.id) {
      setViagemAtiva(prev => ({ ...prev, abastecimentos_viagem: removerLista(prev.abastecimentos_viagem) }));
    }
    if (viagemSelecionada && viagemSelecionada.id === target?.id) {
      setViagemSelecionada(prev => ({ ...prev, abastecimentos_viagem: removerLista(prev.abastecimentos_viagem) }));
    }
    setViagensFinalizadas(prev => prev.map(v => v.id === target?.id ? { ...v, abastecimentos_viagem: removerLista(v.abastecimentos_viagem) } : v));
  };

  const handleSalvarDespesaModal = async (e, alvoViagem = null) => {
    if (e) e.preventDefault();
    const target = alvoViagem || viagemAtiva;
    if (!target) return;

    const payload = {
      viagem_id: target.id,
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
        const itemAtualiz = data[0];
        const atualizarLista = (prevList) => (prevList || []).map(d => d.id === despesaEditandoId ? itemAtualiz : d);

        if (viagemAtiva && viagemAtiva.id === target.id) {
          setViagemAtiva(prev => ({ ...prev, despesas_viagem: atualizarLista(prev.despesas_viagem) }));
        }
        if (viagemSelecionada && viagemSelecionada.id === target.id) {
          setViagemSelecionada(prev => ({ ...prev, despesas_viagem: atualizarLista(prev.despesas_viagem) }));
        }
        setViagensFinalizadas(prev => prev.map(v => v.id === target.id ? { ...v, despesas_viagem: atualizarLista(v.despesas_viagem) } : v));

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
        const itemNovo = data[0];
        const adicionarLista = (prevList) => [...(prevList || []), itemNovo];

        if (viagemAtiva && viagemAtiva.id === target.id) {
          setViagemAtiva(prev => ({ ...prev, despesas_viagem: adicionarLista(prev.despesas_viagem) }));
        }
        if (viagemSelecionada && viagemSelecionada.id === target.id) {
          setViagemSelecionada(prev => ({ ...prev, despesas_viagem: adicionarLista(prev.despesas_viagem) }));
        }
        setViagensFinalizadas(prev => prev.map(v => v.id === target.id ? { ...v, despesas_viagem: adicionarLista(v.despesas_viagem) } : v));

        setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' });
        setModalDespesaAberto(false);
      }
    }
  };

  const handleSalvarDespesa = (e) => {
    handleSalvarDespesaModal(e, modalDetalhesAberto ? viagemSelecionada : viagemAtiva);
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

  const handleExcluirDespesaItem = async (despesaId, viagemAlvo = null) => {
    if (!window.confirm('Deseja excluir este lançamento de despesa?')) return;
    const target = viagemAlvo || viagemAtiva;

    const { error } = await supabase
      .from('despesas_viagem')
      .delete()
      .eq('id', despesaId);

    if (error) {
      alert('Erro ao excluir despesa: ' + error.message);
      return;
    }

    const removerLista = (prevList) => (prevList || []).filter(d => d.id !== despesaId);

    if (viagemAtiva && viagemAtiva.id === target?.id) {
      setViagemAtiva(prev => ({ ...prev, despesas_viagem: removerLista(prev.despesas_viagem) }));
    }
    if (viagemSelecionada && viagemSelecionada.id === target?.id) {
      setViagemSelecionada(prev => ({ ...prev, despesas_viagem: removerLista(prev.despesas_viagem) }));
    }
    setViagensFinalizadas(prev => prev.map(v => v.id === target?.id ? { ...v, despesas_viagem: removerLista(v.despesas_viagem) } : v));
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

  const handleSalvarEdicaoGestor = async (e) => {
    e.preventDefault();
    if (!viagemSelecionada) return;

    const payload = {
      placa: formEdicaoGestor.placa,
      operador: formEdicaoGestor.operador,
      km_inicial: formEdicaoGestor.km_inicial === '' ? null : Number(formEdicaoGestor.km_inicial),
      km_final: formEdicaoGestor.km_final === '' ? null : Number(formEdicaoGestor.km_final),
      local_carregamento: formEdicaoGestor.local_carregamento,
      local_descarga: formEdicaoGestor.local_descarga,
      cliente_destino: formEdicaoGestor.cliente_destino,
      produto: formEdicaoGestor.produto,
      peso_carregado: formEdicaoGestor.peso_carregado === '' ? null : Number(formEdicaoGestor.peso_carregado),
      peso_descarga: formEdicaoGestor.peso_descarga === '' ? null : Number(formEdicaoGestor.peso_descarga),
      nota_fiscal: formEdicaoGestor.nota_fiscal
    };

    const { data, error } = await supabase
      .from('diario_bordo')
      .update(payload)
      .eq('id', viagemSelecionada.id)
      .select(`*, despesas_viagem (*), abastecimentos_viagem (*)`);

    if (error) {
      alert('Erro ao atualizar diário: ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      const atualizado = data[0];
      setViagemSelecionada(atualizado);
      setViagensFinalizadas(prev => prev.map(v => v.id === atualizado.id ? atualizado : v));
      setViagensEmTransitoList(prev => prev.map(v => v.id === atualizado.id ? atualizado : v));
      if (viagemAtiva && viagemAtiva.id === atualizado.id) {
        setViagemAtiva(atualizado);
      }
      alert('Dados do diário atualizados com sucesso!');
    }
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

  // Estilos globais modernos e responsivos
  const styles = {
    container: {
      padding: '16px',
      color: '#f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b132b 0%, #1c2541 100%)',
      boxSizing: 'border-box'
    },
    card: {
      background: 'rgba(28, 37, 65, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '18px',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      background: '#0b132b',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: '#f8fafc',
      fontSize: '13px',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      color: '#fff',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
      transition: 'transform 0.1s, opacity 0.2s'
    },
    btnSuccess: {
      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      color: '#fff',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)'
    },
    btnWarning: {
      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      color: '#fff',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)'
    },
    btnPurple: {
      background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
      color: '#fff',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      boxShadow: '0 4px 14px rgba(147, 51, 234, 0.4)'
    },
    btnSecondary: {
      background: '#334155',
      color: '#94a3b8',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px'
    },
    tableTh: {
      padding: '12px 10px',
      color: '#94a3b8',
      fontWeight: '600',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '12px',
      boxSizing: 'border-box'
    }
  };

  if (carregando) {
    return <div style={{ padding: '40px', color: '#fff', textAlign: 'center', fontFamily: 'sans-serif' }}>Carregando dados do Supabase...</div>;
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
    <div style={styles.container}>
      
      {/* Cabeçalho */}
      <div style={{ ...styles.card, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tipoUsuario === 'GESTOR' ? '📊 Dashboard Logístico' : '🚚 Diário de Bordo'}
          </h2>
          <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
            {tipoUsuario === 'GESTOR' ? 'Visão Geral e KPIs da Frota' : 'Lançamento de Viagens e Operação'}
          </span>
        </div>
        <div style={{ background: tipoUsuario === 'GESTOR' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(74, 222, 128, 0.15)', border: `1px solid ${tipoUsuario === 'GESTOR' ? '#38bdf8' : '#4ade80'}`, padding: '6px 12px', borderRadius: '20px', color: tipoUsuario === 'GESTOR' ? '#38bdf8' : '#4ade80', fontSize: '12px', fontWeight: '600' }}>
          {tipoUsuario}
        </div>
      </div>

      {/* VISÃO EXCLUSIVA DO GESTOR */}
      {tipoUsuario === 'GESTOR' && (
        <>
          {/* PAINEL DE FILTROS DO GESTOR */}
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: '600', color: '#38bdf8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔍 Filtros do Dashboard
              </span>
              {(filtroModo !== 'TODOS' || filtroPlacaGestor) && (
                <button onClick={limparFiltros} style={styles.btnSecondary}>
                  Limpar Filtros
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Período:</label>
                <select 
                  value={filtroModo} 
                  onChange={e => setFiltroModo(e.target.value)}
                  style={styles.input}
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
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Início:</label>
                    <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Fim:</label>
                    <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={styles.input} />
                  </div>
                </>
              )}

              {filtroModo === 'MES_ANO' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Mês:</label>
                  <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={styles.input}>
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
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Ano:</label>
                  <input type="number" placeholder="2026" value={filtroAno} onChange={e => setFiltroAno(e.target.value)} style={styles.input} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Placa:</label>
                <input type="text" placeholder="ABC-1234" value={filtroPlacaGestor} onChange={e => setFiltroPlacaGestor(e.target.value)} style={styles.input} />
              </div>
            </div>
          </div>

          {/* Cards KPI Responsivos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            <div 
              onClick={() => setModalEmTransitoAberto(true)} 
              onMouseEnter={() => setIsHoveredCardEmTransito(true)}
              onMouseLeave={() => setIsHoveredCardEmTransito(false)}
              style={{ ...styles.card, border: `1px solid ${isHoveredCardEmTransito ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Em Trânsito</p>
              <span style={{ fontSize: '11px', color: '#f59e0b', display: 'block', marginBottom: '8px' }}>👆 Clique p/ detalhes</span>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#f59e0b', fontWeight: '700' }}>{viagensEmTransitoCount}</h3>
            </div>
            <div style={{ ...styles.card, border: '1px solid rgba(96, 165, 250, 0.3)' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Viagens Finalizadas</p>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#60a5fa', fontWeight: '700' }}>{totalViagens}</h3>
            </div>
            <div style={{ ...styles.card, border: '1px solid rgba(74, 222, 128, 0.3)' }}>
              <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>KM Rodados</p>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#4ade80', fontWeight: '700' }}>{kmTotalRodados.toLocaleString()} km</h3>
            </div>
            <div 
              onClick={() => setModalCustoTotalAberto(true)}
              onMouseEnter={() => setIsHoveredCardCustoTotal(true)}
              onMouseLeave={() => setIsHoveredCardCustoTotal(false)}
              style={{ ...styles.card, border: `1px solid ${isHoveredCardCustoTotal ? '#f87171' : 'rgba(248, 113, 113, 0.3)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Custo Total</p>
              <span style={{ fontSize: '11px', color: '#f87171', display: 'block', marginBottom: '8px' }}>👆 Clique p/ detalhes</span>
              <h3 style={{ margin: 0, fontSize: '28px', color: '#f87171', fontWeight: '700' }}>R$ {custoOperacionalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>

          <div style={{ ...styles.card, marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#e2e8f0', fontWeight: '600' }}>📊 Desempenho e Custos por Placa</h3>
            {kpisPorPlaca.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>Nenhum dado registrado para o filtro selecionado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={styles.tableTh}>Placa</th>
                      <th style={styles.tableTh}>Viagens</th>
                      <th style={styles.tableTh}>KM Total</th>
                      <th style={styles.tableTh}>Média Km/L</th>
                      <th style={styles.tableTh}>Gasto Comb.</th>
                      <th style={styles.tableTh}>Despesas</th>
                      <th style={styles.tableTh}>Custo Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpisPorPlaca.map((kpi, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#38bdf8' }}>{kpi.placa}</td>
                        <td style={{ padding: '12px 10px' }}>{kpi.qtdViagens}</td>
                        <td style={{ padding: '12px 10px' }}>{kpi.kmTotal.toLocaleString()} km</td>
                        <td style={{ padding: '12px 10px', color: Number(kpi.mediaKmPorLitro) > 0 ? '#4ade80' : '#cbd5e1' }}>{kpi.mediaKmPorLitro}</td>
                        <td style={{ padding: '12px 10px', color: '#f87171' }}>R$ {Number(kpi.combustivelMedioPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px 10px', color: '#fbbf24' }}>R$ {Number(kpi.despesaMediaPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#f43f5e' }}>R$ {Number(kpi.custoMedioPorViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
            <div style={{ ...styles.card, marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8', fontWeight: '600' }}>🚀 Iniciar Novo Diário de Bordo</h3>
              <form onSubmit={handleIniciarViagem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Placa</label>
                  <input type="text" placeholder="ABC-1234" value={formViagem.placa} onChange={e => setFormViagem({...formViagem, placa: e.target.value})} style={styles.input} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Operador</label>
                  <input type="text" value={formViagem.operador} onChange={e => setFormViagem({...formViagem, operador: e.target.value})} style={styles.input} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>KM Inicial</label>
                  <input type="number" placeholder="150000" value={formViagem.kmInicial} onChange={e => setFormViagem({...formViagem, kmInicial: e.target.value})} style={styles.input} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Origem / Carregamento</label>
                  <input type="text" placeholder="Fazenda / Local" value={formViagem.localCarregamento} onChange={e => setFormViagem({...formViagem, localCarregamento: e.target.value})} style={styles.input} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Destino</label>
                  <input type="text" placeholder="Cliente / Cidade" value={formViagem.clienteDestino} onChange={e => setFormViagem({...formViagem, clienteDestino: e.target.value})} style={styles.input} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Produto</label>
                  <input type="text" placeholder="Soja, Milho..." value={formViagem.produto} onChange={e => setFormViagem({...formViagem, produto: e.target.value})} style={styles.input} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Peso (Kg)</label>
                  <input type="number" step="0.01" placeholder="50000" value={formViagem.pesoCarregado} onChange={e => setFormViagem({...formViagem, pesoCarregado: e.target.value})} style={styles.input} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Nota Fiscal</label>
                  <input type="text" placeholder="Nº NF" value={formViagem.notaFiscal} onChange={e => setFormViagem({...formViagem, notaFiscal: e.target.value})} style={styles.input} />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <button type="submit" style={{ ...styles.btnPrimary, width: '100%', padding: '12px' }}>Iniciar Diário</button>
                </div>
              </form>
            </div>
          ) : (
            /* Layout Viagem Ativa */
            <div style={{ ...styles.card, marginBottom: '24px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                  EM TRÂNSITO
                </span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>ID #{viagemAtiva.id}</span>
              </div>

              <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#f8fafc', fontWeight: '500' }}>
                Placa: <strong style={{ color: '#38bdf8' }}>{viagemAtiva.placa}</strong>
              </h3>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '13px', marginBottom: '10px' }}>
                  <div>📍 <strong>Origem:</strong> {viagemAtiva.local_carregamento}</div>
                  <div>🎯 <strong>Destino:</strong> {viagemAtiva.cliente_destino || 'N/D'}</div>
                  <div>📦 <strong>Produto:</strong> {viagemAtiva.produto || 'N/D'}</div>
                  <div>⚖️ <strong>Peso:</strong> {viagemAtiva.peso_carregado || '0'} kg</div>
                  <div>📄 <strong>NF:</strong> {viagemAtiva.nota_fiscal || 'N/D'}</div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  🏎️ <strong>KM Inicial:</strong> {viagemAtiva.km_inicial} km
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                
                {/* Card Abastecimentos */}
                <div style={{ border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '10px', padding: '12px', background: 'rgba(15, 23, 42, 0.6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '13px' }}>
                      ⛽ Combustível ({qtdAbastecimentos})
                    </span>
                    <button onClick={() => setModalListaAbastecimentosAberto(true)} style={{ ...styles.btnWarning, padding: '4px 8px', fontSize: '11px' }}>
                      Ver/Editar
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    <div><strong>Gasto:</strong> R$ {totalGastoAbastecimento.toFixed(2)}</div>
                    <div><strong>Litros:</strong> {totalLitrosAbastecimento.toFixed(2)} L</div>
                  </div>
                </div>

                {/* Card Outros Gastos */}
                <div style={{ border: '1px solid rgba(147, 51, 234, 0.4)', borderRadius: '10px', padding: '12px', background: 'rgba(15, 23, 42, 0.6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '13px' }}>
                      💸 Despesas ({qtdOutrasDespesas})
                    </span>
                    <button onClick={() => setModalListaDespesasAberto(true)} style={{ ...styles.btnPurple, padding: '4px 8px', fontSize: '11px' }}>
                      Ver/Editar
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    <div><strong>Gasto:</strong> R$ {totalGastoOutrasDespesas.toFixed(2)}</div>
                  </div>
                </div>

              </div>

              {/* Botões Inferiores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                <button onClick={() => { setAbastecimentoEditandoId(null); setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' }); setModalAbastecimentoAberto(true); }} style={styles.btnWarning}>
                  ⛽ + Abastecimento
                </button>
                <button onClick={() => { setDespesaEditandoId(null); setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' }); setModalDespesaAberto(true); }} style={styles.btnPurple}>
                  💸 + Despesa
                </button>
                <button onClick={() => setModalFinalizarAberto(true)} style={styles.btnSuccess}>
                  🏁 Finalizar
                </button>
              </div>

            </div>
          )}
        </>
      )}

      {/* HISTÓRICO DE VIAGENS FINALIZADAS */}
      <div style={styles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#e2e8f0', fontWeight: '600' }}>📖 Histórico de Diários</h3>
        {viagensFinalizadasFiltradas.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Nenhuma viagem finalizada encontrada com os filtros selecionados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '650px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={styles.tableTh}>Datas</th>
                  <th style={styles.tableTh}>Placa</th>
                  <th style={styles.tableTh}>Operador</th>
                  <th style={styles.tableTh}>Produto / Origem</th>
                  <th style={styles.tableTh}>KM</th>
                  <th style={styles.tableTh}>Pesos</th>
                  <th style={{ ...styles.tableTh, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {viagensFinalizadasFiltradas.map(v => {
                  const kmRodados = (v.km_final && v.km_inicial) ? (v.km_final - v.km_inicial) : 0;
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 10px', fontSize: '11px', color: '#cbd5e1' }}>
                        Início: {formatarData(v.created_at)}<br/>
                        Fim: {formatarData(v.finished_at || v.updated_at)}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#38bdf8' }}>{v.placa}</td>
                      <td style={{ padding: '12px 10px' }}>{v.operador || 'N/D'}</td>
                      <td style={{ padding: '12px 10px' }}>{v.produto || 'Geral'}<br/><span style={{ fontSize: '11px', color: '#94a3b8' }}>📍 {v.local_carregamento}</span></td>
                      <td style={{ padding: '12px 10px' }}>{kmRodados} km</td>
                      <td style={{ padding: '12px 10px', fontSize: '12px' }}>{v.peso_carregado?.toLocaleString()} / {v.peso_descarga?.toLocaleString()} kg</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => { setViagemSelecionada(v); setModalDetalhesAberto(true); }} style={{ ...styles.btnPrimary, padding: '6px 10px', fontSize: '11px' }}>Detalhes</button>
                          {tipoUsuario === 'GESTOR' && (
                            <button onClick={() => handleExcluirViagem(v.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Excluir</button>
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
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f87171', fontSize: '18px', fontWeight: '600' }}>💰 Custo Operacional por Placa</h3>
            
            <div style={{ overflowY: 'auto', flex: 1, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '450px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={styles.tableTh}>Placa</th>
                    <th style={styles.tableTh}>Viagens</th>
                    <th style={styles.tableTh}>Combustível</th>
                    <th style={styles.tableTh}>Despesas</th>
                    <th style={styles.tableTh}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {kpisPorPlaca.map((kpi, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#38bdf8' }}>{kpi.placa}</td>
                      <td style={{ padding: '10px' }}>{kpi.qtdViagens}</td>
                      <td style={{ padding: '10px', color: '#f87171' }}>R$ {kpi.gastoCombustivelTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px', color: '#fbbf24' }}>R$ {kpi.gastoOutrasDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#f43f5e' }}>R$ {kpi.gastoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              <button onClick={() => setModalCustoTotalAberto(false)} style={styles.btnSecondary}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - VIAGENS EM TRÂNSITO */}
      {modalEmTransitoAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '18px', fontWeight: '600' }}>🚚 Frota em Trânsito ({viagensEmTransitoCount})</h3>
              <input 
                type="text" 
                placeholder="Filtrar placa/motorista..." 
                value={filtroEmTransitoBusca}
                onChange={(e) => setFiltroEmTransitoBusca(e.target.value)}
                style={{ ...styles.input, width: 'auto' }}
              />
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={styles.tableTh}>Placa</th>
                    <th style={styles.tableTh}>Motorista</th>
                    <th style={styles.tableTh}>Origem/Destino</th>
                    <th style={{ ...styles.tableTh, textAlign: 'center' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {viagensEmTransitoFiltradas.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#f59e0b' }}>{v.placa}</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>{v.operador || 'N/D'}</td>
                      <td style={{ padding: '10px' }}>De: {v.local_carregamento}<br/>Para: {v.cliente_destino || 'N/D'}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button onClick={() => { setViagemSelecionada(v); setModalDetalhesAberto(true); }} style={{ ...styles.btnPrimary, padding: '4px 8px', fontSize: '11px' }}>Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right', borderTop: '1px solid #334155', paddingTop: '12px' }}>
              <button onClick={() => setModalEmTransitoAberto(false)} style={styles.btnSecondary}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE ABASTECIMENTOS */}
      {modalListaAbastecimentosAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>⛽ Abastecimentos</h3>
              <button onClick={() => { setModalListaAbastecimentosAberto(false); setAbastecimentoEditandoId(null); setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' }); setModalAbastecimentoAberto(true); }} style={styles.btnWarning}>
                + Novo
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={styles.tableTh}>Posto/NF</th>
                    <th style={styles.tableTh}>KM</th>
                    <th style={styles.tableTh}>Litros</th>
                    <th style={styles.tableTh}>Valor Total</th>
                    <th style={{ ...styles.tableTh, textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {abastInfoAtiva.lista.map((a, idx) => (
                    <tr key={a.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px' }}>{a.posto_combustivel || '-'}<br/><span style={{ fontSize: '10px', color: '#64748b' }}>NF: {a.numero_nota_combustivel || '-'}</span></td>
                      <td style={{ padding: '8px' }}>{a.km_abastecimento || '-'}</td>
                      <td style={{ padding: '8px' }}>{Number(a.litros_combustivel || 0).toFixed(2)} L</td>
                      <td style={{ padding: '8px', color: '#f59e0b', fontWeight: 'bold' }}>R$ {Number(a.valor_combustivel || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => handleEditarAbastecimentoItem(a)} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Editar</button>
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
              <button onClick={() => setModalListaAbastecimentosAberto(false)} style={styles.btnSecondary}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR / EDITAR ABASTECIMENTO */}
      {modalAbastecimentoAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '420px' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#f59e0b', fontSize: '16px', fontWeight: '600' }}>
              ⛽ {abastecimentoEditandoId ? 'Editar Abastecimento' : 'Novo Abastecimento'}
            </h3>
            <form onSubmit={handleSalvarAbastecimento}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Posto de Combustível</label>
                <input type="text" placeholder="Nome do Posto" value={formAbast.postoCombustivel} onChange={e => setFormAbast({...formAbast, postoCombustivel: e.target.value})} style={styles.input} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Número da Nota Fiscal</label>
                <input type="text" placeholder="Nº NF" value={formAbast.numeroNotaCombustivel} onChange={e => setFormAbast({...formAbast, numeroNotaCombustivel: e.target.value})} style={styles.input} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Valor (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formAbast.valorCombustivel} onChange={e => setFormAbast({...formAbast, valorCombustivel: e.target.value})} style={styles.input} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Litros</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formAbast.litrosCombustivel} onChange={e => setFormAbast({...formAbast, litrosCombustivel: e.target.value})} style={styles.input} required />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>KM Abastecimento</label>
                <input type="number" step="0.1" placeholder="150250" value={formAbast.kmAbastecimento} onChange={e => setFormAbast({...formAbast, kmAbastecimento: e.target.value})} style={styles.input} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <button type="submit" style={styles.btnWarning}>
                  {abastecimentoEditandoId ? 'Atualizar' : 'Salvar'}
                </button>
                <button type="button" onClick={() => { setModalAbastecimentoAberto(false); setAbastecimentoEditandoId(null); }} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR DESPESA */}
      {modalDespesaAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#c084fc', fontSize: '16px', fontWeight: '600' }}>
              {despesaEditandoId ? '✏️ Editar Despesa' : '💸 Nova Despesa'}
            </h3>
            <form onSubmit={handleSalvarDespesa}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Tipo</label>
                <input type="text" placeholder="Pedágio, Borracharia..." value={formDesp.tipo} onChange={e => setFormDesp({...formDesp, tipo: e.target.value})} style={styles.input} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Valor (R$)</label>
                <input type="number" step="0.01" value={formDesp.valor} onChange={e => setFormDesp({...formDesp, valor: e.target.value})} style={styles.input} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Descrição</label>
                <input type="text" value={formDesp.descricao} onChange={e => setFormDesp({...formDesp, descricao: e.target.value})} style={styles.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="submit" style={styles.btnPurple}>
                  {despesaEditandoId ? 'Atualizar' : 'Salvar'}
                </button>
                <button type="button" onClick={() => { setModalDespesaAberto(false); setDespesaEditandoId(null); }} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE DESPESAS */}
      {modalListaDespesasAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>💸 Despesas da Viagem</h3>
              <button onClick={() => { setModalListaDespesasAberto(false); setDespesaEditandoId(null); setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' }); setModalDespesaAberto(true); }} style={styles.btnPurple}>
                + Adicionar
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '350px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={styles.tableTh}>Tipo</th>
                    <th style={styles.tableTh}>Descrição</th>
                    <th style={styles.tableTh}>Valor</th>
                    <th style={{ ...styles.tableTh, textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(viagemAtiva?.despesas_viagem || []).map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px' }}>{d.tipo}</td>
                      <td style={{ padding: '8px' }}>{d.descricao || '-'}</td>
                      <td style={{ padding: '8px', color: '#f87171', fontWeight: 'bold' }}>R$ {Number(d.valor).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => handleEditarDespesaItem(d)} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Editar</button>
                          <button onClick={() => handleExcluirDespesaItem(d.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Excl.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button onClick={() => setModalListaDespesasAberto(false)} style={styles.btnSecondary}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR VIAGEM */}
      {modalFinalizarAberto && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '420px' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#4ade80', fontSize: '16px', fontWeight: '600' }}>
              🏁 Finalizar Viagem
            </h3>
            <form onSubmit={handleConcluirViagem}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>KM Final de Chegada</label>
                <input type="number" placeholder="KM Chegada" value={formFim.kmFinal} onChange={e => setFormFim({...formFim, kmFinal: e.target.value})} style={styles.input} required />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Local Descarga</label>
                <input type="text" placeholder="Local / Cliente" value={formFim.localDescarga} onChange={e => setFormFim({...formFim, localDescarga: e.target.value})} style={styles.input} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Peso Descarga (Kg)</label>
                <input type="number" step="0.01" placeholder="25000" value={formFim.pesoDescarga} onChange={e => setFormFim({...formFim, pesoDescarga: e.target.value})} style={styles.input} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <button type="submit" style={styles.btnSuccess}>Finalizar</button>
                <button type="button" onClick={() => setModalFinalizarAberto(false)} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES COMPLETO (GESTOR COM EDIÇÃO TOTAL DE DADOS, ABASTECIMENTOS E DESPESAS) */}
      {modalDetalhesAberto && viagemSelecionada && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#38bdf8' }}>
                📋 Detalhes do Diário - Placa {viagemSelecionada.placa}
              </h3>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '12px', color: '#94a3b8' }}>
                ID #{viagemSelecionada.id}
              </span>
            </div>
            
            {tipoUsuario === 'GESTOR' ? (
              <form onSubmit={handleSalvarEdicaoGestor} style={{ marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '14px', fontWeight: '600' }}>✏️ Edição Geral de Dados</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Placa</label>
                    <input type="text" value={formEdicaoGestor.placa} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, placa: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Operador</label>
                    <input type="text" value={formEdicaoGestor.operador} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, operador: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>KM Inicial</label>
                    <input type="number" value={formEdicaoGestor.km_inicial} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, km_inicial: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>KM Final</label>
                    <input type="number" value={formEdicaoGestor.km_final} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, km_final: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Carregamento</label>
                    <input type="text" value={formEdicaoGestor.local_carregamento} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, local_carregamento: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Descarga</label>
                    <input type="text" value={formEdicaoGestor.local_descarga} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, local_descarga: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Cliente / Destino</label>
                    <input type="text" value={formEdicaoGestor.cliente_destino} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, cliente_destino: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Produto</label>
                    <input type="text" value={formEdicaoGestor.produto} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, produto: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Peso Carregado</label>
                    <input type="number" step="0.01" value={formEdicaoGestor.peso_carregado} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, peso_carregado: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Peso Descarga</label>
                    <input type="number" step="0.01" value={formEdicaoGestor.peso_descarga} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, peso_descarga: e.target.value})} style={styles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px' }}>Nota Fiscal</label>
                    <input type="text" value={formEdicaoGestor.nota_fiscal} onChange={e => setFormEdicaoGestor({...formEdicaoGestor, nota_fiscal: e.target.value})} style={styles.input} />
                  </div>
                </div>
                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                  <button type="submit" style={styles.btnSuccess}>
                    💾 Salvar Alterações Gerais
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '13px', marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px' }}>
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
            )}

            {/* GERENCIAMENTO DE ABASTECIMENTOS NO MODAL DE DETALHES */}
            <div style={{ marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ color: '#f59e0b', margin: 0, fontSize: '14px', fontWeight: '600' }}>⛽ Abastecimentos da Viagem</h4>
                {tipoUsuario === 'GESTOR' && (
                  <button onClick={() => { setAbastecimentoEditandoId(null); setFormAbast({ kmAbastecimento: '', litrosCombustivel: '', valorCombustivel: '', postoCombustivel: '', numeroNotaCombustivel: '' }); setModalAbastecimentoAberto(true); }} style={{ ...styles.btnWarning, padding: '4px 8px', fontSize: '11px' }}>
                    + Adicionar Abastecimento
                  </button>
                )}
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                {getTotaisAbastecimento(viagemSelecionada).lista.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Nenhum abastecimento registrado.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th style={styles.tableTh}>Posto / NF</th>
                        <th style={styles.tableTh}>KM</th>
                        <th style={styles.tableTh}>Litros</th>
                        <th style={styles.tableTh}>Valor</th>
                        {tipoUsuario === 'GESTOR' && <th style={{ ...styles.tableTh, textAlign: 'center' }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {getTotaisAbastecimento(viagemSelecionada).lista.map((ab, idx) => (
                        <tr key={ab.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px' }}>{ab.posto_combustivel || '-'}<br/><span style={{ fontSize: '10px', color: '#64748b' }}>NF: {ab.numero_nota_combustivel || '-'}</span></td>
                          <td style={{ padding: '8px' }}>{ab.km_abastecimento || '-'}</td>
                          <td style={{ padding: '8px' }}>{Number(ab.litros_combustivel || 0).toFixed(2)} L</td>
                          <td style={{ padding: '8px', color: '#f59e0b', fontWeight: 'bold' }}>R$ {Number(ab.valor_combustivel || 0).toFixed(2)}</td>
                          {tipoUsuario === 'GESTOR' && (
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button onClick={() => handleEditarAbastecimentoItem(ab)} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Editar</button>
                                {ab.id !== 'legado' && (
                                  <button onClick={() => handleExcluirAbastecimentoItem(ab.id, viagemSelecionada)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Excl.</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* GERENCIAMENTO DE DESPESAS NO MODAL DE DETALHES */}
            <div style={{ marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ color: '#c084fc', margin: 0, fontSize: '14px', fontWeight: '600' }}>💸 Despesas Adicionais</h4>
                {tipoUsuario === 'GESTOR' && (
                  <button onClick={() => { setDespesaEditandoId(null); setFormDesp({ tipo: 'Pedágio', valor: '', descricao: '' }); setModalDespesaAberto(true); }} style={{ ...styles.btnPurple, padding: '4px 8px', fontSize: '11px' }}>
                    + Adicionar Despesa
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                {(viagemSelecionada.despesas_viagem || []).length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Nenhuma despesa lançada.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th style={styles.tableTh}>Tipo</th>
                        <th style={styles.tableTh}>Descrição</th>
                        <th style={styles.tableTh}>Valor</th>
                        {tipoUsuario === 'GESTOR' && <th style={{ ...styles.tableTh, textAlign: 'center' }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(viagemSelecionada.despesas_viagem || []).map(d => (
                        <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px' }}>{d.tipo}</td>
                          <td style={{ padding: '8px' }}>{d.descricao || '-'}</td>
                          <td style={{ padding: '8px', color: '#f87171', fontWeight: 'bold' }}>R$ {Number(d.valor).toFixed(2)}</td>
                          {tipoUsuario === 'GESTOR' && (
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button onClick={() => handleEditarDespesaItem(d)} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Editar</button>
                                <button onClick={() => handleExcluirDespesaItem(d.id, viagemSelecionada)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>Excl.</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button onClick={() => setModalDetalhesAberto(false)} style={styles.btnSecondary}>Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}