/* ==========================================================
   Relatórios — resumos consolidados e exportação CSV
   ========================================================== */
(function () {
  const { fmt } = BI;
  const $ = (id) => document.getElementById(id);
  let resumo = {};

  function render() {
    const dias = +$("f-periodo").value;
    const prod = BI.byPeriod(BI.producao, dias), par = BI.byPeriod(BI.paradas, dias);
    const a = BI.agg(prod);
    const parMin = par.reduce((s, p) => s + p.minutos, 0);
    $("kpis").innerHTML = [
      BI.kpi({ label: "Registros de produção", value: fmt.num(prod.length), sub: "linha × turno × dia" }),
      BI.kpi({ label: "Peças produzidas", value: fmt.num(a.prod), sub: `eficiência ${fmt.pct(a.efic)}` }),
      BI.kpi({ label: "Eventos de parada", value: fmt.num(par.length), sub: `${fmt.dec(parMin / 60, 1)} h` }),
      BI.kpi({ label: "Custo total", value: fmt.moneyK(a.custo), sub: `${fmt.money(a.custo / a.prod)}/peça` }),
    ].join("");

    resumo.setor = BI.SETORES.map((s) => {
      const g = BI.agg(prod.filter((x) => x.setor === s)), p = par.filter((x) => x.setor === s);
      return { setor: s, meta: g.meta, produzido: g.prod, eficiencia_pct: +(g.efic * 100).toFixed(1), rejeitado: g.rej,
        taxa_rejeicao_pct: +(g.taxaRej * 100).toFixed(2), paradas: p.length, horas_paradas: +(p.reduce((t, x) => t + x.minutos, 0) / 60).toFixed(1), custo: g.custo };
    });
    resumo.produto = BI.PRODUTOS.map((pr) => {
      const g = BI.agg(prod.filter((x) => x.produto === pr.nome));
      return { produto: pr.nome, produzido: g.prod, aprovado: g.apr, qualidade_pct: +(g.qual * 100).toFixed(2), custo: g.custo };
    });
    resumo.turno = BI.TURNOS.map((t) => {
      const g = BI.agg(prod.filter((x) => x.turno === t));
      return { turno: t, produzido: g.prod, eficiencia_pct: +(g.efic * 100).toFixed(1), taxa_rejeicao_pct: +(g.taxaRej * 100).toFixed(2) };
    });

    $("t-setor").innerHTML = resumo.setor.map((r) => `<tr><td>${r.setor}</td><td class="num">${fmt.num(r.meta)}</td><td class="num">${fmt.num(r.produzido)}</td>
      <td class="num">${fmt.dec(r.eficiencia_pct)}%</td><td class="num">${fmt.num(r.rejeitado)}</td><td class="num">${fmt.dec(r.taxa_rejeicao_pct, 2)}%</td>
      <td class="num">${r.paradas}</td><td class="num">${fmt.dec(r.horas_paradas)}</td><td class="num">${fmt.money(r.custo)}</td></tr>`).join("");
    $("t-produto").innerHTML = resumo.produto.map((r) => `<tr><td>${r.produto}</td><td class="num">${fmt.num(r.produzido)}</td><td class="num">${fmt.num(r.aprovado)}</td>
      <td class="num">${fmt.dec(r.qualidade_pct, 2)}%</td><td class="num">${fmt.money(r.custo)}</td></tr>`).join("");
    $("t-turno").innerHTML = resumo.turno.map((r) => `<tr><td>${r.turno}</td><td class="num">${fmt.num(r.produzido)}</td>
      <td class="num">${fmt.dec(r.eficiencia_pct)}%</td><td class="num">${fmt.dec(r.taxa_rejeicao_pct, 2)}%</td></tr>`).join("");

    resumo.prod = prod; resumo.par = par; resumo.def = BI.byPeriod(BI.defeitos, dias);
  }

  $("f-periodo").addEventListener("change", render);
  $("exp-prod").onclick = () => BI.exportCSV("producao", resumo.prod);
  $("exp-par").onclick = () => BI.exportCSV("paradas", resumo.par);
  $("exp-def").onclick = () => BI.exportCSV("qualidade_defeitos", resumo.def);
  $("exp-est").onclick = () => BI.exportCSV("estoque", BI.estoque);
  $("exp-setor").onclick = () => BI.exportCSV("resumo_setor", resumo.setor);
  $("exp-produto").onclick = () => BI.exportCSV("resumo_produto", resumo.produto);
  $("exp-turno").onclick = () => BI.exportCSV("resumo_turno", resumo.turno);
  render();
})();
