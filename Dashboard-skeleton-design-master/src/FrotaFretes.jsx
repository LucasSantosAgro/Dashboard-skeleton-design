import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Users, FileText, Route, Plus, Search, RefreshCw, Pencil, Trash2, X, Save, DollarSign, Package, Gauge, TrendingUp, AlertCircle, Fuel, Receipt, PlayCircle, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { supabase } from './lib/supabaseClient';

const colors = ['#38BDF8','#22C55E','#F59E0B','#A78BFA','#EC4899','#14B8A6'];
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (v,d=0) => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const upper = v => (typeof v === 'string' ? v.toUpperCase() : v);

const emptyTripInicio = {
  codigo_viagem: '', frete_id: '', veiculo_id: '', motorista_id: '', carreta_placa: '',
  km_inicial: '', peso_carregado_kg: '', produto: '',
  numero_nf: '', local_carregamento: '', data_saida: '', observacao: '', status: 'EM_VIAGEM'
};

const emptyTripFim = {
  km_final: '', peso_descarga_kg: '', local_descarga: '', data_chegada: '', status: 'FINALIZADA'
};

const emptyAbastecimento = { veiculo_id: '', viagem_id: '', data_hora: '', litros: '', valor_total: '', km_atual: '', posto: '', observacao: '' };
const emptyDespesa = { veiculo_id: '', viagem_id: '', categoria: 'PEDAGIO', valor: '', data_despesa: '', descricao: '' };
const emptyMotorista = { nome: '', email: '', telefone: '', status: 'ATIVO', veiculo_id: '' };
const emptyVeiculo = { placa: '', marca: '', modelo: '', ano: '', status: 'ATIVO' };
const emptyFrete = { codigo_frete: '', origem: '', destino: '', cliente: '', valor: '', status: 'PENDENTE' };

