import React, { useState, useEffect } from 'react';
// Ajuste os imports conforme a estrutura do seu projeto (ex: supabase, api, etc.)
// import { supabase } from '../services/supabaseClient';

function AbaLogistica() {
  const [viagemAtiva, setViagemAtiva] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados para formulário de nova viagem
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
  const [modalNovoAbastecimento, setModalNovoAbastecimento] = useState(false);
  const [modalNovaDespesa, setModalNovaDespesa] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [modalListaAbastecimentos, setModalListaAbastecimentos] = useState(false);
  const [modalListaDespesas, setModalListaDespesas] = useState(false);
  const [viagemDetalhada, setViagemDetalhada] = useState(null);

  // Dados operacionais da viagem ativa
  const [listaAbastecimentos, setListaAbastecimentos] = useState([]);
  const [listaDespesas, setListaDespesas] = useState([]);
  const [historicoViagens, setHistoricoViagens] = useState([]);

  // Estados de inputs para modais
  const [abastecimento, setAbastecimento] = useState({
    posto: '',
    nota_fiscal: '',
    valor_total: '',
    litros: '',
    km_atual: '',
    foto: null
  });

  const [despesa, setDespesa] = useState({
    tipo: 'Alimentação',
    valor: '',
    descricao: '',
    foto: null
  });

  const [encerramento, setEncerramento] = useState({
    km_final: '',
    local_descarga: '',
    peso_descarga: '',
    foto: null
  });

  // Estados de Edição
  const [itemEdicaoAbastecimento, setItemEdicaoAbastecimento] = useState(null);
  const [itemEdicaoDespesa, setItemEdicaoDespesa] = useState(null);

  // Detalhes da viagem selecionada no histórico
  const [detalhesAbastecimentos, setDetalhesAbastecimentos] = useState([]);
  const [detalhesDespesas, setDetalhesDespesas] = useState([]);

  // Estilos reutilizáveis
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' };
  const inputStyle = { width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' };

  // Funções Mock / placeholders de ações (conecte à sua API ou Supabase)
  const handleIniciarViagem = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setViagemAtiva({ id: 1, ...novaViagem, status: 'ativa' });
      setLoading(false);
    }, 500);
  };

  const handleRegistrarAbastecimento = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const novoId = Date.now();
      const novoItem = { id: novoId, ...abastecimento, preco_por_litro: Number(abastecimento.litros) > 0 ? Number(abastecimento.valor_total) / Number(abastecimento.litros) : 0 };
      setListaAbastecimentos([...listaAbastecimentos, novoItem]);
      setAbastecimento({ posto: '', nota_fiscal: '', valor_total: '', litros: '', km_atual: '', foto: null });
      setModalNovoAbastecimento(false);
      setLoading(false);
    }, 500);
  };

  const handleRegistrarDespesa = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const novoId = Date.now();
      const novoItem = { id: novoId, ...despesa };
      setListaDespesas([...listaDespesas, novoItem]);
      setDespesa({ tipo: 'Alimentação', valor: '', descricao: '', foto: null });
      setModalNovaDespesa(false);
      setLoading(false);
    }, 500);
  };

  const handleFinalizarViagem = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const viagemEncerrada = { 
        ...viagemAtiva, 
        ...encerramento, 
        abastecimentos: listaAbastecimentos, 
        despesas_viagem: listaDespesas 
      };
      setHistoricoViagens([viagemEncerrada, ...historicoViagens]);
      setViagemAtiva(null);
      setListaAbastecimentos([]);
      setListaDespesas([]);
      setEncerramento({ km_final: '', local_descarga: '', peso_descarga: '', foto: null });
      setModalFinalizar(false);
      setLoading(false);
    }, 500);
  };

  const handleSalvarEdicaoAbastecimento = (e) => {
    e.preventDefault();
    setListaAbastecimentos(listaAbastecimentos.map(i => i.id === itemEdicaoAbastecimento.id ? itemEdicaoAbastecimento : i));
    setItemEdicaoAbastecimento(null);
  };

  const handleExcluirAbastecimento = (id) => {
    setListaAbastecimentos(listaAbastecimentos.filter(i => i.id !== id));
  };

  const handleSalvarEdicaoDespesa = (e) => {
    e.preventDefault();
    setListaDespesas(listaDespesas.map(i => i.id === itemEdicaoDespesa.id ? itemEdicaoDespesa : i));
    setItemEdicaoDespesa(null);
  };

  const handleExcluirDespesa = (id) => {
    setListaDespesas(listaDespesas.filter(i => i.id !== id));
  };

  const handleAbrirDetalhes = (viagem) => {
    setViagemDetalhada(viagem);
    setDetalhesAbastecimentos(viagem.abastecimentos || []);
    setDetalhesDespesas(viagem.despesas_viagem || []);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#ffffff', marginBottom: '25px' }}>🚛 Gestão de Logística e Viagens</h2>

      {viagemAtiva ? (
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '30px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <span style={{ background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Viagem em Andamento</span>
              <h3 style={{ margin: '8px 0 0 0', color: '#60a5fa' }}>{viagemAtiva.placa} - {viagemAtiva.operador || 'Motorista não informado'}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Produto: {viagemAtiva.produto || 'N/A'} | Destino: {viagemAtiva.cliente_destino || 'N/A'}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalListaAbastecimentos(true)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                ⛽ Abastecimentos ({listaAbastecimentos.length})
              </button>
              <button onClick={() => setModalListaDespesas(true)} style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                💸 Despesas ({listaDespesas.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
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
              <label style={labelStyle}>Peso Carregado (Kg)</label>
              <input type="number" step="0.01" placeholder="Ex: 50000" value={novaViagem.peso_carregado} onChange={e => setNovaViagem({...novaViagem, peso_carregado: e.target.value})} style={inputStyle} />
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
                <input type="text" placeholder="Nome do Posto" value={abastecimento.posto} onChange={e => setAbastecimento({...abastecimento, posto: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Número da Nota Fiscal</label>
                <input type="text" placeholder="Nº NF" required value={abastecimento.nota_fiscal} onChange={e => setAbastecimento({...abastecimento, nota_fiscal: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Valor Total (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={abastecimento.valor_total} onChange={e => setAbastecimento({...abastecimento, valor_total: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Litros</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={abastecimento.litros} onChange={e => setAbastecimento({...abastecimento, litros: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>KM do Abastecimento</label>
                <input type="number" step="0.1" placeholder="Ex: 150250" value={abastecimento.km_atual} onChange={e => setAbastecimento({...abastecimento, km_atual: e.target.value})} style={inputStyle} />
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
                      <form onSubmit={handleSalvarEdicaoAbastecimento} style={{ display: 'grid', gap: '10px' }}>
                        <div>
                          <label style={labelStyle}>Posto</label>
                          <input type="text" value={itemEdicaoAbastecimento.posto} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, posto: e.target.value})} style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={labelStyle}>Nº NF</label>
                            <input type="text" value={itemEdicaoAbastecimento.nota_fiscal} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, nota_fiscal: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Valor (R$)</label>
                            <input type="number" step="0.01" value={itemEdicaoAbastecimento.valor_total} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, valor_total: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Litros</label>
                            <input type="number" step="0.01" value={itemEdicaoAbastecimento.litros} onChange={e => setItemEdicaoAbastecimento({...itemEdicaoAbastecimento, litros: e.target.value})} style={inputStyle} />
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
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: '#f59e0b' }}>{item.posto || 'Posto não informado'}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setItemEdicaoAbastecimento(item)} style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                            <button onClick={() => handleExcluirAbastecimento(item.id)} style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Excluir</button>
                          </div>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>NF:</strong> {item.nota_fiscal || '-'} | <strong>Valor:</strong> R$ {Number(item.valor_total || 0).toFixed(2)} | <strong>Litros:</strong> {item.litros} L</p>
                        <p style={{ margin: '4px 0', fontSize: '13px', color: '#94a3b8' }}><strong>KM:</strong> {item.km_atual || '-'} km | <strong>Preço/L:</strong> R$ {Number(item.preco_por_litro || 0).toFixed(3)}</p>
                        {item.foto_nota_url && (
                          <a href={item.foto_nota_url} target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', fontSize: '12px', display: 'inline-block', marginTop: '6px' }}>📷 Ver Comprovante Anexado</a>
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
                <label style={labelStyle}>Tipo de Despesa</label>
                <select value={despesa.tipo} onChange={e => setDespesa({...despesa, tipo: e.target.value})} style={inputStyle}>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Pedágio">Pedágio</option>
                  <option value="Manutenção / Borracharia">Manutenção / Borracharia</option>
                  <option value="Hospedagem">Hospedagem</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Valor do Gasto (R$)</label>
                <input type="number" step="0.01" placeholder="0.00" required value={despesa.valor} onChange={e => setDespesa({...despesa, valor: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição / Detalhes</label>
                <input type="text" placeholder="Ex: Almoço no Posto Graal" value={despesa.descricao} onChange={e => setDespesa({...despesa, descricao: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Foto do Comprovante</label>
                <input type="file" accept="image/*" onChange={e => setDespesa({...despesa, foto: e.target.files[0]})} style={{ color: '#fff' }} />
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
                  <div key={item.id} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                    {itemEdicaoDespesa?.id === item.id ? (
                      <form onSubmit={handleSalvarEdicaoDespesa} style={{ display: 'grid', gap: '10px' }}>
                        <div>
                          <label style={labelStyle}>Tipo</label>
                          <select value={itemEdicaoDespesa.tipo} onChange={e => setItemEdicaoDespesa({...itemEdicaoDespesa, tipo: e.target.value})} style={inputStyle}>
                            <option value="Alimentação">Alimentação</option>
                            <option value="Pedágio">Pedágio</option>
                            <option value="Manutenção / Borracharia">Manutenção / Borracharia</option>
                            <option value="Hospedagem">Hospedagem</option>
                            <option value="Outros">Outros</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Valor (R$)</label>
                          <input type="number" step="0.01" value={itemEdicaoDespesa.valor} onChange={e => setItemEdicaoDespesa({...itemEdicaoDespesa, valor: e.target.value})} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Descrição</label>
                          <input type="text" value={itemEdicaoDespesa.descricao} onChange={e => setItemEdicaoDespesa({...itemEdicaoDespesa, descricao: e.target.value})} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Trocar Foto</label>
                          <input type="file" accept="image/*" onChange={e => setItemEdicaoDespesa({...itemEdicaoDespesa, novaFoto: e.target.files[0]})} style={{ color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button type="submit" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Salvar Alterações</button>
                          <button type="button" onClick={() => setItemEdicaoDespesa(null)} style={{ background: '#475569', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, color: '#c084fc' }}>{item.tipo}</h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setItemEdicaoDespesa(item)} style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                            <button onClick={() => handleExcluirDespesa(item.id)} style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Excluir</button>
                          </div>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Valor:</strong> R$ {Number(item.valor || 0).toFixed(2)}</p>
                        <p style={{ margin: '4px 0', fontSize: '13px', color: '#94a3b8' }}><strong>Descrição:</strong> {item.descricao || '-'}</p>
                        {item.foto_comprovante_url && (
                          <a href={item.foto_comprovante_url} target="_blank" rel="noopener noreferrer" style={{ color: '#c084fc', fontSize: '12px', display: 'inline-block', marginTop: '6px' }}>📷 Ver Comprovante Anexado</a>
                        )}
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
            <h3 style={{ marginTop: 0, color: '#16a34a' }}>🏁 Finalizar Viagem</h3>
            <form onSubmit={handleFinalizarViagem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>KM Final</label>
                <input type="number" step="0.1" required value={encerramento.km_final} onChange={e => setEncerramento({...encerramento, km_final: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Local de Descarga</label>
                <input type="text" value={encerramento.local_descarga} onChange={e => setEncerramento({...encerramento, local_descarga: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Peso Descarregado (Kg)</label>
                <input type="number" step="0.01" value={encerramento.peso_descarga} onChange={e => setEncerramento({...encerramento, peso_descarga: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Comprovante de Descarga (Opcional)</label>
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
      <div style={{ marginTop: '40px' }}>
        <h3 style={{ color: '#ffffff', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          📜 Histórico de Viagens Finalizadas
        </h3>
        
        {historicoViagens.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>Nenhuma viagem finalizada encontrada no sistema.</p>
        ) : (
          <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: '#cbd5e1' }}>
              <thead>
                <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#93c5fd' }}>
                  <th style={{ padding: '12px' }}>Placa</th>
                  <th style={{ padding: '12px' }}>Motorista</th>
                  <th style={{ padding: '12px' }}>Produto / Origem</th>
                  <th style={{ padding: '12px' }}>KM Rodados</th>
                  <th style={{ padding: '12px' }}>Origem / Destino (kg)</th>
                  <th style={{ padding: '12px' }}>Dif. Peso</th>
                  <th style={{ padding: '12px' }}>Total Gastos</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {historicoViagens.map(v => {
                  const totalComb = (v.abastecimentos || []).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
                  const totalDesp = (v.despesas_viagem || []).reduce((a, b) => a + (Number(b.valor) || 0), 0);
                  const totalGasto = totalComb + totalDesp;

                  const kmInicial = Number(v.km_inicial || 0);
                  const kmFinal = Number(v.km_final || 0);
                  const kmRodados = (kmFinal > 0 && kmFinal >= kmInicial) ? (kmFinal - kmInicial) : 0;

                  const pOrigem = Number(v.peso_carregado || 0);
                  const pDestino = Number(v.peso_descarga || 0);
                  const difPeso = pDestino - pOrigem;

                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>{v.placa}</td>
                      <td style={{ padding: '12px' }}>{v.operador || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: '#fff' }}>{v.produto || '-'}</span>
                        <br/>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>📍 {v.local_carregamento || 'N/A'}</span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#f8fafc' }}>
                        {kmRodados.toLocaleString('pt-BR')} km
                      </td>
                      <td style={{ padding: '12px' }}>
                        {pOrigem.toLocaleString('pt-BR')} / {pDestino.toLocaleString('pt-BR')} kg
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: difPeso < 0 ? '#ef4444' : difPeso > 0 ? '#22c55e' : '#cbd5e1' }}>
                        {difPeso > 0 ? `+${difPeso.toLocaleString('pt-BR')}` : difPeso.toLocaleString('pt-BR')} kg
                      </td>
                      <td style={{ padding: '12px', color: '#f59e0b', fontWeight: 'bold' }}>
                        R$ {totalGasto.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleAbrirDetalhes(v)}
                          style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                          👁️ Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALHES DE VIAGEM (HISTÓRICO) */}
      {viagemDetalhada && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '10px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', color: '#fff', padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#3b82f6' }}>Detalhes da Viagem #{viagemDetalhada.id}</h3>
              <button onClick={() => setViagemDetalhada(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '20px', cursor: 'pointer' }}>✖</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px', fontSize: '14px' }}>
              <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                <p><strong>Placa:</strong> {viagemDetalhada.placa}</p>
                <p><strong>Motorista:</strong> {viagemDetalhada.operador}</p>
                <p><strong>Produto:</strong> {viagemDetalhada.produto}</p>
                <p><strong>Peso Carga Inicial:</strong> {viagemDetalhada.peso_carregado} kg</p>
              </div>

              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>ROTA & QUILOMETRAGEM</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  📍 {viagemDetalhada.local_carregamento || '-'} ➔ 🎯 {viagemDetalhada.local_descarga || '-'}
                </p>
                <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: '#4ade80' }}>
                  {((Number(viagemDetalhada.km_final || 0) - Number(viagemDetalhada.km_inicial || 0))).toLocaleString('pt-BR')} km rodados
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  (KM Ini: {viagemDetalhada.km_inicial} | KM Fin: {viagemDetalhada.km_final})
                </p>
              </div>
            </div>

            <h4 style={{ color: '#f59e0b', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>⛽ Resumo de Abastecimentos</h4>
            {detalhesAbastecimentos.length === 0 ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>Nenhum abastecimento.</p> : (
              <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                {detalhesAbastecimentos.map(abast => (
                   <div key={abast.id} style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #f59e0b' }}>
                     <p style={{ margin: '0 0 5px 0' }}><strong>{abast.posto}</strong> - NF: {abast.nota_fiscal}</p>
                     <p style={{ margin: 0, color: '#94a3b8' }}>Valor: R$ {abast.valor_total} | Litros: {abast.litros} L | KM: {abast.km_atual}</p>
                   </div>
                ))}
              </div>
            )}

            <h4 style={{ color: '#c084fc', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>💸 Resumo de Despesas</h4>
            {detalhesDespesas.length === 0 ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>Nenhuma despesa.</p> : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {detalhesDespesas.map(desp => (
                   <div key={desp.id} style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid #c084fc' }}>
                     <p style={{ margin: '0 0 5px 0' }}><strong>{desp.tipo}</strong> - R$ {desp.valor}</p>
                     <p style={{ margin: 0, color: '#94a3b8' }}>Descrição: {desp.descricao || '-'}</p>
                   </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '25px', textAlign: 'right' }}>
              <button 
                onClick={() => setViagemDetalhada(null)} 
                style={{ padding: '10px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AbaLogistica;