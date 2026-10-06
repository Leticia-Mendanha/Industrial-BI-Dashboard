/* ==========================================================
   Qualidade — aprovadas, rejeitadas, defeitos e tendência
   ========================================================== */
(function () {
  const { fmt, PALETTE } = BI;
  const $ = (id) => document.getElementById(id);
  BI.fillSelect($("f-setor"), BI.SETORES);

  function render() {
    const dias = +$("f-periodo").value, crit = { setor: $("f-setor").value };
    const rows = BI.where(BI.byPeriod(BI.producao, dias), crit);
    const prev = BI.where(BI.byPeriod(BI.producao, dias, dias), crit);
    const defs = BI.where(BI.byPeriod(BI.defeitos, dias), crit);
    const a = BI.agg(rows), b = BI.agg(prev);

    $("kpis").innerHTML = [
      BI.kpi({ label: "Peças produzidas", value: fmt.num(a.prod), delta: BI.variacao(a.prod, b.prod) }),
      BI.kpi({ label: "Peças aprovadas", value: fmt.num(a.apr), sub: fmt.pct(a.qual, 2) + " do total" }),
      BI.kpi({ label: "Peças rejeitadas", value: fmt.num(a.rej), delta: BI.variacao(a.rej, b.rej), invert: true, tone: "bad" }),
      BI.kpi({ label: "Taxa de rejeição", value: fmt.pct(a.taxaRej, 2), delta: BI.variacao(a.taxaRej, b.taxaRej), invert: true, sub: `${fmt.num(a.taxaRej * 1e6)} PPM` }),
    ].join("");

    const porTipo = BI.sumBy(defs, "tipo", "qtd").sort((x, y) => y[1] - x[1]);
    BI.chart("c-def", {
      type: "bar",
      data: { labels: porTipo.map((d) => d[0]), datasets: [{ label: "Peças", data: porTipo.map((d) => d[1]), backgroundColor: porTipo.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 5 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } } },
    });

    const p = BI.sumBy(rows, "data", "produzido"), r = BI.sumBy(rows, "data", "rejeitado");
    const taxa = p.map((d, i) => (r[i][1] / d[1]) * 100);
    const mm = taxa.map((_, i) => { const s = taxa.slice(Math.max(0, i - 6), i + 1); return s.reduce((x, y) => x + y, 0) / s.length; });
    BI.chart("c-taxa", {
      type: "line",
      data: { labels: p.map((d) => fmt.date(d[0])), datasets: [
        { label: "Taxa diária %", data: taxa, borderColor: "rgba(239,68,68,.45)", pointRadius: 0, borderWidth: 1 },
        { label: "Média móvel 7d %", data: mm, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,.08)", fill: true, tension: .35, pointRadius: 0, borderWidth: 2.5 },
      ] },
    });

    const taxaPor = (key, vals) => vals.map((v) => { const g = BI.agg(rows.filter((x) => x[key] === v)); return +(g.taxaRej * 100).toFixed(2); });
    const barTaxa = (id, labels, data) => BI.chart(id, {
      type: "bar",
      data: { labels, datasets: [{ label: "Taxa %", data, backgroundColor: data.map((v) => (v === Math.max(...data) ? "#ef4444" : PALETTE[0])), borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } } },
    });
    barTaxa("c-setor", BI.SETORES, taxaPor("setor", BI.SETORES));
    barTaxa("c-turno", BI.TURNOS, taxaPor("turno", BI.TURNOS));
  }
  ["f-periodo", "f-setor"].forEach((id) => $(id).addEventListener("change", render));
  render();
})();
