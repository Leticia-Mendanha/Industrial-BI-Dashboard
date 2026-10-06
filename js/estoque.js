/* ==========================================================
   Estoque — KPIs, curva ABC e tabela filtrável
   ========================================================== */
(function () {
  const { fmt, PALETTE } = BI;
  const $ = (id) => document.getElementById(id);
  const itens = BI.estoqueEnriquecido();

  // ---------- KPIs ----------
  const total = itens.reduce((s, i) => s + i.atual, 0);
  const valor = itens.reduce((s, i) => s + i.valor, 0);
  const consumoAnual = itens.reduce((s, i) => s + i.consumoAnualValor, 0);
  const abaixo = itens.filter((i) => i.status === "Abaixo do mínimo").length;
  const acima = itens.filter((i) => i.status === "Acima do máximo").length;
  $("kpis").innerHTML = [
    BI.kpi({ label: "Estoque total", value: fmt.num(total), sub: "unidades" }),
    BI.kpi({ label: "Itens em estoque", value: itens.length, sub: "SKUs ativos" }),
    BI.kpi({ label: "Abaixo do mínimo", value: abaixo, tone: "bad", sub: "risco de ruptura" }),
    BI.kpi({ label: "Acima do máximo", value: acima, tone: "warn", sub: "capital parado" }),
    BI.kpi({ label: "Valor total", value: fmt.moneyK(valor), sub: "custo de aquisição" }),
    BI.kpi({ label: "Giro de estoque", value: fmt.dec(consumoAnual / valor, 1) + "x", sub: `cobertura ${Math.round(365 / (consumoAnual / valor))} dias` }),
  ].join("");

  // ---------- Curva ABC ----------
  const ord = [...itens].sort((a, b) => b.consumoAnualValor - a.consumoAnualValor);
  const cor = { A: PALETTE[0], B: PALETTE[1], C: "#475569" };
  BI.chart("c-abc", {
    type: "bar",
    data: { labels: ord.map((i) => i.codigo), datasets: [
      { label: "Consumo anual (R$)", data: ord.map((i) => i.consumoAnualValor), backgroundColor: ord.map((i) => cor[i.classe]), yAxisID: "y" },
      { label: "% acumulado", type: "line", data: ord.map((i) => +(i.acumPct * 100).toFixed(1)), borderColor: PALETTE[3], pointRadius: 0, yAxisID: "y1" },
    ] },
    options: { scales: { x: { ticks: { display: false } }, y: { ticks: { callback: (v) => fmt.moneyK(v) } }, y1: { position: "right", min: 0, max: 100, grid: { display: false } } } },
  });
  $("abc-resumo").innerHTML = ["A", "B", "C"].map((c) => {
    const g = itens.filter((i) => i.classe === c), vv = g.reduce((s, i) => s + i.consumoAnualValor, 0);
    return `<div style="padding:12px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:center"><span class="badge ${c}">Classe ${c}</span><strong>${fmt.pct(vv / consumoAnual)}</strong></div>
      <div class="bar-mini" style="margin:8px 0"><i style="width:${vv / consumoAnual * 100}%;background:${cor[c]}"></i></div>
      <small style="color:var(--muted)">${g.length} itens (${fmt.pct(g.length / itens.length, 0)}) · ${fmt.moneyK(vv)}/ano</small></div>`;
  }).join("") + `<p style="color:var(--muted);font-size:12px;margin-top:12px">A: até 80% do valor · B: 80–95% · C: restante</p>`;

  // ---------- Categoria e status ----------
  const porCat = BI.sumBy(itens, "categoria", "valor").sort((a, b) => b[1] - a[1]);
  BI.chart("c-cat", {
    type: "bar",
    data: { labels: porCat.map((d) => d[0]), datasets: [{ label: "Valor", data: porCat.map((d) => d[1]), backgroundColor: PALETTE[0], borderRadius: 5 }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: (v) => fmt.moneyK(v) } } } },
  });
  BI.chart("c-status", {
    type: "doughnut",
    data: { labels: ["Normal", "Abaixo do mínimo", "Acima do máximo"], datasets: [{ data: [itens.length - abaixo - acima, abaixo, acima], backgroundColor: ["#22c55e", "#ef4444", "#f59e0b"], borderWidth: 0 }] },
    options: { cutout: "65%", plugins: { legend: { position: "bottom" } } },
  });

  // ---------- Tabela ----------
  BI.fillSelect($("f-cat"), [...new Set(itens.map((i) => i.categoria))], "Todas");
  BI.fillSelect($("f-status"), ["Normal", "Abaixo do mínimo", "Acima do máximo"]);
  BI.fillSelect($("f-classe"), ["A", "B", "C"], "Todas");
  const badge = { Normal: "ok", "Abaixo do mínimo": "low", "Acima do máximo": "high" };
  let filtrados = itens;
  function render() {
    const q = $("f-busca").value.toLowerCase();
    filtrados = itens.filter((i) =>
      (!q || i.codigo.toLowerCase().includes(q) || i.descricao.toLowerCase().includes(q)) &&
      (!$("f-cat").value || i.categoria === $("f-cat").value) &&
      (!$("f-status").value || i.status === $("f-status").value) &&
      (!$("f-classe").value || i.classe === $("f-classe").value));
    $("t-count").textContent = `${filtrados.length} de ${itens.length} itens`;
    $("t-body").innerHTML = filtrados.map((i) => {
      const nivel = Math.min(100, (i.atual / i.maximo) * 100);
      return `<tr><td style="font-family:var(--mono)">${i.codigo}</td><td>${i.descricao}</td><td>${i.categoria}</td>
        <td class="num">${fmt.num(i.atual)}</td><td class="num">${fmt.num(i.minimo)}</td><td class="num">${fmt.num(i.maximo)}</td><td class="num">${fmt.num(i.consumoMedio)}</td>
        <td><div class="bar-mini"><i style="width:${nivel}%;background:${i.status === "Normal" ? "var(--primary)" : i.status === "Abaixo do mínimo" ? "var(--bad)" : "var(--warn)"}"></i></div></td>
        <td><span class="badge ${i.classe}">${i.classe}</span></td><td><span class="badge ${badge[i.status]}">${i.status}</span></td></tr>`;
    }).join("") || `<tr><td colspan="10">Nenhum item encontrado.</td></tr>`;
  }
  ["f-busca", "f-cat", "f-status", "f-classe"].forEach((id) => $(id).addEventListener("input", render));
  $("f-export").onclick = () => BI.exportCSV("estoque", filtrados.map((i) => ({
    codigo: i.codigo, descricao: i.descricao, categoria: i.categoria, estoque_atual: i.atual, estoque_minimo: i.minimo,
    estoque_maximo: i.maximo, consumo_medio_dia: i.consumoMedio, custo_unitario: i.custoUnit, classe_abc: i.classe, status: i.status,
  })));
  render();
})();
