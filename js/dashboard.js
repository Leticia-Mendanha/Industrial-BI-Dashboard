/* ==========================================================
   Dashboard principal — KPIs (últimos 30 dias vs 30 anteriores)
   ========================================================== */
(function () {
  const { fmt, producao, paradas, estoque, PALETTE } = BI;
  const cur = BI.byPeriod(producao, 30), prev = BI.byPeriod(producao, 30, 30);
  const a = BI.agg(cur), b = BI.agg(prev);
  const parCur = BI.byPeriod(paradas, 30), parPrev = BI.byPeriod(paradas, 30, 30);
  const estoqueUn = estoque.reduce((s, i) => s + i.atual, 0);
  const v = BI.variacao;

  // ---------- KPIs ----------
  document.getElementById("kpis").innerHTML = [
    BI.kpi({ label: "Total produzido (veículos)", value: fmt.num(a.veic), delta: v(a.veic, b.veic), sub: "vs 30d anteriores" }),
    BI.kpi({ label: "Meta de produção", value: fmt.num(a.meta), sub: `atingido ${fmt.pct(a.prod / a.meta)}` }),
    BI.kpi({ label: "Eficiência da produção", value: fmt.pct(a.efic), delta: v(a.efic, b.efic), sub: "produzido ÷ meta" }),
    BI.kpi({ label: "Taxa de qualidade", value: fmt.pct(a.qual, 2), delta: v(a.qual, b.qual), sub: "aprovadas ÷ produzidas" }),
    BI.kpi({ label: "Peças produzidas", value: fmt.num(a.prod), delta: v(a.prod, b.prod), sub: "todos os setores" }),
    BI.kpi({ label: "Estoque atual", value: fmt.num(estoqueUn), sub: `${estoque.length} materiais` }),
    BI.kpi({ label: "Custo de produção", value: fmt.moneyK(a.custo), delta: v(a.custo / a.prod, b.custo / b.prod), invert: true, sub: `${fmt.money(a.custo / a.prod)}/peça` }),
    BI.kpi({ label: "Número de paradas", value: fmt.num(parCur.length), delta: v(parCur.length, parPrev.length), invert: true, tone: "warn", sub: `${fmt.num(parCur.reduce((s, p) => s + p.minutos, 0) / 60)} h paradas` }),
  ].join("");

  // ---------- Produção por dia ----------
  const porDia = BI.sumBy(cur, "data", "produzido");
  const metaDia = BI.sumBy(cur, "data", "meta");
  BI.chart("c-dia", {
    type: "bar",
    data: { labels: porDia.map((d) => fmt.date(d[0])), datasets: [
      { label: "Produzido", data: porDia.map((d) => d[1]), backgroundColor: PALETTE[0], borderRadius: 4 },
      { label: "Meta", type: "line", data: metaDia.map((d) => d[1]), borderColor: PALETTE[3], borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 },
    ] },
  });

  // ---------- Produção por setor ----------
  const porSetor = BI.sumBy(cur, "setor", "produzido");
  BI.chart("c-setor", {
    type: "doughnut",
    data: { labels: porSetor.map((d) => d[0]), datasets: [{ data: porSetor.map((d) => d[1]), backgroundColor: PALETTE, borderWidth: 0 }] },
    options: { cutout: "68%", plugins: { legend: { position: "bottom" } } },
  });

  // ---------- Produção x meta (semanal) ----------
  const semanas = {};
  BI.byPeriod(producao, 84).forEach((x) => {
    const d = new Date(x.data + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    semanas[k] = semanas[k] || { p: 0, m: 0 }; semanas[k].p += x.produzido; semanas[k].m += x.meta;
  });
  const sk = Object.keys(semanas).sort();
  BI.chart("c-meta", {
    type: "bar",
    data: { labels: sk.map(fmt.date), datasets: [
      { label: "Produzido", data: sk.map((k) => semanas[k].p), backgroundColor: PALETTE[0], borderRadius: 4 },
      { label: "Meta", data: sk.map((k) => semanas[k].m), backgroundColor: "rgba(138,155,184,.25)", borderRadius: 4 },
    ] },
  });

  // ---------- Produção por turno ----------
  const porTurno = BI.sumBy(cur, "turno", "produzido");
  BI.chart("c-turno", {
    type: "bar",
    data: { labels: porTurno.map((d) => d[0]), datasets: [{ label: "Peças", data: porTurno.map((d) => d[1]), backgroundColor: [PALETTE[0], PALETTE[1], PALETTE[2]], borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } } },
  });

  // ---------- Motivos de parada ----------
  const motivos = BI.sumBy(parCur, "motivo", "minutos").sort((x, y) => y[1] - x[1]);
  BI.chart("c-motivos", {
    type: "doughnut",
    data: { labels: motivos.map((d) => d[0]), datasets: [{ data: motivos.map((d) => d[1]), backgroundColor: PALETTE, borderWidth: 0 }] },
    options: { cutout: "60%", plugins: { legend: { position: "right", labels: { font: { size: 10 } } } } },
  });

  // ---------- Evolução da eficiência (90 dias) ----------
  const p90 = BI.sumBy(producao, "data", "produzido"), m90 = BI.sumBy(producao, "data", "meta");
  const ef = p90.map((d, i) => d[1] / m90[i][1] * 100);
  const mm = ef.map((_, i) => { const s = ef.slice(Math.max(0, i - 6), i + 1); return s.reduce((x, y) => x + y, 0) / s.length; });
  BI.chart("c-efic", {
    type: "line",
    data: { labels: p90.map((d) => fmt.date(d[0])), datasets: [
      { label: "Eficiência diária (%)", data: ef, borderColor: "rgba(59,130,246,.45)", pointRadius: 0, borderWidth: 1 },
      { label: "Média móvel 7d (%)", data: mm, borderColor: PALETTE[1], pointRadius: 0, borderWidth: 2.5, fill: { target: "origin", above: "rgba(34,211,238,.06)" }, tension: .35 },
    ] },
    options: { scales: { y: { min: 70, max: 100 } } },
  });
})();
