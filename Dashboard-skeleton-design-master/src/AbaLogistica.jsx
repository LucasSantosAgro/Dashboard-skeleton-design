import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

export default function AbaLogistica() {
  const [loading, setLoading] = useState(false);
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [historicoViagens, setHistoricoViagens] = useState([]);

  // Formulário de Nova Viagem
  const [novaViagem, setNovaViagem] = useState({
    placa: '',
    operador: '',
    km_inicial: '',
    local_carregamento: '',
    cliente_destino: '',
    produto: '',
    peso_carregado: ''
  });

  // Modais
  const [modalAbastecimento, setModalAbastecimento] = useState(false);
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);

  // Modal Abastecimento Completo
  const [abastecimento, setAbastecimento] = useState({
    posto_combustivel: '',
    numero_nota_combustivel: '',
    valor_combustivel: '',
    litros_combustivel: '',
    km_abastecimento: '',
    foto: null
  });

  // Modal Despesa
  const [despesa, setDespesa] = useState({
    outros_gastos: '',
    descricao_outros_gastos: ''
  });

  // Modal Encerramento
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

  // Funções para abrir modais preenchendo os dados existentes
  function abrirModalAbastecimento() {
    if (viagemAtiva) {
      setAbastecimento({
        posto_combustivel: viagemAtiva.posto_combustivel || '',
        numero_nota_combustivel: viagemAtiva.numero_nota_combustivel || '',
        valor_combustivel: viagemAtiva.valor_combustivel || '',
        litros_combustivel: viagemAtiva.litros_combustivel || '',
        km_abastecimento: viagemAtiva.km_abastecimento || '',
        foto: null
      });
    }
    setModalAbastecimento(true);
  }

  function abrirModalDespesa() {
    if (viagemAtiva) {
      setDespesa({
        outros_gastos: viagemAtiva.outros_gastos || '',
        descricao_outros_gastos: viagemAtiva.descricao_outros_gastos || ''
      });
    }
    setModalDespesa(true);
  }

  async function uploadImagem(file, pasta) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('comprovantes-logistica')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('comprovantes-logistica')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

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
      setNovaViagem({
        placa: '',
        operador: '',
        km_inicial: '',
        local_carregamento: '',
        cliente_destino: '',
        produto: '',
        peso_carregado: ''
      });
      carregarDados();
    }
    setLoading(false);
  }

  async function handleRegistrarAbastecimento(e) {
    e.preventDefault();
    setLoading(true);

    let fotoUrl = viagemAtiva?.foto_nota_combustivel_url || null;
    if (abastecimento.foto) {
      fotoUrl = await uploadImagem(abastecimento.foto, 'abastecimentos');
    }

    const { error } = await supabase
      .from('diario_bordo')
      .update({
        posto_combustivel: abastecimento.posto_combustivel,
        numero_nota_combustivel: abastecimento.numero_nota_combustivel,
        valor_combustivel: Number(abastecimento.valor_combustivel),
        litros_combustivel: Number(abastecimento.litros_combustivel),
        km_abastecimento: abastecimento.km_abastecimento ? Number(abastecimento.km_abastecimento) : null,
        foto_nota_combustivel_url: fotoUrl
      })
      .eq('id', viagemAtiva.id);

    if (error) {
      alert('Erro ao registrar abastecimento: ' + error.message);
    } else {
      alert('Abastecimento registrado com sucesso!');
      setModalAbastecimento(false);
      carregarDados();
    }
    setLoading(false);
  }

  async function handleRegistrarDespesa(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('diario_bordo')
      .update({
        outros_gastos: Number(despesa.outros_gastos),
        descricao_outros_gastos: despesa.descricao_outros_gastos
      })
      .eq('id', viagemAtiva.id);

    if (error) {
      alert('Erro ao registrar despesa: ' + error.message);
    } else {
      alert('Despesa registrada com sucesso!');
      setModalDespesa(false);
      carregarDados();
    }
    setLoading(false);
  }

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
      alert('Viagem finalizada com sucesso!');
      setModalFinalizar(false);
      setEncerramento({ km_final: '', local_descarga: '', peso_descarga: '', foto: null });
      carregarDados();
    }
    setLoading(false);
  }

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

      {/* PAINEL DE VIAGEM ATIVA */}
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
          
          {/* Dados do Embarque */}
          <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px', color: '#cbd5e1', border: '1px solid #334155' }}>
            <p style={{ margin: 0 }}>📍 <strong>Embarque:</strong> {viagemAtiva.local_carregamento || '-'}</p>
            <p style={{ margin: 0 }}>🎯 <strong>Destino:</strong> {viagemAtiva.cliente_destino || '-'}</p>
            <p style={{ margin: 0 }}>📦 <strong>Produto:</strong> {viagemAtiva.produto || '-'}</p>
            <p style={{ margin: 0 }}>⚖️ <strong>Peso Carga:</strong> {viagemAtiva.peso_carregado || '-'}</p>
            <p style={{ margin: 0 }}>🏎️ <strong>KM Inicial:</strong> {viagemAtiva.km_inicial} km</p>
          </div>

          {/* PAINEL DE RESUMO DOS LANÇAMENTOS DO MOTORISTA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            
            {/* Card Visual: Abastecimento */}
            <div style={{ background: '#0f172a', border: '1px solid #d97706', borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⛽ Abastecimento Lançado
              </h4>
              {viagemAtiva.numero_nota_combustivel || viagemAtiva.valor_combustivel ? (
                <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0 }}><strong>Posto:</strong> {viagemAtiva.posto_combustivel || 'Não informado'}</p>
                  <p style={{ margin: 0 }}><strong>Nº Nota Fiscal:</strong> {viagemAtiva.numero_nota_combustivel || '-'}</p>
                  <p style={{ margin: 0 }}><strong>Valor:</strong> R$ {Number(viagemAtiva.valor_combustivel || 0).toFixed(2)}</p>
                  <p style={{ margin: 0 }}><strong>Litros:</strong> {viagemAtiva.litros_combustivel || 0} L</p>
                  <p style={{ margin: 0 }}><strong>KM Abastecimento:</strong> {viagemAtiva.km_abastecimento || '-'} km</p>
                  {viagemAtiva.foto_nota_combustivel_url && (
                    <p style={{ margin: '6px 0 0 0' }}>
                      📷 <a href={viagemAtiva.foto_nota_combustivel_url} target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', fontWeight: 'bold', textDecoration: 'underline' }}>Ver Foto da Nota Fiscal</a>
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>Nenhum abastecimento registrado ainda nesta viagem.</p>
              )}
            </div>

            {/* Card Visual: Despesas */}
            <div style={{ background: '#0f172a', border: '1px solid #9333ea', borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ color: '#c084fc', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💸 Outros Gastos Lançados
              </h4>
              {viagemAtiva.outros_gastos ? (
                <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0 }}><strong>Valor Total Gastos:</strong> R$ {Number(viagemAtiva.outros_gastos || 0).toFixed(2)}</p>
                  <p style={{ margin: 0 }}><strong>Descrição:</strong> {viagemAtiva.descricao_outros_gastos || 'Sem descrição'}</p>
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>Nenhum outro gasto lançado até o momento.</p>
              )}
            </div>

          </div>

          {/* Botões de Ação para o Motorista */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={abrirModalAbastecimento}
              style={{ flex: '1 1 180px', padding: '12px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⛽ {viagemAtiva.valor_combustivel ? 'Editar Abastecimento' : 'Registrar Abastecimento'}
            </button>
            <button 
              onClick={abrirModalDespesa}
              style={{ flex: '1 1 180px', padding: '12px 18px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              💸 {viagemAtiva.outros_gastos ? 'Editar Despesa' : 'Registrar Despesa / Gasto'}
            </button>
            <button 
              onClick={() => setModalFinalizar(true)}
              style={{ flex: '1 1 180px', padding: '12px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              🏁 Finalizar Viagem
            </button>
          </div>
        </div>
      ) : (
        /* FORMULÁRIO DE NOVA VIAGEM */
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '30px' }}>
          <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '20px' }}>🚀 Iniciar Nova Viagem</h3>
          <form onSubmit={handleIniciarViagem} style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <label style={labelStyle}>Veículo / Placa</label>
              <input 
                type="text" placeholder="Ex: ABC-1234" required
                value={novaViagem.placa} onChange={e => setNovaViagem({...novaViagem, placa: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Operador / Motorista</label>
              <input 
                type="text" placeholder="Nome do Motorista"
                value={novaViagem.operador} onChange={e => setNovaViagem({...novaViagem, operador: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>KM Inicial</label>
              <input 
                type="number" step="0.1" placeholder="Ex: 150000" required
                value={novaViagem.km_inicial} onChange={e => setNovaViagem({...novaViagem, km_inicial: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Local do Embarque</label>
              <input 
                type="text" placeholder="Origem / Fazenda / Unidade"
                value={novaViagem.local_carregamento} onChange={e => setNovaViagem({...novaViagem, local_carregamento: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Cliente Destino</label>
              <input 
                type="text" placeholder="Cidade / Filial / Cliente"
                value={novaViagem.cliente_destino} onChange={e => setNovaViagem({...novaViagem, cliente_destino: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Produto</label>
              <input 
                type="text" placeholder="Ex: Soja, Milho, Adubo..."
                value={novaViagem.produto} onChange={e => setNovaViagem({...novaViagem, produto: e.target.value})}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Peso Carregado</label>
              <input 
                type="number" step="0.01" placeholder="Em kg ou toneladas"
                value={novaViagem.peso_carregado} onChange={e => setNovaViagem({...novaViagem, peso_carregado: e.target.value})}
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={loading} style={{ gridColumn: '1 / -1', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '15px' }}>
              {loading ? 'Salvando...' : 'Iniciar Viagem'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL ABASTECIMENTO COMPLETO */}
      {modalAbastecimento && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '450px', color: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#f59e0b' }}>⛽ Registrar Abastecimento</h3>
            <form onSubmit={handleRegistrarAbastecimento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Posto de Combustível</label>
                <input 
                  type="text" placeholder="Nome / Local do Posto" 
                  value={abastecimento.posto_combustivel} 
                  onChange={e => setAbastecimento({...abastecimento, posto_combustivel: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>Número da Nota Combustível</label>
                <input 
                  type="text" placeholder="Nº NF" required 
                  value={abastecimento.numero_nota_combustivel} 
                  onChange={e => setAbastecimento({...abastecimento, numero_nota_combustivel: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Valor Combustível (R$)</label>
                  <input 
                    type="number" step="0.01" placeholder="0.00" required 
                    value={abastecimento.valor_combustivel} 
                    onChange={e => setAbastecimento({...abastecimento, valor_combustivel: e.target.value})} 
                    style={inputStyle} 
                  />
                </div>
                <div>
                  <label style={labelStyle}>Litros Combustível</label>
                  <input 
                    type="number" step="0.01" placeholder="0.00" required 
                    value={abastecimento.litros_combustivel} 
                    onChange={e => setAbastecimento({...abastecimento, litros_combustivel: e.target.value})} 
                    style={inputStyle} 
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>KM do Abastecimento</label>
                <input 
                  type="number" step="0.1" placeholder="Ex: 150250" 
                  value={abastecimento.km_abastecimento} 
                  onChange={e => setAbastecimento({...abastecimento, km_abastecimento: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>Foto da Nota Fiscal</label>
                <input 
                  type="file" accept="image/*" 
                  onChange={e => setAbastecimento({...abastecimento, foto: e.target.files[0]})} 
                  style={{ color: '#fff' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
                <button type="button" onClick={() => setModalAbastecimento(false)} style={{ flex: 1, padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DESPESA */}
      {modalDespesa && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '450px', color: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#c084fc' }}>💸 Registrar Despesa / Outros Gastos</h3>
            <form onSubmit={handleRegistrarDespesa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Valor Outros Gastos (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" required value={despesa.outros_gastos} onChange={e => setDespesa({...despesa, outros_gastos: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição Outros Gastos</label>
                <input type="text" placeholder="Detalhes dos gastos (ex: Pedágio, Alimentação)" value={despesa.descricao_outros_gastos} onChange={e => setDespesa({...despesa, descricao_outros_gastos: e.target.value})} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
                <button type="button" onClick={() => setModalDespesa(false)} style={{ flex: 1, padding: '10px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
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
                <th style={{ padding: '12px' }}>Comprovantes</th>
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
                  <td style={{ padding: '12px' }}>
                    {v.foto_nota_combustivel_url && (
                      <a href={v.foto_nota_combustivel_url} target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', fontWeight: 'bold', marginRight: '10px' }}>NF Abast.</a>
                    )}
                    {v.foto_descarga_url && (
                      <a href={v.foto_descarga_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontWeight: 'bold' }}>Descarga</a>
                    )}
                    {!v.foto_nota_combustivel_url && !v.foto_descarga_url && '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}