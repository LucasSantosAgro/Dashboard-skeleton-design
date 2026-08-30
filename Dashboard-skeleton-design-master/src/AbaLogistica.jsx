import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

export default function AbaLogistica() {
  const [loading, setLoading] = useState(false);
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [listaAbastecimentos, setListaAbastecimentos] = useState([]);
  const [listaDespesas, setListaDespesas] = useState([]);
  const [historicoViagens, setHistoricoViagens] = useState([]);

  // Form Nova Viagem
  const [novaViagem, setNovaViagem] = useState({
    placa: '',
    operador: '',
    km_inicial: '',
    local_carregamento: '',
    cliente_destino: '',
    produto: '',
    peso_carregado: ''
  });

  // Modais de Criação / Finalização
  const [modalNovoAbastecimento, setModalNovoAbastecimento] = useState(false);
  const [modalNovaDespesa, setModalNovaDespesa] = useState(false);
  const [modalListaAbastecimentos, setModalListaAbastecimentos] = useState(false);
  const [modalListaDespesas, setModalListaDespesas] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);

  // Estados para Edição
  const [itemEdicaoAbastecimento, setItemEdicaoAbastecimento] = useState(null);
  const [itemEdicaoDespesa, setItemEdicaoDespesa] = useState(null);

  // Forms de Inclusão
  const [abastecimento, setAbastecimento] = useState({
    posto_combustivel: '',
    numero_nota_combustivel: '',
    valor_combustivel: '',
    litros_combustivel: '',
    km_abastecimento: '',
    foto: null
  });

  const [despesa, setDespesa] = useState({
    outros_gastos: '',
    descricao_outros_gastos: ''
  });

  const [encerramento, setEncerramento] = useState({
    km_final: '',
    local_descarga: '',
    peso_descarga: '',
    foto: null
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: ativa } = await supabase
        .from('diario_bordo')
        .select('*')
        .eq('status', 'EM_TRANSITO')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setViagemAtiva(ativa || null);

      if (ativa) {
        const { data: abast } = await supabase
          .from('abastecimentos')
          .select('*')
          .eq('diario_bordo_id', ativa.id)
          .order('created_at', { ascending: false });

        const { data: desp } = await supabase
          .from('despesas_viagem')
          .select('*')
          .eq('diario_bordo_id', ativa.id)
          .order('created_at', { ascending: false });

        setListaAbastecimentos(abast || []);
        setListaDespesas(desp || []);
      }

      const { data: historico } = await supabase
        .from('diario_bordo')
        .select('*')
        .eq('status', 'FINALIZADA')
        .order('created_at', { ascending: false });

      setHistoricoViagens(historico || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadImagem(file, pasta) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('comprovantes-logistica')
      .upload(fileName, file);

    if (uploadError) return null;

    const { data } = supabase.storage
      .from('comprovantes-logistica')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // --- VIAGEM ---
  async function handleIniciarViagem(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('diario_bordo').insert([{
      ...novaViagem,
      km_inicial: Number(novaViagem.km_inicial),
      peso_carregado: novaViagem.peso_carregado ? Number(novaViagem.peso_carregado) : null,
      status: 'EM_TRANSITO'
    }]);

    if (error) {
      alert('Erro ao iniciar viagem: ' + error.message);
    } else {
      setNovaViagem({ placa: '', operador: '', km_inicial: '', local_carregamento: '', cliente_destino: '', produto: '', peso_carregado: '' });
      carregarDados();
    }
    setLoading(false);
  }

  // --- ABASTECIMENTO (CRIAR E EDITAR) ---
  async function handleRegistrarAbastecimento(e) {
    e.preventDefault();
    setLoading(true);

    let fotoUrl = null;
    if (abastecimento.foto) {
      fotoUrl = await uploadImagem(abastecimento.foto, 'abastecimentos');
    }

    const { error } = await supabase
      .from('abastecimentos')
      .insert([{
        diario_bordo_id: viagemAtiva.id,
        posto_combustivel: abastecimento.posto_combustivel,
        numero_nota_combustivel: abastecimento.numero_nota_combustivel,
        valor_combustivel: Number(abastecimento.valor_combustivel),
        litros_combustivel: Number(abastecimento.litros_combustivel),
        km_abastecimento: abastecimento.km_abastecimento ? Number(abastecimento.km_abastecimento) : null,
        foto_nota_combustivel_url: fotoUrl
      }]);

    if (error) {
      alert('Erro ao registrar abastecimento: ' + error.message);
    } else {
      alert('Novo abastecimento registrado!');
      setModalNovoAbastecimento(false);
      setAbastecimento({ posto_combustivel: '', numero_nota_combustivel: '', valor_combustivel: '', litros_combustivel: '', km_abastecimento: '', foto: null });
      carregarDados();
    }
    setLoading(false);
  }

  async function handleSalvarEdicaoAbastecimento(e) {
    e.preventDefault();
    setLoading(true);

    let fotoUrl = itemEdicaoAbastecimento.foto_nota_combustivel_url;
    if (itemEdicaoAbastecimento.novaFoto) {
      const url = await uploadImagem(itemEdicaoAbastecimento.novaFoto, 'abastecimentos');
      if (url) fotoUrl = url;
    }

    const { error } = await supabase
      .from('abastecimentos')
      .update({
        posto_combustivel: itemEdicaoAbastecimento.posto_combustivel,
        numero_nota_combustivel: itemEdicaoAbastecimento.numero_nota_combustivel,
        valor_combustivel: Number(itemEdicaoAbastecimento.valor_combustivel),
        litros_combustivel: Number(itemEdicaoAbastecimento.litros_combustivel),
        km_abastecimento: itemEdicaoAbastecimento.km_abastecimento ? Number(itemEdicaoAbastecimento.km_abastecimento) : null,
        foto_nota_combustivel_url: fotoUrl
      })
      .eq('id', itemEdicaoAbastecimento.id);

    if (error) {
      alert('Erro ao atualizar abastecimento: ' + error.message);
    } else {
      alert('Abastecimento atualizado!');
      setItemEdicaoAbastecimento(null);
      carregarDados();
    }
    setLoading(false);
  }

  async function handleExcluirAbastecimento(id) {
    if (!confirm('Deseja realmente excluir este abastecimento?')) return;
    setLoading(true);

    const { error } = await supabase
      .from('abastecimentos')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      carregarDados();
    }
    setLoading(false);
  }

  // --- DESPESAS (CRIAR E EDITAR) ---
  async function handleRegistrarDespesa(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('despesas_viagem')
      .insert([{
        diario_bordo_id: viagemAtiva.id,
        outros_gastos: Number(despesa.outros_gastos),
        descricao_outros_gastos: despesa.descricao_outros_gastos
      }]);

    if (error) {
      alert('Erro ao registrar despesa: ' + error.message);
    } else {
      alert('Nova despesa registrada!');
      setModalNovaDespesa(false);
      setDespesa({ outros_gastos: '', descricao_outros_gastos: '' });
      carregarDados();
    }
    setLoading(false);
  }

  async function handleSalvarEdicaoDespesa(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('despesas_viagem')
      .update({
        outros_gastos: Number(itemEdicaoDespesa.outros_gastos),
        descricao_outros_gastos: itemEdicaoDespesa.descricao_outros_gastos
      })
      .eq('id', itemEdicaoDespesa.id);

    if (error) {
      alert('Erro ao atualizar despesa: ' + error.message);
    } else {
      alert('Despesa atualizada!');
      setItemEdicaoDespesa(null);
      carregarDados();
    }
    setLoading(false);
  }

  async function handleExcluirDespesa(id) {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;
    setLoading(true);

    const { error } = await supabase
      .from('despesas_viagem')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir despesa: ' + error.message);
    } else {
      carregarDados();
    }
    setLoading(false);
  }

  // --- FINALIZAR VIAGEM ---
  async function handleFinalizarViagem(e) {
    e.preventDefault();
    setLoading(true);

    let fotoUrl = null;
    if (encerramento.foto) {
      fotoUrl = await uploadImagem(encerramento.foto, 'descargas');
    }

    const { error } = await supabase
      .from('diario_bordo')
      .update({
        km_final: Number(encerramento.km_final),
        local_descarga: encerramento.local_descarga,
        peso_descarga: Number(encerramento.peso_descarga),
        foto_descarga_url: fotoUrl,
        status: 'FINALIZADA'
      })
      .eq('id', viagemAtiva.id);

    if (error) {
      alert('Erro ao finalizar viagem: ' + error.message);
    } else {
      alert('Viagem finalizada!');
      setModalFinalizar(false);
      setEncerramento({ km_final: '', local_descarga: '', peso_descarga: '', foto: null });
      carregarDados();
    }
    setLoading(false);
  }

  const totalGastoCombustivel = listaAbastecimentos.reduce((acc, curr) => acc + (Number(curr.valor_combustivel) || 0), 0);
  const totalLitrosCombustivel = listaAbastecimentos.reduce((acc, curr) => acc + (Number(curr.litros_combustivel) || 0), 0);
  const totalOutrosGastos = listaDespesas.reduce((acc, curr) => acc + (Number(curr.outros_gastos) || 0), 0);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #3b82f6',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#93c5fd'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', color: '#f8fafc' }}>
      <h2 style={{ color: '#ffffff', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        🚛 Gestão de Logística & Diário de Bordo
      </h2>

      {viagemAtiva ? (
        <div style={{ background: '#1e293b', border: '2px solid #3b82f6', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
              VIAGEM EM TRÂNSITO
            </span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>ID #{viagemAtiva.id}</span>
          </div>

          <h3 style={{ color: '#ffffff', margin: '10px 0' }}>
            Placa: <span style={{ color: '#60a5fa' }}>{viagemAtiva.placa}</span> | Motorista: <span style={{ color: '#60a5fa' }}>{viagemAtiva.operador || 'Não informado'}</span>
          </h3>

          <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px', color: '#cbd5e1', border: '1px solid #334155' }}>
            <p style={{ margin: 0 }}>📍 <strong>Embarque:</strong> {viagemAtiva.local_carregamento || '-'}</p>
            <p style={{ margin: 0 }}>🎯 <strong>Destino:</strong> {viagemAtiva.cliente_destino || '-'}</p>
            <p style={{ margin: 0 }}>📦 <strong>Produto:</strong> {viagemAtiva.produto || '-'}</p>
            <p style={{ margin: 0 }}>⚖️ <strong>Peso Carga:</strong> {viagemAtiva.peso_carregado || '-'}</p>
            <p style={{ margin: 0 }}>🏎️ <strong>KM Inicial:</strong> {viagemAtiva.km_inicial} km</p>
          </div>

          {/* CARDS CLICÁVEIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            
            {/* Card Abastecimento */}
            <div 
              onClick={() => setModalListaAbastecimentos(true)}
              style={{ background: '#0f172a', border: '1px solid #d97706', borderRadius: '8px', padding: '15px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: '#f59e0b', margin: 0 }}>⛽ Abastecimentos ({listaAbastecimentos.length})</h4>
                <span style={{ fontSize: '11px', background: '#d97706', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Ver / Editar</span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#e2e8f0' }}>
                <p style={{ margin: '4px 0' }}><strong>Total Gasto:</strong> R$ {totalGastoCombustivel.toFixed(2)}</p>
                <p style={{ margin: '4px 0' }}><strong>Total Litros:</strong> {totalLitrosCombustivel.toFixed(2)} L</p>
              </div>
            </div>

            {/* Card Despesas */}
            <div 
              onClick={() => setModalListaDespesas(true)}
              style={{ background: '#0f172a', border: '1px solid #9333ea', borderRadius: '8px', padding: '15px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: '#c084fc', margin: 0 }}>💸 Outros Gastos ({listaDespesas.length})</h4>
                <span style={{ fontSize: '11px', background: '#9333ea', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Ver / Editar</span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#e2e8f0' }}>
                <p style={{ margin: '4px 0' }}><strong>Total Gastos:</strong> R$ {totalOutrosGastos.toFixed(2)}</p>
              </div>
            </div>

          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setModalNovoAbastecimento(true)}
              style={{ flex: '1 1 180px', padding: '12px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⛽ + Novo Abastecimento
            </button>
            <button 
              onClick={() => setModalNovaDespesa(true)}
              style={{ flex: '1 1 180px', padding: '12px 18px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              💸 + Nova Despesa
            </button>
            <button 
              onClick={() => setModalFinalizar(true)}
              style={{ flex: '1 1 180px', padding: '12px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              🏁 Finalizar Viagem
            </button>
          </div>
        </div>
      ) : (
        /* Form Nova Viagem */
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '30px' }}>
          <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '20px' }}>🚀 Iniciar Nova Viagem</h3>
          <form onSubmit={handleIniciarViagem} style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <label style={labelStyle}>Veículo / Placa</label>
              <input type="text" placeholder="Ex: ABC-1234" required value={novaViagem.placa} onChange={e => setNovaViagem({...novaViagem, placa: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Operador / Motorista</label>
              <input type="text" placeholder="Nome do Motorista" value={novaViagem.operador} onChange={e => setNovaViagem({...novaViagem, operador: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>KM Inicial</label>
              <input type="number" step="0.1" placeholder="Ex: 150000" required value={novaViagem.km_inicial} onChange={e => setNovaViagem({...novaViagem, km_inicial: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Local do Embarque</label>
              <input type="text" placeholder="Origem / Fazenda" value={novaViagem.local_carregamento} onChange={e => setNovaViagem({...novaViagem, local_carregamento: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cliente Destino</label>
              <input type="text" placeholder="Cidade / Cliente" value={novaViagem.cliente_destino} onChange={e => setNovaViagem({...novaViagem, cliente_destino: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Produto</label>
              <input type="text" placeholder="Ex: Soja, Milho" value={novaViagem.produto} onChange={e => setNovaViagem({...novaViagem, produto: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Peso Carregado</label>
              <input type="number" step="0.01" placeholder="Kg ou Toneladas" value={novaViagem.peso_carregado} onChange={e => setNovaViagem({...novaViagem, peso_carregado: e.target.value})} style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{ gridColumn: '1 / -1', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
              {loading ? 'Salvando...' : 'Iniciar Viagem'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL NOVO ABASTECIMENTO */}
      {modalNovoAbastecimento && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '450px', color: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#f59e0b' }}>⛽ Adicionar Abastecimento</h3>
            <form onSubmit={handleRegistrarAbastecimento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Posto de Combustível</label>
                <input type="text" placeholder="Nome do Posto" value={abastecimento.posto_combustivel} onChange={e => setAbastecimento({...abastecimento, posto_combustivel: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Número da Nota Fiscal</label>
                <input type="text" placeholder="Nº NF" required value={abastecimento.numero_nota_combustivel} onChange={e => setAbastecimento({...abastecimento, numero_nota_combustivel: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Valor Total (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={abastecimento.valor_combustivel} onChange={e => setAbastecimento({...abastecimento, valor_combustivel: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Litros</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={abastecimento.litros_combustivel} onChange={e => setAbastecimento({...abastecimento, litros_combustivel: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>KM do Abastecimento</label>
                <input type="number" step="0.1" placeholder="Ex: 150250" value={abastecimento.km_abastecimento} onChange={e => setAbastecimento({...abastecimento, km_abastecimento: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Foto da Nota Fiscal</label>
                <input type="file" accept="image/*" onChange={e => setAbastecimento({...abastecimento, foto: e.target.files[0]})} style={{ color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
                <button type="button" onClick={() => setModalNovoAbastecimento(false)} style={{ flex: 1, padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE ABASTECIMENTOS COM EDIÇÃO */}
      {modalListaAbastecimentos && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '650px', color: '#fff', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#f59e0b' }}>⛽ Histórico de Abastecimentos</h3>
            
            {listaAbastecimentos.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Nenhum abastecimento registrado nesta viagem.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {listaAbastecimentos.map((item) => (
                  <div key={item.id} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                    
                    {itemEdicaoAbastecimento?.id === item.id ? (
                      /* FORM DE EDIÇÃO DO ABASTECIMENTO */
                      <form onSubmit={handleSalvarEdicaoAbastecimento} style={{ display: 'grid', gap: '10px' }}>
                        <div>
                          <label style={labelStyle}>Posto</label>
                          <input type="text" value={itemEdicaoAbastecimento.posto_combustivel} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, posto_combustivel: e.target.value})} style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={labelStyle}>Nº NF</label>
                            <input type="text" value={itemEdicaoAbastecimento.numero_nota_combustivel} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, numero_nota_combustivel: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Valor (R$)</label>
                            <input type="number" step="0.01" value={itemEdicaoAbastecimento.valor_combustivel} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, valor_combustivel: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Litros</label>
                            <input type="number" step="0.01" value={itemEdicaoAbastecimento.litros_combustivel} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, litros_combustivel: e.target.value})} style={inputStyle} />
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Trocar Foto</label>
                          <input type="file" accept="image/*" onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, novaFoto: e.target.files[0]})} style={{ color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Salvar Alterações</button>
                          <button type="button" onClick={() => setItemEdicaoAbastecimento(null)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      /* EXIBIÇÃO NORMAL */
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: '#f59e0b' }}>{item.posto_combustivel || 'Posto não informado'}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setItemEdicaoAbastecimento(item)} style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                            <button onClick={() => handleExcluirAbastecimento(item.id)} style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Excluir</button>
                          </div>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>NF:</strong> {item.numero_nota_combustivel || '-'} | <strong>Valor:</strong> R$ {Number(item.valor_combustivel || 0).toFixed(2)} | <strong>Litros:</strong> {item.litros_combustivel} L</p>
                        <p style={{ margin: '4px 0', fontSize: '13px', color: '#94a3b8' }}><strong>KM:</strong> {item.km_abastecimento || '-'} km</p>
                        {item.foto_nota_combustivel_url && (
                          <a href={item.foto_nota_combustivel_url} target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', fontSize: '12px', display: 'inline-block', marginTop: '6px' }}>📷 Ver Comprovante Anexado</a>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setModalListaAbastecimentos(false); setItemEdicaoAbastecimento(null); }} style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* MODAL NOVA DESPESA */}
      {modalNovaDespesa && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '450px', color: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#c084fc' }}>💸 Adicionar Outros Gastos</h3>
            <form onSubmit={handleRegistrarDespesa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Valor do Gasto (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" required value={despesa.outros_gastos} onChange={e => setDespesa({...despesa, outros_gastos: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <input type="text" placeholder="Ex: Alimentação, Pedágio" value={despesa.descricao_outros_gastos} onChange={e => setDespesa({...despesa, descricao_outros_gastos: e.target.value})} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
                <button type="button" onClick={() => setModalNovaDespesa(false)} style={{ flex: 1, padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LISTA DE DESPESAS COM EDIÇÃO */}
      {modalListaDespesas && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '600px', color: '#fff', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#c084fc' }}>💸 Histórico de Despesas</h3>
            
            {listaDespesas.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Nenhuma despesa registrada nesta viagem.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {listaDespesas.map((item) => (
                  <div key={item.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    
                    {itemEdicaoDespesa?.id === item.id ? (
                      /* FORM DE EDIÇÃO DE DESPESA */
                      <form onSubmit={handleSalvarEdicaoDespesa} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <label style={labelStyle}>Valor (R$)</label>
                          <input type="number" step="0.01" value={itemEdicaoDespesa.outros_gastos} onChange={e => setItemEdicaoDespesa({...itemEdicaoDespesa, outros_gastos: e.target.value})} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Descrição</label>
                          <input type="text" value={itemEdicaoDespesa.descricao_outros_gastos} onChange={e => setItemEdicaoDespesa({...itemEdicaoDespesa, descricao_outros_gastos: e.target.value})} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
                          <button type="button" onClick={() => setItemEdicaoDespesa(null)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      /* EXIBIÇÃO NORMAL */
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ margin: 0, color: '#c084fc', fontWeight: 'bold', fontSize: '15px' }}>R$ {Number(item.outros_gastos || 0).toFixed(2)}</p>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setItemEdicaoDespesa(item)} style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                            <button onClick={() => handleExcluirDespesa(item.id)} style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Excluir</button>
                          </div>
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#e2e8f0' }}>{item.descricao_outros_gastos || 'Sem descrição'}</p>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setModalListaDespesas(false); setItemEdicaoDespesa(null); }} style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR VIAGEM */}
      {modalFinalizar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '450px', color: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#4ade80' }}>🏁 Finalizar Viagem</h3>
            <form onSubmit={handleFinalizarViagem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>KM Final de Chegada</label>
                <input type="number" placeholder="KM Chegada" required value={encerramento.km_final} onChange={e => setEncerramento({...encerramento, km_final: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Local Descarga</label>
                <input type="text" placeholder="Local de destino / Descarga" required value={encerramento.local_descarga} onChange={e => setEncerramento({...encerramento, local_descarga: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Peso Descarga</label>
                <input type="number" step="0.01" placeholder="Ex: 25000" required value={encerramento.peso_descarga} onChange={e => setEncerramento({...encerramento, peso_descarga: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Comprovante de Descarga (Foto)</label>
                <input type="file" accept="image/*" onChange={e => setEncerramento({...encerramento, foto: e.target.files[0]})} style={{ color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Finalizar</button>
                <button type="button" onClick={() => setModalFinalizar(false)} style={{ flex: 1, padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTÓRICO DE VIAGENS FINALIZADAS */}
      <h3 style={{ color: '#ffffff', marginTop: '40px' }}>📜 Histórico de Viagens Encerradas</h3>
      {historicoViagens.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Nenhuma viagem encerrada ainda.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#334155', color: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Placa</th>
                <th style={{ padding: '12px' }}>Operador</th>
                <th style={{ padding: '12px' }}>Produto</th>
                <th style={{ padding: '12px' }}>KM Rodados</th>
                <th style={{ padding: '12px' }}>Peso Descarga</th>
              </tr>
            </thead>
            <tbody>
              {historicoViagens.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #334155', color: '#cbd5e1' }}>
                  <td style={{ padding: '12px' }}>{v.placa}</td>
                  <td style={{ padding: '12px' }}>{v.operador || '-'}</td>
                  <td style={{ padding: '12px' }}>{v.produto || '-'}</td>
                  <td style={{ padding: '12px' }}>{(v.km_final && v.km_inicial) ? (v.km_final - v.km_inicial) : 0} km</td>
                  <td style={{ padding: '12px' }}>{v.peso_descarga || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}