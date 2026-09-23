import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Loader2, LogOut, Trash2, Printer, DollarSign, Package, Calendar, Activity, RefreshCw, AlertTriangle, PlusCircle, MinusCircle, History, Truck, Filter, Search, CheckSquare, BarChart3, CheckCircle2, Clock, X, Edit2, Scale } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { supabase } from '@/lib/supabaseClient';
import jsPDF from "jspdf";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import AbaLogistica from './AbaLogistica.jsx';
import CheckinPortaria from './app/(public)/checkin/page.jsx';
import AgendamentoPage from './app/(public)/agendamento/page.jsx';

const C = { bg: "#0B0F15", card: "#161B23", blue: "#38BDF8", green: "#22C55E", orange: "#F59E0B", purple: "#A78BFA", border: "rgba(255,255,255,0.07)" };
const COLORS = [C.blue, C.green, C.orange, C.purple, "#EC4899"];

const COLUNAS_PATIO = [
  { id: 'aguardando', titulo: 'Aguardando Chegada', cor: 'border-yellow-500 text-yellow-400' },
  { id: 'em_patio', titulo: 'Em Pátio / Triagem', cor: 'border-blue-500 text-blue-400' },
  { id: 'carregando', titulo: 'Carregando', cor: 'border-purple-500 text-purple-400' },
  { id: 'concluido', titulo: 'Concluído / Saída', cor: 'border-green-500 text-green-400' }
];

const faviconSvg = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 85 22 C 75.5 11.5 61 5 45 5 C 22.9 5 5 22.9 5 45 C 5 67.1 22.9 85 45 85 C 60.5 85 74.2 76.2 81 63.5 L 68 63.5 C 62.5 71 54 75.5 45 75.5 C 28.2 75.5 14.5 61.8 14.5 45 C 14.5 28.2 28.2 14.5 45 14.5 C 57.5 14.5 68.2 22 73 32 L 85 22 Z" fill="#FFFFFF"/>
  <path d="M 14.5 45 C 14.5 61.8 28.2 75.5 45 75.5 C 32 75.5 14.5 61 14.5 45 Z" fill="#38BDF8"/>
  <path d="M 45 43 L 83 43 C 94 48 95 62 82 72 C 68 81 53 62 45 43 Z" fill="#38BDF8"/>
  <path d="M 47 45 C 62 50 75 58 83 67" stroke="#0B0F15" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`)}`;

const GraselLogo = () => (
  <div className="flex items-center gap-3 py-1.5 select-none">
    <svg 
      width="42" 
      height="42" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="drop-shadow-[0_2px_8px_rgba(56,189,248,0.2)] shrink-0 transition-transform hover:scale-105 duration-300"
    >
      <path 
        d="M 85 22 C 75.5 11.5 61 5 45 5 C 22.9 5 5 22.9 5 45 C 5 67.1 22.9 85 45 85 C 60.5 85 74.2 76.2 81 63.5 L 68 63.5 C 62.5 71 54 75.5 45 75.5 C 28.2 75.5 14.5 61.8 14.5 45 C 14.5 28.2 28.2 14.5 45 14.5 C 57.5 14.5 68.2 22 73 32 L 85 22 Z" 
        fill="#FFFFFF" 
      />
      <path 
        d="M 14.5 45 C 14.5 61.8 28.2 75.5 45 75.5 C 32 75.5 14.5 61 14.5 45 Z" 
        fill="#38BDF8" 
      />
      <path 
        d="M 45 43 L 83 43 C 94 48 95 62 82 72 C 68 81 53 62 45 43 Z" 
        fill="#38BDF8" 
      />
      <path 
        d="M 47 45 C 62 50 75 58 83 67" 
        stroke="#0B0F15" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
    </svg>

    <div className="flex flex-col justify-center">
      <span 
        className="font-black text-xl text-white tracking-[0.18em] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" 
        style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        GRASEL
      </span>
      <span className="text-[8px] font-bold text-sky-400 tracking-[0.28em] leading-tight mt-1 uppercase opacity-90">
        GRÃOS E INSUMOS
      </span>
    </div>
  </div>
);

