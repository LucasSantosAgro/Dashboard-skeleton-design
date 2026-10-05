import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Users, FileText, Route, Plus, Search, RefreshCw, Pencil, Trash2, X, Save, DollarSign, Package, Gauge, TrendingUp, AlertCircle, Fuel, Receipt, PlayCircle, CheckCircle2, Award, Calendar, Download, Printer, Navigation, Smartphone } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { supabase } from './lib/supabaseClient';

const colors = ['#38BDF8','#22C55E','#F59E0B','#A78BFA','#EC4899','#14B8A6'];
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (v,d=0) => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const upper = v => (typeof v === 'string' ? v.toUpperCase() : v);

const emptyTripInicio = {
  codigo_viagem: '', frete_id: '', veiculo_id: '', motorista_id: '', carreta_placa: '',
  km_inicial: '', peso_carregado_kg: '', produto: '', valor_por_tonelada: '', valor_frete_calculado: '',
  numero_nf: '', local_carregamento: '', local_descarga: '', data_saida: '', observacao: '', status: 'EM_VIAGEM'
};

const emptyTripFim = {
  km_final: '', peso_descarga_kg: '', local_descarga: '', data_chegada: '', status: 'FINALIZADO'
};

const emptyAbastecimento = { veiculo_id: '', viagem_id: '', data_hora: '', litros: '', valor_total: '', km_atual: '', posto: '', observacao: '' };
const emptyDespesa = { veiculo_id: '', viagem_id: '', tipo: 'PEDAGIO', valor: '', data: '', descricao: '' };
const emptyMotorista = { nome: '', email: '', telefone: '', status: 'ATIVO', veiculo_id: '' };
const emptyVeiculo = { placa: '', marca: '', modelo: '', ano: '', status: 'DISPONIVEL' };
const emptyFrete = { codigo_frete: '', tipo_operacao: 'FRETE_PROPRIO', origem: '', destino: '', cliente: '', produto: '', peso_previsto_kg: '', valor_por_tonelada: '', valor_frete: '', status: 'PLANEJADO', veiculo_id: '' };

