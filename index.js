(function () {
  'use strict';
  const CONFIG = {
    API_COUNTRIES: 'https://restcountries.com/v3.1/all?fields=name,flags,region,capital,population,currencies,latlng,borders,cca3',
    API_WEATHER: (lat, lon) =>
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`,
    PAGE_SIZE: 16,
    DEBOUNCE_MS: 300
  };
  const state = {
    allCountries: [],
    filteredCountries: [],
    currentPage: 1,
    totalPages: 1
  };
  const ui = {
    grid: document.getElementById('countriesGrid'),
    pageNumbers: document.getElementById('pageNumbers'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    info: document.getElementById('resultInfo'),
    search: document.getElementById('searchInput'),
    modal: document.getElementById('countryModal'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModalBtn')
  };
  const formatNum = (n) => new Intl.NumberFormat().format(n || 0);
  const safeText = (v) => (v && (Array.isArray(v) ? v.join(', ') : v)) || 'N/A';
  const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  };
  const getWeatherText = (code) => {
    if (code === 0) return 'Clear Sky';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    if (code >= 95) return 'Thunderstorm';
    return 'Variable';
  };
  async function init() {
    ui.info.textContent = 'Loading countries...';
    try {
      const res = await fetch(CONFIG.API_COUNTRIES);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      state.allCountries = data.sort((a, b) =>
        (a.name.common || '').localeCompare(b.name.common || '')
      );
      state.filteredCountries = [...state.allCountries];
      updatePagination();
      render();

      setupEventListeners();
    } catch (err) {
      ui.grid.innerHTML = `<div style="color:red; padding:20px;">Error loading data: ${err.message}. Please refresh.</div>`;
      ui.info.textContent = 'Error';
    }
  }
  function setupEventListeners() {
    ui.search.addEventListener('input', debounce(handleSearch, CONFIG.DEBOUNCE_MS));
    ui.prevBtn.addEventListener('click', () => changePage(-1));
    ui.nextBtn.addEventListener('click', () => changePage(1));
    ui.pageNumbers.addEventListener('click', (e) => {
      if (e.target.dataset.page) goToPage(Number(e.target.dataset.page));
    });
    ui.closeModal.addEventListener('click', closeModal);
    ui.modal.addEventListener('click', (e) => {
      if (e.target === ui.modal) closeModal();
    });
    ui.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card && card.dataset.code) {
        openModal(card.dataset.code);
      }
    });
  }
  function handleSearch(e) {
    const term = e.target.value.toLowerCase().trim();
    state.filteredCountries = term
      ? state.allCountries.filter(c => (c.name.common || '').toLowerCase().includes(term))
      : [...state.allCountries];
      state.currentPage = 1;
    updatePagination();
    render();
  }
  function updatePagination() {
    state.totalPages = Math.ceil(state.filteredCountries.length / CONFIG.PAGE_SIZE);
  }
  function goToPage(page) {
    if (page < 1 || page > state.totalPages) return;
    state.currentPage = page;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function changePage(delta) {
    goToPage(state.currentPage + delta);
  }
  function render() {
    const { filteredCountries, currentPage } = state;
    const start = (currentPage - 1) * CONFIG.PAGE_SIZE;
    const items = filteredCountries.slice(start, start + CONFIG.PAGE_SIZE);
    const fragment = document.createDocumentFragment();
    items.forEach(c => {
      const article = document.createElement('article');
      article.className = 'card';
      article.dataset.code = c.cca3; // Store ID on element
      article.style.cursor = 'pointer';

      article.innerHTML = `
        <img class="flag" src="${c.flags.png}" alt="${c.name.common}" loading="lazy" />
        <h3>${c.name.common}</h3>
        <div class="info">
          <span><b>Region:</b> ${safeText(c.region)}</span>
          <span><b>Capital:</b> ${safeText(c.capital)}</span>
          <span><b>Pop:</b> ${formatNum(c.population)}</span>
        </div>
      `;
      fragment.appendChild(article);
    });

    ui.grid.innerHTML = '';
    ui.grid.appendChild(fragment);

    // Update UI Infos
    const end = Math.min(start + CONFIG.PAGE_SIZE, filteredCountries.length);
    ui.info.textContent = filteredCountries.length
      ? `Showing ${start + 1}-${end} of ${filteredCountries.length}`
      : 'No results found';

    // Render Pagination
    renderPaginationControls();
  }

  function renderPaginationControls() {
    ui.prevBtn.disabled = state.currentPage === 1 || state.filteredCountries.length === 0;
    ui.nextBtn.disabled = state.currentPage === state.totalPages || state.filteredCountries.length === 0;

    const { currentPage, totalPages } = state;
    if (state.filteredCountries.length === 0) {
      ui.pageNumbers.innerHTML = '';
      return;
    }

    let pages = [];
    if (totalPages <= 7) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      if (currentPage < 4) pages = [1, 2, 3, 4, '...', totalPages];
      else if (currentPage > totalPages - 3) pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      else pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }

    const html = pages.map(p => {
      if (p === '...') return '<button class="page-number" disabled>…</button>';
      return `<button class="page-number ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }).join('');

    ui.pageNumbers.innerHTML = html;
  }

  // --- Modal & Weather ---

  async function openModal(cca3) {
    const country = state.allCountries.find(c => c.cca3 === cca3);
    if (!country) return;

    const nativeName = country.name.nativeName
      ? Object.values(country.name.nativeName)[0].common
      : 'N/A';
    const currency = country.currencies
      ? Object.values(country.currencies)[0].symbol
      : 'N/A';
    const lat = country.latlng ? country.latlng[0] : null;
    const lon = country.latlng ? country.latlng[1] : null;

    // Build Modal Content
    ui.modalBody.innerHTML = `
      <div class="modal-header">
        <img src="${country.flags.png}" class="modal-flag" alt="Flag">
        <div class="modal-title">
          <h2>${country.name.common}</h2>
          <span class="modal-subtitle">${country.name.official}</span>
        </div>
      </div>
      <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
        <div class="detail-row"><b>Native:</b> ${nativeName}</div>
        <div class="detail-row"><b>Currency:</b> ${currency}</div>
        <div class="detail-row"><b>Region:</b> ${country.region}</div>
        <div class="detail-row"><b>Subregion:</b> ${safeText(country.subregion)}</div>
      </div>
      
      <div id="weatherBox" class="weather-box">
        Loading Weather...
      </div>
    `;

    ui.modal.showModal();
    ui.modal.classList.add('open'); // For any custom animations

    // Fetch Weather if coordinates exist
    if (lat !== null && lon !== null) {
      await loadWeather(lat, lon);
    } else {
      document.getElementById('weatherBox').textContent = 'Weather data unavailable (No coordinates)';
    }
  }

  function closeModal() {
    ui.modal.close();
    ui.modal.classList.remove('open');
  }

  async function loadWeather(lat, lon) {
    const box = document.getElementById('weatherBox');
    try {
      const res = await fetch(CONFIG.API_WEATHER(lat, lon));
      const data = await res.json();

      if (!data.current) throw new Error('No weather data');

      const { temperature_2m, relative_humidity_2m, weather_code } = data.current;
      const unit = data.current_units.temperature_2m;

      box.innerHTML = `
        <div class="weather-meta">
          <span style="font-weight:700; color:#0369a1; text-transform:uppercase; font-size:12px; margin-bottom:4px;">Current Weather</span>
          <div>${getWeatherText(weather_code)}</div>
          <div style="font-size:13px; opacity:0.8;">Humidity: ${relative_humidity_2m}%</div>
        </div>
        <div class="weather-temp">${temperature_2m}${unit}</div>
      `;
    } catch (e) {
      box.innerHTML = '<span style="color:red">Weather unavailable</span>';
    }
  }

  // --- Bootstrap ---
  init();

})();
