const pptxgen = require("pptxgenjs");

let pres = new pptxgen();

// Define o formato de tela Widescreen 16:9
pres.layout = 'LAYOUT_16X9';

// Cores do Tema Grasel
const COR_BG = "0B0F15";
const COR_AZUL = "38BDF8";
const COR_BRANCO = "FFFFFF";
const COR_CINZA = "9CA3AF";

const slidesDados = [
    {
        titulo: "Grasel Cerealista: Gestão Logística e Operacional",
        sub: "Automação de Portaria, Balança, Contratos, Pátio e Frota com React & Supabase",
        topicos: [
            "Transformação digital completa no setor de grãos e insumos.",
            "Arquitetura web moderna, responsiva e sincronizada em tempo real."
        ]
    },
    {
        titulo: "O Problema e o Desafio",
        sub: "Gargalos tradicionais em operações de cerealistas",
        topicos: [
            "Gargalos na Portaria: Filas de caminhões e controle manual lento.",
            "Descontrole de Contratos: Dificuldade em cruzar saldos de embarque com o peso real na balança.",
            "Gestão de Frota Descentralizada: Falta de rastreabilidade de quilometragem, KM/L e despesas."
        ]
    },
    {
        titulo: "A Solução – Plataforma Grasel",
        sub: "Ecossistema integrado End-to-End",
        topicos: [
            "Módulo Público de Pré-Agendamento: Transportadoras cadastram dados e placas antecipadamente.",
            "Check-in na Portaria: Motoristas confirmam chegada via interface rápida.",
            "Controle de Pátio (Kanban): Visibilidade total das etapas operacionais.",
            "Baixa Automática de Contratos: Atualização instantânea dos saldos de grãos (Soja/Milho)."
        ]
    },
    {
        titulo: "Balança, Caixa e Financeiro",
        sub: "Automação fiscal, de pesagem e de tesouraria",
        topicos: [
            "Gestão de Pesagens: Registro de entradas/saídas e emissão instantânea de comprovantes em PDF.",
            "Controle de Caixa e Troco: Gestão rigorosa de saldos, aportes e sangrias com validação de limites.",
            "Indicadores Financeiros: Gráficos interativos por forma de pagamento (PIX vs. Dinheiro) e produtos."
        ]
    },
    {
        titulo: "Gestão Avançada de Frota e Fretes",
        sub: "Inteligência em rotas, custos e consumo",
        topicos: [
            "Controle de Viagens: Acompanhamento de rotas próprias e terceirizadas com KM inicial/final.",
            "Abastecimentos e Postos: Controle de litros, preço médio e ranking dos postos mais econômicos.",
            "Despesas Operacionais: Lançamento de pedágios, borracharia e manutenções vinculados às viagens."
        ]
    },
    {
        titulo: "Pilha Tecnológica (Tech Stack)",
        sub: "Tecnologias modernas de alto desempenho",
        topicos: [
            "Frontend: React e Tailwind CSS para interface fluida.",
            "Visualização: Recharts para gráficos analíticos dinâmicos.",
            "Backend: Supabase (PostgreSQL) com Realtime Channels para atualizações instantâneas.",
            "Exportação: jsPDF para geração automatizada de comprovantes."
        ]
    },
    {
        titulo: "Conclusão e Próximos Passos",
        sub: "Resultados e impacto operacional esperado",
        topicos: [
            "Agilidade Operacional: Redução expressiva no tempo de atendimento na portaria.",
            "Segurança de Dados: Eliminação de furos de caixa e controle estrito de contratos.",
            "Visão Gerencial: Tomada de decisão orientada por dados de lucratividade por veículo e rota."
        ]
    }
];

slidesDados.forEach(data => {
    let slide = pres.addSlide();
    slide.background = { color: COR_BG };

    // Título e Subtítulo
    slide.addText(data.titulo, { x: 1.0, y: 0.6, w: 11.3, h: 0.8, fontSize: 26, bold: true, color: COR_AZUL });
    slide.addText(data.sub, { x: 1.0, y: 1.3, w: 11.3, h: 0.5, fontSize: 14, color: COR_CINZA });

    // Tópicos
    let textoTopicos = data.topicos.map(t => ({ text: "• " + t, options: { fontSize: 15, color: COR_BRANCO, breakLine: true, pt: 12 } }));
    slide.addText(textoTopicos, { x: 1.0, y: 2.2, w: 11.3, h: 4.5 });
});

pres.writeFile({ fileName: "Apresentacao_Grasel_Cerealista.pptx" })
    .then(() => { console.log("Apresentação gerada com sucesso!"); })
    .catch(err => { console.log("Erro ao gerar:", err); });