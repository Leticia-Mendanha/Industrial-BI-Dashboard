/* ==========================================================
   Produção detalhada — todos os filtros recalculam KPIs,
   gráficos e tabela a partir dos dados brutos.
   ========================================================== */
(function () {
  const { fmt, PALETTE } = BI;
  const $ = (id) => document.getElementById(id);
  const fP = $("f-periodo"), fS = $("f-setor"), fL = $("f-linha"), fT = $("f-turno"), fPr = $("f-produto");

  BI.fillSelect(fS, BI.SETORES);
  BI.fillSelect(fT, BI.TURNOS);
  BI.fillSelect(fPr, BI.PRODUTOS.map((p) => p.nome));
  // As linhas disponíveis dependem do setor escolhido
  const atualizaLinhas = () => BI.fillSelect(fL, BI.LINHAS.filter((l) => !fS.value || l.setor === fS.value).map((l) => l.id), "Todas");
  atualizaLinhas();

  function render() {
    const dias = +fP.value;
    const crit = { setor: fS.value, linha: fL.value, turno: fT.value, produto: fPr.value };
    const rows = BI.where(BI.byPeriod(BI.producao, dias), crit);
    const prev = BI.where(BI.byPeriod(BI.producao, dias, dias), crit);
    const a = BI.agg(rows), b = BI.agg(prev);

    $("kpis").innerHTML = [
      BI.kpi({ label: "Quantidade produzida", value: fmt.num(a.prod), delta: BI.variacao(a.prod, b.prod), sub: "vs período anterior" }),
      BI.kpi({ label: "Meta", value: fmt.num(a.meta), sub: `gap ${fmt.num(a.prod - a.meta)}` }),
      BI.kpi({ label: "Eficiência", value: fmt.pct(a.efic), delta: BI.variacao(a.efic, b.efic), tone: a.efic < 0.85 ? "warn" : "" }),
      BI.kpi({ label: "Custo médio por peça", value: a.prod ? fmt.money(a.custo / a.prod) : "—", delta: BI.variacao(a.custo / a.prod, b.custo / b.prod), invert: true }),
    ].join("");

    // Histórico diário
    const dia = {};
    rows.forEach((x) => { const d = (dia[x.data] = dia[x.data] || { p: 0, m: 0, r: 0, c: 0 }); d.p += x.produzido; d.m += x.meta; d.r += x.rejeitado; d.c += x.custo; });
    const datas = Object.keys(dia).sort();
    BI.chart("c-hist", {
      type: "line",
      data: { labels: datas.map(fmt.date), datasets: [
        { label: "Produzido", data: datas.map((d) => dia[d].p), borderColor: PALETTE[0], backgroundColor: "rgba(59,130,246,.12)", fill: true, tension: .3, pointRadius: dias > 30 ? 0 : 3 },
        { label: "Meta", data: datas.map((d) => dia[d].m), borderColor: PALETTE[3], borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 },
      ] },
    });

    const bar = (id, pairs, horizontal) => BI.chart(id, {
      type: "bar",
      data: { labels: pairs.map((d) => d[0]), datasets: [{ label: "Peças", data: pairs.map((d) => d[1]), backgroundColor: PALETTE[0], borderRadius: 5 }] },
      options: { indexAxis: horizontal ? "y" : "x", plugins: { legend: { display: false } } },
    });
    bar("c-linha", BI.sumBy(rows, "linha", "produzido").sort((x, y) => x[0].localeCompare(y[0])), true);
    bar("c-produto", BI.sumBy(rows, "produto", "produzido").sort((x, y) => y[1] - x[1]));

    const tp = BI.TURNOS.map((t) => BI.agg(rows.filter((x) => x.turno === t)));
    BI.chart("c-turno", {
      type: "bar",
      data: { labels: BI.TURNOS, datasets: [
        { label: "Peças", data: tp.map((t) => t.prod), backgroundColor: PALETTE[0], borderRadius: 5, yAxisID: "y" },
        { label: "Eficiência %", type: "line", data: tp.map((t) => +(t.efic * 100).toFixed(1)), borderColor: PALETTE[1], yAxisID: "y1" },
      ] },
      options: { scales: { y1: { position: "right", grid: { display: false }, min: 70, max: 100 } } },
    });

    $("t-count").textContent = `${datas.length} dias`;
    $("t-body").innerHTML = datas.slice().reverse().map((d) => {
      const x = dia[d], e = x.m ? x.p / x.m : 0;
      return `<tr><td>${d.split("-").reverse().join("/")}</td><td class="num">${fmt.num(x.m)}</td><td class="num">${fmt.num(x.p)}</td>
        <td class="num"><span class="badge ${e >= 0.9 ? "ok" : e >= 0.8 ? "high" : "low"}">${fmt.pct(e)}</span></td>
        <td class="num">${fmt.num(x.r)}</td><td class="num">${fmt.money(x.c)}</td></tr>`;
    }).join("") || `<tr><td colspan="6">Sem dados para os filtros selecionados.</td></tr>`;
  }

  fS.addEventListener("change", () => { atualizaLinhas(); render(); });
  [fP, fL, fT, fPr].forEach((el) => el.addEventListener("change", render));
  $("f-reset").onclick = () => { fP.value = "30"; fS.value = fT.value = fPr.value = ""; atualizaLinhas(); fL.value = ""; render(); };
  render();
})();