function Input(p){return <input {...p} value={p.value ?? ''} onChange={e => { e.target.value = upper(e.target.value); if(p.onChange) p.onChange(e); }} className={'w-full bg-[#1A2030] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white uppercase outline-none focus:border-blue-500/60 shadow-inner '+(p.className||'')}/>}
function Select(p){return <select {...p} className={'w-full bg-[#1A2030] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white uppercase outline-none focus:border-blue-500/60 shadow-inner '+(p.className||'')}/>}
function Field({label,children,className=''}){return <div className={className}><label className="block mb-1.5 text-[11px] sm:text-xs uppercase tracking-wider font-bold text-gray-400">{label}</label>{children}</div>}
function Modal({title,onClose,children}){return <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn"><div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#161B23] border border-white/10 rounded-3xl shadow-2xl"><div className="sticky top-0 z-10 flex justify-between items-center px-5 sm:px-6 py-4 bg-[#161B23] border-b border-white/10"><h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><X size={18}/></button></div><div className="p-5 sm:p-6">{children}</div></div></div>}
function Actions({edit,del}){return <div className="flex justify-end gap-2">{edit && <button onClick={edit} className="p-2.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-blue-400 transition-colors"><Pencil size={15}/></button>}{del && <button onClick={del} className="p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-400 transition-colors"><Trash2 size={15}/></button>}</div>}
function Buttons({saving,close}){return <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-4 border-t border-white/5"><button type="button" onClick={close} className="px-5 py-3 rounded-xl text-xs font-bold text-gray-400 border border-white/10 hover:bg-white/5 transition-colors">CANCELAR</button><button disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shadow-lg shadow-blue-600/30 transition-all"><Save size={16}/>{saving?'SALVANDO...':'SALVAR'}</button></div>}
function Table({rows,headers,render,empty}){return <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-[#1A2030] text-[10px] uppercase text-gray-400 border-b border-white/5"><tr>{headers.map(h=><th key={h} className="p-4 font-bold tracking-wider">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{rows.map((r,i)=><tr key={r.id||i} className="hover:bg-white/[0.03] transition-colors">{render(r)}</tr>)}</tbody></table>{!rows.length&&<p className="text-center text-gray-500 py-10 text-xs">{empty}</p>}</div>}

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
      ['veiculos', 'Veiculos', Truck],
      ['motoristas', 'Motoristas', Users],
      ['fretes', 'Fretes', FileText],
      ['relatorios', 'Relatorios & Exportacao', Download]
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

  const [filtroPlacaRelatorio, setFiltroPlacaRelatorio] = useState('todos');
  const [filtroMotoristaRelatorio, setFiltroMotoristaRelatorio] = useState('todos');

  const [relatorioTipo, setRelatorioTipo] = useState('viagens');

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
  const [viagemDetalheModal, setViagemDetalheModal] = useState(null);

  const currentMotorista = useMemo(() => {
    if (!isDriver || !currentUserEmail) return null;
    const cleanEmail = currentUserEmail.trim().toLowerCase();
    return motoristas.find(m => m.email && m.email.trim().toLowerCase() === cleanEmail) || null;
  }, [isDriver, motoristas, currentUserEmail]);

  const viagemAtiva = useMemo(() => {
    if (!currentMotorista) return null;
    return viagens.find(v => Number(v.motorista_id) === Number(currentMotorista.id) && v.status === 'EM_VIAGEM') || null;
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

  const validarUltimoKm = useCallback((veiculoId, kmInformado, viagemAtualId = null) => {
    if (!veiculoId || !kmInformado) return true;
    let maxKm = 0;
    viagens.forEach(v => {
      if (viagemAtualId && Number(v.id) === Number(viagemAtualId)) return;
      if (Number(v.veiculo_id) === Number(veiculoId)) {
        if (Number(v.km_inicial || 0) > maxKm) maxKm = Number(v.km_inicial);
        if (Number(v.km_final || 0) > maxKm) maxKm = Number(v.km_final);
      }
    });
    abastecimentos.forEach(a => {
      const vViagem = viagens.find(v => Number(v.id) === Number(a.viagem_id));
      if (vViagem && Number(vViagem.veiculo_id) === Number(veiculoId)) {
        if (Number(a.km_atual || 0) > maxKm) maxKm = Number(a.km_atual);
      }
    });
    return Number(kmInformado) >= maxKm;
  }, [viagens, abastecimentos]);

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
    return viagens.filter(v => {
      const passaData = validarFiltroData(v.data_saida || v.created_at);
      if (!passaData) return false;

      if (filtroPlacaRelatorio !== 'todos' && String(v.veiculo_id) !== String(filtroPlacaRelatorio)) {
        return false;
      }
      if (filtroMotoristaRelatorio !== 'todos' && String(v.motorista_id) !== String(filtroMotoristaRelatorio)) {
        return false;
      }
      return true;
    });
  }, [viagens, validarFiltroData, filtroPlacaRelatorio, filtroMotoristaRelatorio]);

  const fretesFiltradosPeriodo = useMemo(() => {
    return fretes.filter(f => {
      const passaData = validarFiltroData(f.created_at);
      if (!passaData) return false;

      if (filtroPlacaRelatorio !== 'todos' && f.veiculo_id && String(f.veiculo_id) !== String(filtroPlacaRelatorio)) {
        return false;
      }
      return true;
    });
  }, [fretes, validarFiltroData, filtroPlacaRelatorio]);

  const abastecimentosFiltradosPeriodo = useMemo(() => {
    return abastecimentos.filter(a => {
      const passaData = validarFiltroData(a.created_at);
      if (!passaData) return false;

      if (filtroPlacaRelatorio !== 'todos' || filtroMotoristaRelatorio !== 'todos') {
        const viagemObj = viagens.find(v => Number(v.id) === Number(a.viagem_id));
        if (!viagemObj) return false;
        if (filtroPlacaRelatorio !== 'todos' && String(viagemObj.veiculo_id) !== String(filtroPlacaRelatorio)) return false;
        if (filtroMotoristaRelatorio !== 'todos' && String(viagemObj.motorista_id) !== String(filtroMotoristaRelatorio)) return false;
      }
      return true;
    });
  }, [abastecimentos, viagens, validarFiltroData, filtroPlacaRelatorio, filtroMotoristaRelatorio]);

  const despesasFiltradasPeriodo = useMemo(() => {
    return despesas.filter(d => {
      const passaData = validarFiltroData(d.data || d.created_at);
      if (!passaData) return false;

      if (filtroPlacaRelatorio !== 'todos' || filtroMotoristaRelatorio !== 'todos') {
        const viagemObj = viagens.find(v => Number(v.id) === Number(d.viagem_id));
        if (!viagemObj) return false;
        if (filtroPlacaRelatorio !== 'todos' && String(viagemObj.veiculo_id) !== String(filtroPlacaRelatorio)) return false;
        if (filtroMotoristaRelatorio !== 'todos' && String(viagemObj.motorista_id) !== String(filtroMotoristaRelatorio)) return false;
      }
      return true;
    });
  }, [despesas, viagens, validarFiltroData, filtroPlacaRelatorio, filtroMotoristaRelatorio]);

  const rankingGestorFiltrado = useMemo(() => {
    const veiculosAlvo = filtroPlacaRelatorio !== 'todos' 
      ? veiculos.filter(v => String(v.id) === String(filtroPlacaRelatorio)) 
      : veiculos;

    const mapa = {};
    veiculosAlvo.forEach(v => {
      mapa[v.id] = {
        veiculo_id: v.id, placa: v.placa, modelo: v.modelo || '-',
        motorista: motoristas.find(m => m.veiculo_id === v.id)?.nome || 'NAO ATRIBUIDO',
        viagensFinalizadas: 0, kmRodados: 0, receitaTotal: 0, custosTotal: 0, totalLitros: 0
      };
    });

    viagensFiltradasPeriodo.forEach(viagem => {
      if (!mapa[viagem.veiculo_id]) {
        const veh = veiculos.find(v => v.id === viagem.veiculo_id);
        if (filtroPlacaRelatorio === 'todos' || String(viagem.veiculo_id) === String(filtroPlacaRelatorio)) {
          mapa[viagem.veiculo_id] = {
            veiculo_id: viagem.veiculo_id, placa: veh?.placa || 'OUTROS', modelo: veh?.modelo || '-',
            motorista: motoristas.find(m => m.id === viagem.motorista_id)?.nome || 'N/A',
            viagensFinalizadas: 0, kmRodados: 0, receitaTotal: 0, custosTotal: 0, totalLitros: 0
          };
        } else {
          return;
        }
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
  }, [veiculos, motoristas, viagensFiltradasPeriodo, fretes, abastecimentosFiltradosPeriodo, despesasFiltradasPeriodo, filtroPlacaRelatorio]);

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
      const nomePosto = upper(a.posto || 'NAO INFORMADO');
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

  const viagensEmTransito = useMemo(() => {
    return viagens.filter(v => v.status === 'EM_VIAGEM').map(v => ({
      ...v,
      motorista_nome: motoristas.find(m => m.id === v.motorista_id)?.nome || '-',
      veiculo_placa: veiculos.find(ve => Number(ve.id) === Number(v.veiculo_id))?.placa || v.veiculos?.placa || '-'
    }));
  }, [viagens, motoristas, veiculos]);

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
        motorista: motoristas.find(m => m.veiculo_id === v.id)?.nome || 'NAO ATRIBUIDO',
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

  const exportarCSV = (dados, nomeArquivo) => {
    if (!dados || !dados.length) {
      alert('Nao ha dados para exportar no periodo selecionado.');
      return;
    }
    const chaves = Object.keys(dados[0]);
    let csvContent = "data:text/csv;charset=utf-8," + [chaves.join(';'), ...dados.map(row => chaves.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(';'))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${nomeArquivo}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarRelatorioGeral = (formato) => {
    let dadosExportacao = [];
    let tituloRelatorio = '';

    if (relatorioTipo === 'viagens') {
      tituloRelatorio = 'Relatorio de Viagens';
      dadosExportacao = viagensFiltradasPeriodo.map(v => ({
        'Codigo Viagem': v.codigo_viagem,
        'Veiculo (Placa)': veiculos.find(ve => Number(ve.id) === Number(v.veiculo_id))?.placa || '-',
        'Motorista': motoristas.find(m => Number(m.id) === Number(v.motorista_id))?.nome || '-',
        'Produto': v.produto || '-',
        'Origem': v.local_carregamento || '-',
        'Destino': v.local_descarga || '-',
        'Peso Origem (kg)': v.peso_carregado_kg ? num(v.peso_carregado_kg) : '0',
        'Peso Destino (kg)': v.peso_descarga_kg ? num(v.peso_descarga_kg) : '0',
        'Dif. Peso (kg)': (v.peso_descarga_kg && v.peso_carregado_kg) ? num(Number(v.peso_descarga_kg) - Number(v.peso_carregado_kg)) : '0',
        'KM Inicial': v.km_inicial || 0,
        'KM Final': v.km_final || 0,
        'KM Total': (v.km_final && v.km_inicial) ? Number(v.km_final) - Number(v.km_inicial) : 0,
        'Data Chegada': v.data_chegada ? new Date(v.data_chegada).toLocaleString('pt-BR') : '-',
        'Status': v.status
      }));
    } else if (relatorioTipo === 'fretes') {
      tituloRelatorio = 'Relatorio de Fretes';
      dadosExportacao = fretesFiltradosPeriodo.map(f => ({
        'Codigo Frete': f.codigo_frete,
        'Operacao': f.tipo_operacao,
        'Cliente': f.cliente,
        'Produto': f.produto || '-',
        'Origem': f.origem,
        'Destino': f.destino,
        'Valor Frete (R$)': money(f.valor_frete || 0),
        'Status': f.status
      }));
    } else if (relatorioTipo === 'abastecimentos') {
      tituloRelatorio = 'Relatorio de Abastecimentos';
      dadosExportacao = abastecimentosFiltradosPeriodo.map(a => ({
        'Data': a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '-',
        'Posto': a.posto || '-',
        'Litros': num(a.litros || 0, 2),
        'Valor Total (R$)': money(a.valor_total || 0),
        'KM Atual': a.km_atual || 0,
        'Nota Fiscal': a.nota_fiscal || '-'
      }));
    } else if (relatorioTipo === 'despesas') {
      tituloRelatorio = 'Relatorio de Despesas';
      dadosExportacao = despesasFiltradasPeriodo.map(d => ({
        'Data': d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '-',
        'Tipo': d.tipo,
        'Descricao': d.descricao || '-',
        'Valor (R$)': money(d.valor || 0)
      }));
    } else if (relatorioTipo === 'veiculos') {
      tituloRelatorio = 'Relatorio de Desempenho de Veiculos';
      dadosExportacao = rankingGestorFiltrado.map(r => ({
        'Placa': r.placa,
        'Modelo': r.modelo,
        'Motorista': r.motorista,
        'Viagens Finalizadas': r.viagensFinalizadas,
        'KM Rodados': r.kmRodados,
        'Media KM/L': Number(r.mediaKmL).toFixed(2),
        'Receita Total (R$)': money(r.receitaTotal),
        'Custos Totais (R$)': money(r.custosTotal),
        'Retorno Liquido (R$)': money(r.retornoLiquido)
      }));
    }

    if (formato === 'csv') {
      exportarCSV(dadosExportacao, `${relatorioTipo}_frota`);
    } else if (formato === 'print' || formato === 'pdf') {
      const janelaPrint = window.open('', '_blank');
      if (janelaPrint) {
        janelaPrint.document.write(`
          <html>
            <head>
              <title>${tituloRelatorio}</title>
              <style>
                body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; }
                h2 { text-align: center; color: #1e3a8a; margin-bottom: 5px; }
                p { text-align: center; font-size: 10px; color: #555; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
                th { background-color: #1e3a8a; color: #fff; font-size: 10px; }
                tr:nth-child(even) { background-color: #f9f9f9; }
              </style>
            </head>
            <body>
              <h2>${tituloRelatorio.toUpperCase()}</h2>
              <p>Gerado em: ${new Date().toLocaleString('pt-BR')} | Filtro: ${filtroTipo.toUpperCase()}</p>
              <table>
                <thead>
                  <tr>
                    ${Object.keys(dadosExportacao[0] || {}).map(k => `<th>${k}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${dadosExportacao.map(row => `<tr>${Object.values(row).map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
              <script>
                window.onload = function() { window.print(); }
              </script>
            </body>
          </html>
        `);
        janelaPrint.document.close();
      }
    }
  };

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
        const proximoNumVag = viagens.length > 0 ? (Math.max(...viagens.map(v => parseInt(String(v.codigo_viagem || '').replace(/\D/g, '') || '0'))) + 1) : 1;
        setTripInicio({
          ...emptyTripInicio,
          codigo_viagem: `VAG - ${String(proximoNumVag).padStart(6, '0')}`,
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
      const proximoNumFrt = fretes.length > 0 ? (Math.max(...fretes.map(f => parseInt(String(f.codigo_frete || '').replace(/\D/g, '') || '0'))) + 1) : 1;
      setFreteForm(row ? {...row} : {...emptyFrete, codigo_frete: `FRT - ${String(proximoNumFrt).padStart(6, '0')}`});
    }
    setModal(type);
  }

  async function save(type) {
    setSaving(true); setError('');
    try {
      if(type === 'iniciar_viagem') {
        const resolvedMotoristaId = isDriver 
          ? (currentMotorista ? currentMotorista.id : (tripInicio.motorista_id ? Number(tripInicio.motorista_id) : null))
          : (tripInicio.motorista_id ? Number(tripInicio.motorista_id) : null);

        if (!resolvedMotoristaId) {
          throw new Error('Identificacao do motorista obrigatoria. Selecione seu cadastro para prosseguir.');
        }

        const veiculoIdNum = Number(tripInicio.veiculo_id);
        const kmInicialNum = tripInicio.km_inicial ? Number(tripInicio.km_inicial) : 0;

        if (kmInicialNum > 0 && !validarUltimoKm(veiculoIdNum, kmInicialNum, editing?.id)) {
          throw new Error('O KM inicial informado nao pode ser menor que o ultimo KM registrado para este veiculo.');
        }

        const pesoKg = tripInicio.peso_carregado_kg ? Number(tripInicio.peso_carregado_kg) : 0;
        const valorTon = tripInicio.valor_por_tonelada ? Number(tripInicio.valor_por_tonelada) : 0;
        let assignedFreteId = tripInicio.frete_id ? Number(tripInicio.frete_id) : null;

        if (!assignedFreteId && (pesoKg > 0 || valorTon > 0 || tripInicio.produto)) {
          const valorFreteCalc = valorTon > 0 && pesoKg > 0 ? (pesoKg / 1000) * valorTon : Number(tripInicio.valor_frete_calculado || 0);
          const proximoNumFrtAuto = fretes.length > 0 ? (Math.max(...fretes.map(f => parseInt(String(f.codigo_frete || '').replace(/\D/g, '') || '0'))) + 1) : 1;
          const novoFretePayload = {
            codigo_frete: `FRT - ${String(proximoNumFrtAuto).padStart(6, '0')}`,
            tipo_operacao: 'FRETE_PROPRIO',
            origem: upper(tripInicio.local_carregamento) || 'N/A',
            destino: upper(tripInicio.local_descarga) || 'N/A',
            cliente: 'VIAGEM PROPRIA / DIRETA',
            produto: upper(tripInicio.produto) || null,
            peso_previsto_kg: pesoKg || null,
            valor_por_tonelada: valorTon || null,
            valor_frete: valorFreteCalc || 0,
            status: 'EM_VIAGEM',
            veiculo_id: veiculoIdNum
          };
          const rFreteIns = await supabase.from('fretes').insert(novoFretePayload).select().single();
          if (!rFreteIns.error && rFreteIns.data) {
            assignedFreteId = rFreteIns.data.id;
          }
        }

        const payload = {
          codigo_viagem: upper(tripInicio.codigo_viagem),
          frete_id: assignedFreteId,
          veiculo_id: veiculoIdNum,
          motorista_id: Number(resolvedMotoristaId),
          carreta_placa: upper(tripInicio.carreta_placa) || null,
          km_inicial: kmInicialNum || null,
          peso_carregado_kg: pesoKg || null,
          produto: upper(tripInicio.produto) || null,
          numero_nf: upper(tripInicio.numero_nf) || null,
          local_carregamento: upper(tripInicio.local_carregamento) || null,
          local_descarga: upper(tripInicio.local_descarga) || null,
          data_saida: tripInicio.data_saida || null,
          status: editing?.status || 'EM_VIAGEM',
          observacao: upper(tripInicio.observacao) || null
        };
        const r = editing ? await supabase.from('viagens').update(payload).eq('id', editing.id) : await supabase.from('viagens').insert(payload);
        if(r.error) throw r.error;

        if (assignedFreteId && valorTon > 0 && pesoKg > 0) {
          const valorCalculado = (pesoKg / 1000) * valorTon;
          await supabase.from('fretes').update({ 
            valor_frete: valorCalculado,
            peso_previsto_kg: pesoKg,
            produto: upper(tripInicio.produto) || undefined
          }).eq('id', Number(assignedFreteId));
        }

        setModal('');
      } else if(type === 'finalizar_viagem') {
        const kmFinalNum = tripFim.km_final ? Number(tripFim.km_final) : 0;
        const kmInicialAtual = Number(editing?.km_inicial || 0);

        if (kmFinalNum < kmInicialAtual) {
          throw new Error('O KM final nao pode ser menor que o KM inicial da viagem.');
        }

        const veiculoIdViagem = Number(editing?.veiculo_id);
        if (veiculoIdViagem && !validarUltimoKm(veiculoIdViagem, kmFinalNum, editing?.id)) {
          throw new Error('O KM final informado nao pode ser menor que o ultimo KM registrado na frota.');
        }

        const payload = {
          km_final: kmFinalNum,
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
        const kmAtualAbst = abastecimentoForm.km_atual ? Number(abastecimentoForm.km_atual) : 0;
        if (abastecimentoForm.viagem_id) {
          const viagemObj = viagens.find(v => Number(v.id) === Number(abastecimentoForm.viagem_id));
          if (viagemObj && kmAtualAbst > 0 && !validarUltimoKm(viagemObj.veiculo_id, kmAtualAbst)) {
            throw new Error('O KM atual do abastecimento nao pode ser menor que o ultimo KM registrado para este veiculo.');
          }
        }

        const litrosVal = Number(abastecimentoForm.litros || 0);
        const valorTotalVal = Number(abastecimentoForm.valor_total || 0);
        const precoLitro = litrosVal > 0 ? valorTotalVal / litrosVal : null;
        const payload = {
          viagem_id: abastecimentoForm.viagem_id ? Number(abastecimentoForm.viagem_id) : null,
          litros: litrosVal,
          valor_total: valorTotalVal,
          preco_por_litro: precoLitro,
          km_atual: kmAtualAbst || null,
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
          codigo_frete: upper(freteForm.codigo_frete),
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

  const statusBadge = s => <span className="px-3 py-1.5 rounded-full border text-[10px] font-extrabold bg-blue-950/60 text-blue-300 border-blue-500/30 shadow-sm">{s}</span>;

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
    <div className="flex flex-col gap-6 uppercase pb-12 max-w-7xl mx-auto px-3 sm:px-6">
      {/* Header com Estilo Moderno */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-[#161B23] to-[#1F2937] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 font-extrabold text-[10px] tracking-widest uppercase border border-blue-500/30">
              {isDriver ? 'Modo Motorista' : 'Gestão Frota & Fretes'}
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-1">
            {isDriver ? `Olá, ${currentMotorista?.nome || currentUserEmail}` : 'Painel Executivo de Frota'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1.5 normal-case font-medium">
            {isDriver ? 'Acesse suas viagens ativas, registre abastecimentos e despesas direto pelo celular.' : 'Controle total de veículos próprios, motoristas, fretes e rentabilidade.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {tabs.map(([id, label, I]) => (
            <button key={id} onClick={() => { setTab(id); setQ(''); }} className={'flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-extrabold border transition-all ' + (tab === id ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/40 scale-105' : 'bg-[#1A2030] text-gray-400 border-white/10 hover:text-white hover:bg-white/5')}>
              <I size={16} />{label}
            </button>
          ))}
          <button onClick={load} title="Atualizar Dados" className="p-3 rounded-2xl bg-[#1A2030] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Banner de Viagem Ativa para Motoristas (Mobile-First de Alto Impacto) */}
      {isDriver && (
        <div className="bg-gradient-to-r from-blue-950/80 via-[#161B23] to-emerald-950/80 border border-blue-500/40 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-blue-600/30 border border-blue-500/50 text-blue-400 animate-pulse">
              <Navigation size={28}/>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Status Atual na Estrada</span>
              <h2 className="text-sm sm:text-base font-black text-white mt-0.5">
                {viagemAtiva ? `Viagem Ativa: ${viagemAtiva.codigo_viagem} (${viagemAtiva.local_carregamento || 'ORIGEM'} → ${viagemAtiva.local_descarga || 'DESTINO'})` : 'Nenhuma viagem em andamento no momento'}
              </h2>
              <p className="text-xs text-gray-300 mt-1 normal-case">
                {viagemAtiva ? `Produto: ${viagemAtiva.produto || 'N/A'} | KM Inicial: ${num(viagemAtiva.km_inicial)} KM` : 'Inicie uma nova viagem para começar a registrar quilometragem e abastecimentos.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {viagemAtiva ? (
              <button onClick={() => open('finalizar_viagem', viagemAtiva)} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all">
                <CheckCircle2 size={18}/> FINALIZAR VIAGEM ATIVA
              </button>
            ) : (
              <button onClick={() => open('iniciar_viagem')} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition-all">
                <PlayCircle size={18}/> INICIAR NOVA VIAGEM
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtro de Período Global para o Gestor */}
      {!isDriver && (
        <div className="bg-[#161B23] border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2.5 text-white text-xs font-bold">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400"><Calendar size={16} /></div>
            <span>Período de Análise:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-[#1A2030] p-1.5 rounded-2xl border border-white/10">
              <button onClick={() => setFiltroTipo('todos')} className={`px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all ${filtroTipo === 'todos' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>TODOS</button>
              <button onClick={() => setFiltroTipo('mes_ano')} className={`px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all ${filtroTipo === 'mes_ano' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>MÊS / ANO</button>
              <button onClick={() => setFiltroTipo('intervalo')} className={`px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all ${filtroTipo === 'intervalo' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>INTERVALO</button>
            </div>

            {filtroTipo === 'mes_ano' && (
              <input type="month" value={filtroMesAno} onChange={e => setFiltroMesAno(e.target.value)} className="bg-[#1A2030] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white uppercase outline-none focus:border-blue-500/60"/>
            )}

            {filtroTipo === 'intervalo' && (
              <div className="flex items-center gap-2">
                <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="bg-[#1A2030] border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white uppercase outline-none focus:border-blue-500/60"/>
                <span className="text-gray-500 text-xs font-bold">até</span>
                <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="bg-[#1A2030] border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white uppercase outline-none focus:border-blue-500/60"/>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs shadow-xl"><AlertCircle size={20} className="shrink-0"/><span>{error}</span></div>}

      {/* DASHBOARD MODERNO DO GESTOR */}
      {!isDriver && tab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div onClick={() => setKpiModal('viagens')} className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 rounded-3xl text-white shadow-xl flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-all border border-blue-400/20 group">
              <div>
                <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Total de Viagens</p>
                <h3 className="text-3xl font-black mt-2 tracking-tight">{kpisFiltrados.total_viagens}</h3>
              </div>
              <p className="text-[10px] text-blue-200 mt-4 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('km')} className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 p-5 rounded-3xl text-white shadow-xl flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-all border border-emerald-400/20 group">
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">KM Rodados</p>
                <h3 className="text-3xl font-black mt-2 tracking-tight">{num(kpisFiltrados.km_rodados)}</h3>
              </div>
              <p className="text-[10px] text-emerald-200 mt-4 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('toneladas')} className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-800 p-5 rounded-3xl text-white shadow-xl flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-all border border-amber-400/20 group">
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-100 tracking-wider">Toneladas</p>
                <h3 className="text-3xl font-black mt-2 tracking-tight">{num(kpisFiltrados.toneladas_transportadas, 1)} t</h3>
              </div>
              <p className="text-[10px] text-amber-200 mt-4 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('receita')} className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-900 p-5 rounded-3xl text-white shadow-xl flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-all border border-purple-400/20 group">
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Receita de Fretes</p>
                <h3 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">{money(kpisFiltrados.receita_fretes)}</h3>
              </div>
              <p className="text-[10px] text-purple-200 mt-4 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver por placa →</p>
            </div>
            <div onClick={() => setKpiModal('custos')} className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-900 p-5 rounded-3xl text-white shadow-xl flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-all border border-rose-400/20 group">
              <div>
                <p className="text-[10px] uppercase font-bold text-rose-100 tracking-wider">Custos Operacionais</p>
                <h3 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">{money(kpisFiltrados.custos_operacionais)}</h3>
              </div>
              <p className="text-[10px] text-rose-200 mt-4 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver divisão →</p>
            </div>
            <div onClick={() => setKpiModal('resultado')} className="bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-800 p-5 rounded-3xl text-white shadow-xl flex flex-col justify-between cursor-pointer hover:scale-[1.03] transition-all border border-teal-400/20 group">
              <div>
                <p className="text-[10px] uppercase font-bold text-teal-100 tracking-wider">Resultado Líquido</p>
                <h3 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">{money(kpisFiltrados.resultado)}</h3>
              </div>
              <p className="text-[10px] text-teal-200 mt-4 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver por placa →</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#161B23] border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400"><Truck size={20}/></div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">Veículos em Trânsito</h3>
                    <p className="text-[11px] text-gray-400">Clique em qualquer placa para inspecionar os detalhes da viagem</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-950 text-blue-300 font-extrabold text-[10px] border border-blue-500/30">{viagensEmTransito.length} na estrada</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {viagensEmTransito.map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => setViagemDetalheModal(v)}
                    className="flex items-center gap-3 bg-[#1A2030] hover:bg-blue-950/50 border border-blue-500/30 px-4 py-3 rounded-2xl text-xs font-bold text-blue-300 transition-all cursor-pointer shadow-md group"
                  >
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                    <span className="font-black text-white group-hover:text-blue-300">{v.veiculo_placa}</span>
                    <span className="text-gray-400 font-medium">({v.motorista_nome})</span>
                  </button>
                ))}
                {!viagensEmTransito.length && (
                  <p className="text-gray-500 text-xs py-4">Nenhum veículo em trânsito no momento.</p>
                )}
              </div>
            </div>

            <div className="bg-[#161B23] border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400"><Fuel size={20}/></div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">Postos Mais Frequentes</h3>
                </div>
                <div className="space-y-3">
                  {rankingPostos.slice(0, 3).map((p, idx) => (
                    <div key={p.posto} className="flex items-center justify-between p-3 rounded-2xl bg-[#1A2030] border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-400 text-xs">{idx + 1}º</span>
                        <div>
                          <p className="font-bold text-white text-xs">{p.posto}</p>
                          <p className="text-[10px] text-gray-400">{num(p.totalLitros, 2)} L abastecidos</p>
                        </div>
                      </div>
                      <span className="font-black text-yellow-400 text-xs">{money(p.precoMedioLitro)}/L</span>
                    </div>
                  ))}
                  {!rankingPostos.length && (
                    <p className="text-gray-500 text-xs py-4 text-center">Sem dados de abastecimento.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#161B23] border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400"><Award size={20}/></div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">Ranking de Desempenho por Frota</h3>
                  <p className="text-[11px] text-gray-400">Classificação baseada no retorno líquido do período</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-400">
                  <tr>
                    <th className="p-4 text-center w-12">#</th>
                    <th className="p-4 text-left">Placa / Modelo</th>
                    <th className="p-4 text-left">Motorista</th>
                    <th className="p-4 text-center">Viagens</th>
                    <th className="p-4 text-right">KM Rodados</th>
                    <th className="p-4 text-right">Média KM/L</th>
                    <th className="p-4 text-right">Faturamento/KM</th>
                    <th className="p-4 text-right">Faturamento Total</th>
                    <th className="p-4 text-right">Retorno Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingGestor.map((r, idx) => (
                    <tr key={r.veiculo_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 text-center font-black text-amber-400">
                        {idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`}
                      </td>
                      <td className="p-4 font-bold text-blue-300">{r.placa} <span className="text-gray-400 font-normal">({r.modelo})</span></td>
                      <td className="p-4 font-semibold text-gray-200">{r.motorista}</td>
                      <td className="p-4 text-center">{r.viagensFinalizadas}</td>
                      <td className="p-4 text-right">{num(r.kmRodados)} km</td>
                      <td className="p-4 text-right text-yellow-400 font-bold">{num(r.mediaKmL, 2)} KM/L</td>
                      <td className="p-4 text-right text-purple-300 font-bold">{money(r.mediaPorKm)}/km</td>
                      <td className="p-4 text-right text-emerald-400 font-bold">{money(r.receitaTotal)}</td>
                      <td className="p-4 text-right text-teal-400 font-black">{money(r.retornoLiquido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA DE RELATÓRIOS */}
      {!isDriver && tab === 'relatorios' && (
        <div className="bg-[#161B23] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2.5">
                <Download size={20} className="text-blue-400"/> Central de Relatórios Executivos
              </h2>
              <p className="text-xs text-gray-400 mt-1">Exporte dados consolidados em CSV ou gere documentos otimizados para impressão e PDF.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1A2030] p-5 rounded-2xl border border-white/5">
            <Field label="Filtrar por Placa (Veículo)">
              <Select value={filtroPlacaRelatorio} onChange={e => setFiltroPlacaRelatorio(e.target.value)}>
                <option value="todos">TODAS AS PLACAS (GERAL)</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.placa} ({v.modelo || '-'}{v.marca ? ` - ${v.marca}` : ''})</option>
                ))}
              </Select>
            </Field>

            <Field label="Filtrar por Motorista">
              <Select value={filtroMotoristaRelatorio} onChange={e => setFiltroMotoristaRelatorio(e.target.value)}>
                <option value="todos">TODOS OS MOTORISTAS (GERAL)</option>
                {motoristas.map(m => (
                  <option key={m.id} value={m.id}>{m.nome} {m.email ? `(${m.email})` : ''}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <button onClick={() => setRelatorioTipo('viagens')} className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${relatorioTipo === 'viagens' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1A2030] border-white/10 text-gray-300 hover:text-white'}`}>
              <Route size={20} className="mb-2 text-blue-300"/>
              Viagens e Rotas
            </button>
            <button onClick={() => setRelatorioTipo('fretes')} className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${relatorioTipo === 'fretes' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1A2030] border-white/10 text-gray-300 hover:text-white'}`}>
              <FileText size={20} className="mb-2 text-purple-300"/>
              Fretes
            </button>
            <button onClick={() => setRelatorioTipo('abastecimentos')} className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${relatorioTipo === 'abastecimentos' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1A2030] border-white/10 text-gray-300 hover:text-white'}`}>
              <Fuel size={20} className="mb-2 text-emerald-300"/>
              Abastecimentos
            </button>
            <button onClick={() => setRelatorioTipo('despesas')} className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${relatorioTipo === 'despesas' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1A2030] border-white/10 text-gray-300 hover:text-white'}`}>
              <Receipt size={20} className="mb-2 text-amber-300"/>
              Despesas
            </button>
            <button onClick={() => setRelatorioTipo('veiculos')} className={`p-4 rounded-2xl border text-left font-bold text-xs transition-all ${relatorioTipo === 'veiculos' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#1A2030] border-white/10 text-gray-300 hover:text-white'}`}>
              <Truck size={20} className="mb-2 text-teal-300"/>
              Desempenho Frota
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1A2030] p-5 rounded-2xl border border-white/5">
            <div>
              <span className="text-xs font-black text-white uppercase block">Módulo Selecionado: {relatorioTipo.toUpperCase()}</span>
              <span className="text-[11px] text-gray-400">Respeita o filtro de período e as seleções de placa/motorista aplicadas acima.</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => exportarRelatorioGeral('csv')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg transition-all">
                <Download size={16}/> EXPORTAR CSV
              </button>
              <button onClick={() => exportarRelatorioGeral('print')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg transition-all">
                <Printer size={16}/> IMPRIMIR / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {viagemDetalheModal && (
        <Modal title={`Detalhes da Viagem: ${viagemDetalheModal.codigo_viagem}`} onClose={() => setViagemDetalheModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Veículo / Placa</span>
              <span className="text-white font-black text-sm">{viagemDetalheModal.veiculo_placa}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Motorista</span>
              <span className="text-white font-black text-sm">{viagemDetalheModal.motorista_nome}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Produto</span>
              <span className="text-white font-bold">{viagemDetalheModal.produto || 'NÃO INFORMADO'}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Nota Fiscal (NF)</span>
              <span className="text-white font-bold">{viagemDetalheModal.numero_nf || 'NÃO INFORMADA'}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Local Carregamento</span>
              <span className="text-white font-bold">{viagemDetalheModal.local_carregamento || 'NÃO INFORMADO'}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Local Descarga</span>
              <span className="text-white font-bold">{viagemDetalheModal.local_descarga || 'EM TRÂNSITO'}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Peso Carregado</span>
              <span className="text-emerald-400 font-bold">{viagemDetalheModal.peso_carregado_kg ? `${num(viagemDetalheModal.peso_carregado_kg)} kg` : 'NÃO INFORMADO'}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Peso Destino</span>
              <span className="text-amber-400 font-bold">{viagemDetalheModal.peso_descarga_kg ? `${num(viagemDetalheModal.peso_descarga_kg)} kg` : 'NÃO INFORMADO'}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Diferença de Peso</span>
              <span className="text-blue-400 font-bold">
                {viagemDetalheModal.peso_descarga_kg && viagemDetalheModal.peso_carregado_kg 
                  ? `${num(Number(viagemDetalheModal.peso_descarga_kg) - Number(viagemDetalheModal.peso_carregado_kg))} kg` 
                  : 'N/A'}
              </span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">KM Total Percorrido</span>
              <span className="text-yellow-400 font-bold">
                {viagemDetalheModal.km_final && viagemDetalheModal.km_inicial 
                  ? `${num(Number(viagemDetalheModal.km_final) - Number(viagemDetalheModal.km_inicial))} KM` 
                  : 'N/A'}
              </span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Data e Hora Chegada</span>
              <span className="text-teal-400 font-bold">{viagemDetalheModal.data_chegada ? new Date(viagemDetalheModal.data_chegada).toLocaleString('pt-BR') : 'EM ANDAMENTO'}</span>
            </div>
            <div className="bg-[#1A2030] p-4 rounded-2xl border border-white/5 sm:col-span-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">KM Inicial / Saída</span>
              <span className="text-white font-bold">{viagemDetalheModal.km_inicial ? `${num(viagemDetalheModal.km_inicial)} KM` : '-'} ({viagemDetalheModal.data_saida ? new Date(viagemDetalheModal.data_saida).toLocaleString('pt-BR') : 'N/A'})</span>
            </div>
          </div>
        </Modal>
      )}

      {kpiModal && (
        <Modal 
          title={
            kpiModal === 'custos' 
              ? 'Divisão de Custos por Placa (Abastecimentos e Despesas)' 
              : `Detalhamento por Placa - ${kpiModal.toUpperCase()}`
          } 
          onClose={() => setKpiModal(null)}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-400">
                <tr>
                  <th className="p-4 text-left">Placa / Veículo</th>
                  {kpiModal === 'custos' ? (
                    <>
                      <th className="p-4 text-right">Abastecimentos (L / Total)</th>
                      <th className="p-4 text-left">Despesas por Categoria</th>
                      <th className="p-4 text-right">Custo Total</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 text-center">Viagens</th>
                      <th className="p-4 text-right">KM Rodados</th>
                      <th className="p-4 text-right">Toneladas (t)</th>
                      <th className="p-4 text-right">Receita</th>
                      <th className="p-4 text-right">Custos</th>
                      <th className="p-4 text-right">Resultado</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {getKpiBreakdownByPlate(kpiModal).map((item, idx) => (
                  <tr key={idx} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-blue-300">{item.placa} <span className="text-gray-400 font-normal">({item.modelo})</span></td>
                    {kpiModal === 'custos' ? (
                      <>
                        <td className="p-4 text-right text-emerald-400 font-bold">
                          {num(item.totalLitrosAbst, 2)} L<br/>
                          <span className="text-white">{money(item.totalValAbst)}</span>
                        </td>
                        <td className="p-4">
                          {Object.keys(item.despesasPorModalidade).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {Object.entries(item.despesasPorModalidade).map(([tipo, val]) => (
                                <span key={tipo} className="text-[11px] text-amber-300">
                                  <strong>{tipo}:</strong> {money(val)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">Nenhuma despesa</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-rose-400 font-black">{money(item.custos)}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-center">{item.totalViagens}</td>
                        <td className="p-4 text-right">{num(item.kmRodados)} km</td>
                        <td className="p-4 text-right">{num(item.toneladas, 1)} t</td>
                        <td className="p-4 text-right text-emerald-400 font-bold">{money(item.receita)}</td>
                        <td className="p-4 text-right text-rose-400 font-bold">{money(item.custos)}</td>
                        <td className="p-4 text-right text-teal-400 font-black">{money(item.resultado)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* ABA DE VIAGENS (COM VISUALIZAÇÃO MOBILE OTIMIZADA PARA MOTORISTAS) */}
      {(tab === 'viagens' || tab === 'minhas_viagens') && (
        <div className="bg-[#161B23] border border-white/10 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-auto">
              <Search size={16} className="absolute left-4 top-3.5 text-gray-500"/>
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar viagens, produtos..." className="pl-11 w-full md:w-80 lowercase"/>
            </div>
            <div className="grid grid-cols-1 sm:flex flex-wrap gap-2.5">
              <button onClick={() => open('abastecimento')} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all">
                <Fuel size={16}/>ABASTECIMENTO
              </button>
              <button onClick={() => open('despesa')} className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl shadow-lg shadow-amber-600/20 transition-all">
                <Receipt size={16}/>DESPESA
              </button>
              <button onClick={() => open('iniciar_viagem')} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-600/30 transition-all">
                <PlayCircle size={16}/>INICIAR NOVA VIAGEM
              </button>
            </div>
          </div>

          {/* Cards em formato Mobile Otimizado */}
          <div className="block sm:hidden p-4 space-y-4">
            {viagensFiltradas.map(v => (
              <div key={v.id} className="bg-[#1A2030] border border-white/10 rounded-3xl p-5 flex flex-col gap-3.5 shadow-xl">
                <div className="flex justify-between items-center">
                  <span className="font-black text-blue-300 text-sm tracking-wide">{v.codigo_viagem}</span>
                  {statusBadge(v.status)}
                </div>
                <div className="text-xs space-y-1.5 text-gray-300">
                  <p><strong>Veículo:</strong> {v.veiculos?.placa || '-'}</p>
                  <p><strong>Motorista:</strong> {v.motorista_nome}</p>
                  <p><strong>Produto:</strong> {v.produto || '-'}</p>
                  <p><strong>Rota:</strong> <span className="text-white font-bold">{v.local_carregamento || '-'} → {v.local_descarga || 'EM TRÂNSITO'}</span></p>
                  <p><strong>Peso Origem:</strong> {v.peso_carregado_kg ? `${num(v.peso_carregado_kg)} KG` : '-'}</p>
                  <p><strong>Peso Destino:</strong> {v.peso_descarga_kg ? `${num(v.peso_descarga_kg)} KG` : '-'}</p>
                  <p><strong>Diferença Peso:</strong> {(v.peso_descarga_kg && v.peso_carregado_kg) ? `${num(Number(v.peso_descarga_kg) - Number(v.peso_carregado_kg))} KG` : '-'}</p>
                  <p><strong>KM Total:</strong> <span className="text-yellow-400 font-extrabold">{(v.km_final && v.km_inicial) ? `${num(Number(v.km_final) - Number(v.km_inicial))} KM` : '-'}</span></p>
                  <p><strong>Data Chegada:</strong> <span className="text-teal-400 font-extrabold">{v.data_chegada ? new Date(v.data_chegada).toLocaleString('pt-BR') : 'EM ANDAMENTO'}</span></p>
                </div>
                <div className="flex items-center gap-2.5 pt-3 border-t border-white/5">
                  {v.status !== 'FINALIZADO' && (
                    <button onClick={() => open('finalizar_viagem', v)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30">
                      <CheckCircle2 size={16}/> FINALIZAR VIAGEM
                    </button>
                  )}
                  <button onClick={() => open('iniciar_viagem', v)} className="p-3 rounded-2xl bg-blue-950/60 text-blue-400 hover:bg-blue-900/60 transition-colors">
                    <Pencil size={18}/>
                  </button>
                  <button onClick={() => del('viagens', v.id, `A VIAGEM ${v.codigo_viagem}`)} className="p-3 rounded-2xl bg-red-950/60 text-red-400 hover:bg-red-900/60 transition-colors">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))}
            {!viagensFiltradas.length && (
              <p className="text-center text-gray-500 py-12 text-xs font-bold">NENHUMA VIAGEM REGISTRADA NO PERÍODO.</p>
            )}
          </div>

          {/* Tabela Desktop */}
          <div className="hidden sm:block">
            <Table rows={viagensFiltradas} headers={['CÓDIGO','VEÍCULO','MOTORISTA','PRODUTO','ORIGEM -> DESTINO','PESO ORIGEM','PESO DESTINO','DIF. PESO','KM TOTAL','DATA CHEGADA','STATUS','AÇÕES']} render={v => (
              <>
                <td className="p-4 font-black text-blue-300">{v.codigo_viagem}</td>
                <td className="p-4 font-semibold">{v.veiculos?.placa || '-'}</td>
                <td className="p-4 font-semibold">{v.motorista_nome}</td>
                <td className="p-4 font-bold text-gray-300">{v.produto || '-'}</td>
                <td className="p-4 font-semibold">{v.local_carregamento || '-'} → {v.local_descarga || 'EM TRÂNSITO'}</td>
                <td className="p-4 font-bold text-emerald-400">{v.peso_carregado_kg ? `${num(v.peso_carregado_kg)} KG` : '-'}</td>
                <td className="p-4 font-bold text-amber-400">{v.peso_descarga_kg ? `${num(v.peso_descarga_kg)} KG` : '-'}</td>
                <td className="p-4 font-extrabold text-blue-400">
                  {v.peso_descarga_kg && v.peso_carregado_kg ? `${num(Number(v.peso_descarga_kg) - Number(v.peso_carregado_kg))} KG` : '-'}
                </td>
                <td className="p-4 font-extrabold text-yellow-400">
                  {v.km_final && v.km_inicial ? `${num(Number(v.km_final) - Number(v.km_inicial))} KM` : '-'}
                </td>
                <td className="p-4 font-bold text-teal-400">
                  {v.data_chegada ? new Date(v.data_chegada).toLocaleString('pt-BR') : '-'}
                </td>
                <td className="p-4">{statusBadge(v.status)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {v.status !== 'FINALIZADO' && (
                      <button onClick={() => open('finalizar_viagem', v)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow transition-all">
                        <CheckCircle2 size={15}/> FINALIZAR
                      </button>
                    )}
                    <Actions edit={() => open('iniciar_viagem', v)} del={() => del('viagens', v.id, `A VIAGEM ${v.codigo_viagem}`)} />
                  </div>
                </td>
              </>
            )} empty="NENHUMA VIAGEM REGISTRADA NO PERÍODO."/>
          </div>
        </div>
      )}

      {tab === 'veiculos' && (
        <div className="bg-[#161B23] border border-white/10 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">Frota de Veículos e Consumo Médio</h2>
            <button onClick={() => open('veiculo')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/30 transition-all">
              <Plus size={16}/>NOVO VEÍCULO
            </button>
          </div>
          <Table rows={veiculosComConsumo} headers={['PLACA','MARCA','MODELO','ANO','KM RODADOS','MÉDIA KM/L','STATUS','AÇÕES']} render={v => (
            <>
              <td className="p-4 font-black text-blue-300">{v.placa}</td>
              <td className="p-4 font-semibold">{v.marca || '-'}</td>
              <td className="p-4 font-extrabold text-white">{v.modelo || '-'}</td>
              <td className="p-4 font-semibold">{v.ano || '-'}</td>
              <td className="p-4 font-semibold text-gray-300">{num(v.kmRodados)} km</td>
              <td className="p-4 font-black text-yellow-400">{num(v.mediaKmL, 2)} KM/L</td>
              <td className="p-4">{statusBadge(v.status || 'DISPONIVEL')}</td>
              <td className="p-4"><Actions edit={() => open('veiculo', v)} del={() => del('veiculos', v.id, `O VEÍCULO ${v.placa}`)} /></td>
            </>
          )} empty="NENHUM VEÍCULO CADASTRADO."/>
        </div>
      )}

      {tab === 'motoristas' && (
        <div className="bg-[#161B23] border border-white/10 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">Motoristas & Vínculo de Veículos</h2>
            <button onClick={() => open('motorista')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/30 transition-all">
              <Plus size={16}/>NOVO MOTORISTA
            </button>
          </div>
          <Table rows={motoristas} headers={['NOME','E-MAIL','TELEFONE','VEÍCULO ATRIBUÍDO','STATUS','AÇÕES']} render={m => {
            const veicVinculado = veiculos.find(v => Number(v.id) === Number(m.veiculo_id));
            return (
              <>
                <td className="p-4 font-black text-white">{m.nome}</td>
                <td className="p-4 text-gray-300 lowercase font-medium">{m.email || '-'}</td>
                <td className="p-4 font-semibold">{m.telefone || '-'}</td>
                <td className="p-4 font-bold text-blue-300">{veicVinculado ? veicVinculado.placa : 'NÃO ATRIBUÍDO'}</td>
                <td className="p-4">{statusBadge(m.status || 'ATIVO')}</td>
                <td className="p-4"><Actions edit={() => open('motorista', m)} del={() => del('motoristas', m.id, `O MOTORISTA ${m.nome}`)} /></td>
              </>
            );
          }} empty="NENHUM MOTORISTA CADASTRADO."/>
        </div>
      )}

      {tab === 'fretes' && (
        <div className="bg-[#161B23] border border-white/10 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">Controle de Fretes e Operações</h2>
            <button onClick={() => open('frete')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/30 transition-all">
              <Plus size={16}/>NOVO FRETE
            </button>
          </div>
          <Table rows={fretes} headers={['CÓDIGO','CLIENTE','ORIGEM -> DESTINO','PRODUTO','VALOR FRETE','STATUS','AÇÕES']} render={f => (
            <>
              <td className="p-4 font-black text-blue-300">{f.codigo_frete}</td>
              <td className="p-4 font-extrabold text-white">{f.cliente}</td>
              <td className="p-4 font-semibold">{f.origem} → {f.destino}</td>
              <td className="p-4 font-semibold text-gray-300">{f.produto || '-'}</td>
              <td className="p-4 font-black text-emerald-400">{money(f.valor_frete)}</td>
              <td className="p-4">{statusBadge(f.status)}</td>
              <td className="p-4"><Actions edit={() => open('frete', f)} del={() => del('fretes', f.id, `O FRETE ${f.codigo_frete}`)} /></td>
            </>
          )} empty="NENHUM FRETE CADASTRADO."/>
        </div>
      )}

      {/* MODAIS DE CADASTRO / EDIÇÃO */}
      {modal === 'iniciar_viagem' && (
        <Modal title={editing ? `Editar Viagem: ${tripInicio.codigo_viagem}` : 'Iniciar Nova Viagem'} onClose={() => setModal('')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Código da Viagem"><Input value={tripInicio.codigo_viagem} onChange={e => setTripInicio({...tripInicio, codigo_viagem: e.target.value})} /></Field>
            <Field label="Veículo (Placa)">
              <Select value={tripInicio.veiculo_id} onChange={e => setTripInicio({...tripInicio, veiculo_id: e.target.value})}>
                <option value="">SELECIONE O VEÍCULO</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo || '-'})</option>)}
              </Select>
            </Field>
            <Field label="Motorista">
              {isDriver ? (
                <Input value={currentMotorista?.nome || currentUserEmail} disabled className="opacity-70 cursor-not-allowed"/>
              ) : (
                <Select value={tripInicio.motorista_id} onChange={e => setTripInicio({...tripInicio, motorista_id: e.target.value})}>
                  <option value="">SELECIONE O MOTORISTA</option>
                  {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Frete Vinculado (Opcional)">
              <Select value={tripInicio.frete_id} onChange={e => setTripInicio({...tripInicio, frete_id: e.target.value})}>
                <option value="">NENHUM (FRETE PRÓPRIO / DIRETO)</option>
                {fretesDisponiveis.map(f => <option key={f.id} value={f.id}>{f.codigo_frete} - {f.cliente} ({f.origem} → {f.destino})</option>)}
              </Select>
            </Field>
            <Field label="Placa da Carreta (Se houver)"><Input value={tripInicio.carreta_placa} onChange={e => setTripInicio({...tripInicio, carreta_placa: e.target.value})} /></Field>
            <Field label="KM Inicial"><Input type="number" value={tripInicio.km_inicial} onChange={e => setTripInicio({...tripInicio, km_inicial: e.target.value})} /></Field>
            <Field label="Produto Transportado"><Input value={tripInicio.produto} onChange={e => setTripInicio({...tripInicio, produto: e.target.value})} /></Field>
            <Field label="Peso Carregado (KG)"><Input type="number" value={tripInicio.peso_carregado_kg} onChange={e => setTripInicio({...tripInicio, peso_carregado_kg: e.target.value})} /></Field>
            <Field label="Valor por Tonelada (R$) (Opcional)"><Input type="number" step="0.01" value={tripInicio.valor_por_tonelada} onChange={e => setTripInicio({...tripInicio, valor_por_tonelada: e.target.value})} /></Field>
            <Field label="Número da Nota Fiscal (NF)"><Input value={tripInicio.numero_nf} onChange={e => setTripInicio({...tripInicio, numero_nf: e.target.value})} /></Field>
            <Field label="Local de Carregamento (Origem)"><Input value={tripInicio.local_carregamento} onChange={e => setTripInicio({...tripInicio, local_carregamento: e.target.value})} /></Field>
            <Field label="Local de Descarga (Destino)"><Input value={tripInicio.local_descarga} onChange={e => setTripInicio({...tripInicio, local_descarga: e.target.value})} /></Field>
            <Field label="Data e Hora de Saída"><Input type="datetime-local" value={tripInicio.data_saida} onChange={e => setTripInicio({...tripInicio, data_saida: e.target.value})} /></Field>
            <Field label="Observações" className="sm:col-span-2 lg:col-span-3"><Input value={tripInicio.observacao} onChange={e => setTripInicio({...tripInicio, observacao: e.target.value})} /></Field>
            <Buttons saving={saving} close={() => setModal('')} />
          </div>
        </Modal>
      )}

      {modal === 'finalizar_viagem' && (
        <Modal title={`Finalizar Viagem: ${editing?.codigo_viagem}`} onClose={() => setModal('')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="KM Final"><Input type="number" value={tripFim.km_final} onChange={e => setTripFim({...tripFim, km_final: e.target.value})} /></Field>
            <Field label="Peso no Destino (KG)"><Input type="number" value={tripFim.peso_descarga_kg} onChange={e => setTripFim({...tripFim, peso_descarga_kg: e.target.value})} /></Field>
            <Field label="Local de Descarga Efetivo"><Input value={tripFim.local_descarga} onChange={e => setTripFim({...tripFim, local_descarga: e.target.value})} /></Field>
            <Field label="Data e Hora de Chegada"><Input type="datetime-local" value={tripFim.data_chegada} onChange={e => setTripFim({...tripFim, data_chegada: e.target.value})} /></Field>
            <Buttons saving={saving} close={() => setModal('')} />
          </div>
        </Modal>
      )}

      {modal === 'abastecimento' && (
        <Modal title="Registrar Abastecimento" onClose={() => setModal('')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Viagem Associada">
              <Select value={abastecimentoForm.viagem_id} onChange={e => setAbastecimentoForm({...abastecimentoForm, viagem_id: e.target.value})}>
                <option value="">SELECIONE A VIAGEM ATIVA</option>
                {viagens.filter(v => v.status === 'EM_VIAGEM').map(v => <option key={v.id} value={v.id}>{v.codigo_viagem} - {v.veiculos?.placa} ({v.local_carregamento} → {v.local_descarga || 'EM TRÂNSITO'})</option>)}
              </Select>
            </Field>
            <Field label="Posto de Combustível"><Input value={abastecimentoForm.posto} onChange={e => setAbastecimentoForm({...abastecimentoForm, posto: e.target.value})} /></Field>
            <Field label="Nota Fiscal (NF)"><Input value={abastecimentoForm.nota_fiscal} onChange={e => setAbastecimentoForm({...abastecimentoForm, nota_fiscal: e.target.value})} /></Field>
            <Field label="Litros Abastecidos"><Input type="number" step="0.01" value={abastecimentoForm.litros} onChange={e => setAbastecimentoForm({...abastecimentoForm, litros: e.target.value})} /></Field>
            <Field label="Valor Total (R$)"><Input type="number" step="0.01" value={abastecimentoForm.valor_total} onChange={e => setAbastecimentoForm({...abastecimentoForm, valor_total: e.target.value})} /></Field>
            <Field label="KM Atual do Veículo"><Input type="number" value={abastecimentoForm.km_atual} onChange={e => setAbastecimentoForm({...abastecimentoForm, km_atual: e.target.value})} /></Field>
            <Buttons saving={saving} close={() => setModal('')} />
          </div>
        </Modal>
      )}

      {modal === 'despesa' && (
        <Modal title="Registrar Despesa de Viagem" onClose={() => setModal('')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Viagem Associada">
              <Select value={despesaForm.viagem_id} onChange={e => setDespesaForm({...despesaForm, viagem_id: e.target.value})}>
                <option value="">SELECIONE A VIAGEM ATIVA</option>
                {viagens.filter(v => v.status === 'EM_VIAGEM').map(v => <option key={v.id} value={v.id}>{v.codigo_viagem} - {v.veiculos?.placa} ({v.local_carregamento} → {v.local_descarga || 'EM TRÂNSITO'})</option>)}
              </Select>
            </Field>
            <Field label="Tipo de Despesa">
              <Select value={despesaForm.tipo} onChange={e => setDespesaForm({...despesaForm, tipo: e.target.value})}>
                <option value="PEDAGIO">PEDÁGIO</option>
                <option value="MANUTENCAO">MANUTENÇÃO / OFICINA</option>
                <option value="BORRACHARIA">BORRACHARIA</option>
                <option value="ALIMENTACAO">ALIMENTAÇÃO</option>
                <option value="ESTADIA">ESTADIA / PERNOITE</option>
                <option value="OUTROS">OUTROS</option>
              </Select>
            </Field>
            <Field label="Valor (R$)"><Input type="number" step="0.01" value={despesaForm.valor} onChange={e => setDespesaForm({...despesaForm, valor: e.target.value})} /></Field>
            <Field label="Data da Despesa"><Input type="date" value={despesaForm.data} onChange={e => setDespesaForm({...despesaForm, data: e.target.value})} /></Field>
            <Field label="Descrição / Detalhes" className="sm:col-span-2"><Input value={despesaForm.descricao} onChange={e => setDespesaForm({...despesaForm, descricao: e.target.value})} /></Field>
            <Buttons saving={saving} close={() => setModal('')} />
          </div>
        </Modal>
      )}

      {modal === 'motorista' && (
        <Modal title={editing ? 'Editar Motorista' : 'Novo Motorista'} onClose={() => setModal('')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome Completo"><Input value={motoristaForm.nome} onChange={e => setMotoristaForm({...motoristaForm, nome: e.target.value})} /></Field>
            <Field label="E-mail de Acesso (Login)"><Input type="email" value={motoristaForm.email} onChange={e => setMotoristaForm({...motoristaForm, email: e.target.value})} /></Field>
            <Field label="Telefone / WhatsApp"><Input value={motoristaForm.telefone} onChange={e => setMotoristaForm({...motoristaForm, telefone: e.target.value})} /></Field>
            <Field label="Veículo Fixo Vinculado">
              <Select value={motoristaForm.veiculo_id} onChange={e => setMotoristaForm({...motoristaForm, veiculo_id: e.target.value})}>
                <option value="">NENHUM VEÍCULO FIXO</option>
                {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo || '-'})</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={motoristaForm.status} onChange={e => setMotoristaForm({...motoristaForm, status: e.target.value})}>
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
                <option value="FERIAS">FÉRIAS</option>
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')} />
          </div>
        </Modal>
      )}

      {modal === 'veiculo' && (
        <Modal title={editing ? 'Editar Veículo' : 'Novo Veículo'} onClose={() => setModal('')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Placa"><Input value={veiculoForm.placa} onChange={e => setVeiculoForm({...veiculoForm, placa: e.target.value})} /></Field>
            <Field label="Marca"><Input value={veiculoForm.marca} onChange={e => setVeiculoForm({...veiculoForm, marca: e.target.value})} /></Field>
            <Field label="Modelo"><Input value={veiculoForm.modelo} onChange={e => setVeiculoForm({...veiculoForm, modelo: e.target.value})} /></Field>
            <Field label="Ano"><Input type="number" value={veiculoForm.ano} onChange={e => setVeiculoForm({...veiculoForm, ano: e.target.value})} /></Field>
            <Field label="Status Operacional">
              <Select value={veiculoForm.status} onChange={e => setVeiculoForm({...veiculoForm, status: e.target.value})}>
                <option value="DISPONIVEL">DISPONÍVEL</option>
                <option value="EM_VIAGEM">EM VIAGEM</option>
                <option value="MANUTENCAO">EM MANUTENÇÃO</option>
                <option value="INATIVO">INATIVO</option>
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')} />
          </div>
        </Modal>
      )}

      {modal === 'frete' && (
        <Modal title={editing ? 'Editar Frete' : 'Novo Frete'} onClose={() => setModal('')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Código do Frete"><Input value={freteForm.codigo_frete} onChange={e => setFreteForm({...freteForm, codigo_frete: e.target.value})} /></Field>
            <Field label="Tipo de Operação">
              <Select value={freteForm.tipo_operacao} onChange={e => setFreteForm({...freteForm, tipo_operacao: e.target.value})}>
                <option value="FRETE_PROPRIO">FRETE PRÓPRIO / DIRETO</option>
                <option value="TERCEIRIZADO">TERCEIRIZADO</option>
              </Select>
            </Field>
            <Field label="Cliente / Empresa"><Input value={freteForm.cliente} onChange={e => setFreteForm({...freteForm, cliente: e.target.value})} /></Field>
            <Field label="Origem"><Input value={freteForm.origem} onChange={e => setFreteForm({...freteForm, orige: e.target.value})} /></Field>
            <Field label="Destino"><Input value={freteForm.destino} onChange={e => setFreteForm({...freteForm, destino: e.target.value})} /></Field>
            <Field label="Produto"><Input value={freteForm.produto} onChange={e => setFreteForm({...freteForm, produto: e.target.value})} /></Field>
            <Field label="Peso Previsto (KG)"><Input type="number" value={freteForm.peso_previsto_kg} onChange={e => setFreteForm({...freteForm, peso_previsto_kg: e.target.value})} /></Field>
            <Field label="Valor por Tonelada (R$)"><Input type="number" step="0.01" value={freteForm.valor_por_tonelada} onChange={e => setFreteForm({...freteForm, valor_por_tonelada: e.target.value})} /></Field>
            <Field label="Valor Total do Frete (R$)">
              <Input 
                type="number" 
                step="0.01" 
                value={
                  freteForm.peso_previsto_kg && freteForm.valor_por_tonelada 
                    ? (Number(freteForm.peso_previsto_kg) / 1000) * Number(freteForm.valor_por_tonelada) 
                    : freteForm.valor_frete
                } 
                onChange={e => setFreteForm({...freteForm, valor_frete: e.target.value})}
              />
            </Field>
            <Field label="Status do Frete">
              <Select value={freteForm.status} onChange={e => setFreteForm({...freteForm, status: e.target.value})}>
                <option value="PLANEJADO">PLANEJADO</option>
                <option value="EM_VIAGEM">EM VIAGEM</option>
                <option value="FINALIZADO">FINALIZADO</option>
                <option value="CANCELADO">CANCELADO</option>
              </Select>
            </Field>
            <Buttons saving={saving} close={() => setModal('')} />
          </div>
        </Modal>
      )}
    </div>
  );
}