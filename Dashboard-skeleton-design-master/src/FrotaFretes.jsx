import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Users, FileText, Route, Plus, Search, RefreshCw, Pencil, Trash2, X, Save, DollarSign, Package, Gauge, TrendingUp, AlertCircle, Fuel, Receipt, PlayCircle, CheckCircle2, Award, Calendar } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { supabase } from './lib/supabaseClient';

const colors = ['#38BDF8','#22C55E','#F59E0B','#A78BFA','#EC4899','#14B8A6'];
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (v,d=0) => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const upper = v => (typeof v === 'string' ? v.toUpperCase() : v);

const emptyTripInicio = {
  codigo_viagem: '', frete_id: '', veiculo_id: '', motorista_id: '', carreta_placa: '',
  km_inicial: '', peso_carregado_kg: '', produto: '', valor_por_tonelada: '', valor_frete_calculado: '',
  numero_nf: '', local_carregamento: '', data_saida: '', observacao: '', status: 'EM_VIAGEM'
};

const emptyTripFim = {
  km_final: '', peso_descarga_kg: '', local_descarga: '', data_chegada: '', status: 'FINALIZADO'
};

const emptyAbastecimento = { veiculo_id: '', viagem_id: '', data_hora: '', litros: '', valor_total: '', km_atual: '', posto: '', observacao: '' };
const emptyDespesa = { veiculo_id: '', viagem_id: '', tipo: 'PEDAGIO', valor: '', data: '', descricao: '' };
const emptyMotorista = { nome: '', email: '', telefone: '', status: 'ATIVO', veiculo_id: '' };
const emptyVeiculo = { placa: '', marca: '', modelo: '', ano: '', status: 'DISPONIVEL' };
const emptyFrete = { codigo_frete: '', tipo_operacao: 'FRETE_PROPRIO', origem: '', destino: '', cliente: '', produto: '', peso_previsto_kg: '', valor_por_tonelada: '', valor_frete: '', status: 'PLANEJADO', veiculo_id: '' };

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

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMesAno, setFiltroMesAno] = useState(new Date().toISOString().slice(0, 7));
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

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
  const [kpiModal, setKpiModal] = useState(null);

  // CORREÇÃO APLICADA: Busca estrita e segura por e-mail (com trim e lowercase para evitar falhas de correspondência)
  const currentMotorista = useMemo(() => {
    if (!isDriver || !currentUserEmail) return null;
    const cleanEmail = currentUserEmail.trim().toLowerCase();
    return motoristas.find(m => m.email?.trim().toLowerCase() === cleanEmail) || null;
  }, [isDriver, motoristas, currentUserEmail]);

  const viagemAtiva = useMemo(() => {
    if (!currentMotorista) return null;
    return viagens.find(v => v.motorista_id === currentMotorista.id && v.status === 'EM_VIAGEM') || null;
  }, [viagens, currentMotorista]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const resV = await supabase.from('veiculos').select('id, placa, marca, modelo, ano, status, ativo').order('placa');
      if(resV.error) throw resV.error;
      setVeiculos(resV.data || []);

      const resM = await supabase.from('motoristas').select('id, nome, email, telefone, status, veiculo_id, ativo').order('nome');
      if(resM.error) throw resM.error;
      setMotoristas(resM.data || []);

      const resF = await supabase.from('fretes').select('id, codigo_frete, tipo_operacao, origem, destino, cliente, produto, peso_previsto_kg, valor_por_tonelada, valor_frete, status, veiculo_id, created_at').order('created_at',{ascending:false});
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
          id, viagem_id, posto, nota_fiscal, valor_total, litros, preco_por_litro, km_atual, media_kml, foto_nota_url, created_at
        `).order('created_at', {ascending: false});
        setAbastecimentos(resAb.data || []);
      } catch { setAbastecimentos([]); }

      try {
        const resDesp = await supabase.from('viagem_despesas').select(`
          id, viagem_id, tipo, descricao, valor, data, local, comprovante_url, created_at
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

  const validarFiltroData = useCallback((dataStr) => {
    if (filtroTipo === 'todos' || !dataStr) return true;
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return true;

    if (filtroTipo === 'mes_ano' && filtroMesAno) {
      const [anoFiltro, mesFiltro] = filtroMesAno.split('-');
      return d.getFullYear() === Number(anoFiltro) && (d.getMonth() + 1) === Number(mesFiltro);
    }

    if (filtroTipo === 'intervalo') {
      let valido = true;
      if (filtroDataInicio) {
        const dInicio = new Date(filtroDataInicio + 'T00:00:00');
        if (d < dInicio) valido = false;
      }
      if (filtroDataFim) {
        const dFim = new Date(filtroDataFim + 'T23:59:59');
        if (d > dFim) valido = false;
      }
      return valido;
    }

    return true;
  }, [filtroTipo, filtroMesAno, filtroDataInicio, filtroDataFim]);

  const viagensFiltradasPeriodo = useMemo(() => {
    return viagens.filter(v => validarFiltroData(v.data_saida || v.created_at));
  }, [viagens, validarFiltroData]);

  const fretesFiltradosPeriodo = useMemo(() => {
    return fretes.filter(f => validarFiltroData(f.created_at));
  }, [fretes, validarFiltroData]);

  const abastecimentosFiltradosPeriodo = useMemo(() => {
    return abastecimentos.filter(a => validarFiltroData(a.created_at));
  }, [abastecimentos, validarFiltroData]);

  const despesasFiltradasPeriodo = useMemo(() => {
    return despesas.filter(d => validarFiltroData(d.data || d.created_at));
  }, [despesas, validarFiltroData]);

  const kpisFiltrados = useMemo(() => {
    const total_viagens = viagensFiltradasPeriodo.length;
    const km_rodados = viagensFiltradasPeriodo.reduce((acc, item) => acc + Math.max(0, Number(item.km_final || 0) - Number(item.km_inicial || 0)), 0);
    const toneladas_transportadas = viagensFiltradasPeriodo.reduce((acc, item) => acc + Number(item.peso_descarga_kg || item.peso_carregado_kg || 0) / 1000, 0);
    
    const fretesIds = viagensFiltradasPeriodo.map(v => v.frete_id).filter(Boolean);
    const receita_fretes = fretesFiltradosPeriodo
      .filter(f => fretesIds.includes(f.id) || viagensFiltradasPeriodo.some(v => v.frete_id === f.id))
      .reduce((acc, f) => acc + Number(f.valor_frete || 0), 0);

    const viagemIdsPeriodo = viagensFiltradasPeriodo.map(v => Number(v.id));
    const custosAbst = abastecimentosFiltradosPeriodo
      .filter(a => a.viagem_id && viagemIdsPeriodo.includes(Number(a.viagem_id)))
      .reduce((acc, a) => acc + Number(a.valor_total || 0), 0);
    
    const custosDesp = despesasFiltradasPeriodo
      .filter(d => d.viagem_id && viagemIdsPeriodo.includes(Number(d.viagem_id)))
      .reduce((acc, d) => acc + Number(d.valor || 0), 0);

    const custos_operacionais = custosAbst + custosDesp;
    const resultado = receita_fretes - custos_operacionais;

    return {
      total_viagens,
      km_rodados,
      toneladas_transportadas,
      receita_fretes,
      custos_operacionais,
      resultado
    };
  }, [viagensFiltradasPeriodo, fretesFiltradosPeriodo, abastecimentosFiltradosPeriodo, despesasFiltradasPeriodo]);

  const rankingPostos = useMemo(() => {
    const mapaPostos = {};
    abastecimentosFiltradosPeriodo.forEach(a => {
      const nomePosto = upper(a.posto || 'NÃO INFORMADO');
      if (!mapaPostos[nomePosto]) {
        mapaPostos[nomePosto] = { posto: nomePosto, totalLitros: 0, valorTotal: 0, qtdAbastecimentos: 0 };
      }
      mapaPostos[nomePosto].totalLitros += Number(a.litros || 0);
      mapaPostos[nomePosto].valorTotal += Number(a.valor_total || 0);
      mapaPostos[nomePosto].qtdAbastecimentos += 1;
    });

    return Object.values(mapaPostos).map(p => ({
      ...p,
      precoMedioLitro: p.totalLitros > 0 ? p.valorTotal / p.totalLitros : 0
    })).sort((a, b) => b.totalLitros - a.totalLitros);
  }, [abastecimentosFiltradosPeriodo]);

  const viagensFiltradas = useMemo(() => {
    let lista = viagensFiltradasPeriodo.map(v => ({
      ...v,
      motorista_nome: motoristas.find(m => m.id === v.motorista_id)?.nome || '-'
    }));

    if (isDriver && currentMotorista) {
      lista = lista.filter(v => Number(v.motorista_id) === Number(currentMotorista.id));
    }
    return lista.filter(x => [x.codigo_viagem, x.local_carregamento, x.local_descarga, x.numero_nf, x.produto, x.motorista_nome].join(' ').toLowerCase().includes(q.toLowerCase()));
  }, [viagensFiltradasPeriodo, motoristas, isDriver, currentMotorista, q]);

  const fretesDisponiveis = useMemo(() => {
    return fretes.filter(f => f.status === 'PLANEJADO');
  }, [fretes]);

  const veiculosComConsumo = useMemo(() => {
    return veiculos.map(v => {
      const viagensVeiculo = viagensFiltradasPeriodo.filter(item => Number(item.veiculo_id) === Number(v.id));
      const viagemIds = viagensVeiculo.map(i => i.id);

      const kmRodados = viagensVeiculo.reduce((acc, item) => acc + Math.max(0, Number(item.km_final || 0) - Number(item.km_inicial || 0)), 0);
      
      const abstsVeiculo = abastecimentosFiltradosPeriodo.filter(a => {
        if (!a.viagem_id) return false;
        return viagemIds.includes(Number(a.viagem_id));
      });
      const totalLitros = abstsVeiculo.reduce((acc, a) => acc + Number(a.litros || 0), 0);
      const mediaKmL = totalLitros > 0 ? kmRodados / totalLitros : 0;

      return { ...v, kmRodados, totalLitros, mediaKmL };
    });
  }, [veiculos, viagensFiltradasPeriodo, abastecimentosFiltradosPeriodo]);

  const rankingGestor = useMemo(() => {
    const mapa = {};
    veiculos.forEach(v => {
      mapa[v.id] = {
        veiculo_id: v.id, placa: v.placa, modelo: v.modelo || '-',
        motorista: motoristas.find(m => m.veiculo_id === v.id)?.nome || 'NÃO ATRIBUÍDO',
        viagensFinalizadas: 0, kmRodados: 0, receitaTotal: 0, custosTotal: 0, totalLitros: 0
      };
    });

    viagensFiltradasPeriodo.forEach(viagem => {
      if (!mapa[viagem.veiculo_id]) {
        const veh = veiculos.find(v => v.id === viagem.veiculo_id);
        mapa[viagem.veiculo_id] = {
          veiculo_id: viagem.veiculo_id, placa: veh?.placa || 'OUTROS', modelo: veh?.modelo || '-',
          motorista: motoristas.find(m => m.id === viagem.motorista_id)?.nome || 'N/A',
          viagensFinalizadas: 0, kmRodados: 0, receitaTotal: 0, custosTotal: 0, totalLitros: 0
        };
      }

      const item = mapa[viagem.veiculo_id];
      if (viagem.status === 'FINALIZADO') item.viagensFinalizadas += 1;

      const km = Math.max(0, Number(viagem.km_final || 0) - Number(viagem.km_inicial || 0));
      item.kmRodados += km;

      if (viagem.frete_id) {
        const freteObj = fretes.find(f => f.id === viagem.frete_id);
        if (freteObj) item.receitaTotal += Number(freteObj.valor_frete || 0);
      }

      const absts = abastecimentosFiltradosPeriodo.filter(a => Number(a.viagem_id) === Number(viagem.id));
      const desps = despesasFiltradasPeriodo.filter(d => Number(d.viagem_id) === Number(viagem.id));
      item.custosTotal += absts.reduce((acc, a) => acc + Number(a.valor_total || 0), 0) + desps.reduce((acc, d) => acc + Number(d.valor || 0), 0);
      item.totalLitros += absts.reduce((acc, a) => acc + Number(a.litros || 0), 0);
    });

    return Object.values(mapa).map(item => {
      const retornoLiquido = item.receitaTotal - item.custosTotal;
      const mediaPorKm = item.kmRodados > 0 ? item.receitaTotal / item.kmRodados : 0;
      const mediaKmL = item.totalLitros > 0 ? item.kmRodados / item.totalLitros : 0;
      return { ...item, retornoLiquido, mediaPorKm, mediaKmL };
    }).sort((a, b) => b.retornoLiquido - a.retornoLiquido);
  }, [veiculos, motoristas, viagensFiltradasPeriodo, fretes, abastecimentosFiltradosPeriodo, despesasFiltradasPeriodo]);

  function open(type, row = null) {
    setEditing(row); setQ('');
    if(type === 'iniciar_viagem') {
      const veiculoSugerido = currentMotorista?.veiculo_id || '';
      let freteSugeridoId = '';
      if (!row && veiculoSugerido) {
        const freteDoVeiculo = fretes.find(f => Number(f.veiculo_id) === Number(veiculoSugerido) && f.status === 'PLANEJADO');
        if (freteDoVeiculo) freteSugeridoId = String(freteDoVeiculo.id);
      }

      if(row) {
        setTripInicio({...row, valor_por_tonelada: '', valor_frete_calculado: ''});
      } else {
        setTripInicio({
          ...emptyTripInicio,
          codigo_viagem: `VAG-${Date.now().toString().slice(-6)}`,
          motorista_id: currentMotorista ? currentMotorista.id : '',
          veiculo_id: veiculoSugerido,
          frete_id: freteSugeridoId,
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
        status: 'FINALIZADO'
      });
    } else if(type === 'abastecimento') {
      const viagemSugeridaId = viagemAtiva?.id || '';
      setAbastecimentoForm(row ? {...row} : {...emptyAbastecimento, viagem_id: viagemSugeridaId});
    } else if(type === 'despesa') {
      const viagemSugeridaId = viagemAtiva?.id || '';
      setDespesaForm(row ? {...row} : {...emptyDespesa, viagem_id: viagemSugeridaId, data: new Date().toISOString().slice(0,10)});
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
        const pesoKg = tripInicio.peso_carregado_kg ? Number(tripInicio.peso_carregado_kg) : 0;
        const payload = {
          codigo_viagem: upper(tripInicio.codigo_viagem || `VAG-${Date.now().toString().slice(-6)}`),
          frete_id: tripInicio.frete_id ? Number(tripInicio.frete_id) : null,
          veiculo_id: Number(tripInicio.veiculo_id),
          motorista_id: isDriver && currentMotorista ? currentMotorista.id : Number(tripInicio.motorista_id),
          carreta_placa: upper(tripInicio.carreta_placa) || null,
          km_inicial: tripInicio.km_inicial ? Number(tripInicio.km_inicial) : null,
          peso_carregado_kg: pesoKg || null,
          produto: upper(tripInicio.produto) || null,
          numero_nf: upper(tripInicio.numero_nf) || null,
          local_carregamento: upper(tripInicio.local_carregamento) || null,
          data_saida: tripInicio.data_saida || null,
          status: editing?.status || 'EM_VIAGEM',
          observacao: upper(tripInicio.observacao) || null
        };
        const r = editing ? await supabase.from('viagens').update(payload).eq('id', editing.id) : await supabase.from('viagens').insert(payload);
        if(r.error) throw r.error;

        if (tripInicio.frete_id && tripInicio.valor_por_tonelada && pesoKg > 0) {
          const valorCalculado = (pesoKg / 1000) * Number(tripInicio.valor_por_tonelada);
          await supabase.from('fretes').update({ 
            valor_frete: valorCalculado,
            peso_previsto_kg: pesoKg,
            produto: upper(tripInicio.produto) || undefined
          }).eq('id', Number(tripInicio.frete_id));
        }

        setModal('');
      } else if(type === 'finalizar_viagem') {
        const payload = {
          km_final: tripFim.km_final ? Number(tripFim.km_final) : null,
          peso_descarga_kg: tripFim.peso_descarga_kg ? Number(tripFim.peso_descarga_kg) : null,
          local_descarga: upper(tripFim.local_descarga) || null,
          data_chegada: tripFim.data_chegada || null,
          status: 'FINALIZADO'
        };
        const r = await supabase.from('viagens').update(payload).eq('id', editing.id);
        if(r.error) throw r.error;

        if (editing?.frete_id) {
          const rFrete = await supabase.from('fretes').update({ status: 'FINALIZADO' }).eq('id', editing.frete_id);
          if(rFrete.error) throw rFrete.error;
        }

        setModal('');
      } else if(type === 'abastecimento') {
        const litrosVal = Number(abastecimentoForm.litros || 0);
        const valorTotalVal = Number(abastecimentoForm.valor_total || 0);
        const precoLitro = litrosVal > 0 ? valorTotalVal / litrosVal : null;
        const payload = {
          viagem_id: abastecimentoForm.viagem_id ? Number(abastecimentoForm.viagem_id) : null,
          litros: litrosVal,
          valor_total: valorTotalVal,
          preco_por_litro: precoLitro,
          km_atual: abastecimentoForm.km_atual ? Number(abastecimentoForm.km_atual) : null,
          posto: upper(abastecimentoForm.posto) || null,
          nota_fiscal: upper(abastecimentoForm.nota_fiscal) || null
        };
        const r = editing ? await supabase.from('abastecimentos').update(payload).eq('id', editing.id) : await supabase.from('abastecimentos').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'despesa') {
        const payload = {
          viagem_id: despesaForm.viagem_id ? Number(despesaForm.viagem_id) : null,
          tipo: upper(despesaForm.tipo),
          valor: Number(despesaForm.valor || 0),
          descricao: upper(despesaForm.descricao) || null,
          data: despesaForm.data || new Date().toISOString()
        };
        const r = editing ? await supabase.from('viagem_despesas').update(payload).eq('id', editing.id) : await supabase.from('viagem_despesas').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'motorista') {
        const payload = {
          nome: upper(motoristaForm.nome),
          email: motoristaForm.email?.toLowerCase().trim(),
          telefone: motoristaForm.telefone,
          status: upper(motoristaForm.status),
          veiculo_id: motoristaForm.veiculo_id ? Number(motoristaForm.veiculo_id) : null,
          ativo: motoristaForm.status === 'ATIVO'
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
          status: upper(veiculoForm.status),
          ativo: veiculoForm.status === 'DISPONIVEL' || veiculoForm.status === 'EM_VIAGEM'
        };
        const r = editing ? await supabase.from('veiculos').update(payload).eq('id', editing.id) : await supabase.from('veiculos').insert(payload);
        if(r.error) throw r.error;
        setModal('');
      } else if(type === 'frete') {
        const pesoPrev = freteForm.peso_previsto_kg ? Number(freteForm.peso_previsto_kg) : 0;
        const valorTon = freteForm.valor_por_tonelada ? Number(freteForm.valor_por_tonelada) : 0;
        const valorTotalFinal = pesoPrev > 0 && valorTon > 0 ? (pesoPrev / 1000) * valorTon : Number(freteForm.valor_frete || 0);

        const payload = {
          codigo_frete: upper(freteForm.codigo_frete || `FRT-${Date.now().toString().slice(-6)}`),
          tipo_operacao: upper(freteForm.tipo_operacao || 'FRETE_PROPRIO'),
          origem: upper(freteForm.origem),
          destino: upper(freteForm.destino),
          cliente: upper(freteForm.cliente),
          produto: upper(freteForm.produto) || null,
          peso_previsto_kg: pesoPrev || null,
          valor_por_tonelada: valorTon || null,
          valor_frete: valorTotalFinal,
          status: upper(freteForm.status),
          veiculo_id: freteForm.veiculo_id ? Number(freteForm.veiculo_id) : null
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

  const getKpiBreakdownByPlate = (metricType) => {
    return veiculos.map(v => {
      const viagensVeiculo = viagensFiltradasPeriodo.filter(item => Number(item.veiculo_id) === Number(v.id));
      const viagemIds = viagensVeiculo.map(i => i.id);

      const kmRodados = viagensVeiculo.reduce((acc, item) => acc + Math.max(0, Number(item.km_final || 0) - Number(item.km_inicial || 0)), 0);
      const toneladas = viagensVeiculo.reduce((acc, item) => acc + Number(item.peso_descarga_kg || item.peso_carregado_kg || 0) / 1000, 0);
      
      const fretesVeiculo = fretesFiltradosPeriodo.filter(f => viagensVeiculo.some(tg => tg.frete_id === f.id));
      const receita = fretesVeiculo.reduce((acc, f) => acc + Number(f.valor_frete || 0), 0);

      const abstViagem = abastecimentosFiltradosPeriodo.filter(a => a.viagem_id && viagemIds.includes(Number(a.viagem_id)));
      const despViagem = despesasFiltradasPeriodo.filter(d => d.viagem_id && viagemIds.includes(Number(d.viagem_id)));
      
      const totalLitrosAbst = abstViagem.reduce((acc, a) => acc + Number(a.litros || 0), 0);
      const totalValAbst = abstViagem.reduce((acc, a) => acc + Number(a.valor_total || 0), 0);
      
      const despesasPorModalidade = {};
      despViagem.forEach(d => {
        const tipoDesp = upper(d.tipo || 'OUTROS');
        despesasPorModalidade[tipoDesp] = (despesasPorModalidade[tipoDesp] || 0) + Number(d.valor || 0);
      });

      const custos = totalValAbst + despViagem.reduce((acc, d) => acc + Number(d.valor || 0), 0);
      const resultado = receita - custos;

      return { 
        placa: v.placa, 
        modelo: v.modelo || '-', 
        totalViagens: viagensVeiculo.length, 
        kmRodados, 
        toneladas, 
        receita, 
        custos, 
        resultado,
        totalLitrosAbst,
        totalValAbst,
        despesasPorModalidade
      };
    });
  };

  return (
    <div className="flex flex-col gap-5 uppercase">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Gestão Operacional</p>
          <h1 className="text-xl font-extrabold text-white mt-1">
            {isDriver ? `Painel do Motorista: ${currentMotorista?.nome || currentUserEmail}` : 'Frota & Fretes'}
          </h1>
          <p className="text-xs text-gray-500 mt-1 normal-case">
            {isDriver ? 'Inicie viagens, finalize rotas, registre abastecimentos e despesas vinculadas ou avulsas.' : 'Veículos próprios, motoristas vinculados, fretes e viagens.'}
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

      {!isDriver && (
        <div className="bg-[#161B23] border border-white/5 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <Calendar size={16} className="text-blue-400" />
            <span>Filtro de Período:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-[#1A2030] p-1 rounded-lg border border-white/10">
              <button onClick={() => setFiltroTipo('todos')} className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${filtroTipo === 'todos' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>TODOS</button>
              <button onClick={() => setFiltroTipo('mes_ano')} className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${filtroTipo === 'mes_ano' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>MÊS / ANO</button>
              <button onClick={() => setFiltroTipo('intervalo')} className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${filtroTipo === 'intervalo' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>DATA INÍCIO / FIM</button>
            </div>

            {filtroTipo === 'mes_ano' && (
              <input type="month" value={filtroMesAno} onChange={e => setFiltroMesAno(e.target.value)} className="bg-[#1A2030] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white uppercase outline-none focus:border-blue-500/60"/>
            )}

            {filtroTipo === 'intervalo' && (
              <div className="flex items-center gap-2">
                <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="bg-[#1A2030] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white uppercase outline-none focus:border-blue-500/60"/>
                <span className="text-gray-500 text-xs">até</span>
                <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="bg-[#1A2030] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white uppercase outline-none focus:border-blue-500/60"/>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="flex gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 text-xs"><AlertCircle size={15}/>{error}</div>}

      {!isDriver && tab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-[#161B23] border border-white/5 p-4 rounded-xl">
            <h2 className="text-sm font-extrabold text-white tracking-wider">Dashboard da Frota (Clique nos cards para detalhar por placa)</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#1A2030] px-3 py-1.5 rounded-lg border border-white/10">
              <span>Período Ativo Filtrado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div onClick={() => setKpiModal('viagens')} className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-semibold text-blue-100">Total de Viagens</p>
                <h3 className="text-2xl font-black mt-1">{kpisFiltrados.total_viagens}</h3>
              </div>
              <p className="text-[10px] text-blue-200 mt-3">Clique para ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('km')} className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-semibold text-emerald-100">Km Rodados</p>
                <h3 className="text-2xl font-black mt-1">{num(kpisFiltrados.km_rodados)} km</h3>
              </div>
              <p className="text-[10px] text-emerald-200 mt-3">Clique para ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('toneladas')} className="bg-gradient-to-br from-amber-500 to-amber-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-semibold text-amber-100">Toneladas Transportadas</p>
                <h3 className="text-2xl font-black mt-1">{num(kpisFiltrados.toneladas_transportadas, 1)} t</h3>
              </div>
              <p className="text-[10px] text-amber-200 mt-3">Clique para ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('receita')} className="bg-gradient-to-br from-purple-600 to-purple-800 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-semibold text-purple-100">Receita de Fretes</p>
                <h3 className="text-xl font-black mt-1">{money(kpisFiltrados.receita_fretes)}</h3>
              </div>
              <p className="text-[10px] text-purple-200 mt-3">Clique para ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('custos')} className="bg-gradient-to-br from-rose-600 to-rose-800 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-semibold text-rose-100">Custos Operacionais</p>
                <h3 className="text-xl font-black mt-1">{money(kpisFiltrados.custos_operacionais)}</h3>
              </div>
              <p className="text-[10px] text-rose-200 mt-3">Clique para ver divisão por placa →</p>
            </div>
            <div onClick={() => setKpiModal('resultado')} className="bg-gradient-to-br from-teal-500 to-teal-700 p-4 rounded-xl text-white shadow-lg flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-semibold text-teal-100">Resultado</p>
                <h3 className="text-xl font-black mt-1">{money(kpisFiltrados.resultado)}</h3>
              </div>
              <p className="text-[10px] text-teal-200 mt-3">Clique para ver por placa →</p>
            </div>
          </div>

          <div className="bg-[#161B23] border border-white/5 p-5 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="text-emerald-400" size={18}/>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mini Ranking de Postos (Volume e Preço Médio do Combustível)</h3>
              </div>
              <span className="text-[10px] text-gray-400">Postos mais utilizados no período</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-400">
                  <tr>
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3 text-left">Posto</th>
                    <th className="p-3 text-center">Abastecimentos</th>
                    <th className="p-3 text-right">Total Litros</th>
                    <th className="p-3 text-right">Valor Gasto Total</th>
                    <th className="p-3 text-right text-yellow-400">Preço Médio / Litro</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingPostos.map((p, idx) => (
                    <tr key={p.posto} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-center font-black text-emerald-400">{idx + 1}º</td>
                      <td className="p-3 font-bold text-blue-300">{p.posto}</td>
                      <td className="p-3 text-center">{p.qtdAbastecimentos}</td>
                      <td className="p-3 text-right">{num(p.totalLitros, 2)} L</td>
                      <td className="p-3 text-right font-bold text-gray-200">{money(p.valorTotal)}</td>
                      <td className="p-3 text-right font-black text-yellow-400">{money(p.precoMedioLitro)} / L</td>
                    </tr>
                  ))}
                  {!rankingPostos.length && (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-500">Nenhum abastecimento registrado no período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#161B23] border border-white/5 p-5 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="text-amber-400" size={18}/>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ranking de Desempenho e Retorno por Veículo / Motorista</h3>
              </div>
              <span className="text-[10px] text-gray-400">Baseado no período filtrado</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-400">
                  <tr>
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3 text-left">Placa / Modelo</th>
                    <th className="p-3 text-left">Motorista</th>
                    <th className="p-3 text-center">Viagens Finalizadas</th>
                    <th className="p-3 text-right">Km Rodados</th>
                    <th className="p-3 text-right">Média KM/L</th>
                    <th className="p-3 text-right">Média Faturamento/KM</th>
                    <th className="p-3 text-right">Faturamento Total</th>
                    <th className="p-3 text-right">Retorno Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingGestor.map((r, idx) => (
                    <tr key={r.veiculo_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-center font-black text-amber-400">
                        {idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`}
                      </td>
                      <td className="p-3 font-bold text-blue-300">{r.placa} <span className="text-gray-400 font-normal">({r.modelo})</span></td>
                      <td className="p-3 font-semibold text-gray-200">{r.motorista}</td>
                      <td className="p-3 text-center">{r.viagensFinalizadas}</td>
                      <td className="p-3 text-right">{num(r.kmRodados)} km</td>
                      <td className="p-3 text-right text-yellow-400 font-bold">{num(r.mediaKmL, 2)} KM/L</td>
                      <td className="p-3 text-right text-purple-300 font-bold">{money(r.mediaPorKm)}/km</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">{money(r.receitaTotal)}</td>
                      <td className="p-3 text-right text-teal-400 font-black">{money(r.retornoLiquido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {kpiModal && (
        <Modal 
          title={
            kpiModal === 'custos' 
              ? 'Divisão de Custos por Placa (Abastecimentos e Despesas por Modalidade)' 
              : `Detalhamento por Placa - ${kpiModal.toUpperCase()}`
          } 
          onClose={() => setKpiModal(null)}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-400">
                <tr>
                  <th className="p-3 text-left">Placa / Veículo</th>
                  {kpiModal === 'custos' ? (
                    <>
                      <th className="p-3 text-right">Abastecimento (Litros / Total)</th>
                      <th className="p-3 text-left">Despesas por Modalidade</th>
                      <th className="p-3 text-right">Custo Total</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3 text-center">Total Viagens</th>
                      <th className="p-3 text-right">Km Rodados</th>
                      <th className="p-3 text-right">Toneladas (t)</th>
                      <th className="p-3 text-right">Receita Fretes</th>
                      <th className="p-3 text-right">Custos</th>
                      <th className="p-3 text-right">Resultado</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {getKpiBreakdownByPlate(kpiModal).map((item, idx) => (
                  <tr key={idx} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 font-bold text-blue-300">{item.placa} <span className="text-gray-400 font-normal">({item.modelo})</span></td>
                    {kpiModal === 'custos' ? (
                      <>
                        <td className="p-3 text-right text-emerald-400 font-bold">
                          {num(item.totalLitrosAbst, 2)} L<br/>
                          <span className="text-white">{money(item.totalValAbst)}</span>
                        </td>
                        <td className="p-3">
                          {Object.keys(item.despesasPorModalidade).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {Object.entries(item.despesasPorModalidade).map(([tipo, val]) => (
                                <span key={tipo} className="text-[11px] text-amber-300">
                                  <strong>{tipo}:</strong> {money(val)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">Nenhuma despesa registrada</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-rose-400 font-black">{money(item.custos)}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-center">{item.totalViagens}</td>
                        <td className="p-3 text-right">{num(item.kmRodados)} km</td>
                        <td className="p-3 text-right">{num(item.toneladas, 1)} t</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">{money(item.receita)}</td>
                        <td className="p-3 text-right text-rose-400 font-bold">{money(item.custos)}</td>
                        <td className="p-3 text-right text-teal-400 font-black">{money(item.resultado)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {(tab === 'viagens' || tab === 'minhas_viagens') && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500"/>
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar viagens, produtos..." className="pl-9 md:w-72 lowercase"/>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => open('abastecimento')} className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg">
                <Fuel size={15}/>ABASTECIMENTO
              </button>
              <button onClick={() => open('despesa')} className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg">
                <Receipt size={15}/>DESPESA
              </button>
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
                  {v.status !== 'FINALIZADO' && (
                    <button onClick={() => open('finalizar_viagem', v)} className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/50 text-[10px] font-bold border border-emerald-500/20">
                      <CheckCircle2 size={12}/> FINALIZAR
                    </button>
                  )}
                  <Actions edit={() => open('iniciar_viagem', v)} del={() => del('viagens', v.id, `A VIAGEM ${v.codigo_viagem}`)} />
                </div>
              </td>
            </>
          )} empty="NENHUMA VIAGEM REGISTRADA NO PERÍODO."/>
        </div>
      )}

      {tab === 'veiculos' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Frota de Veículos e Consumo Médio (Período)</h2>
            <button onClick={() => open('veiculo')} className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Plus size={15}/>ADICIONAR VEÍCULO
            </button>
          </div>
          <Table rows={veiculosComConsumo} headers={['Placa','Marca','Modelo','Ano','Km Rodados','Média KM/L','Status','Ações']} render={v => (
            <>
              <td className="p-3 font-bold text-blue-300">{v.placa}</td>
              <td className="p-3">{v.marca || '-'}</td>
              <td className="p-3 font-semibold text-white">{v.modelo || '-'}</td>
              <td className="p-3">{v.ano || '-'}</td>
              <td className="p-3 text-gray-300">{num(v.kmRodados)} km</td>
              <td className="p-3 font-bold text-yellow-400">{num(v.mediaKmL, 2)} KM/L</td>
              <td className="p-3">{statusBadge(v.status || 'DISPONIVEL')}</td>
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
              <td className="p-3">{statusBadge(m.status || 'ATIVO')}</td>
              <td className="p-3"><Actions edit={() => open('motorista', m)} del={() => del('motoristas', m.id, m.nome)} /></td>
            </>
          )} empty="NENHUM MOTORISTA CADASTRADO."/>
        </div>
      )}

      {tab === 'fretes' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Gestão de Fretes (Período)</h2>
            <button onClick={() => open('frete')} className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Plus size={15}/>CADASTRAR FRETE
            </button>
          </div>
          <Table rows={fretesFiltradosPeriodo.map(f => ({...f, veiculo_placa: veiculos.find(v => Number(v.id) === Number(f.veiculo_id))?.placa || '-'}))} headers={['Código','Tipo Operação','Veículo (Placa)','Produto','Origem → Destino','Valor/Ton','Valor Frete','Status','Ações']} render={f => (
            <>
              <td className="p-3 font-bold text-blue-300">{f.codigo_frete}</td>
              <td className="p-3 font-semibold text-blue-400">{f.tipo_operacao}</td>
              <td className="p-3 font-bold text-amber-400">{f.veiculo_placa}</td>
              <td className="p-3 text-gray-300">{f.produto || '-'}</td>
              <td className="p-3">{f.origem || '-'} → {f.destino || '-'}</td>
              <td className="p-3 text-purple-300">{f.valor_por_tonelada ? money(f.valor_por_tonelada) : '-'}</td>
              <td className="p-3 font-bold text-emerald-400">{money(f.valor_frete)}</td>
              <td className="p-3">{statusBadge(f.status || 'PLANEJADO')}</td>
              <td className="p-3"><Actions edit={() => open('frete', f)} del={() => del('fretes', f.id, `O FRETE ${f.codigo_frete}`)} /></td>
            </>
          )} empty="NENHUM FRETE CADASTRADO NO PERÍODO."/>
        </div>
      )}

      {tab === 'abastecimentos' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Consulta de Abastecimentos (Período)</h2>
            <button onClick={() => open('abastecimento')} className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Fuel size={15}/>NOVO ABASTECIMENTO
            </button>
          </div>
          <Table rows={abastecimentosFiltradosPeriodo.map(a => ({...a, viagem_codigo: viagens.find(v => Number(v.id) === Number(a.viagem_id))?.codigo_viagem || 'AVULSO'}))} headers={['Data/Hora','Viagem','Posto','Litros','Valor Total','KM Atual','']} render={a => (
            <>
              <td className="p-3">{a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-'}</td>
              <td className="p-3 font-bold text-blue-300">{a.viagem_codigo}</td>
              <td className="p-3">{a.posto || '-'}</td>
              <td className="p-3">{num(a.litros, 2)} L</td>
              <td className="p-3 font-bold">{money(a.valor_total)}</td>
              <td className="p-3">{num(a.km_atual)} KM</td>
              <td className="p-3"><Actions del={() => del('abastecimentos', a.id, 'O ABASTECIMENTO')} /></td>
            </>
          )} empty="NENHUM ABASTECIMENTO REGISTRADO NO PERÍODO."/>
        </div>
      )}

      {tab === 'despesas' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Consulta de Despesas (Período)</h2>
            <button onClick={() => open('despesa')} className="flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Receipt size={15}/>LANÇAR DESPESA
            </button>
          </div>
          <Table rows={despesasFiltradasPeriodo.map(d => ({...d, viagem_codigo: viagens.find(v => Number(v.id) === Number(d.viagem_id))?.codigo_viagem || 'AVULSO'}))} headers={['Data','Viagem','Tipo','Descrição','Valor','']} render={d => (
            <>
              <td className="p-3">{d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '-'}</td>
              <td className="p-3 font-bold text-blue-300">{d.viagem_codigo}</td>
              <td className="p-3 font-bold text-amber-400">{d.tipo}</td>
              <td className="p-3">{d.descricao || '-'}</td>
              <td className="p-3 font-bold">{money(d.valor)}</td>
              <td className="p-3"><Actions del={() => del('viagem_despesas', d.id, 'A DESPESA')} /></td>
            </>
          )} empty="NENHUMA DESPESA REGISTRADA NO PERÍODO."/>
        </div>
      )}

      {modal === 'iniciar_viagem' && (
        <Modal title={editing ? 'Editar / Vincular Frete da Viagem' : 'Iniciar Nova Viagem'} onClose={() => setModal('')}>
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

            <Field label="Frete Associado (Planejados)">
              <Select value={tripInicio.frete_id} onChange={e => {
                const selectedFreteId = e.target.value;
                const selectedFrete = fretes.find(f => Number(f.id) === Number(selectedFreteId));
                const pesoAtual = Number(tripInicio.peso_carregado_kg || selectedFrete?.peso_previsto_kg || 0);
                const valorTon = selectedFrete?.valor_por_tonelada || '';
                let valorCalculado = tripInicio.valor_frete_calculado;

                if (valorTon && pesoAtual > 0) valorCalculado = (pesoAtual / 1000) * Number(valorTon);

                setTripInicio({
                  ...tripInicio, 
                  frete_id: selectedFreteId,
                  veiculo_id: selectedFrete?.veiculo_id ? String(selectedFrete.veiculo_id) : tripInicio.veiculo_id,
                  produto: selectedFrete?.produto || tripInicio.produto,
                  peso_carregado_kg: selectedFrete?.peso_previsto_kg ? String(selectedFrete.peso_previsto_kg) : tripInicio.peso_carregado_kg,
                  valor_por_tonelada: valorTon,
                  valor_frete_calculado: valorCalculado || selectedFrete?.valor_frete || ''
                });
              }}>
                <option value="">NENHUM / VIAGEM PRÓPRIA</option>
                {fretesDisponiveis.map(f => {
                  const placaFrete = veiculos.find(v => Number(v.id) === Number(f.veiculo_id))?.placa;
                  return (
                    <option key={f.id} value={f.id}>
                      {f.codigo_frete} - {f.origem} → {f.destino} {placaFrete ? `[Veículo: ${placaFrete}]` : ''} ({money(f.valor_frete)})
                    </option>
                  );
                })}
              </Select>
            </Field>

            <Field label="Produto Transportado (Auto)"><Input value={tripInicio.produto} onChange={e => setTripInicio({...tripInicio, produto: e.target.value})} placeholder="EX: SOJA A GRANEL"/></Field>
            <Field label="Preço por Tonelada (R$) (Auto)"><Input type="number" step="0.01" value={tripInicio.valor_por_tonelada} onChange={e => {
              const valTon = e.target.value;
              const pesoKg = Number(tripInicio.peso_carregado_kg || 0);
              const calc = pesoKg > 0 && valTon ? (pesoKg / 1000) * Number(valTon) : '';
              setTripInicio({...tripInicio, valor_por_tonelada: valTon, valor_frete_calculado: calc});
            }} placeholder="R$ por TON"/></Field>
            
            <Field label="Peso Carga (kg)">
              <Input type="number" value={tripInicio.peso_carregado_kg} onChange={e => {
                const pesoKg = e.target.value;
                const valTon = Number(tripInicio.valor_por_tonelada || 0);
                const calc = valTon > 0 && pesoKg ? (Number(pesoKg) / 1000) * valTon : '';
                setTripInicio({...tripInicio, peso_carregado_kg: pesoKg, valor_frete_calculado: calc});
              }} placeholder="Ex: 35000"/>
            </Field>

            <Field label="Valor Total Frete (Calculado)">
              <Input type="number" step="0.01" value={tripInicio.valor_frete_calculado} disabled className="bg-gray-800 text-emerald-400 font-bold cursor-not-allowed" placeholder="Calculado automaticamente"/>
            </Field>

            <Field label="Placa Carreta (Opcional)"><Input value={tripInicio.carreta_placa} onChange={e => setTripInicio({...tripInicio, carreta_placa: e.target.value})}/></Field>
            <Field label="Local Carregamento"><Input value={tripInicio.local_carregamento} onChange={e => setTripInicio({...tripInicio, local_carregamento: e.target.value})}/></Field>
            <Field label="Número NF"><Input value={tripInicio.numero_nf} onChange={e => setTripInicio({...tripInicio, numero_nf: e.target.value})}/></Field>
            <Field label="KM Inicial"><Input type="number" value={tripInicio.km_inicial} onChange={e => setTripInicio({...tripInicio, km_inicial: e.target.value})}/></Field>
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

      {modal === 'veiculo' && (
        <Modal title={editing ? 'Editar Veículo' : 'Novo Veículo'} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('veiculo'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Placa"><Input value={veiculoForm.placa} onChange={e => setVeiculoForm({...veiculoForm, placa: e.target.value})} required placeholder="EX: ABC-1234"/></Field>
            <Field label="Marca"><Input value={veiculoForm.marca} onChange={e => setVeiculoForm({...veiculoForm, marca: e.target.value})} placeholder="EX: VOLVO"/></Field>
            <Field label="Modelo"><Input value={veiculoForm.modelo} onChange={e => setVeiculoForm({...veiculoForm, modelo: e.target.value})} placeholder="EX: FH 540"/></Field>
            <Field label="Ano"><Input type="number" value={veiculoForm.ano} onChange={e => setVeiculoForm({...veiculoForm, ano: e.target.value})} placeholder="EX: 2023"/></Field>
            <Field label="Status">
              <Select value={veiculoForm.status} onChange={e => setVeiculoForm({...veiculoForm, status: e.target.value})}>
                <option value="DISPONIVEL">DISPONÍVEL</option>
                <option value="EM_VIAGEM">EM VIAGEM</option>
                <option value="MANUTENCAO">MANUTENÇÃO</option>
                <option value="INATIVO">INATIVO</option>
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'frete' && (
        <Modal title={editing ? 'Editar Frete' : 'Cadastrar Frete'} onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('frete'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Código do Frete"><Input value={freteForm.codigo_frete} onChange={e => setFreteForm({...freteForm, codigo_frete: e.target.value})} required/></Field>
            <Field label="Tipo de Operação">
              <Select value={freteForm.tipo_operacao} onChange={e => setFreteForm({...freteForm, tipo_operacao: e.target.value})}>
                {['FRETE_PROPRIO','FRETE_TERCEIRO','TRANSFERENCIA','RETORNO','DESLOCAMENTO','OUTROS'].map(op => <option key={op}>{op}</option>)}
              </Select>
            </Field>
            <Field label="Veículo / Placa (Opcional)">
              <Select value={freteForm.veiculo_id} onChange={e => setFreteForm({...freteForm, veiculo_id: e.target.value})}>
                <option value="">SELECIONE O VEÍCULO</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
              </Select>
            </Field>
            <Field label="Cliente"><Input value={freteForm.cliente} onChange={e => setFreteForm({...freteForm, cliente: e.target.value})} required placeholder="NOME DO CLIENTE"/></Field>
            <Field label="Produto"><Input value={freteForm.produto} onChange={e => setFreteForm({...freteForm, produto: e.target.value})} placeholder="EX: SOJA, MILHO, ADUBO"/></Field>
            <Field label="Peso Previsto (kg)"><Input type="number" value={freteForm.peso_previsto_kg} onChange={e => {
              const peso = e.target.value;
              const ton = Number(freteForm.valor_por_tonelada || 0);
              const total = ton > 0 && peso ? (Number(peso) / 1000) * ton : freteForm.valor_frete;
              setFreteForm({...freteForm, peso_previsto_kg: peso, valor_frete: total});
            }} placeholder="EX: 35000"/></Field>
            <Field label="Valor por Tonelada (R$)"><Input type="number" step="0.01" value={freteForm.valor_por_tonelada} onChange={e => {
              const ton = e.target.value;
              const peso = Number(freteForm.peso_previsto_kg || 0);
              const total = peso > 0 && ton ? (peso / 1000) * Number(ton) : freteForm.valor_frete;
              setFreteForm({...freteForm, valor_por_tonelada: ton, valor_frete: total});
            }} placeholder="R$ por TON"/></Field>
            <Field label="Valor do Frete Total (R$)"><Input type="number" step="0.01" value={freteForm.valor_frete} onChange={e => setFreteForm({...freteForm, valor_frete: e.target.value})} required/></Field>
            <Field label="Origem"><Input value={freteForm.origem} onChange={e => setFreteForm({...freteForm, origem: e.target.value})} required placeholder="CIDADE/UF ORIGEM"/></Field>
            <Field label="Destino"><Input value={freteForm.destino} onChange={e => setFreteForm({...freteForm, destino: e.target.value})} required placeholder="CIDADE/UF DESTINO"/></Field>
            <Field label="Status">
              <Select value={freteForm.status} onChange={e => setFreteForm({...freteForm, status: e.target.value})}>
                {['PLANEJADO','AGUARDANDO_CARREGAMENTO','CARREGADO','EM_VIAGEM','NO_DESTINO','FINALIZADO','CANCELADO'].map(st => <option key={st}>{st}</option>)}
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'abastecimento' && (
        <Modal title="Registrar Abastecimento" onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('abastecimento'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Viagem Vinculada (Opcional - Deixe vazio se for avulso)">
              <Select value={abastecimentoForm.viagem_id} onChange={e => setAbastecimentoForm({...abastecimentoForm, viagem_id: e.target.value})}>
                <option value="">NENHUMA / LANÇAMENTO AVULSO</option>
                {viagens.map(v => <option key={v.id} value={v.id}>{v.codigo_viagem} ({v.local_carregamento || 'ROTA'} - {v.status})</option>)}
              </Select>
            </Field>
            <Field label="Litros"><Input type="number" step="0.01" value={abastecimentoForm.litros} onChange={e => setAbastecimentoForm({...abastecimentoForm, litros: e.target.value})} required/></Field>
            <Field label="Valor Total (R$)"><Input type="number" step="0.01" value={abastecimentoForm.valor_total} onChange={e => setAbastecimentoForm({...abastecimentoForm, valor_total: e.target.value})} required/></Field>
            <Field label="KM Atual"><Input type="number" value={abastecimentoForm.km_atual} onChange={e => setAbastecimentoForm({...abastecimentoForm, km_atual: e.target.value})}/></Field>
            <Field label="Posto"><Input value={abastecimentoForm.posto} onChange={e => setAbastecimentoForm({...abastecimentoForm, posto: e.target.value})}/></Field>
            <Field label="Nota Fiscal"><Input value={abastecimentoForm.nota_fiscal} onChange={e => setAbastecimentoForm({...abastecimentoForm, nota_fiscal: e.target.value})}/></Field>
            <Buttons saving={saving} close={() => setModal('')}/>
          </form>
        </Modal>
      )}

      {modal === 'despesa' && (
        <Modal title="Lançar Despesa" onClose={() => setModal('')}>
          <form onSubmit={e => { e.preventDefault(); save('despesa'); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Viagem Vinculada (Opcional - Deixe vazio se for avulso)">
              <Select value={despesaForm.viagem_id} onChange={e => setDespesaForm({...despesaForm, viagem_id: e.target.value})}>
                <option value="">NENHUMA / LANÇAMENTO AVULSO</option>
                {viagens.map(v => <option key={v.id} value={v.id}>{v.codigo_viagem} ({v.local_carregamento || 'ROTA'} - {v.status})</option>)}
              </Select>
            </Field>
            <Field label="Tipo de Despesa">
              <Select value={despesaForm.tipo} onChange={e => setDespesaForm({...despesaForm, tipo: e.target.value})}>
                {['BORRACHARIA','PEDAGIO','ALIMENTACAO','ESTACIONAMENTO','MANUTENCAO','OUTROS'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Valor (R$)"><Input type="number" step="0.01" value={despesaForm.valor} onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})} required/></Field>
            <Field label="Data da Despesa"><Input type="date" value={despesaForm.data ? despesaForm.data.slice(0,10) : ''} onChange={e => setDespesaForm({...despesaForm, data: e.target.value})} required/></Field>
            <Field label="Descrição" className="sm:col-span-2"><Input value={despesaForm.descricao} onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})} placeholder="EX: REPARO DE PNEU NA BORRACHARIA"/></Field>
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