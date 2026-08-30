import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

export default function AbaLogistica() {
  const [loading, setLoading] = useState(false);
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [historicoViagens, setHistoricoViagens] = useState([]);

  // Estados do Formulário de Nova Viagem
  const [novaViagem, setNovaViagem] = useState({
    veiculo: '',
    motorista: '',
    km_inicial: '',
    destino: '',
    observacao: ''
  });

  // Estados dos Modais
  const [modalAbastecimento, setModalAbastecimento] = useState(false);
  const [modalDespesa, setModalDespesa] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);

  // Formulário de Abastecimento
  const [abastecimento, setAbastecimento] = useState({
    posto: '',
    nota_fiscal: '',
    valor_total: '',
    litros: '',
    km_atual: '',
    foto: null
  });

  // Formulário de Despesa
  const [despesa, setDespesa] = useState({
    tipo: 'Pedágio',
    valor: '',
    descricao: '',
    foto: null
  });

  // Formulário de Encerramento
  const [encerramento, setEncerramento] = useState({
    km_final: '',
    peso_descarga: '',
    foto: null
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      // Buscar viagem ativa
      const { data: ativa } = await supabase
        .from('diario_bordo')
        .select('*')
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setViagemAtiva(ativa || null);

      // Buscar histórico de viagens finalizadas
      const { data: historico } = await supabase
        .from('diario_bordo')
        .select('*')
        .eq('status', 'finalizada')
        .order('created_at', { ascending: false });

      setHistoricoViagens(historico || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  // Função para Upload no Supabase Storage
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

  // Iniciar Nova Viagem
  async function handleIniciarViagem(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('diario_bordo').insert([{
      ...novaViagem,
      km_inicial: Number(novaViagem.km_inicial),
      status: 'em_andamento'
    }]);

    if (error) {
      alert('Erro ao iniciar viagem: ' + error.message);
    } else {
      setNovaViagem({ veiculo: '', motorista: '', km_inicial: '', destino: '', observacao: '' });
      carregarDados();
    }
    setLoading(false);
  }

  // Registrar Abastecimento
  async function handleRegistrarAbastecimento(e) {
    e.preventDefault();
    setLoading(true);

    const valorTotal = Number(abastecimento.valor_total);
    const litros = Number(abastecimento.litros);
    const kmAtual = Number(abastecimento.km_atual);

    // Buscar último abastecimento para calcular média
    const { data: ultimosAbastecimentos } = await supabase
      .from('abastecimentos')
      .select('km_atual')
      .eq('viagem_id', viagemAtiva.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const kmAnterior = ultimosAbastecimentos && ultimosAbastecimentos.length > 0
      ? Number(ultimosAbastecimentos[0].km_atual)
      : Number(viagemAtiva.km_inicial);

    const precoPorLitro = litros > 0 ? (valorTotal / litros) : 0;
    const kmRodados = kmAtual - kmAnterior;
    const mediaKml = litros > 0 && kmRodados > 0 ? (kmRodados / litros) : 0;

    let fotoUrl = null;
    if (abastecimento.foto) {
      fotoUrl = await uploadImagem(abastecimento.foto, 'abastecimentos');
    }

    const { error } = await supabase.from('abastecimentos').insert([{
      viagem_id: viagemAtiva.id,
      posto: abastecimento.posto,
      nota_fiscal: abastecimento.nota_fiscal,
      valor_total: valorTotal,
      litros: litros,
      preco_por_litro: precoPorLitro,
      km_atual: kmAtual,
      media_kml: mediaKml,
      foto_nota_url: fotoUrl
    }]);

    if (error) {
      alert('Erro ao registrar abastecimento: ' + error.message);
    } else {
      alert(`Abastecimento registrado!\nMédia calculada: ${mediaKml.toFixed(2)} km/L`);
      setModalAbastecimento(false);
      setAbastecimento({ posto: '', nota_fiscal: '', valor_total: '', litros: '', km_atual: '', foto: null });
    }
    setLoading(false);
  }

  // Registrar Despesa
  async function handleRegistrarDespesa(e) {
    e.preventDefault();
    setLoading(true);

    let fotoUrl = null;
    if (despesa.foto) {
      fotoUrl = await uploadImagem(despesa.foto, 'despesas');
    }

    const { error } = await supabase.from('despesas_viagem').insert([{
      viagem_id: viagemAtiva.id,
      tipo: despesa.tipo,
      valor: Number(despesa.valor),
      descricao: despesa.descricao,
      foto_comprovante_url: fotoUrl
    }]);

    if (error) {
      alert('Erro ao registrar despesa: ' + error.message);
    } else {
      alert('Despesa registrada com sucesso!');
      setModalDespesa(false);
      setDespesa({ tipo: 'Pedágio', valor: '', descricao: '', foto: null });
    }
    setLoading(false);
  }

  // Finalizar Viagem
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
        peso_descarga: Number(encerramento.peso_descarga),
        foto_descarga_url: fotoUrl,
        status: 'finalizada'
      })
      .eq('id', viagemAtiva.id);

    if (error) {
      alert('Erro ao finalizar viagem: ' + error.message);
    } else {
      alert('Viagem finalizada com sucesso!');
      setModalFinalizar(false);
      setEncerramento({ km_final: '', peso_descarga: '', foto: null });
      carregarDados();
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>🚛 Gestão de Logística & Diário de Bordo</h2>

      {/* PAINEL DE VIAGEM ATIVA */}
      {viagemAtiva ? (
        <div style={{ background: '#e3f2fd', border: '2px solid #2196f3', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <span style={{ background: '#2196f3', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            VIAGEM EM ANDAMENTO
          </span>
          <h3 style={{ margin: '10px 0' }}>{viagemAtiva.veiculo} - {viagemAtiva.motorista}</h3>
          <p style={{ margin: '5px 0' }}><strong>Destino:</strong> {viagemAtiva.destino || 'Não informado'}</p>
          <p style={{ margin: '5px 0' }}><strong>KM Inicial:</strong> {viagemAtiva.km_inicial} km</p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setModalAbastecimento(true)}
              style={{ padding: '10px 15px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              ⛽ Registrar Abastecimento
            </button>
            <button 
              onClick={() => setModalDespesa(true)}
              style={{ padding: '10px 15px', background: '#9c27b0', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              💸 Registrar Despesa / Gasto
            </button>
            <button 
              onClick={() => setModalFinalizar(true)}
              style={{ padding: '10px 15px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              🏁 Finalizar Viagem
            </button>
          </div>
        </div>
      ) : (
        /* FORMULÁRIO DE NOVA VIAGEM */
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>🚀 Iniciar Nova Viagem</h3>
          <form onSubmit={handleIniciarViagem} style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <input 
              type="text" placeholder="Veículo (ex: Placa/Modelo)" required
              value={novaViagem.veiculo} onChange={e => setNovaViagem({...novaViagem, veiculo: e.target.value})}
              style={{ padding: '8px' }}
            />
            <input 
              type="text" placeholder="Motorista" required
              value={novaViagem.motorista} onChange={e => setNovaViagem({...novaViagem, motorista: e.target.value})}
              style={{ padding: '8px' }}
            />
            <input 
              type="number" placeholder="KM Inicial" required
              value={novaViagem.km_inicial} onChange={e => setNovaViagem({...novaViagem, km_inicial: e.target.value})}
              style={{ padding: '8px' }}
            />
            <input 
              type="text" placeholder="Destino"
              value={novaViagem.destino} onChange={e => setNovaViagem({...novaViagem, destino: e.target.value})}
              style={{ padding: '8px' }}
            />
            <button type="submit" disabled={loading} style={{ gridColumn: '1 / -1', padding: '10px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
              {loading ? 'Salvando...' : 'Iniciar Viagem'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL ABASTECIMENTO */}
      {modalAbastecimento && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h3>⛽ Registrar Abastecimento</h3>
            <form onSubmit={handleRegistrarAbastecimento} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Posto" required value={abastecimento.posto} onChange={e => setAbastecimento({...abastecimento, posto: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Número Nota Fiscal" required value={abastecimento.nota_fiscal} onChange={e => setAbastecimento({...abastecimento, nota_fiscal: e.target.value})} style={{ padding: '8px' }} />
              <input type="number" step="0.01" placeholder="Valor Total (R$)" required value={abastecimento.valor_total} onChange={e => setAbastecimento({...abastecimento, valor_total: e.target.value})} style={{ padding: '8px' }} />
              <input type="number" step="0.01" placeholder="Quantidade Litros" required value={abastecimento.litros} onChange={e => setAbastecimento({...abastecimento, litros: e.target.value})} style={{ padding: '8px' }} />
              <input type="number" placeholder="KM Atual" required value={abastecimento.km_atual} onChange={e => setAbastecimento({...abastecimento, km_atual: e.target.value})} style={{ padding: '8px' }} />
              
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Foto da Nota Fiscal:</label>
              <input type="file" accept="image/*" onChange={e => setAbastecimento({...abastecimento, foto: e.target.files[0]})} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
                <button type="button" onClick={() => setModalAbastecimento(false)} style={{ flex: 1, padding: '10px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DESPESA */}
      {modalDespesa && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h3>💸 Registrar Despesa / Gasto</h3>
            <form onSubmit={handleRegistrarDespesa} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select value={despesa.tipo} onChange={e => setDespesa({...despesa, tipo: e.target.value})} style={{ padding: '8px' }}>
                <option value="Pedágio">Pedágio</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Pernoite">Pernoite</option>
                <option value="Manutenção Rápida">Manutenção Rápida</option>
                <option value="Outros">Outros</option>
              </select>
              <input type="number" step="0.01" placeholder="Valor (R$)" required value={despesa.valor} onChange={e => setDespesa({...despesa, valor: e.target.value})} style={{ padding: '8px' }} />
              <input type="text" placeholder="Descrição / Observação" value={despesa.descricao} onChange={e => setDespesa({...despesa, descricao: e.target.value})} style={{ padding: '8px' }} />
              
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Comprovante (Opcional):</label>
              <input type="file" accept="image/*" onChange={e => setDespesa({...despesa, foto: e.target.files[0]})} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#9c27b0', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
                <button type="button" onClick={() => setModalDespesa(false)} style={{ flex: 1, padding: '10px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR VIAGEM */}
      {modalFinalizar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h3>🏁 Finalizar Viagem</h3>
            <form onSubmit={handleFinalizarViagem} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="number" placeholder="KM Final de Chegada" required value={encerramento.km_final} onChange={e => setEncerramento({...encerramento, km_final: e.target.value})} style={{ padding: '8px' }} />
              <input type="number" step="0.01" placeholder="Peso Descarregado (kg ou ton)" required value={encerramento.peso_descarga} onChange={e => setEncerramento({...encerramento, peso_descarga: e.target.value})} style={{ padding: '8px' }} />
              
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Comprovante de Descarga:</label>
              <input type="file" accept="image/*" onChange={e => setEncerramento({...encerramento, foto: e.target.files[0]})} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Finalizar</button>
                <button type="button" onClick={() => setModalFinalizar(false)} style={{ flex: 1, padding: '10px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTÓRICO DE VIAGENS FINALIZADAS */}
      <h3>📜 Histórico de Viagens Encerradas</h3>
      {historicoViagens.length === 0 ? (
        <p style={{ color: '#666' }}>Nenhuma viagem encerrada ainda.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#eee', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Veículo</th>
              <th style={{ padding: '8px' }}>Motorista</th>
              <th style={{ padding: '8px' }}>KM Rodados</th>
              <th style={{ padding: '8px' }}>Peso Descarga</th>
              <th style={{ padding: '8px' }}>Comprovante</th>
            </tr>
          </thead>
          <tbody>
            {historicoViagens.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px' }}>{v.veiculo}</td>
                <td style={{ padding: '8px' }}>{v.motorista}</td>
                <td style={{ padding: '8px' }}>{(v.km_final - v.km_inicial) || 0} km</td>
                <td style={{ padding: '8px' }}>{v.peso_descarga || '-'}</td>
                <td style={{ padding: '8px' }}>
                  {v.foto_descarga_url ? (
                    <a href={v.foto_descarga_url} target="_blank" rel="noopener noreferrer">Ver Foto</a>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}