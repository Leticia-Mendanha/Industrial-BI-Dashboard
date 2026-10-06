/* ==========================================================
   Industrial BI Dashboard — Base de dados fictícia
   Gera de forma determinística (semente fixa) 90 dias de
   produção, qualidade, paradas e um cadastro de estoque.
   Também expõe funções utilitárias usadas por todas as páginas.
   ========================================================== */
(function () {
  // ---------- Gerador pseudoaleatório com semente (mulberry32) ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const r = mulberry32(2026);
  const rand = (a, b) => a + r() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pickW = (items, weights) => {
    const total = weights.reduce((s, w) => s + w, 0);
    let x = r() * total;
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  };

  // ---------- Dimensões ----------
  const SETORES = ["Estamparia", "Soldagem", "Pintura", "Montagem Final"];
  const LINHAS = [
    { id: "EST-01", setor: "Estamparia", fator: 0.97 },
    { id: "EST-02", setor: "Estamparia", fator: 0.91 },
    { id: "SOL-01", setor: "Soldagem", fator: 0.95 },
    { id: "SOL-02", setor: "Soldagem", fator: 0.89 },
    { id: "PIN-01", setor: "Pintura", fator: 0.93 },
    { id: "PIN-02", setor: "Pintura", fator: 0.87 },
    { id: "MON-01", setor: "Montagem Final", fator: 0.96 },
    { id: "MON-02", setor: "Montagem Final", fator: 0.92 },
  ];
  const TURNOS = ["1º Turno", "2º Turno", "3º Turno"];
  const FATOR_TURNO = { "1º Turno": 1.0, "2º Turno": 0.97, "3º Turno": 0.9 };
  const PRODUTOS = [
    { id: "AUR", nome: "Sedan Aurora", custo: 182, peso: 4 },
    { id: "TIT", nome: "SUV Titan", custo: 236, peso: 3 },
    { id: "VEN", nome: "Hatch Vento", custo: 148, peso: 5 },
    { id: "FOR", nome: "Picape Forte", custo: 254, peso: 2 },
  ];
  const DEFEITOS = ["Dimensional", "Solda fria", "Bolha na pintura", "Riscos/amassados", "Montagem incorreta", "Corrosão"];
  const PESO_DEFEITO = {
    Estamparia: [6, 0, 0, 5, 0, 1],
    Soldagem: [3, 7, 0, 1, 0, 2],
    Pintura: [0, 0, 8, 3, 0, 2],
    "Montagem Final": [2, 0, 0, 2, 7, 0],
  };
  const MOTIVOS = ["Falha mecânica", "Falta de material", "Setup/troca de ferramenta", "Falha elétrica", "Manutenção preventiva", "Qualidade/retrabalho", "Falta de operador"];
  const PESO_MOTIVO = [9, 6, 7, 4, 3, 3, 2];

  // ---------- Calendário: 90 dias até 30/09/2026 (sem domingos) ----------
  const FIM = new Date(Date.UTC(2026, 8, 30));
  const DATAS = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(FIM.getTime() - i * 86400000);
    if (d.getUTCDay() !== 0) DATAS.push(d.toISOString().slice(0, 10));
  }

  // ---------- Fatos: produção, defeitos e paradas ----------
  const producao = [], defeitos = [], paradas = [];
  const META_TURNO = 420; // peças por turno por linha
  DATAS.forEach((data, di) => {
    const sabado = new Date(data + "T00:00:00Z").getUTCDay() === 6;
    const tendencia = 0.96 + (di / DATAS.length) * 0.05; // melhoria gradual
    LINHAS.forEach((linha) => {
      // Paradas do dia nessa linha (reduzem produção)
      let minutosParados = 0;
      const nEventos = r() < 0.5 ? randi(1, 2) : 0;
      for (let e = 0; e < nEventos; e++) {
        const motivo = pickW(MOTIVOS, PESO_MOTIVO);
        const minutos = motivo === "Manutenção preventiva" ? randi(60, 180) : randi(8, 140);
        minutosParados += minutos;
        paradas.push({
          data, setor: linha.setor, linha: linha.id, turno: TURNOS[randi(0, 2)],
          maquina: `${linha.id}-M${randi(1, 4)}`, motivo, minutos,
        });
      }
      TURNOS.forEach((turno) => {
        if (sabado && turno === "3º Turno") return;
        const prod = pickW(PRODUTOS, PRODUTOS.map((p) => p.peso));
        const meta = sabado ? 300 : META_TURNO;
        const perda = 1 - minutosParados / (3 * 480) * 0.8;
        const produzido = Math.round(meta * linha.fator * FATOR_TURNO[turno] * tendencia * perda * rand(0.93, 1.07));
        const taxaRej = rand(0.008, 0.035) * (turno === "3º Turno" ? 1.35 : 1) * (linha.setor === "Pintura" ? 1.3 : 1);
        const rejeitado = Math.round(produzido * taxaRej);
        producao.push({
          data, setor: linha.setor, linha: linha.id, turno, produto: prod.nome,
          meta, produzido, aprovado: produzido - rejeitado, rejeitado,
          custo: Math.round(produzido * prod.custo * rand(0.97, 1.05)),
        });
        // Distribui as peças rejeitadas entre tipos de defeito
        let restante = rejeitado;
        while (restante > 0) {
          const q = Math.min(restante, randi(1, Math.max(1, Math.ceil(rejeitado / 2))));
          defeitos.push({ data, setor: linha.setor, linha: linha.id, tipo: pickW(DEFEITOS, PESO_DEFEITO[linha.setor]), qtd: q });
          restante -= q;
        }
      });
    });
  });

  // ---------- Cadastro de estoque ----------
  const CAT_ITENS = {
    "Matéria-prima": ["Bobina aço laminado 1,2mm", "Bobina aço galvanizado 0,8mm", "Chapa alumínio 2mm", "Perfil tubular 40x40", "Barra aço SAE 1045", "Granulado PP automotivo", "Vidro temperado lateral"],
    Componentes: ["Amortecedor dianteiro", "Pastilha de freio", "Disco de freio ventilado", "Radiador alumínio", "Bomba de combustível", "Coxim do motor", "Farol LED", "Retrovisor elétrico"],
    "Elétrica": ["Chicote principal", "Bateria 60Ah", "Módulo ECU", "Sensor ABS", "Alternador 120A", "Motor de partida", "Conector 12 vias"],
    Pintura: ["Primer epóxi (L)", "Tinta base prata (L)", "Tinta base preta (L)", "Verniz PU (L)", "Selante PVC (kg)", "Diluente (L)"],
    Fixadores: ["Parafuso M8x25", "Porca autotravante M8", "Rebite estrutural 6mm", "Arruela lisa M10", "Clip plástico painel", "Prisioneiro roda M12"],
    Embalagem: ["Caixa papelão reforçada", "Rack metálico retornável", "Filme stretch (rolo)", "Pallet PBR", "Separador plástico"],
  };
  const estoque = [];
  let seq = 1;
  Object.entries(CAT_ITENS).forEach(([categoria, itens]) => {
    itens.forEach((descricao) => {
      const consumoMedio = randi(15, 900);
      const minimo = Math.round(consumoMedio * randi(3, 6));
      const maximo = Math.round(minimo * rand(2.2, 3.2));
      const sorteio = r();
      let atual;
      if (sorteio < 0.18) atual = Math.round(minimo * rand(0.2, 0.95));
      else if (sorteio < 0.3) atual = Math.round(maximo * rand(1.05, 1.5));
      else atual = Math.round(rand(minimo, maximo));
      const custoUnit = categoria === "Fixadores" ? rand(0.15, 3) : categoria === "Embalagem" ? rand(4, 120) : categoria === "Pintura" ? rand(25, 140) : rand(18, 950);
      estoque.push({
        codigo: `MT-${String(seq++).padStart(4, "0")}`, descricao, categoria,
        atual, minimo, maximo, consumoMedio, custoUnit: Math.round(custoUnit * 100) / 100,
      });
    });
  });

  // ---------- Utilitários ----------
  const nf = new Intl.NumberFormat("pt-BR");
  const fmt = {
    num: (v) => nf.format(Math.round(v)),
    dec: (v, d = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }),
    pct: (v, d = 1) => (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%",
    money: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
    moneyK: (v) => v >= 1e6 ? "R$ " + fmt.dec(v / 1e6, 2) + " mi" : "R$ " + fmt.dec(v / 1e3, 1) + " mil",
    date: (s) => s.slice(8, 10) + "/" + s.slice(5, 7),
  };

  /** Filtra linhas por período (últimos N dias, com deslocamento opcional) */
  function byPeriod(rows, dias, offset = 0) {
    if (!dias || dias === "all") return rows;
    const fim = FIM.getTime() - offset * 86400000;
    const ini = fim - (dias - 1) * 86400000;
    return rows.filter((x) => { const t = Date.parse(x.data + "T00:00:00Z"); return t >= ini && t <= fim; });
  }
  /** Filtra por um objeto de critérios {setor, linha, turno, produto}; "" = todos */
  function where(rows, crit) {
    return rows.filter((x) => Object.entries(crit).every(([k, v]) => !v || x[k] === v));
  }
  /** Soma um campo agrupando por chave. Retorna [[chave, valor], ...] */
  function sumBy(rows, key, field) {
    const m = new Map();
    rows.forEach((x) => m.set(x[key], (m.get(x[key]) || 0) + (field ? x[field] : 1)));
    return [...m.entries()];
  }
  /** Agrega KPIs de produção */
  function agg(rows) {
    const s = { prod: 0, meta: 0, apr: 0, rej: 0, custo: 0, veic: 0 };
    rows.forEach((x) => {
      s.prod += x.produzido; s.meta += x.meta; s.apr += x.aprovado; s.rej += x.rejeitado; s.custo += x.custo;
      if (x.setor === "Montagem Final") s.veic += x.produzido;
    });
    s.efic = s.meta ? s.prod / s.meta : 0;
    s.qual = s.prod ? s.apr / s.prod : 0;
    s.taxaRej = s.prod ? s.rej / s.prod : 0;
    return s;
  }
  /** Exporta um array de objetos para CSV (padrão Excel pt-BR: ponto e vírgula) */
  function exportCSV(nome, rows) {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const esc = (v) => { const s = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = "\ufeff" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = nome + ".csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  /** Status e classificação ABC do estoque */
  function estoqueEnriquecido() {
    const itens = estoque.map((i) => ({
      ...i,
      status: i.atual < i.minimo ? "Abaixo do mínimo" : i.atual > i.maximo ? "Acima do máximo" : "Normal",
      valor: i.atual * i.custoUnit,
      consumoAnualValor: i.consumoMedio * 365 * i.custoUnit,
    }));
    const total = itens.reduce((s, i) => s + i.consumoAnualValor, 0);
    let acum = 0;
    [...itens].sort((a, b) => b.consumoAnualValor - a.consumoAnualValor).forEach((i) => {
      acum += i.consumoAnualValor;
      i.acumPct = acum / total;
      i.classe = i.acumPct <= 0.8 ? "A" : i.acumPct <= 0.95 ? "B" : "C";
    });
    return itens;
  }

  window.BI = {
    SETORES, LINHAS, TURNOS, PRODUTOS, DEFEITOS, MOTIVOS, DATAS,
    producao, defeitos, paradas, estoque,
    fmt, byPeriod, where, sumBy, agg, exportCSV, estoqueEnriquecido,
    ultimaData: DATAS[DATAS.length - 1],
  };
})();