const gerarPDF = (p, operador) => {
  const doc = new jsPDF();
  const agora = new Date().toLocaleString('pt-BR');
  const info = [
    `Data/Hora Emissão: ${agora}`,
    `Op. Saída: ${operador || 'N/A'}`,
    `Comprovante: ${p.comprovante || ''}`,
    `Placa: ${p.placa || ''}`,
    `Peso Entrada: ${Number(p.peso_entrada || 0).toFixed(2)}kg`,
    `Peso Saída: ${Number(p.peso_saida || 0).toFixed(2)}kg`,
    `Peso Líquido: ${Number(p.peso_liquido || 0).toFixed(2)}kg`,
    `Qtd Sacas: ${Number(p.sacas || 0).toFixed(2)}`,
    `Valor p/ Saca: R$ ${Number(p.valor_unitario || 0).toFixed(2)}`,
    `Valor Total: R$ ${Number(p.valor_total || 0).toFixed(2)}`,
    `Pagamento: ${p.forma_pagamento || ''}`
  ];

  [10, 150].forEach(y => {
    doc.setFontSize(12);
    doc.text("COMPROVANTE GRASEL", 10, y);
    doc.setFontSize(10);
    info.forEach((txt, i) => doc.text(txt, 10, y + 8 + (i * 6)));
    const assinaturaY = y + 85;
    doc.line(10, assinaturaY, 90, assinaturaY);
    doc.line(110, assinaturaY, 190, assinaturaY);
    doc.text("Assinatura do Cliente", 10, assinaturaY + 5);
    doc.text("Assinatura do Operador", 110, assinaturaY + 5);
  });

  doc.save(`comp_${p.comprovante}.pdf`);
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="#9CA3AF" fontSize="10" fontWeight="600" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export function CadastroContratos() {
  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [numeroContrato, setNumeroContrato] = useState('');
  const [cliente, setCliente] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [produto, setProduto] = useState('Milho ensacado');
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState('');
  const [contratoEditandoId, setContratoEditandoId] = useState(null);

  const buscarContratos = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('contratos_embarque')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setContratos(data);
    setCarregando(false);
  };

  useEffect(() => {
    buscarContratos();
  }, []);

  const salvarContrato = async (e) => {
    e.preventDefault();
    if (!numeroContrato || !cliente || !quantidadeDisponivel) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    if (contratoEditandoId) {
      const { error } = await supabase
        .from('contratos_embarque')
        .update({
          numero_contrato: numeroContrato,
          cliente,
          cnpj: cnpj,
          cnpj_cliente: cnpj,
          produto,
          quantidade_disponivel: Number(quantidadeDisponivel)
        })
        .eq('id', contratoEditandoId);

      if (error) {
        alert(`Erro ao atualizar contrato: ${error.message}`);
      } else {
        alert('Contrato atualizado com sucesso!');
        cancelarEdicao();
        buscarContratos();
      }
    } else {
      const { error } = await supabase.from('contratos_embarque').insert([{
        numero_contrato: numeroContrato,
        cliente,
        cnpj: cnpj,
        cnpj_cliente: cnpj,
        produto,
        quantidade_disponivel: Number(quantidadeDisponivel),
        status: 'Ativo'
      }]);

      if (error) {
        alert(`Erro ao cadastrar contrato: ${error.message}`);
      } else {
        alert('Contrato cadastrado com sucesso!');
        cancelarEdicao();
        buscarContratos();
      }
    }
  };

  const iniciarEdicao = (c) => {
    setContratoEditandoId(c.id);
    setNumeroContrato(c.numero_contrato || '');
    setCliente(c.cliente || '');
    setCnpj(c.cnpj || c.cnpj_cliente || '');
    setProduto(c.produto || 'Milho ensacado');
    setQuantidadeDisponivel(c.quantidade_disponivel ?? '');
  };

  const cancelarEdicao = () => {
    setContratoEditandoId(null);
    setNumeroContrato('');
    setCliente('');
    setCnpj('');
    setQuantidadeDisponivel('');
    setProduto('Milho ensacado');
  };

  const finalizarContratoManual = async (id) => {
    if (window.confirm('Deseja realmente finalizar este contrato manualmente?')) {
      const { error } = await supabase
        .from('contratos_embarque')
        .update({ status: 'Finalizado' })
        .eq('id', id);

      if (error) {
        alert(`Erro ao finalizar contrato: ${error.message}`);
      } else {
        buscarContratos();
      }
    }
  };

  const excluirContrato = async (id) => {
    if (window.confirm('Deseja realmente excluir este contrato? Esta ação não pode ser desfeita.')) {
      const { error } = await supabase
        .from('contratos_embarque')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Erro ao excluir contrato: ${error.message}`);
      } else {
        alert('Contrato excluído com sucesso!');
        buscarContratos();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-md">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <Package className="text-blue-400" size={18} /> 
          {contratoEditandoId ? 'Editar Contrato de Embarque' : 'Cadastrar Novo Contrato de Embarque'}
        </h3>
        <form onSubmit={salvarContrato} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Nº Contrato</label>
            <input 
              type="text" 
              placeholder="Ex: CT-2026/001" 
              value={numeroContrato} 
              onChange={e => setNumeroContrato(e.target.value)} 
              className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Cliente</label>
            <input 
              type="text" 
              placeholder="Nome do cliente" 
              value={cliente} 
              onChange={e => setCliente(e.target.value)} 
              className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">CNPJ do Cliente</label>
            <input 
              type="text" 
              placeholder="00.000.000/0000-00" 
              value={cnpj} 
              onChange={e => setCnpj(e.target.value)} 
              className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Produto</label>
            <select 
              value={produto} 
              onChange={e => setProduto(e.target.value)} 
              className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500"
            >
              <option value="Milho ensacado">Milho ensacado</option>
              <option value="Milho granel">Milho granel</option>
              <option value="Quebradinho">Quebradinho</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Qtd Disponível (Kg)</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="Ex: 50000" 
              value={quantidadeDisponivel} 
              onChange={e => setQuantidadeDisponivel(e.target.value)} 
              className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500" 
              required 
            />
          </div>
          <div className="flex items-end gap-1">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs p-2 rounded-lg transition-colors cursor-pointer shadow-md">
              {contratoEditandoId ? 'Atualizar' : 'Salvar'}
            </button>
            {contratoEditandoId && (
              <button type="button" onClick={cancelarEdicao} className="bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs p-2 rounded-lg transition-colors cursor-pointer">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-md">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3">Lista de Contratos Cadastrados</h3>
        {carregando ? (
          <div className="text-center py-6 text-gray-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Carregando contratos...
          </div>
        ) : contratos.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs border border-dashed border-white/5 rounded-lg">
            Nenhum contrato cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-white/5 uppercase text-[9px] tracking-wider">
                  <th className="p-2.5">Contrato</th>
                  <th className="p-2.5">Cliente</th>
                  <th className="p-2.5">CNPJ</th>
                  <th className="p-2.5">Produto</th>
                  <th className="p-2.5">Disponível (Kg)</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {contratos.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 font-bold text-blue-400">{c.numero_contrato}</td>
                    <td className="p-2.5 text-gray-300">{c.cliente}</td>
                    <td className="p-2.5 text-gray-400">{c.cnpj || c.cnpj_cliente || 'N/A'}</td>
                    <td className="p-2.5 text-gray-300">{c.produto}</td>
                    <td className="p-2.5 font-semibold text-green-400">{Number(c.quantidade_disponivel || 0).toLocaleString('pt-BR')} Kg</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'Ativo' ? 'bg-blue-950/60 text-blue-300 border border-blue-500/20' : 'bg-gray-800 text-gray-400'}`}>
                        {c.status || 'Ativo'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right space-x-1.5">
                      {c.status !== 'Finalizado' && (
                        <>
                          <button 
                            onClick={() => iniciarEdicao(c)} 
                            className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer border border-blue-500/30"
                            title="Editar Contrato"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => finalizarContratoManual(c.id)} 
                            className="bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer border border-amber-500/30"
                          >
                            Finalizar
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => excluirContrato(c.id)} 
                        className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer border border-red-500/30"
                        title="Excluir Contrato"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanPatio() {
  const [ordens, setOrdens] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  
  const [filtroCnpj, setFiltroCnpj] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');

  // Novos estados para filtro de período
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const [modalAtivosAberto, setModalAtivosAberto] = useState(false);
  const [modalFinalizadosAberto, setModalFinalizadosAberto] = useState(false);
  const [contratoSelecionadoFiltro, setContratoSelecionadoFiltro] = useState(null);

  const processandoRef = useRef({});

  // Lógica para verificar se a ordem está dentro do período filtrado
  const ordemDentroDoPeriodo = useCallback((ordem) => {
    if (!filtroDataInicio && !filtroDataFim) return true;
    
    const dataRef = ordem.created_at || ordem.data_chegada_portaria;
    if (!dataRef) return true; 

    const dataOrdem = new Date(dataRef);
    if (isNaN(dataOrdem.getTime())) return true;
    
    if (filtroDataInicio) {
      const inicio = new Date(`${filtroDataInicio}T00:00:00`);
      if (dataOrdem < inicio) return false;
    }
    
    if (filtroDataFim) {
      const fim = new Date(`${filtroDataFim}T23:59:59`);
      if (dataOrdem > fim) return false;
    }
    
    return true;
  }, [filtroDataInicio, filtroDataFim]);

  // FUNÇÃO REESCRITA COM SISTEMA DE "FALLBACK" PARA PREVENIR ERROS DE BANCO
  const buscarDados = useCallback(async () => {
    // 1. Busca todos os contratos (sabemos que funciona pois aparecem no painel)
    const { data: contratosData, error: erroContratos } = await supabase
      .from('contratos_embarque')
      .select('*');

    if (erroContratos) console.error('Erro ao buscar contratos:', erroContratos);
    const contratosAtuais = contratosData || [];
    setContratos(contratosAtuais);

    // 2. Busca ordens de forma SEGURA e RESILIENTE
    let ordensDataResult = [];
    
    // Tenta primeiro com o Join nativo usando apenas '*', sem arriscar colunas que não existem
    const { data: ordensComJoin, error: erroJoin } = await supabase
      .from('ordens_carregamento')
      .select('*, contratos_embarque(*)')
      .order('created_at', { ascending: true });

    if (!erroJoin && ordensComJoin) {
      // Normaliza para garantir que contratos_embarque seja um objeto no React
      ordensDataResult = ordensComJoin.map(ordem => ({
        ...ordem,
        contratos_embarque: Array.isArray(ordem.contratos_embarque) 
          ? (ordem.contratos_embarque[0] || null) 
          : (ordem.contratos_embarque || null)
      }));
    } else {
      console.warn('Erro de relação detectado no Supabase. Acionando Fallback de Segurança...', erroJoin);
      
      // Fallback: Se o banco rejeitou o Join por falta de Foreign Key, busca plano e junta manualmente.
      const { data: ordensPlanas, error: erroPlanas } = await supabase
        .from('ordens_carregamento')
        .select('*')
        .order('created_at', { ascending: true });

      if (erroPlanas) {
        console.error('Falha crítica ao buscar ordens de carregamento:', erroPlanas);
      } else if (ordensPlanas) {
        ordensDataResult = ordensPlanas.map(ordem => ({
          ...ordem,
          contratos_embarque: ordem.contrato_id 
            ? contratosAtuais.find(c => c.id === ordem.contrato_id) || null
            : null
        }));
      }
    }

    setOrdens(ordensDataResult);
    setCarregando(false);
  }, []);

  const atualizarStatus = async (id, novoStatus) => {
    const dadosUpdate = { status: novoStatus };
    
    if (novoStatus === 'em_patio') {
      dadosUpdate.data_chegada_portaria = new Date().toISOString();
    }

    setOrdens((prev) =>
      prev.map((ordem) => (ordem.id === id ? { ...ordem, ...dadosUpdate } : ordem))
    );

    const { error } = await supabase
      .from('ordens_carregamento')
      .update(dadosUpdate)
      .eq('id', id);

    if (error) buscarDados();
  };

  // Nova função para excluir ordem de carregamento
  const excluirOrdem = async (id) => {
    if (!window.confirm('🚨 TEM CERTEZA? Esta ação excluirá permanentemente a ordem de carregamento do sistema.')) {
      return;
    }

    try {
      // Atualização otimista na UI para parecer instantâneo
      setOrdens((prev) => prev.filter(o => o.id !== id));
      
      const { error } = await supabase
        .from('ordens_carregamento')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir:', error);
        alert('Ocorreu um erro ao excluir a ordem. Ela retornará à tela.');
        buscarDados(); // reverte a UI caso dê erro no banco
      }
    } catch (err) {
      console.error(err);
      buscarDados();
    }
  };

  const atualizarConclusaoCarregamento = async (id, notaFiscal, pesoCarregado, contratoId) => {
    if (processandoRef.current[id]) return;
    processandoRef.current[id] = true;
    setProcessandoId(id);

    try {
      const { data: ordemAtual, error: erroBuscaOrdem } = await supabase
        .from('ordens_carregamento')
        .select('status, peso_carregado, contrato_id')
        .eq('id', id)
        .single();

      if (erroBuscaOrdem || !ordemAtual) {
        alert('Erro ao localizar a ordem de carregamento.');
        return;
      }

      if (ordemAtual.status === 'concluido' || (ordemAtual.peso_carregado !== null && Number(ordemAtual.peso_carregado) > 0)) {
        alert('⚠️ Ação bloqueada: Esta ordem de carregamento já foi finalizada anteriormente e o saldo do contrato já sofreu a baixa.');
        buscarDados();
        return;
      }

      const idContratoReal = contratoId || ordemAtual.contrato_id || ordens.find(o => o.id === id)?.contrato_id || ordens.find(o => o.id === id)?.contratos_embarque?.id;

      if (!idContratoReal) {
        alert('Aviso: Esta ordem de carregamento não possui nenhum contrato vinculado! O saldo não pode ser abatido.');
        return;
      }

      const pesoNumerico = Number(pesoCarregado) || 0;
      const dadosUpdateOrdem = {
        status: 'concluido',
        nota_fiscal: notaFiscal,
        peso_carregado: pesoNumerico
      };

      const { data: ordemAtualizada, error: erroOrdem } = await supabase
        .from('ordens_carregamento')
        .update(dadosUpdateOrdem)
        .eq('id', id)
        .eq('status', 'carregando')
        .select();

      if (erroOrdem || !ordemAtualizada || ordemAtualizada.length === 0) {
        alert('Erro ou conflito: Esta ordem pode já ter sido processada em outra aba ou dispositivo.');
        buscarDados();
        return;
      }

      const { data: contrato, error: erroBusca } = await supabase
        .from('contratos_embarque')
        .select('quantidade_disponivel, numero_contrato')
        .eq('id', idContratoReal)
        .single();

      if (erroBusca || !contrato) {
        console.error('Erro ao buscar contrato:', erroBusca);
        alert('Ordem finalizada, mas houve um erro ao localizar o contrato vinculado.');
        return;
      }

      const saldoAtual = Number(contrato.quantidade_disponivel) || 0;
      const novoSaldo = saldoAtual - pesoNumerico;
      const novoStatusContrato = novoSaldo <= 0 ? 'Finalizado' : 'Ativo';

      const { error: erroAtualizacaoContrato } = await supabase
        .from('contratos_embarque')
        .update({ 
          quantidade_disponivel: novoSaldo,
          status: novoStatusContrato
        })
        .eq('id', idContratoReal);

      if (erroAtualizacaoContrato) {
        console.error('Erro ao atualizar saldo do contrato:', erroAtualizacaoContrato);
        alert(`Erro ao atualizar o contrato: ${erroAtualizacaoContrato.message}`);
        return;
      }

      let mensagem = `Carregamento concluído com sucesso!\n\n` +
                     `• Contrato: ${contrato.numero_contrato}\n` +
                     `• Baixa efetuada: -${pesoNumerico.toLocaleString('pt-BR')} Kg\n` +
                     `• Saldo restante: ${novoSaldo.toLocaleString('pt-BR')} Kg`;

      if (novoSaldo <= 0) {
        mensagem += `\n\n🔒 CONTRATO FINALIZADO AUTOMATICAMENTE!`;
      } else if (novoSaldo < 100000) {
        mensagem += `\n\n⚠️ ATENÇÃO: O saldo deste contrato está abaixo de 100.000 Kg!`;
      }

      alert(mensagem);

      setOrdens((prev) =>
        prev.map((ordem) => (ordem.id === id ? { ...ordem, ...dadosUpdateOrdem } : ordem))
      );
      buscarDados();
    } finally {
      processandoRef.current[id] = false;
      setProcessandoId(null);
    }
  };

  const formatarDataHora = (dataIso) => {
    if (!dataIso) return 'N/A';
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    buscarDados();

    const canalOrdens = supabase
      .channel('mudancas-patio')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordens_carregamento' },
        () => { buscarDados(); }
      )
      .subscribe();

    const canalContratos = supabase
      .channel('mudancas-contratos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos_embarque' },
        () => { buscarDados(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalOrdens);
      supabase.removeChannel(canalContratos);
    };
  }, [buscarDados]);

  const contratosAtivos = contratos.filter(c => {
    const st = (c.status || '').toLowerCase().trim();
    return (st === 'ativo' || !st) && Number(c.quantidade_disponivel) > 0;
  });
  
  const contratosFinalizados = contratos.filter(c => {
    const st = (c.status || '').toLowerCase().trim();
    return st === 'finalizado' || Number(c.quantidade_disponivel) <= 0;
  });

  const totalVeiculosPatio = ordens.filter(o => {
    const s = (o.status || '').toLowerCase().trim();
    return s === 'em_patio' || s === 'carregando';
  }).length;

  const pesoTotalEmbarcado = ordens
    .filter(o => {
      const s = (o.status || '').toLowerCase().trim();
      return (s === 'concluido' || s === 'concluído') && o.peso_carregado && ordemDentroDoPeriodo(o);
    })
    .reduce((acc, o) => acc + Number(o.peso_carregado), 0);

  const ordensFiltradasParaGrafico = ordens.filter(ordem => {
    if (!ordemDentroDoPeriodo(ordem)) return false;

    if (contratoSelecionadoFiltro) {
      const matchContrato = 
        ordem.contratos_embarque?.id === contratoSelecionadoFiltro || 
        ordem.contrato_id === contratoSelecionadoFiltro;
      if (!matchContrato) return false;
    }

    const statusOrdem = (ordem.status || '').toLowerCase().trim();

    if (statusOrdem === 'concluido' || statusOrdem === 'concluído') {
      if (ordem.contratos_embarque) {
        const stContrato = (ordem.contratos_embarque.status || '').toLowerCase().trim();
        if (stContrato && stContrato !== 'ativo' && stContrato !== 'finalizado') {
          return false;
        }
      }

      if (filtroCnpj && !((ordem.cnpj_transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase()) || (ordem.transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase()))) {
        return false;
      }
      if (filtroContrato && !((ordem.contratos_embarque?.numero_contrato || '').toLowerCase().includes(filtroContrato.toLowerCase()))) {
        return false;
      }
      if (filtroProduto && !((ordem.contratos_embarque?.produto || '').toLowerCase().includes(filtroProduto.toLowerCase()))) {
        return false;
      }
    }
    return true;
  });

  const dadosGraficoProdutos = {};
  ordensFiltradasParaGrafico.forEach(ordem => {
    const statusOrdem = (ordem.status || '').toLowerCase().trim();
    if ((statusOrdem === 'concluido' || statusOrdem === 'concluído') && ordem.peso_carregado) {
      const produto = ordem.contratos_embarque?.produto || ordem.produto || 'Não especificado';
      const peso = Number(ordem.peso_carregado) || 0;
      dadosGraficoProdutos[produto] = (dadosGraficoProdutos[produto] || 0) + peso;
    }
  });

  const produtosArrayGrafico = Object.keys(dadosGraficoProdutos).map(prod => ({
    produto: prod,
    peso: dadosGraficoProdutos[prod]
  }));

  const maiorPesoGrafico = Math.max(...produtosArrayGrafico.map(p => p.peso), 1);

  if (carregando) {
    return (
      <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" size={20} /> Carregando pátio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* BARRA DE FILTROS GLOBAIS DE PERÍODO */}
      <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 shadow-md flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex items-center gap-2 text-gray-400 mb-1 sm:mb-2 sm:mr-4">
          <Filter size={18} className="text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Período de Embarque</span>
        </div>
        
        <div className="flex-1 max-w-[200px]">
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Data Início</label>
          <input
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            className="w-full p-2 text-xs bg-[#1A2030] border border-white/10 text-white rounded outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="flex-1 max-w-[200px]">
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Data Fim</label>
          <input
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            className="w-full p-2 text-xs bg-[#1A2030] border border-white/10 text-white rounded outline-none focus:border-blue-500"
          />
        </div>
        
        {(filtroDataInicio || filtroDataFim) && (
          <button
            onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}
            className="text-xs text-gray-400 hover:text-white pb-2 underline cursor-pointer"
          >
            Limpar Período
          </button>
        )}
      </div>

      {/* PAINEL DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setModalAtivosAberto(true)}
          className="bg-[#161B23] p-4 rounded-xl border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer shadow-md flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Contratos Ativos</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">{contratosAtivos.length}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Clique para ver e filtrar</p>
          </div>
          <div className="p-3 bg-blue-950/40 text-blue-400 border border-blue-500/20 rounded-xl">
            <Clock size={24} />
          </div>
        </div>

        <div 
          onClick={() => setModalFinalizadosAberto(true)}
          className="bg-[#161B23] p-4 rounded-xl border border-white/5 hover:border-green-500/50 transition-all cursor-pointer shadow-md flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-green-400">Contratos Finalizados</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">{contratosFinalizados.length}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Clique para ver e filtrar</p>
          </div>
          <div className="p-3 bg-green-950/40 text-green-400 border border-green-500/20 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Veículos no Pátio</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">{totalVeiculosPatio}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Triagem e Carregamento</p>
          </div>
          <div className="p-3 bg-purple-950/40 text-purple-400 border border-purple-500/20 rounded-xl">
            <Truck size={24} />
          </div>
        </div>

        <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Total Embarcado</span>
            <h2 className="text-xl font-extrabold text-white mt-1">{(pesoTotalEmbarcado / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Ton</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {filtroDataInicio || filtroDataFim ? 'No período selecionado' : 'Total acumulado'}
            </p>
          </div>
          <div className="p-3 bg-amber-950/40 text-amber-400 border border-amber-500/20 rounded-xl">
            <Scale size={24} />
          </div>
        </div>
      </div>

      {contratoSelecionadoFiltro && (
        <div className="bg-blue-950/30 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-blue-400" />
            <span>Filtrando pelo Contrato ID: <strong className="text-white">{contratoSelecionadoFiltro}</strong></span>
          </div>
          <button 
            onClick={() => setContratoSelecionadoFiltro(null)}
            className="text-gray-400 hover:text-white underline cursor-pointer"
          >
            Limpar Filtro de Contrato
          </button>
        </div>
      )}

      {/* GRÁFICO DE PRODUTOS EMBARCADOS */}
      <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={18} />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Volume Embarcado por Produto (Kg)</h3>
          </div>
          <span className="text-xs text-gray-400">Atualizado conforme filtros e contratos selecionados</span>
        </div>

        {produtosArrayGrafico.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-6 border border-dashed border-white/5 rounded-lg">
            Nenhum produto embarcado encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {produtosArrayGrafico.map((item) => {
              const porcentagem = (item.peso / maiorPesoGrafico) * 100;
              return (
                <div key={item.produto} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-white">{item.produto}</span>
                    <span className="text-green-400 font-bold">{item.peso.toLocaleString('pt-BR')} Kg</span>
                  </div>
                  <div className="w-full bg-[#1A2030] h-3 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-green-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(porcentagem, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COLUNAS KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUNAS_PATIO.map((coluna) => {
          const colIdNormalizado = coluna.id.toLowerCase().trim();

          let ordensColuna = ordens.filter((o) => {
            const oStatus = (o.status || '').toLowerCase().trim();
            return oStatus === colIdNormalizado || (colIdNormalizado === 'concluido' && oStatus === 'concluído');
          });

          if (contratoSelecionadoFiltro) {
            ordensColuna = ordensColuna.filter((o) => 
              o.contratos_embarque?.id === contratoSelecionadoFiltro || o.contrato_id === contratoSelecionadoFiltro
            );
          }

          if (coluna.id === 'concluido') {
            // Aplica filtro de data apenas na coluna de concluídos
            ordensColuna = ordensColuna.filter(o => ordemDentroDoPeriodo(o));

            ordensColuna = ordensColuna.filter(o => {
              if (o.contratos_embarque) {
                const stContrato = (o.contratos_embarque.status || '').toLowerCase().trim();
                if (stContrato && stContrato !== 'ativo' && stContrato !== 'finalizado') {
                  return false;
                }
              }
              return true;
            });

            if (filtroCnpj) {
              ordensColuna = ordensColuna.filter((o) => 
                (o.cnpj_transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase()) ||
                (o.transportadora || '').toLowerCase().includes(filtroCnpj.toLowerCase())
              );
            }
            if (filtroContrato) {
              ordensColuna = ordensColuna.filter((o) => 
                (o.contratos_embarque?.numero_contrato || '').toLowerCase().includes(filtroContrato.toLowerCase())
              );
            }
            if (filtroProduto) {
              ordensColuna = ordensColuna.filter((o) => {
                const prod = o.contratos_embarque?.produto || o.produto || '';
                return prod.toLowerCase().includes(filtroProduto.toLowerCase());
              });
            }
          }

          return (
            <div key={coluna.id} className="bg-[#161B23] rounded-xl p-4 border border-white/5 flex flex-col h-[calc(100vh-280px)] min-h-[450px]">
              <div className={`flex justify-between items-center pb-3 mb-3 border-b-2 ${coluna.cor}`}>
                <h2 className="font-bold text-xs uppercase tracking-wider">{coluna.titulo}</h2>
                <span className="bg-[#1A2030] text-gray-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/10">
                  {ordensColuna.length}
                </span>
              </div>

              {coluna.id === 'concluido' && (
                <div className="mb-3 p-2.5 bg-[#1A2030] rounded-lg border border-white/10 space-y-2">
                  <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Filtros de Concluídos</div>
                  <input
                    type="text"
                    placeholder="Filtrar por CNPJ / Transportadora"
                    value={filtroCnpj}
                    onChange={(e) => setFiltroCnpj(e.target.value)}
                    className="w-full p-1.5 text-xs bg-[#161B23] border border-white/10 text-white rounded outline-none focus:border-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por Contrato"
                    value={filtroContrato}
                    onChange={(e) => setFiltroContrato(e.target.value)}
                    className="w-full p-1.5 text-xs bg-[#161B23] border border-white/10 text-white rounded outline-none focus:border-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por Produto"
                    value={filtroProduto}
                    onChange={(e) => setFiltroProduto(e.target.value)}
                    className="w-full p-1.5 text-xs bg-[#161B23] border border-white/10 text-white rounded outline-none focus:border-green-500"
                  />
                  {(filtroCnpj || filtroContrato || filtroProduto) && (
                    <button
                      onClick={() => { setFiltroCnpj(''); setFiltroContrato(''); setFiltroProduto(''); }}
                      className="w-full text-[11px] text-gray-400 hover:text-white py-0.5 transition-colors cursor-pointer"
                    >
                      Limpar Filtros Rápidos
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {ordensColuna.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-8 border border-dashed border-white/5 rounded-lg">
                    Nenhum veículo nesta etapa
                  </div>
                ) : (
                  ordensColuna.map((ordem) => {
                    const statusAtualNormalizado = (ordem.status || '').toLowerCase().trim();

                    return (
                      <div key={ordem.id} className="bg-[#1A2030] p-4 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all shadow-md relative">
                        
                        {/* CABEÇALHO DO CARD COM BOTÃO EXCLUIR */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-xs font-bold text-blue-400">#{ordem.codigo_ordem || ordem.id.substring(0, 6)}</div>
                            <div className="text-gray-400 text-[10px]">{ordem.tipo_veiculo}</div>
                          </div>
                          
                          <button 
                            onClick={() => excluirOrdem(ordem.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer p-1 rounded hover:bg-red-500/10"
                            title="Excluir Ordem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        {ordem.contratos_embarque?.numero_contrato && (
                          <div className="mb-2 text-[11px] bg-blue-950/40 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-medium inline-block">
                            Contrato: {ordem.contratos_embarque.numero_contrato} ({ordem.contratos_embarque.status || 'Ativo'})
                          </div>
                        )}

                        {ordem.contratos_embarque?.produto && (
                          <div className="mb-2 ml-1 text-[11px] bg-purple-950/40 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-medium inline-block">
                            Produto: {ordem.contratos_embarque.produto}
                          </div>
                        )}

                        {/* EXIBIÇÃO DO CLIENTE */}
                        {(ordem.contratos_embarque?.cliente || ordem.cliente) && (
                          <div className="mb-2 text-[11px] text-gray-300">
                            Cliente: <span className="text-white font-medium">{ordem.contratos_embarque?.cliente || ordem.cliente}</span>
                          </div>
                        )}

                        <h3 className="font-bold text-white text-sm mt-1">{ordem.transportadora}</h3>
                        
                        {ordem.cnpj_transportadora && (
                          <p className="text-[11px] text-gray-400">CNPJ: {ordem.cnpj_transportadora}</p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">Mot: <span className="text-white font-medium">{ordem.nome_motorista}</span></p>

                        {ordem.data_chegada_portaria && (
                          <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-blue-400 font-medium">
                            ⏱️ Check-in: {formatarDataHora(ordem.data_chegada_portaria)}
                          </div>
                        )}

                        {ordem.peso_carregado && (
                          <div className="mt-1 text-[11px] text-green-400 font-medium">
                            ⚖️ Carregado: {Number(ordem.peso_carregado).toLocaleString('pt-BR')} Kg {ordem.nota_fiscal ? `| NF: ${ordem.nota_fiscal}` : ''}
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-gray-400 grid grid-cols-2 gap-1">
                          <div><strong>Cavalo:</strong> <span className="text-gray-200">{ordem.placa_cavalo}</span></div>
                          <div><strong>Carreta:</strong> <span className="text-gray-200">{ordem.placa_carreta || 'N/A'}</span></div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/5">
                          {statusAtualNormalizado === 'aguardando' && (
                            <button onClick={() => atualizarStatus(ordem.id, 'em_patio')} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg font-semibold transition-colors cursor-pointer">
                              Aprovar Entrada
                            </button>
                          )}
                          {statusAtualNormalizado === 'em_patio' && (
                            <button onClick={() => atualizarStatus(ordem.id, 'carregando')} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-1.5 rounded-lg font-semibold transition-colors cursor-pointer">
                              Iniciar Carregamento
                            </button>
                          )}
                          {statusAtualNormalizado === 'carregando' && (
                            <div className="mt-3 pt-2 border-t border-white/5 space-y-2">
                              <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400">Nota Fiscal</label>
                                <input
                                  type="text"
                                  placeholder="Número da NF"
                                  defaultValue={ordem.nota_fiscal || ''}
                                  id={`nf-${ordem.id}`}
                                  disabled={processandoId === ordem.id}
                                  className="w-full p-2 text-xs bg-[#161B23] border border-white/10 text-white rounded-lg outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400">Peso Carregado (KG)</label>
                                <input
                                  type="number"
                                  step="10"
                                  placeholder="Ex: 35000"
                                  defaultValue={ordem.peso_carregado || ''}
                                  id={`peso-${ordem.id}`}
                                  disabled={processandoId === ordem.id}
                                  className="w-full p-2 text-xs bg-[#161B23] border border-white/10 text-white rounded-lg outline-none focus:border-blue-500"
                                />
                              </div>
                              <button
                                disabled={processandoId === ordem.id}
                                onClick={() => {
                                  const nfInput = document.getElementById(`nf-${ordem.id}`);
                                  const pesoInput = document.getElementById(`peso-${ordem.id}`);
                                  const nf = nfInput ? nfInput.value : '';
                                  const peso = pesoInput ? parseFloat(pesoInput.value) || 0 : 0;
                                  
                                  if (!nf || peso <= 0) {
                                    alert('Preencha a Nota Fiscal e o Peso Carregado corretamente!');
                                    return;
                                  }

                                  atualizarConclusaoCarregamento(ordem.id, nf, peso, ordem.contrato_id || ordem.contratos_embarque?.id);
                                }}
                                className={`w-full text-xs font-bold py-2 rounded-lg mt-2 transition-colors shadow-md flex items-center justify-center gap-2 ${
                                  processandoId === ordem.id 
                                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer shadow-green-900/20'
                                }`}
                              >
                                {processandoId === ordem.id ? (
                                  <>
                                    <Loader2 className="animate-spin" size={14} /> Processando baixa...
                                  </>
                                ) : (
                                  'Finalizar e Baixar do Contrato'
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CONTRATOS ATIVOS */}
      {modalAtivosAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161B23] border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-base">Contratos Ativos ({contratosAtivos.length})</h3>
              <button onClick={() => setModalAtivosAberto(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {contratosAtivos.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-6">Nenhum contrato ativo no momento.</p>
              ) : (
                contratosAtivos.map(c => (
                  <div key={c.id} className="bg-[#1A2030] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-400 text-sm">Contrato: {c.numero_contrato}</span>
                        <span className="bg-blue-950/60 text-blue-300 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded font-medium">{c.produto}</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">Cliente: <strong className="text-white">{c.cliente}</strong></p>
                      {c.cnpj && <p className="text-xs text-gray-400">CNPJ: {c.cnpj}</p>}
                      <p className="text-xs text-green-400 mt-0.5">Disponível: <strong>{Number(c.quantidade_disponivel).toLocaleString('pt-BR')} Kg</strong></p>
                    </div>
                    <button
                      onClick={() => {
                        setContratoSelecionadoFiltro(c.id);
                        setModalAtivosAberto(false);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer w-full sm:w-auto text-center"
                    >
                      Filtrar por este
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTRATOS FINALIZADOS */}
      {modalFinalizadosAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161B23] border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-base">Contratos Finalizados ({contratosFinalizados.length})</h3>
              <button onClick={() => setModalFinalizadosAberto(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {contratosFinalizados.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-6">Nenhum contrato finalizado no momento.</p>
              ) : (
                contratosFinalizados.map(c => (
                  <div key={c.id} className="bg-[#1A2030] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-400 text-sm">Contrato: {c.numero_contrato}</span>
                        <span className="bg-green-950/60 text-green-300 border border-green-500/20 text-[10px] px-2 py-0.5 rounded font-medium">{c.produto}</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">Cliente: <strong className="text-white">{c.cliente}</strong></p>
                      {c.cnpj && <p className="text-xs text-gray-400">CNPJ: {c.cnpj}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">Saldo Final: <strong>{Number(c.quantidade_disponivel).toLocaleString('pt-BR')} Kg</strong></p>
                    </div>
                    <button
                      onClick={() => {
                        setContratoSelecionadoFiltro(c.id);
                        setModalFinalizadosAberto(false);
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer w-full sm:w-auto text-center"
                    >
                      Filtrar por este
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PesagemItem({ p, onFinalizar, onExcluir, saldoCaixa }) {
  const [pesoSaida, setPesoSaida] = useState('');
  const [valorSaca, setValorSaca] = useState('');
  const [formaPag, setFormaPag] = useState('PIX');
  const [dinheiroRecebido, setDinheiroRecebido] = useState('');

  const pesoEntrada = Number(p.peso_entrada || 0);
  const pesoSaidaNum = Number(pesoSaida || 0);

  // Validação: Não permitir peso de saída menor que o peso de entrada
  const handleFinalizarComConfirmacao = (e) => {
    e.preventDefault();

    if (pesoSaidaNum < pesoEntrada) {
      alert("⚠️ Erro: O peso de saída não pode ser menor que o peso de entrada!");
      return;
    }

    const confirmacao = window.confirm(
      `Confirma a finalização da pesagem para a placa ${p.placa}?\n\n` +
      `• Peso Entrada: ${pesoEntrada.toLocaleString('pt-BR')} kg\n` +
      `• Peso Saída: ${pesoSaidaNum.toLocaleString('pt-BR')} kg\n` +
      `• Peso Líquido: ${pesoLiquido.toLocaleString('pt-BR')} kg\n` +
      `• Total: R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
    );

    if (!confirmacao) return;

    onFinalizar(p, e, { pesoSaida: pesoSaidaNum, valorSaca: valorUnitarioNum, formaPag, pesoLiquido, qtdSacas, valorTotal, troco });
  };

  const pesoLiquido = Math.max(0, pesoSaidaNum - pesoEntrada);
  const qtdSacas = pesoLiquido / 60;
  const valorUnitarioNum = Number(valorSaca || 0);
  const valorTotal = qtdSacas * valorUnitarioNum;
  const dinheiroRecNum = Number(dinheiroRecebido || 0);
  const troco = formaPag === 'DINHEIRO' ? Math.max(0, dinheiroRecNum - valorTotal) : 0;

  return (
    <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-400 text-sm">Comp: {p.comprovante}</span>
            <span className="bg-blue-950/60 text-blue-300 border border-blue-500/20 text-[10px] px-2 py-0.5 rounded font-medium">{p.produto}</span>
          </div>
          <p className="text-xs text-gray-300 mt-1">Placa: <strong className="text-white uppercase">{p.placa}</strong> | Entrada: {p.data} ({pesoEntrada.toLocaleString('pt-BR')} kg)</p>
        </div>
        <button onClick={() => onExcluir(p.id)} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 cursor-pointer">
          <Trash2 size={14} /> Cancelar Pesagem
        </button>
      </div>

      <form onSubmit={handleFinalizarComConfirmacao} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Peso Saída (kg)</label>
          <input 
            type="number" 
            step="10" 
            placeholder="Ex: 35000" 
            value={pesoSaida} 
            onChange={e => setPesoSaida(e.target.value)} 
            className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500" 
            required 
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Valor por Saca (R$)</label>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Ex: 85.00" 
            value={valorSaca} 
            onChange={e => setValorSaca(e.target.value)} 
            className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500" 
            required 
          />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Forma de Pagamento</label>
          <select 
            value={formaPag} 
            onChange={e => setFormaPag(e.target.value)} 
            className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500"
          >
            <option value="PIX">PIX</option>
            <option value="DINHEIRO">DINHEIRO</option>
          </select>
        </div>

        {formaPag === 'DINHEIRO' && (
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Dinheiro Recebido (R$)</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="Ex: 1000.00" 
              value={dinheiroRecebido} 
              onChange={e => setDinheiroRecebido(e.target.value)} 
              className="w-full bg-[#1A2030] p-2 rounded-lg text-xs outline-none border border-white/10 text-white focus:border-blue-500" 
              required 
            />
          </div>
        )}

        <div className="bg-[#1A2030] p-2.5 rounded-lg border border-white/5 flex flex-col justify-center">
          <div className="text-[10px] text-gray-400">Líquido: <strong className="text-white">{pesoLiquido.toLocaleString('pt-BR')} kg</strong></div>
          <div className="text-[10px] text-gray-400">Total: <strong className="text-emerald-400">R$ {valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></div>
          {formaPag === 'DINHEIRO' && (
            <div className="text-[10px] text-gray-400">Troco: <strong className="text-amber-400">R$ {troco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></div>
          )}
        </div>

        <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
          <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-md">
            Finalizar e Emitir Comprovante
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Operador");
  const [userRole, setUserRole] = useState("gestor");
  const [aba, setAba] = useState("dashboard");
  const [pesagens, setPesagens] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [f, setF] = useState({ prod: "", pag: "", dataI: "", dataF: "", mes: "", ano: "" });
  const [activeKpi, setActiveKpi] = useState("TODOS");
  const [saldoCaixa, setSaldoCaixa] = useState(0);

  const [valorAporte, setValorAporte] = useState("");
  const [valorSangria, setValorSangria] = useState("");
  const [motivoSangria, setMotivoSangria] = useState("");

  const [fCaixaTipo, setFCaixaTipo] = useState("");
  const [fCaixaDataI, setFCaixaDataI] = useState("");
  const [fCaixaDataF, setFCaixaDataF] = useState("");
  const [fCaixaOperador, setFCaixaOperador] = useState("");
  const [fCaixaBusca, setFCaixaBusca] = useState("");

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublicCheckin = path === "/checkin" || path.endsWith("/checkin") || (typeof window !== 'undefined' && window.location.search.includes("public=checkin"));
  const isPublicAgendamento = path === "/agendamento" || path.endsWith("/agendamento") || (typeof window !== 'undefined' && window.location.search.includes("public=agendamento"));

  useEffect(() => {
    document.title = "Grasel Cerealista";

    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = faviconSvg;
  }, []);

  const load = useCallback(async (userId) => {
    setLoading(true);
    const { data: pesagensData } = await supabase.from('fat_pesagens').select('*').neq('status_pagamento', 'EXCLUÍDO');
    const { data: caixaData } = await supabase.from('controle_caixa').select('saldo_atual').eq('id', 1).maybeSingle();
    const { data: movData } = await supabase.from('movimentacoes_caixa').select('*').order('created_at', { ascending: false });
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    
    setPesagens(pesagensData || []);
    setMovimentacoes(movData || []);
    setSaldoCaixa(Number(caixaData?.saldo_atual || 0));
    
    if (profile) {
      if (profile.nome) setUserName(profile.nome);
      const roleDetectado = profile.role || profile.perfil || 'gestor';
      setUserRole(roleDetectado.toLowerCase());
      
      if (roleDetectado.toLowerCase() === 'motorista') {
        setAba('logistica');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isPublicCheckin || isPublicAgendamento) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) load(session.user.id); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { 
      setSession(session); 
      if (session) load(session.user.id); else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [load, isPublicCheckin, isPublicAgendamento]);

  const registrarMovimentacao = async (tipo, valor, motivo, novoSaldo) => {
    await supabase.from('controle_caixa').upsert({ id: 1, saldo_atual: novoSaldo });
    await supabase.from('movimentacoes_caixa').insert([{
      tipo,
      valor,
      motivo,
      operador: userName,
      saldo_resultante: novoSaldo
    }]);
    setSaldoCaixa(novoSaldo);
    if (session?.user?.id) load(session.user.id);
  };

  const handleAdicionarTroco = async (e) => {
    e.preventDefault();
    const val = Number(valorAporte);
    if (val <= 0) return alert("Informe um valor válido de troco.");
    const novoSaldo = saldoCaixa + val;
    await registrarMovimentacao('ENTRADA_TROCO', val, 'Aporte / Adição de Troco no Caixa', novoSaldo);
    setValorAporte("");
    alert("Troco adicionado com sucesso!");
  };

  const handleSangriaGasto = async (e) => {
    e.preventDefault();
    const val = Number(valorSangria);
    if (val <= 0) return alert("Informe um valor válido.");
    if (!motivoSangria.trim()) return alert("Descreva o motivo do gasto/retirada.");
    if (val > saldoCaixa) return alert("Saldo de troco insuficiente para realizar esta retirada!");

    const novoSaldo = saldoCaixa - val;
    await registrarMovimentacao('SANGRIA_GASTO', val, motivoSangria, novoSaldo);
    setValorSangria("");
    setMotivoSangria("");
    alert("Retirada registrada com sucesso!");
  };

  const excluirPesagem = async (id) => {
    if (window.confirm("Confirmar o cancelamento desta pesagem?")) {
      const { error } = await supabase.from('fat_pesagens').update({ status_pagamento: 'EXCLUÍDO' }).eq('id', id);
      if (!error && session?.user?.id) load(session.user.id);
    }
  };

  const getNextComprovante = async () => {
    const { data } = await supabase.from('fat_pesagens').select('comprovante').order('comprovante', { ascending: false }).limit(1);
    const last = data && data[0] && data[0].comprovante ? parseInt(data[0].comprovante.split('-')[1]) : 0;
    return `CP-${(last + 1).toString().padStart(6, '0')}`;
  };

  const registrarEntrada = async (e) => {
    e.preventDefault();
    const nextComp = await getNextComprovante();
    const { error } = await supabase.from('fat_pesagens').insert([{ 
        comprovante: nextComp, 
        placa: e.target.placa.value.toUpperCase(), 
        produto: e.target.prod.value, 
        peso_entrada: Number(e.target.peso.value), 
        data: new Date().toISOString().split('T')[0], 
        status_pagamento: 'ABERTO', 
        operador_entrada: userName 
    }]);
    if (error) alert(error.message); else { alert("Registrado com Sucesso: " + nextComp); e.target.reset(); if (session?.user?.id) load(session.user.id); }
  };

  const finalizarPesagem = async (p, e, calcData) => {
    e.preventDefault();
    const { pesoSaida, valorSaca, formaPag, pesoLiquido, qtdSacas, valorTotal, troco } = calcData;

    if (formaPag === "DINHEIRO") {
      if (troco > saldoCaixa) {
        alert("OPERAÇÃO CANCELADA: Saldo de troco insuficiente em caixa!");
        return;
      }
      const novoSaldo = saldoCaixa - troco;
      await registrarMovimentacao('SAIDA_TROCO', troco, `Troco referente ao comprovante ${p.comprovante}`, novoSaldo);
    }

    const payload = {
      peso_saida: Number(pesoSaida), 
      peso_liquido: pesoLiquido, 
      sacas: qtdSacas, 
      valor_unitario: Number(valorSaca), 
      valor_total: valorTotal, 
      valor_troco: troco, 
      forma_pagamento: formaPag, 
      status_pagamento: 'FECHADO', 
      operador_saida: userName 
    };

    const { error } = await supabase.from('fat_pesagens').update(payload).eq('id', p.id);

    if (!error) {
      if (session?.user?.id) load(session.user.id);
      gerarPDF({ ...p, ...payload }, userName);
    }
  };

  const filt = useMemo(() => pesagens.filter(p => 
    (f.prod === "" || p.produto === f.prod) && 
    (f.pag === "" || p.forma_pagamento === f.pag) && 
    (!f.dataI || p.data >= f.dataI) && 
    (!f.dataF || p.data <= f.dataF) && 
    (!f.mes || p.data?.slice(5, 7) === f.mes) && 
    (!f.ano || p.data?.slice(0, 4) === f.ano)
  ), [pesagens, f]);

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(m => {
      const dataMov = m.created_at ? m.created_at.split('T')[0] : '';
      const matchTipo = fCaixaTipo === "" || m.tipo === fCaixaTipo;
      const matchDataI = !fCaixaDataI || dataMov >= fCaixaDataI;
      const matchDataF = !fCaixaDataF || dataMov <= fCaixaDataF;
      const matchOperador = fCaixaOperador === "" || m.operador === fCaixaOperador;
      const matchBusca = fCaixaBusca === "" || (m.motivo || "").toLowerCase().includes(fCaixaBusca.toLowerCase());
      return matchTipo && matchDataI && matchDataF && matchOperador && matchBusca;
    });
  }, [movimentacoes, fCaixaTipo, fCaixaDataI, fCaixaDataF, fCaixaOperador, fCaixaBusca]);

  const operadoresCaixa = useMemo(() => {
    return [...new Set(movimentacoes.map(m => m.operador))].filter(Boolean);
  }, [movimentacoes]);

  const resumoCaixaFiltro = useMemo(() => {
    const totalAportes = movimentacoesFiltradas.filter(m => m.tipo === 'ENTRADA_TROCO').reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
    const totalSaidas = movimentacoesFiltradas.filter(m => m.tipo === 'SAIDA_TROCO' || m.tipo === 'SANGRIA_GASTO').reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
    return { totalAportes, totalSaidas };
  }, [movimentacoesFiltradas]);

  const dataForCharts = useMemo(() => {
    let base = filt;
    const now = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().slice(0, 7);
    const year = new Date().getFullYear().toString();
    if (activeKpi === "DIÁRIA") base = filt.filter(p => p.data === now);
    else if (activeKpi === "MENSAL") base = filt.filter(p => p.data?.startsWith(month));
    else if (activeKpi === "ANUAL") base = filt.filter(p => p.data?.startsWith(year));
    return base;
  }, [filt, activeKpi]);

  const dia = filt.filter(p => p.data === new Date().toISOString().split('T')[0]).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const mens = filt.filter(p => p.data?.slice(0, 7) === (f.ano && f.mes ? `${f.ano}-${f.mes}` : new Date().toISOString().slice(0, 7))).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const anu = filt.filter(p => p.data?.startsWith(f.ano || new Date().getFullYear().toString())).reduce((a, b) => a + (Number(b.valor_total) || 0), 0);
  const pesoTotal = filt.reduce((a, b) => a + (Number(b.peso_liquido) || 0), 0);
  const totalTroco = filt.reduce((a, b) => a + (Number(b.valor_troco) || 0), 0);

  const pesagensAbertas = useMemo(() => pesagens.filter(p => p.status_pagamento === 'ABERTO'), [pesagens]);

  if (isPublicCheckin) {
    return <CheckinPortaria />;
  }

  if (isPublicAgendamento) {
    return <AgendamentoPage />;
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0F15] text-blue-500"><Loader2 className="animate-spin" size={40}/></div>;

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-[#0B0F15]">
      <div className="w-96 p-8 bg-[#161B23] rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center">
        <GraselLogo />
        <div className="w-full mt-6">
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B0F15] text-white overflow-hidden font-sans">
      <aside className="w-56 border-r border-white/5 p-4 flex flex-col gap-3 shrink-0 bg-[#0E131B]">
        <div className="mb-2">
          <GraselLogo />
        </div>
        
        <nav className="flex flex-col gap-1">
          {userRole !== 'motorista' && (
            <>
              <button onClick={() => setAba("dashboard")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'dashboard' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>DASHBOARD</button>
              <button onClick={() => setAba("entrada")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'entrada' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>NOVA ENTRADA</button>
              <button onClick={() => setAba("saida")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'saida' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>SAÍDA DE VEÍCULOS</button>
              <button onClick={() => setAba("caixa")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'caixa' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>CONTROLE DE CAIXA</button>
            </>
          )}
          <button onClick={() => setAba("logistica")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all ${aba === 'logistica' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            {userRole === 'motorista' ? 'MEU DIÁRIO / LOGÍSTICA' : 'LOGÍSTICA / DIÁRIO'}
          </button>
          {userRole !== 'motorista' && (
            <>
              <button onClick={() => setAba("patio")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all flex items-center gap-2 ${aba === 'patio' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <CheckSquare size={14} /> CONTROLE DE PÁTIO
              </button>
              <button onClick={() => setAba("cad_contratos")} className={`text-xs text-left p-2 rounded-lg font-medium transition-all flex items-center gap-2 ${aba === 'cad_contratos' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Package size={14} /> CADASTRO DE CONTRATOS
              </button>
            </>
          )}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-[10px] text-gray-400 mb-0.5 font-semibold">{userName}</p>
            <p className="text-[9px] text-blue-400 mb-2 uppercase font-bold tracking-wider">{userRole}</p>
            <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"><LogOut size={12}/> SAIR</button>
        </div>

        {userRole !== 'motorista' && (
          <>
            <hr className="border-white/5 my-1" />
            <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase mb-1">Filtros Vendas</p>
            <div className="flex flex-col gap-1.5">
              <input type="date" className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, dataI: e.target.value})}/>
              <input type="date" className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, dataF: e.target.value})}/>
              <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, mes: e.target.value})}><option value="">Mês</option>{Array.from({length: 12}, (_, i) => <option key={i+1} value={(i+1).toString().padStart(2, '0')}>{i+1}</option>)}</select>
              <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, ano: e.target.value})}><option value="">Ano</option>{[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
              <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, prod: e.target.value})}><option value="">Produto</option> {[...new Set(pesagens.map(p => p.produto))].filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}</select>
              <select className="bg-[#161B23] p-1.5 rounded-lg text-[10px] border border-white/5 text-gray-300 outline-none focus:border-blue-500/50" onChange={e => setF({...f, pag: e.target.value})}><option value="">Pagamento</option><option value="PIX">PIX</option><option value="DINHEIRO">DINHEIRO</option></select>
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 p-6 overflow-y-auto bg-[#0B0F15]">
        {userRole === 'motorista' ? (
          <AbaLogistica session={session} userName={userName} />
        ) : (
          <>
            {aba === "dashboard" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-6 gap-3">
                  {[ 
                    {l: "DIÁRIA", v: `R$ ${dia.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: Calendar, color: "from-blue-500/10 to-transparent", text: "text-blue-400"}, 
                    {l: "PESO TOTAL", v: `${pesoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}kg`, icon: Package, color: "from-purple-500/10 to-transparent", text: "text-purple-400"}, 
                    {l: "MENSAL", v: `R$ ${mens.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: DollarSign, color: "from-emerald-500/10 to-transparent", text: "text-emerald-400"}, 
                    {l: "ANUAL", v: `R$ ${anu.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: Activity, color: "from-indigo-500/10 to-transparent", text: "text-indigo-400"}, 
                    {l: "TROCO PAGO", v: `R$ ${totalTroco.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: RefreshCw, color: "from-amber-500/10 to-transparent", text: "text-amber-400"}, 
                    {l: "TODOS", v: filt.length.toFixed(0), icon: DollarSign, color: "from-gray-500/10 to-transparent", text: "text-gray-300"} 
                  ].map((k, i) => {
                    const IconComponent = k.icon;
                    const isActive = activeKpi === k.l;
                    return (
                      <button 
                        key={i} 
                        onClick={() => setActiveKpi(k.l)} 
                        className={`relative p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 overflow-hidden bg-gradient-to-b ${k.color} ${
                          isActive 
                            ? 'bg-[#1A2030] border-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02]' 
                            : 'bg-[#161B23] border-white/5 hover:border-white/10 hover:bg-[#1A2030]/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-[9px] text-gray-400 font-bold tracking-wider uppercase">{k.l}</p>
                          <IconComponent size={14} className={k.text} />
                        </div>
                        <p className="font-extrabold text-sm tracking-tight">{k.v}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4 h-[240px]">
                  <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <p className="text-[11px] font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                      PAGAMENTOS ({activeKpi})
                    </p>
                    <div className="h-[170px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={[
                              {name: 'PIX', value: dataForCharts.filter(p=>p.forma_pagamento==='PIX').reduce((a,b)=>a+(Number(b.valor_total)||0),0)}, 
                              {name: 'DINHEIRO', value: dataForCharts.filter(p=>p.forma_pagamento==='DINHEIRO').reduce((a,b)=>a+(Number(b.valor_total)||0),0)}
                            ]} 
                            innerRadius={40} 
                            outerRadius={60} 
                            paddingAngle={4}
                            labelLine={false} 
                            label={renderCustomizedLabel} 
                            dataKey="value"
                          >
                            {COLORS.map((c, i) => <Cell key={i} fill={c} stroke="transparent" />)}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                          />
                          <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#161B23] p-4 rounded-xl border border-white/5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <p className="text-[11px] font-bold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                      PRODUTOS ({activeKpi})
                    </p>
                    <div className="h-[170px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={Object.entries(dataForCharts.reduce((acc, p) => { acc[p.produto] = (acc[p.produto] || 0) + (Number(p.valor_total) || 0); return acc; }, {})).map(([name, value]) => ({ name, value }))} 
                            innerRadius={40} 
                            outerRadius={60} 
                            paddingAngle={4}
                            labelLine={false} 
                            label={renderCustomizedLabel} 
                            dataKey="value"
                          >
                            {COLORS.map((c, i) => <Cell key={i} fill={c} stroke="transparent" />)}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                          />
                          <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161B23] rounded-xl border border-white/5 p-4 shadow-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-gray-400 border-b border-white/5 font-semibold uppercase tracking-wider text-[9px]">
                        {["Data", "Comp.", "Produto", "Peso", "Valor", "Troco", "Pag.", "Ação"].map(h => <th key={h} className="p-2.5">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[...filt].sort((a,b) => (b.comprovante || '').localeCompare(a.comprovante || '')).slice(0, 10).map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-2.5 text-gray-300">{p.data}</td>
                          <td className="p-2.5 font-medium text-gray-200">{p.comprovante}</td>
                          <td className="p-2.5 text-gray-300">{p.produto}</td>
                          <td className="p-2.5 font-medium text-gray-200">{Number(p.peso_liquido||0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}kg</td>
                          <td className="p-2.5 font-bold text-emerald-400">R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="p-2.5 font-medium text-amber-400">R$ {Number(p.valor_troco || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.forma_pagamento === 'PIX' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {p.forma_pagamento}
                            </span>
                          </td>
                          <td className="p-2.5 flex items-center gap-2">
                            <button onClick={() => gerarPDF(p, userName)} className="p-1 hover:bg-white/10 rounded cursor-pointer text-gray-300" title="Imprimir PDF"><Printer size={14}/></button>
                            <button onClick={() => excluirPesagem(p.id)} className="p-1 hover:bg-red-500/20 rounded cursor-pointer text-red-400" title="Excluir"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {aba === "entrada" && (
              <div className="max-w-xl mx-auto bg-[#161B23] p-6 rounded-xl border border-white/5 shadow-xl">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Registrar Nova Entrada (Balança)</h2>
                <form onSubmit={registrarEntrada} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase">Placa do Veículo</label>
                    <input name="placa" type="text" placeholder="EX: ABC1D23" className="w-full mt-1 bg-[#1A2030] p-2.5 rounded-lg text-sm uppercase outline-none border border-white/10 text-white focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase">Produto</label>
                    <select name="prod" className="w-full mt-1 bg-[#1A2030] p-2.5 rounded-lg text-sm outline-none border border-white/10 text-white focus:border-blue-500">
                      <option value="Milho ensacado">Milho ensacado</option>
                      <option value="Milho granel">Milho granel</option>
                      <option value="Quebradinho">Quebradinho</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase">Peso de Entrada (kg)</label>
                    <input name="peso" type="number" step="10" placeholder="Ex: 15400" className="w-full mt-1 bg-[#1A2030] p-2.5 rounded-lg text-sm outline-none border border-white/10 text-white focus:border-blue-500" required />
                  </div>
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer shadow-lg">REGISTRAR ENTRADA</button>
                </form>
              </div>
            )}

            {aba === "saida" && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Veículos em Aberto / Aguardando Saída</h2>
                {pesagensAbertas.length === 0 ? (
                  <div className="text-center text-gray-500 py-12 text-xs bg-[#161B23] rounded-xl border border-white/5">Nenhum veículo aguardando finalização.</div>
                ) : (
                  pesagensAbertas.map(p => (
                    <PesagemItem key={p.id} p={p} onFinalizar={finalizarPesagem} onExcluir={excluirPesagem} saldoCaixa={saldoCaixa} />
                  ))
                )}
              </div>
            )}

            {aba === "caixa" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-green-400">Saldo Atual em Caixa (Troco)</span>
                      <h2 className="text-3xl font-extrabold text-white mt-1">
                        R$ {saldoCaixa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </h2>
                    </div>
                    <form onSubmit={handleAdicionarTroco} className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Valor do Aporte / Troco" 
                        value={valorAporte} 
                        onChange={e => setValorAporte(e.target.value)} 
                        className="bg-[#1A2030] p-2 rounded-lg text-xs flex-1 outline-none border border-white/10 text-white focus:border-green-500" 
                      />
                      <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                        <PlusCircle size={14}/> Adicionar Troco
                      </button>
                    </form>
                  </div>

                  <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400">Retirada / Sangria de Caixa</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">Retire valores para despesas ou acertos</p>
                    </div>
                    <form onSubmit={handleSangriaGasto} className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          step="0.01" 
                          placeholder="Valor" 
                          value={valorSangria} 
                          onChange={e => setValorSangria(e.target.value)} 
                          className="bg-[#1A2030] p-2 rounded-lg text-xs w-1/3 outline-none border border-white/10 text-white focus:border-red-500" 
                        />
                        <input 
                          type="text" 
                          placeholder="Motivo da retirada (obrigatório)" 
                          value={motivoSangria} 
                          onChange={e => setMotivoSangria(e.target.value)} 
                          className="bg-[#1A2030] p-2 rounded-lg text-xs flex-1 outline-none border border-white/10 text-white focus:border-red-500" 
                        />
                      </div>
                      <button type="submit" className="w-full bg-red-900/40 hover:bg-red-800 text-red-300 hover:text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 border border-red-500/30">
                        <MinusCircle size={14}/> Realizar Retirada / Sangria
                      </button>
                    </form>
                  </div>
                </div>

                <div className="bg-[#161B23] p-5 rounded-xl border border-white/5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                      <History size={16} className="text-blue-400"/> Histórico de Movimentações de Caixa
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <select value={fCaixaTipo} onChange={e => setFCaixaTipo(e.target.value)} className="bg-[#1A2030] p-1.5 rounded border border-white/10 text-gray-300 outline-none">
                        <option value="">Todos os Tipos</option>
                        <option value="ENTRADA_TROCO">Entrada de Troco</option>
                        <option value="SAIDA_TROCO">Saída de Troco (Vendas)</option>
                        <option value="SANGRIA_GASTO">Sangria / Gasto</option>
                      </select>
                      <input type="date" value={fCaixaDataI} onChange={e => setFCaixaDataI(e.target.value)} className="bg-[#1A2030] p-1.5 rounded border border-white/10 text-gray-300 outline-none" />
                      <input type="date" value={fCaixaDataF} onChange={e => setFCaixaDataF(e.target.value)} className="bg-[#1A2030] p-1.5 rounded border border-white/10 text-gray-300 outline-none" />
                      <select value={fCaixaOperador} onChange={e => setFCaixaOperador(e.target.value)} className="bg-[#1A2030] p-1.5 rounded border border-white/10 text-gray-300 outline-none">
                        <option value="">Todos Operadores</option>
                        {operadoresCaixa.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                      <input type="text" placeholder="Buscar motivo..." value={fCaixaBusca} onChange={e => setFCaixaBusca(e.target.value)} className="bg-[#1A2030] p-1.5 rounded border border-white/10 text-gray-300 outline-none" />
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Total Aportes Filtrados: <strong className="text-green-400">R$ {resumoCaixaFiltro.totalAportes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></span>
                    <span>Total Saídas/Retiradas Filtradas: <strong className="text-red-400">R$ {resumoCaixaFiltro.totalSaidas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-white/5 uppercase text-[9px] tracking-wider">
                          {["Data/Hora", "Tipo", "Motivo", "Operador", "Valor", "Saldo Resultante"].map(h => <th key={h} className="p-2.5">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {movimentacoesFiltradas.length === 0 ? (
                          <tr><td colSpan="6" className="text-center py-6 text-gray-500">Nenhuma movimentação encontrada com os filtros atuais.</td></tr>
                        ) : (
                          movimentacoesFiltradas.map(m => (
                            <tr key={m.id} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 text-gray-300">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  m.tipo === 'ENTRADA_TROCO' ? 'bg-green-950/60 text-green-300 border border-green-500/20' :
                                  m.tipo === 'SAIDA_TROCO' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/20' :
                                  'bg-red-950/60 text-red-300 border border-red-500/20'
                                }`}>
                                  {m.tipo}
                                </span>
                              </td>
                              <td className="p-2.5 text-gray-200">{m.motivo}</td>
                              <td className="p-2.5 text-gray-300">{m.operador || 'N/A'}</td>
                              <td className={`p-2.5 font-bold ${m.tipo === 'ENTRADA_TROCO' ? 'text-green-400' : 'text-red-400'}`}>
                                {m.tipo === 'ENTRADA_TROCO' ? '+' : '-'} R$ {Number(m.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                              </td>
                              <td className="p-2.5 font-semibold text-white">R$ {Number(m.saldo_resultante || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {aba === "logistica" && (
              <AbaLogistica session={session} userName={userName} />
            )}

            {aba === "patio" && (
              <KanbanPatio />
            )}

            {aba === "cad_contratos" && (
              <CadastroContratos />
            )}
          </>
        )}
      </main>
    </div>
  );
}