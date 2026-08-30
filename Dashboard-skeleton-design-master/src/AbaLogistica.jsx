import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

export default function AbaLogistica() {
  const [loading, setLoading] = useState(false);
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [historicoViagens, setHistoricoViagens] = useState([]);

  // Estados do Formulário de Nova Viagem (Alinhados com o Banco SQL)
  const [novaViagem, setNovaViagem] = useState({
    placa: '',
    operador: '',
    km_inicial: '',
    local_carregamento: '',
    cliente_destino: '',
    produto: '',
    peso_carregado: ''
  });

  // Estados dos Modais
  const [modalAbastecimento, setModalAbastecimento] = useState(false);
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);

  // Formulário de Abastecimento
  const [abastecimento, setAbastecimento] = useState({
    numero_nota_combustivel: '',
    valor_combustivel: '',
    litros_combustivel: ''
  });

  // Formulário de Despesa
  const [despesa, setDespesa] = useState({
    outros_gastos: '',
    descricao_outros_gastos: ''
  });

  // Formulário de Encerramento
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

  async function uploadImagem(file) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `descargas/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

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

    const { error } = await supabase
      .from('diario_bordo')
      .update({
        numero_nota_combustivel: abastecimento.numero_nota_combustivel,
        valor_combustivel: Number(abastecimento.valor_combustivel),
        litros_combustivel: Number(abastecimento.litros_combustivel)
      })
      .eq('id', viagemAtiva.id);

    if (error) {
      alert('Erro ao registrar abastecimento: ' + error.message);
    } else {
      alert('Abastecimento registrado!');
      setModalAbastecimento(false);
      setAbastecimento({ numero_nota_combustivel: '', valor_combustivel: '', litros_combustivel: '' });
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
      setDespesa({ outros_gastos: '', descricao_outros_gastos: '' });
      carregarDados();
    }
    setLoading(false);
  }

  async function handleFinalizarViagem(e) {
    e.preventDefault();
    setLoading(true);

    let fotoUrl = null;
    if (encerramento.foto) {
      fotoUrl = await uploadImagem(encerramento.foto);
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
          <span style={{ background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            VIAGEM EM TRANSITO
          </span>
          <h3 style={{ color: '#ffffff', margin: '15px 0 5px 0' }}>Placa: {viagemAtiva.placa} - Motorista/Operador: {viagemAtiva.operador || 'Não informado'}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', margin: '15px 0', color: '#cbd5e1' }}>
            <p style={{ margin: 0 }}><strong>Local Embarque:</strong> {viagemAtiva.local_carregamento || '-'}</p>
            <p style={{ margin: 0 }}><strong>Cliente Destino:</strong> {viagemAtiva.cliente_destino || '-'}</p>
            <p style={{ margin: 0 }}><strong>Produto:</strong> {viagemAtiva.produto || '-'}</p>
            <p style={{ margin: 0 }}><strong>Peso Carregado:</strong> {viagemAtiva.peso_carregado || '-'}</p>
            <p style={{ margin: 0 }}><strong>KM Inicial:</strong> {viagemAtiva.km_inicial} km</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setModalAbastecimento(true)}
              style={{ padding: '12px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⛽ Registrar Abastecimento
            </button>
            <button 
              onClick={() => setModalDespesa(true)}
              style={{ padding: '12px 18px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              💸 Registrar Despesa / Gasto
            </button>
            <button 
              onClick={() => setModalFinalizar(true)}
              style={{ padding: '12px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
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

      {/* MODAL ABASTECIMENTO */}
      {modalAbastecimento && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '450px', color: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#f59e0b' }}>⛽ Registrar Abastecimento</h3>
            <form onSubmit={handleRegistrarAbastecimento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Número da Nota Combustível</label>
                <input type="text" placeholder="Nº NF" required value={abastecimento.numero_nota_combustivel} onChange={e => setAbastecimento({...abastecimento, numero_nota_combustivel: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Valor Combustível (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={abastecimento.valor_combustivel} onChange={e => setAbastecimento({...abastecimento, valor_combustivel: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Litros Combustível</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={abastecimento.litros_combustivel} onChange={e => setAbastecimento({...abastecimento, litros_combustivel: e.target.value})} style={inputStyle} />
                </div>
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
                <th style={{ padding: '12px' }}>Comprovante</th>
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
                    {v.foto_descarga_url ? (
                      <a href={v.foto_descarga_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontWeight: 'bold' }}>Ver Foto</a>
                    ) : '-'}
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