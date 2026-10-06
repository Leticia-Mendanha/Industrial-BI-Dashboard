/* ==========================================================
   Layout compartilhado: proteção de login, sidebar, cabeçalho,
   padrões visuais do Chart.js e helpers de interface.
   ========================================================== */
(function () {
  const user = sessionStorage.getItem("bi_user");
  if (!user) { location.replace("index.html"); return; }

  const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    dashboard: I('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    producao: I('<path d="M2 20h20M4 20V10l5 3V10l5 3V6l6 4v10"/>'),
    estoque: I('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>'),
    qualidade: I('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>'),
    paradas: I('<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>'),
    relatorios: I('<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
    sql: I('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
    sobre: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'),
  };
  const NAV = [
    ["Análise", [["dashboard", "Dashboard"], ["producao", "Produção"], ["estoque", "Estoque"], ["qualidade", "Qualidade"], ["paradas", "Paradas"]]],
    ["Dados", [["relatorios", "Relatórios"], ["sql", "Dados & SQL"], ["sobre", "Sobre o projeto"]]],
  ];
  const page = document.body.dataset.page;

  document.getElementById("sidebar").innerHTML = `
    <div class="brand"><div class="brand-mark">${ICONS.producao}</div><div><strong>Industrial BI</strong><span>Automotive Analytics</span></div></div>
    ${NAV.map(([grupo, itens]) => `<div class="nav-group"><p>${grupo}</p>${itens.map(([id, label]) =>
      `<a href="${id}.html" class="nav-link ${id === page ? "active" : ""}">${ICONS[id]}<span>${label}</span></a>`).join("")}</div>`).join("")}
    <div class="sidebar-foot"><span class="dot-live"></span> Dados atualizados em ${BI.fmt.date(BI.ultimaData)}/2026</div>`;

  document.getElementById("topbar").innerHTML = `
    <button class="menu-btn" aria-label="Abrir menu">${I('<path d="M4 6h16M4 12h16M4 18h16"/>')}</button>
    <div class="top-title"><span class="crumb">Industrial BI Dashboard</span><h1>${document.body.dataset.title || ""}</h1></div>
    <div class="top-user"><div class="avatar">${user.slice(0, 2).toUpperCase()}</div><div class="user-meta"><strong>${user}</strong><span>Analista de Dados</span></div>
    <button class="btn-ghost" id="logout">Sair</button></div>`;
  document.getElementById("logout").onclick = () => { sessionStorage.removeItem("bi_user"); location.href = "index.html"; };
  document.querySelector(".menu-btn").onclick = () => document.body.classList.toggle("nav-open");

  // ---------- Padrões do Chart.js ----------
  if (window.Chart) {
    Chart.defaults.color = "#8a9bb8";
    Chart.defaults.borderColor = "rgba(138,155,184,.12)";
    Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.tooltip.backgroundColor = "#0b1220";
    Chart.defaults.plugins.tooltip.borderColor = "#2a3a5c";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.maintainAspectRatio = false;
  }

  const charts = {};
  BI.PALETTE = ["#3b82f6", "#22d3ee", "#14b8a6", "#f59e0b", "#94a3b8", "#ef4444", "#60a5fa"];
  /** Cria (ou recria) um gráfico em um canvas */
  BI.chart = (id, cfg) => { charts[id]?.destroy(); charts[id] = new Chart(document.getElementById(id), cfg); };
  /** Gera o HTML de um card de KPI */
  BI.kpi = ({ label, value, delta, sub, invert, tone }) => {
    let d = "";
    if (delta !== undefined && isFinite(delta)) {
      const good = invert ? delta <= 0 : delta >= 0;
      d = `<span class="delta ${good ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${BI.fmt.pct(Math.abs(delta))}</span>`;
    }
    return `<div class="kpi ${tone || ""}"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><div class="kpi-foot">${d}<span>${sub || ""}</span></div></div>`;
  };
  BI.variacao = (a, b) => (b ? (a - b) / b : 0);
  /** Preenche um <select> com opções */
  BI.fillSelect = (el, values, todos = "Todos") => {
    const cur = el.value;
    el.innerHTML = `<option value="">${todos}</option>` + values.map((v) => `<option>${v}</option>`).join("");
    if (values.includes(cur)) el.value = cur;
  };
})();
