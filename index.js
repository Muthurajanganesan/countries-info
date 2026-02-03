const gridEl = document.getElementById("countriesGrid");
const pageNumbersEl = document.getElementById("pageNumbers");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const resultInfoEl = document.getElementById("resultInfo");
const PAGE_SIZE = 16;
let countries = [];
let currentPage = 1;
let totalPages = 1;
function formatNumber(n) {
  return new Intl.NumberFormat().format(n ?? 0);
}
function safeText(value, fallback = "N/A") {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value) && value.length === 0) return fallback;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
function renderCountries() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = countries.slice(start, end);
  gridEl.innerHTML = pageItems.map(c => {
    const name = c?.name?.common ?? "Unknown";
    const flag = c?.flags?.png || c?.flags?.svg || "";
    const region = safeText(c?.region);
    const capital = safeText(c?.capital);
    const population = formatNumber(c?.population);
    return `
      <article class="card">
        ${flag ? `<img class="flag" src="${flag}" alt="Flag of ${name}">` : ""}
        <h3>${name}</h3>
        <div class="info">
          <span><b>Region:</b> ${region}</span>
          <span><b>Capital:</b> ${capital}</span>
          <span><b>Population:</b> ${population}</span>
        </div>
      </article>
    `;
  }).join("");
  resultInfoEl.textContent = `Showing ${start + 1}-${Math.min(end, countries.length)} of ${countries.length} countries`;
  updatePaginationUI();
}
function updatePaginationUI() {
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  const maxButtons = 7;
  const pages = [];
  if (totalPages <= maxButtons) {
    for (let p = 1; p <= totalPages; p++) pages.push(p);
  } else {
    pages.push(1);
    let left = Math.max(2, currentPage - 1);
    let right = Math.min(totalPages - 1, currentPage + 1);
    if (left > 2) pages.push("...");
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }
  pageNumbersEl.innerHTML = pages.map(p => {
    if (p === "...") return `<button class="page-number" type="button" disabled>…</button>`;
    return `<button class="page-number ${p === currentPage ? "active" : ""}" type="button" data-page="${p}">${p}</button>`;
  }).join("");
}
function goToPage(page) {
  const p = Number(page);
  if (!Number.isFinite(p)) return;
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderCountries();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
pageNumbersEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  goToPage(btn.dataset.page);
});
prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
nextBtn.addEventListener("click", () => goToPage(currentPage + 1));
async function loadCountries() {
  try {
    resultInfoEl.textContent = "Loading countries...";
    const url = "https://restcountries.com/v3.1/all?fields=name,flags,region,capital,population";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    countries = data.sort((a, b) => {
      const an = (a?.name?.common || "").toLowerCase();
      const bn = (b?.name?.common || "").toLowerCase();
      return an.localeCompare(bn);
    });
    totalPages = Math.ceil(countries.length / PAGE_SIZE);
    currentPage = 1;
    renderCountries();
  } catch (err) {
    resultInfoEl.textContent = "Failed to load data.";
    gridEl.innerHTML = `<p style="padding:12px;color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

loadCountries();
