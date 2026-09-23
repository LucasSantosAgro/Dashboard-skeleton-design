import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Users, FileText, Route, Plus, Search, RefreshCw, Pencil, Trash2, X, Save, DollarSign, Package, Gauge, TrendingUp, AlertCircle, Fuel, Receipt } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { supabase } from './lib/supabaseClient';

const tabs = [
  ['dashboard','Dashboard',TrendingUp], ['viagens','Viagens',Route], ['veiculos','Veículos',Truck], ['motoristas','Motoristas',Users], ['fretes','Fretes',FileText]
];
const colors = ['#38BDF8','#22C55E','#F59E0B','#A78BFA','#EC4899','#14B8A6'];
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (v,d=0) => Number(v || 0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

const emptyV = {placa:'', tipo:'CAMINHAO', marca:'', modelo:'', ano:'', capacidade_kg:'', km_atual:'', ativo:true};
const emptyM = {nome:'', cpf:'', telefone:'', cnh:'', categoria_cnh:'', veiculo_id:'', ativo:true};
const emptyF = {codigo_frete:'', tipo_operacao:'FRETE_PROPRIO', contratante:'', contratante_cnpj:'', cliente:'', cliente_cnpj:'', origem:'', destino:'', produto:'', peso_previsto_kg:'', valor_frete:'', valor_por_tonelada:'', numero_nf:'', data_prevista:'', status:'PLANEJADO', observacao:''};
const emptyTrip = {
  codigo_viagem: '', frete_id: '', veiculo_id: '', motorista_id: '', carreta_placa: '',
  km_inicial: '', km_final: '', peso_carregado_kg: '', peso_descarga_kg: '',
  numero_nf: '', local_carregamento: '', local_descarga: '', data_saida: '', data_chegada: '',
  status: 'PLANEJADA', observacao: '',
  contratante_cnpj: '', cliente_cnpj: ''
};

function Input(p){return <input {...p} className={'w-full bg-[#1A2030] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60 '+(p.className||'')}/>}
function Select(p){return <select {...p} className={'w-full bg-[#1A2030] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/60 '+(p.className||'')}/>}
function Field({label,children,className=''}){return <div className={className}><label className="block mb-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</label>{children}</div>}
function Modal({title,onClose,children}){return <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#161B23] border border-white/10 rounded-2xl shadow-2xl"><div className="sticky top-0 z-10 flex justify-between items-center px-5 py-4 bg-[#161B23] border-b border-white/10"><h3 className="text-sm font-bold text-white">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-white"><X size={19}/></button></div><div className="p-5">{children}</div></div></div>}
function Kpi({label,value,sub,icon:Icon,tone='blue'}){const t={blue:'text-blue-400 bg-blue-950/40 border-blue-500/20',green:'text-green-400 bg-green-950/40 border-green-500/20',orange:'text-orange-400 bg-orange-950/40 border-orange-500/20',purple:'text-purple-400 bg-purple-950/40 border-purple-500/20'};return <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between"><div><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span><h2 className="text-2xl font-extrabold text-white mt-1">{value}</h2><p className="text-[10px] text-gray-500 mt-0.5">{sub}</p></div><div className={'p-3 rounded-xl border '+t[tone]}><Icon size={22}/></div></div>}
function Actions({edit,del}){return <div className="flex justify-end gap-1"><button onClick={edit} className="p-1.5 rounded bg-blue-950/40 text-blue-400"><Pencil size={13}/></button><button onClick={del} className="p-1.5 rounded bg-red-950/40 text-red-400"><Trash2 size={13}/></button></div>}
function Buttons({saving,close}){return <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-3 border-t border-white/5"><button type="button" onClick={close} className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-white/10">Cancelar</button><button disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white disabled:opacity-50"><Save size={14}/>{saving?'SALVANDO...':'SALVAR'}</button></div>}

export default function FrotaFretes({userRole='gestor', currentUserEmail=''}){
  const [tab,setTab]=useState('dashboard'),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const [veiculos,setVeiculos]=useState([]),[motoristas,setMotoristas]=useState([]),[fretes,setFretes]=useState([]),[dashboard,setDashboard]=useState([]),[kpis,setKpis]=useState(null);
  const [viagens,setViagens]=useState([]),[trip,setTrip]=useState(emptyTrip);
  const [abastecimentos,setAbastecimentos]=useState([]),[despesas,setDespesas]=useState([]);
  const [q,setQ]=useState(''),[modal,setModal]=useState(''),[editing,setEditing]=useState(null),[vf,setVf]=useState(emptyV),[mf,setMf]=useState(emptyM),[ff,setFf]=useState(emptyF);
  
  const canEdit = userRole !== 'motorista';
  
  // Identifica se o utilizador logado é motorista e qual o seu registo
  const currentMotorista = useMemo(() => {
    if (canEdit) return null;
    return motoristas.find(m => m.email === currentUserEmail) || motoristas[0] || null;
  }, [canEdit, motoristas, currentUserEmail]);

  const load = useCallback(async()=>{
    setLoading(true); setError('');
    const [v,m,f,t,d,k,abs,des] = await Promise.all([
      supabase.from('veiculos').select('*').order('placa'),
      supabase.from('motoristas').select('*').order('nome'),
      supabase.from('fretes').select('*').order('created_at',{ascending:false}),
      supabase.from('viagens').select('*, fretes(codigo_frete, tipo_operacao, origem, destino, produto, valor_frete), veiculos(placa, marca, modelo), motoristas(nome)').order('created_at',{ascending:false}),
      supabase.from('v_frota_dashboard').select('*').order('data_saida',{ascending:false}),
      supabase.from('v_frota_kpis').select('*').maybeSingle(),
      supabase.from('viagem_abastecimentos').select('*').catch(()=>({data:[]})),
      supabase.from('viagem_despesas').select('*').catch(()=>({data:[]}))
    ]);
    const err = [v.error,m.error,f.error,t.error,d.error,k.error].find(Boolean);
    if(err) setError(err.message);
    setVeiculos(v.data||[]);
    setMotoristas(m.data||[]);
    setFretes(f.data||[]);
    setViagens(t.data||[]);
    setDashboard(d.data||[]);
    setKpis(k.data||null);
    setAbastecimentos(abs.data||[]);
    setDespesas(des.data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{load()},[load]);

  const fv = useMemo(()=>veiculos.filter(x=>[x.placa,x.marca,x.modelo,x.tipo].join(' ').toLowerCase().includes(q.toLowerCase())),[veiculos,q]);
  const fm = useMemo(()=>motoristas.filter(x=>[x.nome,x.cpf,x.telefone,x.cnh].join(' ').toLowerCase().includes(q.toLowerCase())),[motoristas,q]);
  const fretesFiltrados = useMemo(()=>fretes.filter(x=>[x.codigo_frete,x.cliente,x.contratante,x.origem,x.destino,x.produto].join(' ').toLowerCase().includes(q.toLowerCase())),[fretes,q]);
  const viagensFiltradas = useMemo(()=>viagens.filter(x=>[x.codigo_viagem,x.local_carregamento,x.local_descarga,x.numero_nf].join(' ').toLowerCase().includes(q.toLowerCase())),[viagens,q]);

  const ops = useMemo(()=>{const m={};dashboard.forEach(x=>m[x.tipo_operacao]=(m[x.tipo_operacao]||0)+1);return Object.entries(m).map(([name,value])=>({name,value}))},[dashboard]);
  const chart = useMemo(()=>{const m={};dashboard.forEach(x=>{const dt=x.data_saida?new Date(x.data_saida).toLocaleDateString('pt-BR'):'Sem data';m[dt]??={date:dt,receita:0,custos:0};m[dt].receita+=Number(x.receita||0);m[dt].custos+=Number(x.custo_total||0)});return Object.values(m).slice(-12)},[dashboard]);

  function open(type, row=null){
    setEditing(row); setQ('');
    if(type==='veiculo') setVf(row?{...emptyV,...row}:{...emptyV});
    if(type==='motorista') setMf(row?{...emptyM,...row}:{...emptyM});
    if(type==='frete') setFf(row?{...emptyF,...row}:{...emptyF});
    if(type==='viagem'){
      if(row){
        setTrip({...row});
      } else {
        setTrip({
          ...emptyTrip,
          codigo_viagem: `VAG-${Date.now().toString().slice(-6)}`,
          motorista_id: currentMotorista ? currentMotorista.id : '',
          veiculo_id: currentMotorista?.veiculo_id || ''
        });
      }
    }
    setModal(type);
  }

  async function save(type){
    setSaving(true); setError('');
    let table, payload;
    
    if(type==='veiculo'){
      table='veiculos';
      payload={placa:vf.placa.trim().toUpperCase(),tipo:vf.tipo,marca:vf.marca||null,modelo:vf.modelo||null,ano:vf.ano?Number(vf.ano):null,capacidade_kg:vf.capacidade_kg?Number(vf.capacidade_kg):null,km_atual:Number(vf.km_atual||0),ativo:!!vf.ativo};
    } else if(type==='motorista'){
      table='motoristas';
      payload={nome:mf.nome.trim(),cpf:mf.cpf||null,telefone:mf.telefone||null,cnh:mf.cnh||null,categoria_cnh:mf.categoria_cnh||null,veiculo_id:mf.veiculo_id?Number(mf.veiculo_id):null,ativo:!!mf.ativo};
    } else if(type==='frete'){
      table='fretes';
      payload={
        codigo_frete: ff.codigo_frete.trim().toUpperCase() || `FRT-${Date.now().toString().slice(-6)}`,
        tipo_operacao: ff.tipo_operacao, contratante: ff.contratante||null, contratante_cnpj: ff.contratante_cnpj||null,
        cliente: ff.cliente||null, cliente_cnpj: ff.cliente_cnpj||null, origem: ff.origem.trim(), destino: ff.destino.trim(),
        produto: ff.produto||null, peso_previsto_kg: ff.peso_previsto_kg?Number(ff.peso_previsto_kg):null,
        valor_frete: Number(ff.valor_frete||0), valor_por_tonelada: ff.valor_por_tonelada?Number(ff.valor_por_tonelada):null,
        numero_nf: ff.numero_nf||null, data_prevista: ff.data_prevista||null, status: ff.status, observacao: ff.observacao||null
      };
    } else if(type==='viagem'){
      table='viagens';
      payload = {
        codigo_viagem: trip.codigo_viagem || `VAG-${Date.now().toString().slice(-6)}`,
        frete_id: trip.frete_id ? Number(trip.frete_id) : null,
        veiculo_id: Number(trip.veiculo_id),
        motorista_id: Number(trip.motorista_id),
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
    }

    const r = editing ? await supabase.from(table).update(payload).eq('id', editing.id) : await supabase.from(table).insert(payload);
    if(r.error) setError(r.error.message);
    else setModal('');
    setSaving(false);
    if(!r.error) await load();
  }

  async function del(table, id, label){
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
          <h1 className="text-xl font-extrabold text-white mt-1">Frota & Fretes</h1>
          <p className="text-xs text-gray-500 mt-1">Veículos próprios, motoristas, fretes e viagens.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(([id,label,I])=>(
            <button key={id} onClick={()=>{setTab(id);setQ('')}} className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border '+(tab===id?'bg-blue-600/10 text-blue-400 border-blue-500/30':'bg-[#161B23] text-gray-400 border-white/5')}>
              <I size={14}/>{label}
            </button>
          ))}
          <button onClick={load} className="p-2 rounded-lg bg-[#161B23] border border-white/5 text-gray-400">
            <RefreshCw size={15} className={loading?'animate-spin':''}/>
          </button>
        </div>
      </div>

      {error && <div className="flex gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 text-xs"><AlertCircle size={15}/>{error}</div>}

      {tab==='dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi label="Viagens" value={num(kpis?.total_viagens)} sub="Não canceladas" icon={Route}/>
            <Kpi label="Em andamento" value={num(kpis?.viagens_em_andamento)} sub="Na estrada / destino" icon={Truck} tone="orange"/>
            <Kpi label="Km rodados" value={num(kpis?.km_rodados)+' km'} sub="Viagens" icon={Gauge} tone="purple"/>
            <Kpi label="Toneladas" value={num(kpis?.toneladas_transportadas,1)} sub="Transportadas" icon={Package} tone="green"/>
            <Kpi label="Receita" value={money(kpis?.receita_fretes)} sub="Fretes" icon={DollarSign}/>
            <Kpi label="Resultado" value={money(kpis?.resultado)} sub="Receita - custos" icon={TrendingUp} tone="green"/>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-[#161B23] border border-white/5 rounded-xl p-4">
              <h2 className="text-sm font-bold text-white">Receita x Custos</h2>
              <div className="h-72 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
                    <XAxis dataKey="date" tick={{fill:'#9CA3AF',fontSize:10}}/>
                    <YAxis tick={{fill:'#9CA3AF',fontSize:10}}/>
                    <Tooltip formatter={v=>money(v)}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="receita" name="Receita" fill="#38BDF8"/>
                    <Bar dataKey="custos" name="Custos" fill="#F59E0B"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-[#161B23] border border-white/5 rounded-xl p-4">
              <h2 className="text-sm font-bold text-white">Tipo de operação</h2>
              <div className="h-72">
                {ops.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ops} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={85} label>
                        {ops.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}
                      </Pie>
                      <Tooltip/>
                      <Legend wrapperStyle={{fontSize:10}}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-xs text-gray-600">Nenhuma viagem cadastrada.</div>}
              </div>
            </div>
          </div>
          <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h2 className="text-sm font-bold text-white">Últimas viagens</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-500">
                  <tr>{['Viagem','Veículo','Motorista','Origem → Destino','Receita','Custo','Resultado','Status'].map(x=><th key={x} className="text-left p-3">{x}</th>)}</tr>
                </thead>
                <tbody>
                  {dashboard.slice(0,10).map(r=>(
                    <tr key={r.viagem_id} className="border-t border-white/5">
                      <td className="p-3 text-blue-300 font-bold">{r.codigo_viagem}</td>
                      <td className="p-3">{r.placa||'-'}</td>
                      <td className="p-3">{r.motorista||'-'}</td>
                      <td className="p-3">{r.origem||'-'} → {r.destino||'-'}</td>
                      <td className="p-3">{money(r.receita)}</td>
                      <td className="p-3">{money(r.custo_total)}</td>
                      <td className="p-3 font-bold">{money(r.resultado)}</td>
                      <td className="p-3">{status(r.status)}</td>
                    </tr>
                  ))}
                  {!dashboard.length && <tr><td colSpan="8" className="p-8 text-center text-gray-600">Nenhuma viagem cadastrada ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab==='viagens' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500"/>
              <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar viagens..." className="pl-9 md:w-72"/>
            </div>
            <button onClick={()=>open('viagem')} className="flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
              <Plus size={15}/>NOVA VIAGEM
            </button>
          </div>
          <Table rows={viagensFiltradas} headers={['Código','Veículo','Motorista','Carregamento → Descarga','NF','Status','']} render={v=>(
            <>
              <td className="p-3 font-bold text-blue-300">{v.codigo_viagem}</td>
              <td className="p-3">{v.veiculos?.placa || '-'}</td>
              <td className="p-3">{v.motoristas?.nome || '-'}</td>
              <td className="p-3">{v.local_carregamento || '-'} → {v.local_descarga || '-'}</td>
              <td className="p-3">{v.numero_nf || '-'}</td>
              <td className="p-3">{status(v.status)}</td>
              <td className="p-3"><Actions edit={()=>open('viagem', v)} del={()=>del('viagens', v.id, `a viagem ${v.codigo_viagem}`)}/></td>
            </>
          )} empty="Nenhuma viagem registada."/>
        </div>
      )}

      {tab!=='dashboard' && tab!=='viagens' && (
        <div className="bg-[#161B23] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500"/>
              <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar..." className="pl-9 md:w-72"/>
            </div>
            {canEdit && (
              <button onClick={()=>open(tab==='veiculos'?'veiculo':tab==='motoristas'?'motorista':'frete')} className="flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg">
                <Plus size={15}/>{tab==='veiculos'?'NOVO VEÍCULO':tab==='motoristas'?'NOVO MOTORISTA':'NOVO FRETE'}
              </button>
            )}
          </div>
          {tab==='veiculos' && <Table rows={fv} headers={['Placa','Veículo','Tipo','Capacidade','KM atual','Status','']} render={v=><><td className="p-3 font-bold text-blue-300">{v.placa}</td><td className="p-3">{v.marca} {v.modelo}</td><td className="p-3">{v.tipo}</td><td className="p-3">{v.capacidade_kg?num(v.capacidade_kg)+' kg':'-'}</td><td className="p-3">{num(v.km_atual)} km</td><td className="p-3">{v.ativo?'ATIVO':'INATIVO'}</td><td className="p-3"><Actions edit={()=>open('veiculo',v)} del={()=>del('veiculos',v.id,`o veículo ${v.placa}`)}/></td></>} empty="Nenhum veículo cadastrado."/>}
          {tab==='motoristas' && <Table rows={fm} headers={['Nome','CPF','Telefone','CNH','Categoria','Status','']} render={m=><><td className="p-3 font-bold">{m.nome}</td><td className="p-3">{m.cpf||'-'}</td><td className="p-3">{m.telefone||'-'}</td><td className="p-3">{m.cnh||'-'}</td><td className="p-3">{m.categoria_cnh||'-'}</td><td className="p-3">{m.ativo?'ATIVO':'INATIVO'}</td><td className="p-3"><Actions edit={()=>open('motorista',m)} del={()=>del('motoristas',m.id,`o motorista ${m.nome}`)}/></td></>} empty="Nenhum motorista cadastrado."/>}
          {tab==='fretes' && <Table rows={fretesFiltrados} headers={['Código','Operação','Cliente / CNPJ','Origem → Destino','Produto','Valor','Status','']} render={f=><><td className="p-3 font-bold text-blue-300">{f.codigo_frete}</td><td className="p-3">{f.tipo_operacao}</td><td className="p-3">{f.cliente||f.contratante||'-'}<br/><span className="text-[10px] text-gray-500">{f.cliente_cnpj||f.contratante_cnpj||''}</span></td><td className="p-3">{f.origem} → {f.destino}</td><td className="p-3">{f.produto||'-'}</td><td className="p-3 text-green-400">{money(f.valor_frete)}</td><td className="p-3">{status(f.status)}</td><td className="p-3"><Actions edit={()=>open('frete',f)} del={()=>del('fretes',f.id,`o frete ${f.codigo_frete}`)}/></td></>} empty="Nenhum frete cadastrado."/>}
        </div>
      )}

      {/* Modal Veículo */}
      {modal==='veiculo' && (
        <Modal title={editing?'Editar veículo':'Novo veículo'} onClose={()=>setModal('')}>
          <form onSubmit={e=>{e.preventDefault();save('veiculo')}} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Placa"><Input value={vf.placa} onChange={e=>setVf({...vf,placa:e.target.value})} required/></Field>
            <Field label="Tipo"><Select value={vf.tipo} onChange={e=>setVf({...vf,tipo:e.target.value})}><option>CAMINHAO</option><option>CAVALO</option><option>CARRETA</option><option>UTILITARIO</option><option>OUTROS</option></Select></Field>
            <Field label="Marca"><Input value={vf.marca} onChange={e=>setVf({...vf,marca:e.target.value})}/></Field>
            <Field label="Modelo"><Input value={vf.modelo} onChange={e=>setVf({...vf,modelo:e.target.value})}/></Field>
            <Field label="Ano"><Input type="number" value={vf.ano} onChange={e=>setVf({...vf,ano:e.target.value})}/></Field>
            <Field label="Capacidade (kg)"><Input type="number" value={vf.capacidade_kg} onChange={e=>setVf({...vf,capacidade_kg:e.target.value})}/></Field>
            <Field label="KM atual"><Input type="number" value={vf.km_atual} onChange={e=>setVf({...vf,km_atual:e.target.value})}/></Field>
            <Field label="Ativo"><input type="checkbox" checked={vf.ativo} onChange={e=>setVf({...vf,ativo:e.target.checked})}/></Field>
            <Buttons saving={saving} close={()=>setModal('')}/>
          </form>
        </Modal>
      )}

      {/* Modal Motorista */}
      {modal==='motorista' && (
        <Modal title={editing?'Editar motorista':'Novo motorista'} onClose={()=>setModal('')}>
          <form onSubmit={e=>{e.preventDefault();save('motorista')}} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo" className="sm:col-span-2"><Input value={mf.nome} onChange={e=>setMf({...mf,nome:e.target.value})} required/></Field>
            <Field label="CPF"><Input value={mf.cpf} onChange={e=>setMf({...mf,cpf:e.target.value})}/></Field>
            <Field label="Telefone"><Input value={mf.telefone} onChange={e=>setMf({...mf,telefone:e.target.value})}/></Field>
            <Field label="CNH"><Input value={mf.cnh} onChange={e=>setMf({...mf,cnh:e.target.value})}/></Field>
            <Field label="Categoria"><Select value={mf.categoria_cnh} onChange={e=>setMf({...mf,categoria_cnh:e.target.value})}><option value="">Selecione</option>{['A','B','C','D','E','AB','AC','AD','AE'].map(x=><option key={x}>{x}</option>)}</Select></Field>
            <Field label="Veículo Padrão / Vinculado">
              <Select value={mf.veiculo_id} onChange={e=>setMf({...mf,veiculo_id:e.target.value})}>
                <option value="">Selecione o veículo</option>
                {veiculos.map(v=><option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
              </Select>
            </Field>
            <Field label="Ativo"><input type="checkbox" checked={mf.ativo} onChange={e=>setMf({...mf,ativo:e.target.checked})}/></Field>
            <Buttons saving={saving} close={()=>setModal('')}/>
          </form>
        </Modal>
      )}

      {/* Modal Frete */}
      {modal==='frete' && (
        <Modal title={editing?'Editar frete':'Novo frete'} onClose={()=>setModal('')}>
          <form onSubmit={e=>{e.preventDefault();save('frete')}} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Código"><Input value={ff.codigo_frete} onChange={e=>setFf({...ff,codigo_frete:e.target.value})} placeholder="Gerado auto se vazio"/></Field>
            <Field label="Tipo de operação"><Select value={ff.tipo_operacao} onChange={e=>setFf({...ff,tipo_operacao:e.target.value})}>{['FRETE_PROPRIO','FRETE_TERCEIRO','TRANSFERENCIA','RETORNO','DESLOCAMENTO','OUTROS'].map(x=><option key={x}>{x}</option>)}</Select></Field>
            <Field label="Status"><Select value={ff.status} onChange={e=>setFf({...ff,status:e.target.value})}>{['PLANEJADO','AGUARDANDO_CARREGAMENTO','CARREGADO','EM_VIAGEM','NO_DESTINO','FINALIZADO','CANCELADO'].map(x=><option key={x}>{x}</option>)}</Select></Field>
            <Field label="Contratante"><Input value={ff.contratante} onChange={e=>setFf({...ff,contratante:e.target.value})}/></Field>
            <Field label="CNPJ Contratante"><Input value={ff.contratante_cnpj} onChange={e=>setFf({...ff,contratante_cnpj:e.target.value})} placeholder="00.000.000/0000-00"/></Field>
            <Field label="Cliente"><Input value={ff.cliente} onChange={e=>setFf({...ff,cliente:e.target.value})}/></Field>
            <Field label="CNPJ Cliente"><Input value={ff.cliente_cnpj} onChange={e=>setFf({...ff,cliente_cnpj:e.target.value})} placeholder="00.000.000/0000-00"/></Field>
            <Field label="Produto"><Input value={ff.produto} onChange={e=>setFf({...ff,produto:e.target.value})}/></Field>
            <Field label="Origem"><Input value={ff.origem} onChange={e=>setFf({...ff,origem:e.target.value})} required/></Field>
            <Field label="Destino"><Input value={ff.destino} onChange={e=>setFf({...ff,destino:e.target.value})} required/></Field>
            <Field label="Data prevista"><Input type="date" value={ff.data_prevista} onChange={e=>setFf({...ff,data_prevista:e.target.value})}/></Field>
            <Field label="Peso previsto (kg)"><Input type="number" value={ff.peso_previsto_kg} onChange={e=>setFf({...ff,peso_previsto_kg:e.target.value})}/></Field>
            <Field label="Valor frete (R$)"><Input type="number" step="0.01" value={ff.valor_frete} onChange={e=>setFf({...ff,valor_frete:e.target.value})}/></Field>
            <Field label="Valor/t (R$)"><Input type="number" step="0.01" value={ff.valor_por_tonelada} onChange={e=>setFf({...ff,valor_por_tonelada:e.target.value})}/></Field>
            <Field label="NF"><Input value={ff.numero_nf} onChange={e=>setFf({...ff,numero_nf:e.target.value})}/></Field>
            <Field label="Observação" className="sm:col-span-2"><Input value={ff.observacao} onChange={e=>setFf({...ff,observacao:e.target.value})}/></Field>
            <Buttons saving={saving} close={()=>setModal('')}/>
          </form>
        </Modal>
      )}

      {/* Modal Viagem (Dual-Access: Gestor completo vs Motorista travado) */}
      {modal==='viagem' && (
        <Modal title={editing?'Editar viagem':'Registar nova viagem'} onClose={()=>setModal('')}>
          <form onSubmit={e=>{e.preventDefault();save('viagem')}} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Código Viagem"><Input value={trip.codigo_viagem} onChange={e=>setTrip({...trip,codigo_viagem:e.target.value})} required/></Field>
            
            <Field label="Motorista">
              {canEdit ? (
                <Select value={trip.motorista_id} onChange={e=>setTrip({...trip,motorista_id:e.target.value})} required>
                  <option value="">Selecione o motorista</option>
                  {motoristas.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
                </Select>
              ) : (
                <Input value={currentMotorista ? currentMotorista.nome : 'Motorista'} disabled className="bg-gray-800 text-gray-400 cursor-not-allowed"/>
              )}
            </Field>

            <Field label="Veículo / Placa">
              {canEdit ? (
                <Select value={trip.veiculo_id} onChange={e=>setTrip({...trip,veiculo_id:e.target.value})} required>
                  <option value="">Selecione o veículo</option>
                  {veiculos.map(v=><option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
                </Select>
              ) : (
                <Input value={veiculos.find(v=>v.id===Number(trip.veiculo_id))?.placa || 'Veículo Vinculado'} disabled className="bg-gray-800 text-gray-400 cursor-not-allowed"/>
              )}
            </Field>

            <Field label="Frete Associado (Opcional)">
              <Select value={trip.frete_id} onChange={e=>setTrip({...trip,frete_id:e.target.value})}>
                <option value="">Nenhum / Viagem Própria</option>
                {fretes.map(f=><option key={f.id} value={f.id}>{f.codigo_frete} - {f.origem} → {f.destino}</option>)}
              </Select>
            </Field>

            <Field label="Status da Viagem">
              <Select value={trip.status} onChange={e=>setTrip({...trip,status:e.target.value})}>
                {['PLANEJADA','AGUARDANDO_CARREGAMENTO','CARREGADO','EM_VIAGEM','NO_DESTINO','FINALIZADA','CANCELADA'].map(s=><option key={s}>{s}</option>)}
              </Select>
            </Field>

            <Field label="Placa Carreta (Opcional)"><Input value={trip.carreta_placa} onChange={e=>setTrip({...trip,carreta_placa:e.target.value})}/></Field>
            <Field label="Local Carregamento"><Input value={trip.local_carregamento} onChange={e=>setTrip({...trip,local_carregamento:e.target.value})}/></Field>
            <Field label="Local Descarga"><Input value={trip.local_descarga} onChange={e=>setTrip({...trip,local_descarga:e.target.value})}/></Field>
            <Field label="Número NF"><Input value={trip.numero_nf} onChange={e=>setTrip({...trip,numero_nf:e.target.value})}/></Field>
            <Field label="KM Inicial"><Input type="number" value={trip.km_inicial} onChange={e=>setTrip({...trip,km_inicial:e.target.value})}/></Field>
            <Field label="KM Final"><Input type="number" value={trip.km_final} onChange={e=>setTrip({...trip,km_final:e.target.value})}/></Field>
            <Field label="Peso Carregado (kg)"><Input type="number" value={trip.peso_carregado_kg} onChange={e=>setTrip({...trip,peso_carregado_kg:e.target.value})}/></Field>
            <Field label="Peso Descarga (kg)"><Input type="number" value={trip.peso_descarga_kg} onChange={e=>setTrip({...trip,peso_descarga_kg:e.target.value})}/></Field>
            <Field label="Data Saída"><Input type="datetime-local" value={trip.data_saida?trip.data_saida.slice(0,16):''} onChange={e=>setTrip({...trip,data_saida:e.target.value})}/></Field>
            <Field label="Data Chegada"><Input type="datetime-local" value={trip.data_chegada?trip.data_chegada.slice(0,16):''} onChange={e=>setTrip({...trip,data_chegada:e.target.value})}/></Field>
            <Field label="Observação" className="sm:col-span-2"><Input value={trip.observacao} onChange={e=>setTrip({...trip,observacao:e.target.value})}/></Field>
            
            <Buttons saving={saving} close={()=>setModal('')}/>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Table({rows,headers,render,empty}){
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-[#1A2030] text-[10px] uppercase text-gray-500">
          <tr>{headers.map(h=><th key={h} className="text-left p-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(r=><tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">{render(r)}</tr>)}
          {!rows.length && <tr><td colSpan={headers.length} className="p-8 text-center text-gray-600">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}