function Input(p){return <input {...p} value={p.value ?? ''} onChange={e => { e.target.value = upper(e.target.value); if(p.onChange) p.onChange(e); }} className={'w-full bg-[#1A2030] border border-white/10 rounded-lg px-3 py-2 text-xs text-white uppercase outline-none focus:border-blue-500/60 '+(p.className||'')}/>}
function Select(p){return <select {...p} className={'w-full bg-[#1A2030] border border-white/10 rounded-lg px-3 py-2 text-xs text-white uppercase outline-none focus:border-blue-500/60 '+(p.className||'')}/>}
function Field({label,children,className=''}){return <div className={className}><label className="block mb-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</label>{children}</div>}
function Modal({title,onClose,children}){return <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#161B23] border border-white/10 rounded-2xl shadow-2xl"><div className="sticky top-0 z-10 flex justify-between items-center px-5 py-4 bg-[#161B23] border-b border-white/10"><h3 className="text-sm font-bold text-white uppercase">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-white"><X size={19}/></button></div><div className="p-5">{children}</div></div></div>}
function Actions({edit,del}){return <div className="flex justify-end gap-1">{edit && <button onClick={edit} className="p-1.5 rounded bg-blue-950/40 text-blue-400"><Pencil size={13}/></button>}{del && <button onClick={del} className="p-1.5 rounded bg-red-950/40 text-red-400"><Trash2 size={13}/></button>}</div>}
function Buttons({saving,close}){return <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-3 border-t border-white/5"><button type="button" onClick={close} className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-white/10">CANCELAR</button><button disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white disabled:opacity-50"><Save size={14}/>{saving?'SALVANDO...':'SALVAR'}</button></div>}

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
  const [kpis, setKpis] = useState(null);
  const [dashboardData, setDashboardData] = useState([]);

  const [tripInicio, setTripInicio] = useState(emptyTripInicio);
  const [tripFim, setTripFim] = useState(emptyTripFim);
  const [abastecimentoForm, setAbastecimentoForm] = useState(emptyAbastecimento);
  const [despesaForm, setDespesaForm] = useState(emptyDespesa);
  const [motoristaForm, setMotoristaForm] = useState(emptyMotorista);
  const [veiculoForm, setVeiculoForm] = useState(emptyVeiculo);
  const [freteForm, setFreteForm] = useState(emptyFrete);

  const [q, setQ] = useState('');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);

  const currentMotorista = useMemo(() => {
    if (!isDriver) return null;
    return motoristas.find(m => m.email?.toLowerCase() === currentUserEmail?.toLowerCase()) || motoristas[0] || null;
  }, [isDriver, motoristas, currentUserEmail]);

  const viagemAtiva = useMemo(() => {
    if (!currentMotorista) return null;
    return viagens.find(v => v.motorista_id === currentMotorista.id && v.status === 'EM_VIAGEM') || null;
  }, [viagens, currentMotorista]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const resV = await supabase.from('veiculos').select('id, placa, marca, modelo, ano, status').order('placa');
      if(resV.error) throw resV.error;
      setVeiculos(resV.data || []);

      const resM = await supabase.from('motoristas').select('id, nome, email, telefone, status, veiculo_id').order('nome');
      if(resM.error) throw resM.error;
      setMotoristas(resM.data || []);

      const resF = await supabase.from('fretes').select('id, codigo_frete, origem, destino, cliente, valor, status, created_at').order('created_at',{ascending:false});
      if(resF.error) throw resF.error;
      setFretes(resF.data || []);

      const resT = await supabase.from('viagens').select(`
        id, codigo_viagem, frete_id, veiculo_id, motorista_id, carreta_placa,
        km_inicial, km_final, peso_carregado_kg, peso_descarga_kg, produto,
        numero_nf, local_carregamento, local_descarga, data_saida, data_chegada,
        status, observacao, created_at,
        veiculos (id, placa, marca, modelo)
      `).order('created_at',{ascending:false});
      if(resT.error) throw resT.error;
      setViagens(resT.data || []);

      try {
        const resAb = await supabase.from('abastecimentos').select(`
          id, veiculo_id, viagem_id, data_hora, litros, valor_total, km_atual, posto, observacao, created_at,
          veiculos (id, placa)
        `).order('created_at', {ascending: false});
        setAbastecimentos(resAb.data || []);
      } catch { setAbastecimentos([]); }

      try {
        const resDesp = await supabase.from('viagem_despesas').select(`
          id, viagem_id, tipo, valor, data, descricao, created_at
        `).order('created_at', {ascending: false});
        setDespesas(resDesp.data || []);
      } catch { setDespesas([]); }

      try {
        const resKpi = await supabase.from('v_frota_kpis').select('*').single();
        if(!resKpi.error) setKpis(resKpi.data);
      } catch { setKpis(null); }

      try {
        const resDash = await supabase.from('v_frota_dashboard').select('*');
        if(!resDash.error) setDashboardData(resDash.data || []);
      } catch { setDashboardData([]); }

    } catch (e) {
      setError('Erro ao carregar dados do Supabase: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const viagensFiltradas = useMemo(() => {
    let lista = viagens.map(v => ({
      ...v,
      motorista_nome: motoristas.find(m => m.id === v.motorista_id)?.nome || '-'
    }));

    if (isDriver && currentMotorista) {
      lista = lista.filter(v => v.motorista_id === currentMotorista.id);
    }
    return lista.filter(x => [x.codigo_viagem, x.local_carregamento, x.local_descarga, x.numero_nf, x.produto, x.motorista_nome].join(' ').toLowerCase().includes(q.toLowerCase()));
  }, [viagens, motoristas, isDriver, currentMotorista, q]);

  function open(type, row = null) {
    setEditing(row); setQ('');
    if(type === 'iniciar_viagem') {
      const veiculoSugerido = currentMotorista?.veiculo_id || '';
      if(row) {
        setTripInicio({...row});
      } else {
        setTripInicio({
          ...emptyTripInicio,
          codigo_viagem: `VAG-${Date.now().toString().slice(-6)}`,
          motorista_id: currentMotorista ? currentMotorista.id : '',
          veiculo_id: veiculoSugerido,
          data_saida: new Date().toISOString().slice(0,16),
          status: 'EM_VIAGEM'
        });
      }
    } else if(type === 'finalizar_viagem') {
      setEditing(row);
      setTripFim({
        km_final: row?.km_final || '',
        peso_descarga_kg: row?.peso_descarga_kg || '',
        local_descarga: row?.local_descarga || '',
        data_chegada: row?.data_chegada ? row.data_chegada.slice(0,16) : new Date().toISOString().slice(0,16),
        status: 'FINALIZADA'
      });
    } else if(type === 'abastecimento') {
      const veiculoSugerido = viagemAtiva?.veiculo_id || currentMotorista?.veiculo_id || '';
      const viagemSugeridaId = viagemAtiva?.id || '';
      setAbastecimentoForm(row ? {...row} : {...emptyAbastecimento, veiculo_id: veiculoSugerido, viagem_id: viagemSugeridaId, data_hora: new Date().toISOString().slice(0,16)});
    } else if(type === 'despesa') {
      const veiculoSugerido = viagemAtiva?.veiculo_id || currentMotorista?.veiculo_id || '';
      const viagemSugeridaId = viagemAtiva?.id || '';
      setDespesaForm(row ? {...row} : {...emptyDespesa, viagem_id: viagemSugeridaId, data_despesa: new Date().toISOString().slice(0,10)});
    } else if(type === 'motorista') {
      setMotoristaForm(row ? {...row} : {...emptyMotorista});
    } else if(type === 'veiculo') {
      setVeiculoForm(row ? {...row} : {...emptyVeiculo});
    } else if(type === 'frete') {
      setFreteForm(row ? {...row} : {...emptyFrete, codigo_frete: `FRT-${Date.now().toString().slice(-6)}`});
    }
    setModal(type);
  }

  async function save(type) {
    setSaving(true); setError('');
    try {
      if(type === 'iniciar_viagem') {
        const payload = {
          codigo_viagem: upper(tripInicio.codigo_viagem || `VAG-${Date.now().toString().slice(-6)}`),
          frete_id: tripInicio.frete_id ? Number(tripInicio.frete_id) : null,
          veiculo_id: Number(tripInicio.veiculo_id),
          motorista_id: isDriver && currentMotorista ? currentMotorista.id : Number(tripInicio.motorista_id),
          carreta_placa: upper(tripInicio.carreta_placa) || null,
          km_inicial: tripInicio.km_inicial ? Number(tripInicio.km_inicial) : null,
          peso_carregado_kg: tripInicio.peso_carregado_kg ? Number(tripInicio.peso_carregado_kg) : null,
          produto: upper(tripInicio.produto) || null,
          numero_nf: upper(tripInicio.numero_nf) || null,
          local_carregamento: upper(tripInicio.local_carregamento) || null,
          data_saida: tripInicio.data_saida || null,
          status: 'EM_VIAGEM',
          observacao: upper(tripInicio.observacao) || null
        };
        const r = editing ? await supabase.from('viagens').update(payload).eq('id', editing.id) : await supabase.from('viagens').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'finalizar_viagem') {
        const payload = {
          km_final: tripFim.km_final ? Number(tripFim.km_final) : null,
          peso_descarga_kg: tripFim.peso_descarga_kg ? Number(tripFim.peso_descarga_kg) : null,
          local_descarga: upper(tripFim.local_descarga) || null,
          data_chegada: tripFim.data_chegada || null,
          status: 'FINALIZADA'
        };
        const r = await supabase.from('viagens').update(payload).eq('id', editing.id);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'abastecimento') {
        const payload = {
          viagem_id: abastecimentoForm.viagem_id ? Number(abastecimentoForm.viagem_id) : null,
          litros: Number(abastecimentoForm.litros || 0),
          valor_total: Number(abastecimentoForm.valor_total || 0),
          km_atual: abastecimentoForm.km_atual ? Number(abastecimentoForm.km_atual) : null,
          posto: upper(abastecimentoForm.posto) || null
        };
        const r = editing ? await supabase.from('abastecimentos').update(payload).eq('id', editing.id) : await supabase.from('abastecimentos').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'despesa') {
        const payload = {
          viagem_id: Number(despesaForm.viagem_id),
          tipo: upper(despesaForm.categoria),
          valor: Number(despesaForm.valor || 0),
          descricao: upper(despesaForm.descricao) || null
        };
        const r = editing ? await supabase.from('viagem_despesas').update(payload).eq('id', editing.id) : await supabase.from('viagem_despesas').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'motorista') {
        const payload = {
          nome: upper(motoristaForm.nome),
          email: motoristaForm.email?.toLowerCase(),
          telefone: motoristaForm.telefone,
          status: upper(motoristaForm.status),
          veiculo_id: motoristaForm.veiculo_id ? Number(motoristaForm.veiculo_id) : null
        };
        const r = editing ? await supabase.from('motoristas').update(payload).eq('id', editing.id) : await supabase.from('motoristas').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'veiculo') {
        const payload = {
          placa: upper(veiculoForm.placa),
          marca: upper(veiculoForm.marca),
          modelo: upper(veiculoForm.modelo),
          ano: veiculoForm.ano ? Number(veiculoForm.ano) : null,
          status: upper(veiculoForm.status)
        };
        const r = editing ? await supabase.from('veiculos').update(payload).eq('id', editing.id) : await supabase.from('veiculos').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'frete') {
        const payload = {
          codigo_frete: upper(freteForm.codigo_frete || `FRT-${Date.now().toString().slice(-6)}`),
          origem: upper(freteForm.origem),
          destino: upper(freteForm.destino),
          cliente: upper(freteForm.cliente),
          valor: Number(freteForm.valor || 0),
          status: upper(freteForm.status)
        };
        const r = editing ? await supabase.from('fretes').update(payload).eq('id', editing.id) : await supabase.from('fretes').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      }
      await load();
    } catch (e) {
      setError('Erro ao salvar: ' + (e.message || JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
  }

  async function del(table, id, label) {
    if(!window.confirm(`EXCLUIR ${label}?`)) return;
    const r = await supabase.from(table).delete().eq('id', id);
    if(r.error) setError(r.error.message);
    else await load();
  }

  const statusBadge = s => <span className="px-2 py-1 rounded border text-[9px] font-bold bg-blue-950/40 text-blue-300 border-blue-500/20">{s}</span>;

  return (
    <div className="flex flex-col gap-5 uppercase">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Gestão Operacional</p>
          <h1 className="text-xl font-extrabold text-white mt-1">
            {isDriver ? `Painel do Motorista: ${currentMotorista?.nome || currentUserEmail}` : 'Frota & Fretes'}
          </h1>
          <p className="text-xs text-gray-500 mt-1 normal-case">
            {isDriver ? 'Inicie viagens, finalize rotas, registre abastecimentos e despesas vinculadas à sua viagem ativa.' : 'Veículos próprios, motoristas vinculados, fretes e viagens.'}
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

      {/* DASHBOARD DO GESTOR */}
      {!isDriver && tab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-[#161B23] border border-white/5 p-4 rounded-xl">
            <h2 className="text-sm font-extrabold text-white tracking-wider">Dashboard da Frota</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#1A2030] px-3 py-1.5 rounded-lg border border-white/10">
              <span>Período Geral</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-blue-100">Total de Viagens</p>
                <h3 className="text-2xl font-black mt-1">{kpis?.total_viagens || viagens.length}</h3>
              </div>
              <p className="text-[10px] text-blue-200 mt-3">Registradas no sistema</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-emerald-100">Km Rodados</p>
                <h3 className="text-2xl font-black mt-1">{num(kpis?.km_rodados || 0)} km</h3>
              </div>
              <p className="text-[10px] text-emerald-200 mt-3">Baseado nas viagens</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-amber-100">Toneladas Transportadas</p>
                <h3 className="text-2xl font-black mt-1">{num(kpis?.toneladas_transportadas || 0, 1)} t</h3>
              </div>
              <p className="text-[10px] text-amber-200 mt-3">Volume total</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-purple-100">Receita de Fretes</p>
                <h3 className="text-xl font-black mt-1">{money(kpis?.receita_fretes || fretes.reduce((acc, f) => acc + Number(f.valor || 0), 0))}</h3>
              </div>
              <p className="text-[10px] text-purple-200 mt-3">Soma de fretes</p>
            </div>
            <div className="bg-gradient-to-br from-rose-600 to-rose-800 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-rose-100">Custos Operacionais</p>
                <h3 className="text-xl font-black mt-1">{money(kpis?.custos_operacionais || abastecimentos.reduce((acc, a) => acc + Number(a.valor_total || 0), 0))}</h3>
              </div>
              <p className="text-[10px] text-rose-200 mt-3">Abastecimentos e despesas</p>
            </div>
            <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-teal-100">Resultado</p>
                <h3 className="text-xl font-black mt-1">{money(kpis?.resultado || 0)}</h3>
              </div>
              <p className="text-[10px] text-teal-200 mt-3">Receita - Custos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-[#161B23] border border-white/5 p-5 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-white uppercase">Receitas x Custos</h3>
                <div className="flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Receita</span>
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Custos</span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.length ? dashboardData : [{codigo_viagem: 'GERAL', receita: 0, custo_total: 0}]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                    <XAxis dataKey="codigo_viagem" stroke="#A0AEC0" fontSize={10} />
                    <YAxis stroke="#A0AEC0" fontSize={10} />
                    <Tooltip contentStyle={{backgroundColor: '#1A2030', borderColor: '#4A5568', fontSize: '11px', textTransform: 'uppercase'}} />
                    <Bar dataKey="receita" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="custo_total" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#161B23] border border-white/5 p-5 rounded-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase">Viagens em Andamento</h3>
                <span onClick={() => setTab('viagens')} className="text-[10px] text-blue-400 cursor-pointer font-bold">Ver todas →</span>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto max-h-60">
                {viagens.filter(v => v.status === 'EM_VIAGEM').length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">Nenhuma viagem em andamento.</p>
                ) : (
                  viagens.filter(v => v.status === 'EM_VIAGEM').map(v => (
                    <div key={v.id} className="bg-[#1A2030] p-3 rounded-lg border border-white/5 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-300">{v.codigo_viagem}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-500/20">{v.status}</span>
                      </div>
                      <p className="text-[11px] text-gray-300">Motorista: {motoristas.find(m => m.id === v.motorista_id)?.nome || '-'}</p>
                      <p className="text-[11px] text-gray-400">Placa: {v.veiculos?.placa || '-'}</p>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1 pt-1 border-t border-white/5">
                        <span>{v.local_carregamento || 'ORIGEM'} → {v.local_descarga || 'DESTINO'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(tab === 'viagens' || tab === 'minhas_viagens') && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500"/>
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar viagens, produtos..." className="pl-9 md:w-72 lowercase"/>
            </div>
            <div className="flex flex-wrap gap-2">
              {isDriver && (
                <>
                  <button onClick={() => open('abastecimento')} className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <Fuel size={15}/>ABASTECIMENTO
                  </button>
                  <button onClick={() => open('despesa')} className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg">
                    <Receipt size={15}/>DESPESA
                  </button>
                </>
              )}
              <button onClick={() => open('iniciar_viagem')} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg">
                <PlayCircle size={15}/>INICIAR NOVA VIAGEM
              </button>
            </div>
          </div>
          <Table rows={viagensFiltradas} headers={['Código','Veículo','Motorista','Produto','Origem → Destino','Status','Ações']} render={v => (
            <>
              <td className="p-3 font-bold text-blue-300">{v.codigo_viagem}</td>
              <td className="p-3">{v.veiculos?.placa || '-'}</td>
              <td className="p-3">{v.motorista_nome}</td>
              <td className="p-3 font-semibold text-gray-300">{v.produto || '-'}</td>
              <td className="p-3">{v.local_carregamento || '-'} → {v.local_descarga || 'EM TRÂNSITO'}</td>
              <td className="p-3">{statusBadge(v.status)}</td>
              <td className="p-3">
                <div className="flex items-center gap-1.5">
                  {v.status !== 'FINALIZADA' && (
                    <button onClick={() => open('finalizar_viagem', v)} className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/50 text-[10px] font-bold border border-emerald-500/20">
                      <CheckCircle2 size={12}/> FINALIZAR
                    </button>
                  )}
                  <Actions edit={() => open('iniciar_viagem', v)} del={() => del('viagens', v.id, `A VIAGEM ${v.codigo_viagem}`)} />
                </div>
              </td>
            </>
          )} empty="NENHUMA VIAGEM REGISTRADA."/>
        </div>
      )}

      {/* ABA VEÍCULOS ADICIONADA */}
      {tab === 'veiculos' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Frota de Veículos</h2>
            <button onClick={() => open('veiculo')} className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Plus size={15}/>ADICIONAR VEÍCULO
            </button>
          </div>
          <Table rows={veiculos} headers={['Placa','Marca','Modelo','Ano','Status','Ações']} render={v => (
            <>
              <td className="p-3 font-bold text-blue-300">{v.placa}</td>
              <td className="p-3">{v.marca || '-'}</td>
              <td className="p-3 font-semibold text-white">{v.modelo || '-'}</td>
              <td className="p-3">{v.ano || '-'}</td>
              <td className="p-3">{statusBadge(v.status || 'ATIVO')}</td>
              <td className="p-3"><Actions edit={() => open('veiculo', v)} del={() => del('veiculos', v.id, `O VEÍCULO ${v.placa}`)} /></td>
            </>
          )} empty="NENHUM VEÍCULO CADASTRADO."/>
        </div>
      )}

      {tab === 'motoristas' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Motoristas & Vínculo de Veículos</h2>
            <button onClick={() => open('motorista')} className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Plus size={15}/>NOVO MOTORISTA
            </button>
          </div>
          <Table rows={motoristas.map(m => ({...m, veiculo_placa: veiculos.find(v => v.id === m.veiculo_id)?.placa || 'NENHUM'}))} headers={['Nome','E-mail','Telefone','Veículo Vinculado','Status','']} render={m => (
            <>
              <td className="p-3 font-bold text-white">{m.nome}</td>
              <td className="p-3 lowercase">{m.email || '-'}</td>
              <td className="p-3">{m.telefone || '-'}</td>
              <td className="p-3 font-semibold text-blue-400">{m.veiculo_placa}</td>
              <td className="p-3">{statusBadge(m.status)}</td>
              <td className="p-3"><Actions edit={() => open('motorista', m)} del={() => del('motoristas', m.id, m.nome)} /></td>
            </>
          )} empty="NENHUM MOTORISTA CADASTRADO."/>
        </div>
      )}

      {/* ABA FRETES ADICIONADA */}
      {tab === 'fretes' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Gestão de Fretes</h2>
            <button onClick={() => open('frete')} className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Plus size={15}/>CADASTRAR FRETE
            </button>
          </div>
          <Table rows={fretes} headers={['Código','Origem → Destino','Cliente','Valor','Status','Ações']} render={f => (
            <>
              <td className="p-3 font-bold text-blue-300">{f.codigo_frete}</td>
              <td className="p-3">{f.origem || '-'} → {f.destino || '-'}</td>
              <td className="p-3">{f.cliente || '-'}</td>
              <td className="p-3 font-bold text-emerald-400">{money(f.valor)}</td>
              <td className="p-3">{statusBadge(f.status || 'PENDENTE')}</td>
              <td className="p-3"><Actions edit={() => open('frete', f)} del={() => del('fretes', f.id, `O FRETE ${f.codigo_frete}`)} /></td>
            </>
          )} empty="NENHUM FRETE CADASTRADO."/>
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
          <Table rows={abastecimentos} headers={['Data/Hora','Posto','Litros','Valor Total','KM Atual','']} render={a => (
            <>
              <td className="p-3">{a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-'}</td>
              <td className="p-3">{a.posto || '-'}</td>
              <td className="p-3">{num(a.litros, 2)} L</td>
              <td className="p-3 font-bold">{money(a.valor_total)}</td>
              <td className="p-3">{num(a.km_atual)} KM</td>
              <td className="p-3"><Actions del={() => del('abastecimentos', a.id, 'O ABASTECIMENTO')} /></td>
            </>
          )} empty="NENHUM ABASTECIMENTO REGISTRADO."/>
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
          <Table rows={despesas} headers={['Data','Tipo','Descrição','Valor','']} render={d => (
            <>
              <td className="p-3">{d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '-'}</td>
              <td className="p-3 font-bold text-amber-400">{d.tipo}</td>
              <td className="p-3">{d.descricao || '-'}</td>
              <td className="p-3 font-bold">{money(d.valor)}</td>
              <td className="p-3"><Actions del={() => del('viagem_despesas', d.id, 'A DESPESA')} /></td>
            </>
          )} empty="NENHUMA DESPESA REGISTRADA."/>
        </div>
      )}

      {modal === 'iniciar_viagem' && (
        <Modal title={editing ? 'Editar Início da Viagem' : 'Iniciar Nova Viagem'} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('iniciar_viagem'); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Código Viagem"><Input value={tripInicio.codigo_viagem} onChange={e => setTripInicio({...tripInicio, codigo_viagem: e.target.value})} required/></Field>
            
            <Field label="Motorista">
              {isDriver ? (
                <Input value={currentMotorista ? currentMotorista.nome : (currentUserEmail || 'MOTORISTA')} disabled className="bg-gray-800 text-gray-400 cursor-not-allowed"/>
              ) : (
                <Select value={tripInicio.motorista_id} onChange={e => setTripInicio({...tripInicio, motorista_id: e.target.value})} required>
                  <option value="">SELECIONE O MOTORISTA</option>
                  {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </Select>
              )}
            </Field>

            <Field label="Veículo / Placa">
              <Select value={tripInicio.veiculo_id} onChange={e => setTripInicio({...tripInicio, veiculo_id: e.target.value})} required>
                <option value="">SELECIONE O VEÍCULO</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
              </Select>
            </Field>

            <Field label="Frete Associado (Opcional)">
              <Select value={tripInicio.frete_id} onChange={e => setTripInicio({...tripInicio, frete_id: e.target.value})}>
                <option value="">NENHUM / VIAGEM PRÓPRIA</option>
                {fretes.map(f => <option key={f.id} value={f.id}>{f.codigo_frete} - {f.origem} → {f.destino}</option>)}
              </Select>
            </Field>

            <Field label="Produto Transportado"><Input value={tripInicio.produto} onChange={e => setTripInicio({...tripInicio, produto: e.target.value})} placeholder="EX: SOJA A GRANEL"/></Field>
            <Field label="Placa Carreta (Opcional)"><Input value={tripInicio.carreta_placa} onChange={e => setTripInicio({...tripInicio, carreta_placa: e.target.value})}/></Field>
            <Field label="Local Carregamento"><Input value={tripInicio.local_carregamento} onChange={e => setTripInicio({...tripInicio, local_carregamento: e.target.value})}/></Field>
            <Field label="Número NF"><Input value={tripInicio.numero_nf} onChange={e => setTripInicio({...tripInicio, numero_nf: e.target.value})}/></Field>
            <Field label="KM Inicial"><Input type="number" value={tripInicio.km_inicial} onChange={e => setTripInicio({...tripInicio, km_inicial: e.target.value})}/></Field>
            <Field label="Peso Origem (kg)"><Input type="number" value={tripInicio.peso_carregado_kg} onChange={e => setTripInicio({...tripInicio, peso_carregado_kg: e.target.value})}/></Field>
            <Field label="Data/Hora Saída"><Input type="datetime-local" value={tripInicio.data_saida ? tripInicio.data_saida.slice(0,16) : ''} onChange={e => setTripInicio({...tripInicio, data_saida: e.target.value})}/></Field>
            <Field label="Observação" className="sm:col-span-2"><Input value={tripInicio.observacao} onChange={e => setTripInicio({...tripInicio, observacao: e.target.value})}/></Field>
            
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'finalizar_viagem' && (
        <Modal title={`Finalizar Viagem: ${editing?.codigo_viagem || ''}`} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('finalizar_viagem'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="KM Final"><Input type="number" value={tripFim.km_final} onChange={e => setTripFim({...tripFim, km_final: e.target.value})} required/></Field>
            <Field label="Peso Destino (kg)"><Input type="number" value={tripFim.peso_descarga_kg} onChange={e => setTripFim({...tripFim, peso_descarga_kg: e.target.value})} required/></Field>
            <Field label="Local Descarga"><Input value={tripFim.local_descarga} onChange={e => setTripFim({...tripFim, local_descarga: e.target.value})} required/></Field>
            <Field label="Data/Hora Chegada"><Input type="datetime-local" value={tripFim.data_chegada} onChange={e => setTripFim({...tripFim, data_chegada: e.target.value})} required/></Field>
            
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'motorista' && (
        <Modal title={editing ? 'Editar Motorista' : 'Novo Motorista'} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('motorista'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome Completo"><Input value={motoristaForm.nome} onChange={e => setMotoristaForm({...motoristaForm, nome: e.target.value})} required/></Field>
            <Field label="E-mail (Login)"><Input type="email" value={motoristaForm.email} onChange={e => setMotoristaForm({...motoristaForm, email: e.target.value})} required className="lowercase"/></Field>
            <Field label="Telefone"><Input value={motoristaForm.telefone} onChange={e => setMotoristaForm({...motoristaForm, telefone: e.target.value})}/></Field>
            <Field label="Veículo Vinculado Padrão">
              <Select value={motoristaForm.veiculo_id} onChange={e => setMotoristaForm({...motoristaForm, veiculo_id: e.target.value})}>
                <option value="">NENHUM VEÍCULO VINCULADO</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={motoristaForm.status} onChange={e => setMotoristaForm({...motoristaForm, status: e.target.value})}>
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {/* MODAL VEÍCULO ADICIONADO */}
      {modal === 'veiculo' && (
        <Modal title={editing ? 'Editar Veículo' : 'Novo Veículo'} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('veiculo'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Placa"><Input value={veiculoForm.placa} onChange={e => setVeiculoForm({...veiculoForm, placa: e.target.value})} required placeholder="EX: ABC-1234"/></Field>
            <Field label="Marca"><Input value={veiculoForm.marca} onChange={e => setVeiculoForm({...veiculoForm, marca: e.target.value})} placeholder="EX: VOLVO"/></Field>
            <Field label="Modelo"><Input value={veiculoForm.modelo} onChange={e => setVeiculoForm({...veiculoForm, modelo: e.target.value})} placeholder="EX: FH 540"/></Field>
            <Field label="Ano"><Input type="number" value={veiculoForm.ano} onChange={e => setVeiculoForm({...veiculoForm, ano: e.target.value})} placeholder="EX: 2023"/></Field>
            <Field label="Status">
              <Select value={veiculoForm.status} onChange={e => setVeiculoForm({...veiculoForm, status: e.target.value})}>
                <option value="ATIVO">ATIVO</option>
                <option value="MANUTENCAO">MANUTENÇÃO</option>
                <option value="INATIVO">INATIVO</option>
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {/* MODAL FRETE ADICIONADO */}
      {modal === 'frete' && (
        <Modal title={editing ? 'Editar Frete' : 'Cadastrar Frete'} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('frete'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Código do Frete"><Input value={freteForm.codigo_frete} onChange={e => setFreteForm({...freteForm, codigo_frete: e.target.value})} required/></Field>
            <Field label="Cliente"><Input value={freteForm.cliente} onChange={e => setFreteForm({...freteForm, cliente: e.target.value})} required placeholder="NOME DO CLIENTE"/></Field>
            <Field label="Origem"><Input value={freteForm.origem} onChange={e => setFreteForm({...freteForm, origem: e.target.value})} required placeholder="CIDADE/UF ORIGEM"/></Field>
            <Field label="Destino"><Input value={freteForm.destino} onChange={e => setFreteForm({...freteForm, destino: e.target.value})} required placeholder="CIDADE/UF DESTINO"/></Field>
            <Field label="Valor do Frete (R$)"><Input type="number" step="0.01" value={freteForm.valor} onChange={e => setFreteForm({...freteForm, valor: e.target.value})} required/></Field>
            <Field label="Status">
              <Select value={freteForm.status} onChange={e => setFreteForm({...freteForm, status: e.target.value})}>
                <option value="PENDENTE">PENDENTE</option>
                <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                <option value="CONCLUIDO">CONCLUÍDO</option>
                <option value="CANCELADO">CANCELADO</option>
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'abastecimento' && (
        <Modal title="Registrar Abastecimento" onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('abastecimento'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Viagem Ativa Vinculada">
              <Select value={abastecimentoForm.viagem_id} onChange={e => setAbastecimentoForm({...abastecimentoForm, viagem_id: e.target.value})} required>
                <option value="">SELECIONE A VIAGEM</option>
                {viagens.map(v => <option key={v.id} value={v.id}>{v.codigo_viagem} ({v.local_carregamento || 'EM TRÂNSITO'})</option>)}
              </Select>
            </Field>
            <Field label="Litros"><Input type="number" step="0.01" value={abastecimentoForm.litros} onChange={e => setAbastecimentoForm({...abastecimentoForm, litros: e.target.value})} required/></Field>
            <Field label="Valor Total (R$)"><Input type="number" step="0.01" value={abastecimentoForm.valor_total} onChange={e => setAbastecimentoForm({...abastecimentoForm, valor_total: e.target.value})} required/></Field>
            <Field label="KM Atual"><Input type="number" value={abastecimentoForm.km_atual} onChange={e => setAbastecimentoForm({...abastecimentoForm, km_atual: e.target.value})}/></Field>
            <Field label="Posto"><Input value={abastecimentoForm.posto} onChange={e => setAbastecimentoForm({...abastecimentoForm, posto: e.target.value})}/></Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'despesa' && (
        <Modal title="Lançar Despesa de Viagem" onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('despesa'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Viagem Ativa Vinculada">
              <Select value={despesaForm.viagem_id} onChange={e => setDespesaForm({...despesaForm, viagem_id: e.target.value})} required>
                <option value="">SELECIONE A VIAGEM</option>
                {viagens.map(v => <option key={v.id} value={v.id}>{v.codigo_viagem} ({v.local_carregamento || 'EM TRÂNSITO'})</option>)}
              </Select>
            </Field>
            <Field label="Tipo de Despesa">
              <Select value={despesaForm.categoria} onChange={e => setDespesaForm({...despesaForm, categoria: e.target.value})}>
                {['COMBUSTIVEL','PEDAGIO','ALIMENTACAO','ESTACIONAMENTO','MANUTENCAO','OUTROS'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Valor (R$)"><Input type="number" step="0.01" value={despesaForm.valor} onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})} required/></Field>
            <Field label="Descrição" className="sm:col-span-2"><Input value={despesaForm.descricao} onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})} placeholder="EX: ALMOÇO EM POSTO DE ESTRADA"/></Field>
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