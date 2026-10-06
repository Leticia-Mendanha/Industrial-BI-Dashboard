/* ==========================================================
   Paradas de produção — Pareto, setores e máquinas críticas
   ========================================================== */
(function () {
  const { fmt, PALETTE } = BI;
  const $ = (id) => document.getElementById(id);
  BI.fillSelect($("f-setor"), BI.SETORES);
  const top = (pairs) => pairs.sort((a, b) => b[1] - a[1])[0] || ["—", 0];

  function render() {
    const dias = +$("f-periodo").value, crit = { setor: $("f-setor").value };
    const rows = BI.where(BI.byPeriod(BI.paradas, dias), crit);
    const prev = BI.where(BI.byPeriod(BI.paradas, dias, dias), crit);
    const min = rows.reduce((s, p) => s + p.minutos, 0), minPrev = prev.reduce((s, p) => s + p.minutos, 0);
    const motivos = BI.sumBy(rows, "motivo", "minutos").sort((a, b) => b[1] - a[1]);
    const setores = BI.sumBy(rows, "setor", "minutos");
    const maqs = BI.sumBy(rows, "maquina", "minutos");
    const tm = top([...motivos]), ts = top([...setores]), tq = top([...maqs]);

    $("kpis").innerHTML = [
      BI.kpi({ label: "Tempo total de parada", value: fmt.dec(min / 60, 1) + " h", delta: BI.variacao(min, minPrev), invert: true, tone: "warn" }),
      BI.kpi({ label: "Quantidade de paradas", value: rows.length, delta: BI.variacao(rows.length, prev.length), invert: true, sub: `MTTR ${rows.length ? Math.round(min / rows.length) : 0} min` }),
      BI.kpi({ label: "Principal motivo", value: tm[0], sub: min ? fmt.pct(tm[1] / min) + " do tempo" : "" }),
      BI.kpi({ label: "Setor mais afetado", value: ts[0], sub: fmt.dec(ts[1] / 60, 1) + " h" }),
      BI.kpi({ label: "Máquina mais afetada", value: tq[0], sub: fmt.dec(tq[1] / 60, 1) + " h" }),
    ].join("");

    // Pareto: barras ordenadas + linha de % acumulado
    let ac = 0;
    const acum = motivos.map((m) => +((ac += m[1]) / min * 100).toFixed(1));
    BI.chart("c-pareto", {
      type: "bar",
      data: { labels: motivos.map((m) => m[0]), datasets: [
        { label: "Minutos", data: motivos.map((m) => m[1]), backgroundColor: acum.map((v, i) => (i === 0 || acum[i - 1] < 80 ? PALETTE[0] : "#334766")), borderRadius: 6, yAxisID: "y" },
        { label: "% acumulado", type: "line", data: acum, borderColor: PALETTE[3], backgroundColor: PALETTE[3], yAxisID: "y1", tension: .2 },
        { label: "Linha 80%", type: "line", data: acum.map(() => 80), borderColor: "rgba(239,68,68,.6)", borderDash: [4, 4], pointRadius: 0, borderWidth: 1, yAxisID: "y1" },
      ] },
      options: { scales: { y1: { position: "right", min: 0, max: 100, grid: { display: false }, ticks: { callback: (v) => v + "%" } } } },
    });

    BI.chart("c-setor", {
      type: "bar",
      data: { labels: setores.map((d) => d[0]), datasets: [{ label: "Horas", data: setores.map((d) => +(d[1] / 60).toFixed(1)), backgroundColor: setores.map((d) => (d[0] === ts[0] ? "#f59e0b" : PALETTE[0])), borderRadius: 6 }] },
      options: { plugins: { legend: { display: false } } },
    });

    const cont = Object.fromEntries(BI.sumBy(rows, "maquina"));
    const topMaq = maqs.sort((a, b) => b[1] - a[1]).slice(0, 10);
    $("t-maq").innerHTML = topMaq.map(([m, v]) => `<tr><td style="font-family:var(--mono)">${m}</td><td>${rows.find((r) => r.maquina === m).setor}</td>
      <td class="num">${cont[m]}</td><td class="num">${fmt.num(v)}</td><td><div class="bar-mini"><i style="width:${(v / topMaq[0][1]) * 100}%;background:var(--warn)"></i></div></td></tr>`).join("")
      || `<tr><td colspan="5">Sem paradas no período.</td></tr>`;
  }
  ["f-periodo", "f-setor"].forEach((id) => $(id).addEventListener("change", render));
  render();
})();
