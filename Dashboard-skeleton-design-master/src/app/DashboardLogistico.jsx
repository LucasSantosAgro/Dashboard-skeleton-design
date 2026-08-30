import React, { useState } from 'react';

export default function DashboardLogistico({
  historicoViagens = [],
  abastecimentos = [],
  despesas = [],
  loading = false,
  onFinalizarViagem,
  onExcluirDespesa,
  onAtualizarDespesa
}) {
  // Estados de Modais e Formulários
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [modalListaDespesas, setModalListaDespesas] = useState(false);
  const [itemEdicaoDespesa, setItemEdicaoDespesa] = useState(null);
  const [viagemDetalhada, setViagemDetalhada] = useState(null);

  const [encerramento, setEncerramento] = useState({
    km_final: '',
    local_descarga: '',
    peso_descarga: '',
    foto: null
  });

  // Estilos reutilizáveis
  const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '12px', color: '#94a3b8' };
  const inputStyle = { width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' };

  // Handlers básicos
  const handleFinalizarViagem = (e) => {
    e.preventDefault();
    if (onFinalizarViagem) onFinalizarViagem(encerramento);
    setModalFinalizar(false);
  };

  const handleExcluirDespesa = (id) => {
    if (onExcluirDespesa) onExcluirDespesa(id);
  };

  const handleSalvarEdicaoDespesa = (e) => {
    e.preventDefault();
    if (onAtualizarDespesa && itemEdicaoDespesa) {
      onAtualizarDespesa(itemEdicaoDespesa);
    }
    setItemEdicaoDespesa(null);
  };

  const handleAbrirDetalhes = (viagem) => {
    setViagemDetalhada(viagem);
  };

  // Separação de Viagens Ativas (em trânsito) e Finalizadas com base no km_final
  const viagensEmTransito = historicoViagens.filter(v => !v.km_final || Number(v.km_final) === 0);
  const viagensFinalizadas = historicoViagens.filter(v => v.km_final && Number(v.km_final) > 0);

  // Dados auxiliares para o modal de detalhes
  const detalhesAbastecimentos = viagemDetalhada?.abastecimentos || [];
  const detalhesDespesas = viagemDetalhada?.despesas_viagem || [];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#090d16', minHeight: '100vh', color: '#f8fafc' }}>
      
      {/* Cabeçalho do Dashboard Logístico Integrado */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>🚚 Painel Logístico de Frota</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Gestão operacional de viagens em trânsito, histórico, abastecimentos e despesas.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setModalFinalizar(true)} 
            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            🏁 Finalizar Viagem Ativa
          </button>
        </div>
      </header>

      {/* Indicadores de Resumo Rápido (KPIs) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Veículos em Trânsito</span>
          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: '#38bdf8' }}>{viagensEmTransito.length}</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Viagens Finalizadas</span>
          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: '#60a5fa' }}>{viagensFinalizadas.length}</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Rodado (Histórico)</span>
          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: '#4ade80' }}>
            {viagensFinalizadas.reduce((acc, v) => {
              const ini = Number(v.km_inicial || 0);
              const fin = Number(v.km_final || 0);
              return acc + ((fin > 0 && fin >= ini) ? (fin - ini) : 0);
            }, 0).toLocaleString('pt-BR')} km
          </h3>
        </div>
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Gastos Totais Registrados</span>
          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: '#f59e0b' }}>
            R$ {historicoViagens.reduce((acc, v) => {
              const tComb = (v.abastecimentos || []).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
              const tDesp = (v.despesas_viagem || []).reduce((a, b) => a + (Number(b.valor) || 0), 0);
              return acc + tComb + tDesp;
            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
        </div>
      </section>

      {/* SEÇÃO DE VIAGENS EM TRÂNSITO */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          🚚 Viagens em Trânsito (Ativas no momento)
        </h3>
        
        {viagensEmTransito.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>Nenhum veículo em trânsito no momento.</p>
        ) : (
          <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: '#cbd5e1' }}>
              <thead>
                <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#38bdf8' }}>
                  <th style={{ padding: '12px' }}>Placa</th>
                  <th style={{ padding: '12px' }}>Motorista</th>
                  <th style={{ padding: '12px' }}>Produto / Carga</th>
                  <th style={{ padding: '12px' }}>Origem</th>
                  <th style={{ padding: '12px' }}>KM Inicial</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {viagensEmTransito.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#60a5fa' }}>{v.placa}</td>
                    <td style={{ padding: '12px' }}>{v.operador || '-'}</td>
                    <td style={{ padding: '12px' }}>{v.produto || '-'} ({Number(v.peso_carregado || 0).toLocaleString('pt-BR')} kg)</td>
                    <td style={{ padding: '12px' }}>📍 {v.local_carregamento || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{Number(v.km_inicial || 0).toLocaleString('pt-BR')} km</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: '#0284c7', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        EM TRÂNSITO
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTÓRICO DE VIAGENS FINALIZADAS */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ color: '#ffffff', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          📜 Histórico de Viagens Finalizadas
        </h3>
        
        {viagensFinalizadas.length === 0 ? (
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
                {viagensFinalizadas.map(v => {
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

      {/* MODAL LISTA DE DESPESAS */}
      {modalListaDespesas && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '550px', maxHeight: '80vh', overflowY: 'auto', color: '#fff' }}>
            <h3 style={{ marginTop: 0, color: '#c084fc' }}>Gerenciar Despesas</h3>
            {despesas.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Nenhuma despesa cadastrada.</p>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {despesas.map(item => (
                  <div key={item.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    {itemEdicaoDespesa && itemEdicaoDespesa.id === item.id ? (
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
                     <p style={{ margin: 0, color: '#94a3b8' }}>{desp.descricao}</p>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}