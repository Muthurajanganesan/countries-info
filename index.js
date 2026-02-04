const gridEl = document.getElementById("countriesGrid");
const pageNumbersEl = document.getElementById("pageNumbers");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const resultInfoEl = document.getElementById("resultInfo");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("countryModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalBody = document.getElementById("modalBody");

const PAGE_SIZE = 16;
let allCountries = [];
let filteredCountries = [];
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
  const pageItems = filteredCountries.slice(start, end);

  gridEl.innerHTML = pageItems.map(c => {
    const name = c?.name?.common ?? "Unknown";
    const flag = c?.flags?.png || c?.flags?.svg || "";
    const region = safeText(c?.region);
    const capital = safeText(c?.capital);
    const population = formatNumber(c?.population);
    const cca3 = c.cca3;

    return `
      <article class="card" onclick="openModal('${cca3}')" style="cursor: pointer;">
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

  resultInfoEl.textContent = `Showing ${filteredCountries.length > 0 ? start + 1 : 0}-${Math.min(end, filteredCountries.length)} of ${filteredCountries.length} countries`;
  updatePaginationUI();
}

function updatePaginationUI() {
  prevBtn.disabled = currentPage === 1 || filteredCountries.length === 0;
  nextBtn.disabled = currentPage === totalPages || filteredCountries.length === 0;

  if (filteredCountries.length === 0) {
    pageNumbersEl.innerHTML = "";
    return;
  }

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
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  filteredCountries = allCountries.filter(c =>
    (c.name.common || "").toLowerCase().includes(term)
  );
  currentPage = 1;
  totalPages = Math.ceil(filteredCountries.length / PAGE_SIZE);
  renderCountries();
});

window.openModal = async function (cca3) {
  const country = allCountries.find(c => c.cca3 === cca3);
  if (!country) return;
  const commonName = country.name?.common || "N/A";
  const officialName = country.name?.official || "N/A";
  const flag = country.flags?.png || "";
  const nativeNameObj = country.name?.nativeName || {};
  const firstNativeKey = Object.keys(nativeNameObj)[0];
  const nativeName = firstNativeKey ? nativeNameObj[firstNativeKey].common : "N/A";

  const currencyObj = country.currencies || {};
  const firstCurrKey = Object.keys(currencyObj)[0];
  const currencySymbol = firstCurrKey ? currencyObj[firstCurrKey].symbol : "N/A";

  const longitude = country.latlng ? country.latlng[1] : "N/A";
  const latitude = country.latlng ? country.latlng[0] : null;

  let borders = country.borders || [];
  if (borders.length > 2) borders = borders.slice(-2);
  const borderString = borders.length > 0 ? borders.join(", ") : "None";

  modalBody.innerHTML = `
    <div class="modal-header">
      <img src="${flag}" class="modal-flag" alt="Flag">
      <div class="modal-title">
        <h2>${commonName}</h2>
        <span class="modal-subtitle">${officialName}</span>
      </div>
    </div>
    
    <div class="detail-row"><span class="detail-label">Native Name:</span> ${nativeName}</div>
    <div class="detail-row"><span class="detail-label">Symbol:</span> ${currencySymbol}</div>
    <div class="detail-row"><span class="detail-label">Longitude:</span> ${longitude}</div>
    <div class="detail-row"><span class="detail-label">Borders (End):</span> ${borderString}</div>

    <div id="weatherContainer" class="weather-box">
      <span>Loading weather...</span>
    </div>
  `;

  modal.showModal();

  if (latitude !== null && longitude !== "N/A") {
    fetchWeather(latitude, longitude);
  } else {
    document.getElementById("weatherContainer").innerHTML = "<span>Weather Unavailable</span>";
  }
};

closeModalBtn.addEventListener(("click"), () => modal.close());
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close();
});

async function fetchWeather(lat, lon) {
  const weatherEl = document.getElementById("weatherContainer");
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    const current = data.current;
    if (!current) throw new Error("No data");

    const temp = current.temperature_2m;
    const humidity = current.relative_humidity_2m;
    const code = current.weather_code;
    const unit = data.current_units.temperature_2m;

    const weatherText = getWeatherText(code);

    weatherEl.innerHTML = `
      <div class="weather-meta">
        <span style="font-weight:600; font-size:14px; color:#0c4a6e;">CURRENT WEATHER</span>
        <span><b>Condition:</b> ${weatherText}</span>
        <span><b>Humidity:</b> ${humidity}%</span>
      </div>
      <div class="weather-temp">${temp}${unit}</div>
    `;

  } catch (err) {
    weatherEl.innerHTML = `<span style="color:#b91c1c">Failed to load weather</span>`;
    console.error(err);
  }
}

function getWeatherText(code) {
  if (code === 0) return "Clear Sky";
  if (code >= 1 && code <= 3) return "Partly Cloudy";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Variable";
}

async function loadCountries() {
  try {
    resultInfoEl.textContent = "Loading countries...";
    const url = "https://restcountries.com/v3.1/all?fields=name,flags,region,capital,population,currencies,latlng,borders,cca3";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();

    allCountries = data.sort((a, b) => {
      const an = (a?.name?.common || "").toLowerCase();
      const bn = (b?.name?.common || "").toLowerCase();
      return an.localeCompare(bn);
    });

    filteredCountries = [...allCountries];
    totalPages = Math.ceil(filteredCountries.length / PAGE_SIZE);
    currentPage = 1;
    renderCountries();

  } catch (err) {
    resultInfoEl.textContent = "Failed to load data.";
    gridEl.innerHTML = `<p style="padding:12px;color:#b91c1c;">Error: ${err.message}</p>`;
  }
}

pageNumbersEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  goToPage(btn.dataset.page);
});
prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
nextBtn.addEventListener("click", () => goToPage(currentPage + 1));

loadCountries();
