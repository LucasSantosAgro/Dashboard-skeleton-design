import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Users, FileText, Route, Plus, Search, RefreshCw, Pencil, Trash2, X, Save, DollarSign, Package, Gauge, TrendingUp, AlertCircle, Fuel, Receipt, PlayCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { supabase } from './lib/supabaseClient';

const colors = ['#38BDF8','#22C55E','#F59E0B','#A78BFA','#EC4899','#14B8A6'];
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (v,d=0) => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

const emptyTrip = {
  codigo_viagem: '', frete_id: '', veiculo_id: '', motorista_id: '', carreta_placa: '',
  km_inicial: '', km_final: '', peso_carregado_kg: '', peso_descarga_kg: '',
  numero_nf: '', local_carregamento: '', local_descarga: '', data_saida: '', data_chegada: '',
  status: 'PLANEJADA', observacao: '', contratante_cnpj: '', cliente_cnpj: ''
};

const emptyAbastecimento = { veiculo_id: '', data_hora: '', litros: '', valor_total: '', km_atual: '', posto: '', observacao: '' };
const emptyDespesa = { veiculo_id: '', categoria: 'COMBUSTIVEL', valor: '', data_despesa: '', descricao: '' };

function Input(p){return <input {...p} className={'w-full bg-[#1A2030] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60 '+(p.className||'')}/>}
function Select(p){return <select {...p} className={'w-full bg-[#1A2030] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60 '+(p.className||'')}/>}
function Field({label,children,className=''}){return <div className={className}><label className="block mb-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</label>{children}</div>}
function Modal({title,onClose,children}){return <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#161B23] border border-white/10 rounded-2xl shadow-2xl"><div className="sticky top-0 z-10 flex justify-between items-center px-5 py-4 bg-[#161B23] border-b border-white/10"><h3 className="text-sm font-bold text-white">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-white"><X size={19}/></button></div><div className="p-5">{children}</div></div></div>}
function Actions({edit,del}){return <div className="flex justify-end gap-1">{edit && <button onClick={edit} className="p-1.5 rounded bg-blue-950/40 text-blue-400"><Pencil size={13}/></button>}{del && <button onClick={del} className="p-1.5 rounded bg-red-950/40 text-red-400"><Trash2 size={13}/></button>}</div>}
function Buttons({saving,close}){return <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-3 border-t border-white/5"><button type="button" onClick={close} className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-white/10">Cancelar</button><button disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white disabled:opacity-50"><Save size={14}/>{saving?'SALVANDO...':'SALVAR'}</button></div>}

export default function FrotaFretes({userRole='gestor', currentUserEmail=''}){
  const isDriver = userRole === 'motorista';
  
  const tabs = useMemo(() => {
    if (isDriver) {
      return [
        ['minhas_viagens', 'Minhas Viagens', Route],
        ['abastecimentos', 'Abastecimentos', Fuel],
        ['despesas', 'Despesas', Receipt]
      ];
    }
    return [
      ['dashboard', 'Dashboard', TrendingUp],
      ['viagens', 'Viagens', Route],
      ['veiculos', 'Veículos', Truck],
      ['motoristas', 'Motoristas', Users],
      ['fretes', 'Fretes', FileText]
    ];
  }, [isDriver]);

  const [tab, setTab] = useState(isDriver ? 'minhas_viagens' : 'dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [fretes, setFretes] = useState([]);
  const [viagens, setViagens] = useState([]);
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [despesas, setDespesas] = useState([]);

  const [trip, setTrip] = useState(emptyTrip);
  const [abastecimentoForm, setAbastecimentoForm] = useState(emptyAbastecimento);
  const [despesaForm, setDespesaForm] = useState(emptyDespesa);

  const [q, setQ] = useState('');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);

  const currentMotorista = useMemo(() => {
    if (!isDriver) return null;
    return motoristas.find(m => m.email?.toLowerCase() === currentUserEmail?.toLowerCase()) || motoristas[0] || null;
  }, [isDriver, motoristas, currentUserEmail]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const resV = await supabase.from('veiculos').select('id, placa, marca, modelo, ano, status').order('placa');
      if(resV.error) throw resV.error;
      setVeiculos(resV.data || []);

      const resM = await supabase.from('motoristas').select('id, nome, email, telefone, status').order('nome');
      if(resM.error) throw resM.error;
      setMotoristas(resM.data || []);

      const resF = await supabase.from('fretes').select('id, codigo_frete, origem, destino, status, created_at').order('created_at',{ascending:false});
      if(resF.error) throw resF.error;
      setFretes(resF.data || []);

      const resT = await supabase.from('viagens').select(`
        id, codigo_viagem, frete_id, veiculo_id, motorista_id, carreta_placa,
        km_inicial, km_final, peso_carregado_kg, peso_descarga_kg,
        numero_nf, local_carregamento, local_descarga, data_saida, data_chegada,
        status, observacao, created_at,
        veiculos (id, placa, marca, modelo)
      `).order('created_at',{ascending:false});
      if(resT.error) throw resT.error;
      setViagens(resT.data || []);

      try {
        const resAb = await supabase.from('abastecimentos').select(`
          id, veiculo_id, data_hora, litros, valor_total, km_atual, posto, observacao, created_at,
          veiculos (id, placa)
        `).order('created_at', {ascending: false});
        setAbastecimentos(resAb.data || []);
      } catch { setAbastecimentos([]); }

      try {
        const resDesp = await supabase.from('despesas_viagem').select(`
          id, veiculo_id, categoria, valor, data_despesa, descricao, created_at,
          veiculos (id, placa)
        `).order('created_at', {ascending: false});
        setDespesas(resDesp.data || []);
      } catch { setDespesas([]); }

    } catch (e) {
      setError('Erro ao carregar dados do Supabase: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }, [isDriver]);

  useEffect(() => { load(); }, [load]);

  const viagensFiltradas = useMemo(() => {
    let lista = viagens.map(v => ({
      ...v,
      motorista_nome: motoristas.find(m => m.id === v.motorista_id)?.nome || '-'
    }));

    if (isDriver && currentMotorista) {
      lista = lista.filter(v => v.motorista_id === currentMotorista.id);
    }
    return lista.filter(x => [x.codigo_viagem, x.local_carregamento, x.local_descarga, x.numero_nf, x.motorista_nome].join(' ').toLowerCase().includes(q.toLowerCase()));
  }, [viagens, motoristas, isDriver, currentMotorista, q]);

  function open(type, row = null) {
    setEditing(row); setQ('');
    if(type === 'viagem') {
      if(row) {
        setTrip({...row});
      } else {
        setTrip({
          ...emptyTrip,
          codigo_viagem: `VAG-${Date.now().toString().slice(-6)}`,
          motorista_id: currentMotorista ? currentMotorista.id : '',
          veiculo_id: '',
          data_saida: new Date().toISOString().slice(0,16),
          status: 'EM_VIAGEM'
        });
      }
    } else if(type === 'abastecimento') {
      setAbastecimentoForm(row ? {...row} : {...emptyAbastecimento, data_hora: new Date().toISOString().slice(0,16)});
    } else if(type === 'despesa') {
      setDespesaForm(row ? {...row} : {...emptyDespesa, data_despesa: new Date().toISOString().slice(0,10)});
    }
    setModal(type);
  }

  async function save(type) {
    setSaving(true); setError('');
    let table = '', payload = {};

    if(type === 'viagem') {
      table = 'viagens';
      payload = {
        codigo_viagem: trip.codigo_viagem || `VAG-${Date.now().toString().slice(-6)}`,
        frete_id: trip.frete_id ? Number(trip.frete_id) : null,
        veiculo_id: Number(trip.veiculo_id),
        motorista_id: isDriver && currentMotorista ? currentMotorista.id : Number(trip.motorista_id),
        carreta_placa: trip.carreta_placa || null,
        km_inicial: trip.km_inicial ? Number(trip.km_inicial) : null,
        km_final: trip.km_final ? Number(trip.km_final) : null,
        peso_carregado_kg: trip.peso_carregado_kg ? Number(trip.peso_carregado_kg) : null,
        peso_descarga_kg: trip.peso_descarga_kg ? Number(trip.peso_descarga_kg) : null,
        numero_nf: trip.numero_nf || null,
        local_carregamento: trip.local_carregamento || null,
        local_descarga: trip.local_descarga || null,
        data_saida: trip.data_saida || null,
        data_chegada: trip.data_chegada || null,
        status: trip.status || 'PLANEJADA',
        observacao: trip.observacao || null
      };
    } else if(type === 'abastecimento') {
      table = 'abastecimentos';
      payload = {
        veiculo_id: Number(abastecimentoForm.veiculo_id),
        data_hora: abastecimentoForm.data_hora || null,
        litros: Number(abastecimentoForm.litros || 0),
        valor_total: Number(abastecimentoForm.valor_total || 0),
        km_atual: Number(abastecimentoForm.km_atual || 0),
        posto: abastecimentoForm.posto || null,
        observacao: abastecimentoForm.observacao || null
      };
    } else if(type === 'despesa') {
      table = 'despesas_viagem';
      payload = {
        veiculo_id: despesaForm.veiculo_id ? Number(despesaForm.veiculo_id) : null,
        categoria: despesaForm.categoria,
        valor: Number(despesaForm.valor || 0),
        data_despesa: despesaForm.data_despesa || null,
        descricao: despesaForm.descricao || null
      };
    }

    const r = editing ? await supabase.from(table).update(payload).eq('id', editing.id) : await supabase.from(table).insert(payload);
    if(r.error) setError(r.error.message);
    else setModal('');
    setSaving(false);
    if(!r.error) await load();
  }

  async function del(table, id, label) {
    if(!window.confirm(`Excluir ${label}?`)) return;
    const r = await supabase.from(table).delete().eq('id', id);
    if(r.error) setError(r.error.message);
    else await load();
  }

  const status = s => <span className="px-2 py-1 rounded border text-[9px] font-bold bg-blue-950/40 text-blue-300 border-blue-500/20">{s}</span>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Gestão operacional</p>
          <h1 className="text-xl font-extrabold text-white mt-1">
            {isDriver ? `Painel do Motorista: ${currentMotorista?.nome || currentUserEmail}` : 'Frota & Fretes'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isDriver ? 'Inicie viagens, registre abastecimentos e lance despesas na estrada.' : 'Veículos próprios, motoristas, fretes e viagens.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(([id, label, I]) => (
            <button key={id} onClick={() => { setTab(id); setQ(''); }} className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ' + (tab === id ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' : 'bg-[#161B23] text-gray-400 border-white/5')}>
              <I size={14} />{label}
            </button>
          ))}
          <button onClick={load} className="p-2 rounded-lg bg-[#161B23] border border-white/5 text-gray-400">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="flex gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 text-xs"><AlertCircle size={15}/>{error}</div>}

      {(tab === 'viagens' || tab === 'minhas_viagens') && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500"/>
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar viagens..." className="pl-9 md:w-72"/>
            </div>
            <div className="flex gap-2">
              {isDriver && (
                <>
                  <button onClick={() => open('abastecimento')} className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <Fuel size={15}/>NOVO ABASTECIMENTO
                  </button>
                  <button onClick={() => open('despesa')} className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <Receipt size={15}/>LANÇAR DESPESA
                  </button>
                </>
              )}
              <button onClick={() => open('viagem')} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg">
                <PlayCircle size={15}/>{isDriver ? 'INICIAR / REGISTRAR VIAGEM' : 'NOVA VIAGEM'}
              </button>
            </div>
          </div>
          <Table rows={viagensFiltradas} headers={['Código','Veículo','Motorista','Carregamento → Descarga','NF','Status','']} render={v => (
            <>
              <td className="p-3 font-bold text-blue-300">{v.codigo_viagem}</td>
              <td className="p-3">{v.veiculos?.placa || '-'}</td>
              <td className="p-3">{v.motorista_nome}</td>
              <td className="p-3">{v.local_carregamento || '-'} → {v.local_descarga || '-'}</td>
              <td className="p-3">{v.numero_nf || '-'}</td>
              <td className="p-3">{status(v.status)}</td>
              <td className="p-3"><Actions edit={() => open('viagem', v)} del={() => del('viagens', v.id, `a viagem ${v.codigo_viagem}`)} /></td>
            </>
          )} empty="Nenhuma viagem registrada."/>
        </div>
      )}

      {tab === 'abastecimentos' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Meus Abastecimentos</h2>
            <button onClick={() => open('abastecimento')} className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Fuel size={15}/>NOVO ABASTECIMENTO
            </button>
          </div>
          <Table rows={abastecimentos} headers={['Data/Hora','Veículo','Posto','Litros','Valor Total','KM Atual','']} render={a => (
            <>
              <td className="p-3">{a.data_hora ? new Date(a.data_hora).toLocaleString('pt-BR') : '-'}</td>
              <td className="p-3 font-bold text-emerald-400">{a.veiculos?.placa || '-'}</td>
              <td className="p-3">{a.posto || '-'}</td>
              <td className="p-3">{num(a.litros, 2)} L</td>
              <td className="p-3 font-bold">{money(a.valor_total)}</td>
              <td className="p-3">{num(a.km_atual)} km</td>
              <td className="p-3"><Actions del={() => del('abastecimentos', a.id, 'o abastecimento')} /></td>
            </>
          )} empty="Nenhum abastecimento registrado."/>
        </div>
      )}

      {tab === 'despesas' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Despesas de Viagem</h2>
            <button onClick={() => open('despesa')} className="flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Receipt size={15}/>LANÇAR DESPESA
            </button>
          </div>
          <Table rows={despesas} headers={['Data','Categoria','Veículo','Descrição','Valor','']} render={d => (
            <>
              <td className="p-3">{d.data_despesa ? new Date(d.data_despesa).toLocaleDateString('pt-BR') : '-'}</td>
              <td className="p-3 font-bold text-amber-400">{d.categoria}</td>
              <td className="p-3">{d.veiculos?.placa || '-'}</td>
              <td className="p-3">{d.descricao || '-'}</td>
              <td className="p-3 font-bold">{money(d.valor)}</td>
              <td className="p-3"><Actions del={() => del('despesas_viagem', d.id, 'a despesa')} /></td>
            </>
          )} empty="Nenhuma despesa registrada."/>
        </div>
      )}

      {modal === 'viagem' && (
        <Modal title={editing ? 'Editar viagem' : 'Iniciar / Registrar Viagem'} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('viagem'); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Código Viagem"><Input value={trip.codigo_viagem} onChange={e => setTrip({...trip, codigo_viagem: e.target.value})} required/></Field>
            
            <Field label="Motorista">
              {isDriver ? (
                <Input value={currentMotorista ? currentMotorista.nome : (currentUserEmail || 'Motorista')} disabled className="bg-gray-800 text-gray-400 cursor-not-allowed"/>
              ) : (
                <Select value={trip.motorista_id} onChange={e => setTrip({...trip, motorista_id: e.target.value})} required>
                  <option value="">Selecione o motorista</option>
                  {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </Select>
              )}
            </Field>

            <Field label="Veículo / Placa">
              <Select value={trip.veiculo_id} onChange={e => setTrip({...trip, veiculo_id: e.target.value})} required>
                <option value="">Selecione o veículo</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
              </Select>
            </Field>

            <Field label="Frete Associado (Opcional)">
              <Select value={trip.frete_id} onChange={e => setTrip({...trip, frete_id: e.target.value})}>
                <option value="">Nenhum / Viagem Própria</option>
                {fretes.map(f => <option key={f.id} value={f.id}>{f.codigo_frete} - {f.origem} → {f.destino}</option>)}
              </Select>
            </Field>

            <Field label="Status da Viagem">
              <Select value={trip.status} onChange={e => setTrip({...trip, status: e.target.value})}>
                {['PLANEJADA','AGUARDANDO_CARREGAMENTO','CARREGADO','EM_VIAGEM','NO_DESTINO','FINALIZADA','CANCELADA'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>

            <Field label="Placa Carreta (Opcional)"><Input value={trip.carreta_placa} onChange={e => setTrip({...trip, carreta_placa: e.target.value})}/></Field>
            <Field label="Local Carregamento"><Input value={trip.local_carregamento} onChange={e => setTrip({...trip, local_carregamento: e.target.value})}/></Field>
            <Field label="Local Descarga"><Input value={trip.local_descarga} onChange={e => setTrip({...trip, local_descarga: e.target.value})}/></Field>
            <Field label="Número NF"><Input value={trip.numero_nf} onChange={e => setTrip({...trip, numero_nf: e.target.value})}/></Field>
            <Field label="KM Inicial"><Input type="number" value={trip.km_inicial} onChange={e => setTrip({...trip, km_inicial: e.target.value})}/></Field>
            <Field label="KM Final"><Input type="number" value={trip.km_final} onChange={e => setTrip({...trip, km_final: e.target.value})}/></Field>
            <Field label="Peso Carregado (kg)"><Input type="number" value={trip.peso_carregado_kg} onChange={e => setTrip({...trip, peso_carregado_kg: e.target.value})}/></Field>
            <Field label="Peso Descarga (kg)"><Input type="number" value={trip.peso_descarga_kg} onChange={e => setTrip({...trip, peso_descarga_kg: e.target.value})}/></Field>
            <Field label="Data Saída"><Input type="datetime-local" value={trip.data_saida ? trip.data_saida.slice(0,16) : ''} onChange={e => setTrip({...trip, data_saida: e.target.value})}/></Field>
            <Field label="Data Chegada"><Input type="datetime-local" value={trip.data_chegada ? trip.data_chegada.slice(0,16) : ''} onChange={e => setTrip({...trip, data_chegada: e.target.value})}/></Field>
            <Field label="Observação" className="sm:col-span-2"><Input value={trip.observacao} onChange={e => setTrip({...trip, observacao: e.target.value})}/></Field>
            
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'abastecimento' && (
        <Modal title="Registrar Abastecimento" onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('abastecimento'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Veículo / Placa">
              <Select value={abastecimentoForm.veiculo_id} onChange={e => setAbastecimentoForm({...abastecimentoForm, veiculo_id: e.target.value})} required>
                <option value="">Selecione o veículo</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
              </Select>
            </Field>
            <Field label="Data e Hora"><Input type="datetime-local" value={abastecimentoForm.data_hora ? abastecimentoForm.data_hora.slice(0,16) : ''} onChange={e => setAbastecimentoForm({...abastecimentoForm, data_hora: e.target.value})} required/></Field>
            <Field label="Litros"><Input type="number" step="0.01" value={abastecimentoForm.litros} onChange={e => setAbastecimentoForm({...abastecimentoForm, litros: e.target.value})} required/></Field>
            <Field label="Valor Total (R$)"><Input type="number" step="0.01" value={abastecimentoForm.valor_total} onChange={e => setAbastecimentoForm({...abastecimentoForm, valor_total: e.target.value})} required/></Field>
            <Field label="KM Atual"><Input type="number" value={abastecimentoForm.km_atual} onChange={e => setAbastecimentoForm({...abastecimentoForm, km_atual: e.target.value})} required/></Field>
            <Field label="Posto"><Input value={abastecimentoForm.posto} onChange={e => setAbastecimentoForm({...abastecimentoForm, posto: e.target.value})}/></Field>
            <Field label="Observação" className="sm:col-span-2"><Input value={abastecimentoForm.observacao} onChange={e => setAbastecimentoForm({...abastecimentoForm, observacao: e.target.value})}/></Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'despesa' && (
        <Modal title="Lançar Despesa de Viagem" onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('despesa'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria">
              <Select value={despesaForm.categoria} onChange={e => setDespesaForm({...despesaForm, categoria: e.target.value})}>
                {['COMBUSTIVEL','PEDAGIO','ESTACIONAMENTO','MANUTENCAO','ALIMENTACAO','HOSPEDAGEM','OUTROS'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Veículo / Placa (Opcional)">
              <Select value={despesaForm.veiculo_id} onChange={e => setDespesaForm({...despesaForm, veiculo_id: e.target.value})}>
                <option value="">Selecione o veículo</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
              </Select>
            </Field>
            <Field label="Valor (R$)"><Input type="number" step="0.01" value={despesaForm.valor} onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})} required/></Field>
            <Field label="Data"><Input type="date" value={despesaForm.data_despesa} onChange={e => setDespesaForm({...despesaForm, data_despesa: e.target.value})} required/></Field>
            <Field label="Descrição" className="sm:col-span-2"><Input value={despesaForm.descricao} onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})} placeholder="Ex: Almoço em posto de estrada"/></Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Table({rows, headers, render, empty}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-500">
          <tr>{headers.map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(r => <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">{render(r)}</tr>)}
          {!rows.length && <tr><td colSpan={headers.length} className="p-8 text-center text-gray-600">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}