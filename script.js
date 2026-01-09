// Configuración cargada desde prices.json
let config = null;
let lastResult = '';

function formatArgentineNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

async function loadConfig() {
  try {
    const response = await fetch('prices.json');
    if (!response.ok) {
      throw new Error('Error al cargar la configuración');
    }
    config = await response.json();
    initializeApp();
  } catch (error) {
    console.error('Error cargando configuración:', error);
    alert('Error al cargar la configuración. Por favor, recarga la página.');
  }
}

function initializeApp() {
  updateDisabledOptions();
  hideResultContainer();
  document.getElementById('currencyFrom').addEventListener('change', updateDisabledOptions);
  document.getElementById('currencyTo').addEventListener('change', updateDisabledOptions);
  document.getElementById('amount').addEventListener('input', formatNumericInput);
}

function formatNumericInput(event) {
  const input = event.target;
  let value = input.value.replace(/\./g, '').replace(/,/g, '');
  
  if (value.length > 9) {
    value = value.slice(0, 9);
  }
  
  if (value) {
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  
  input.value = value;
}

function updateDisabledOptions() {
  const from = document.getElementById('currencyFrom').value;
  const toSelect = document.getElementById('currencyTo');
  
  for (let opt of toSelect.options) {
    opt.disabled = (
      opt.value === from ||
      (from === 'CUP' && opt.value === 'MLC') ||
      (from === 'MLC' && opt.value === 'CUP')
    );
  }
  
  if (from === toSelect.value) {
    toSelect.value = (from === 'ARS') ? 'CUP' : 'ARS';
  }
}

function hideResultContainer() {
  const resultContainer = document.getElementById('resultContainer');
  if (resultContainer) {
    resultContainer.style.display = 'none';
  }
}

function swapCurrencies() {
  const f = document.getElementById('currencyFrom');
  const t = document.getElementById('currencyTo');
  const resultContainer = document.getElementById('resultContainer');
  [f.value, t.value] = [t.value, f.value];
  updateDisabledOptions();
  document.getElementById('amount').value = '';
  document.getElementById('resultText').textContent = '';
  document.getElementById('copyFeedback').classList.remove('show');
  document.getElementById('btnCopiar').style.display = 'none';
  if (resultContainer) {
    resultContainer.style.display = 'none';
  }
  lastResult = '';
}

function rateForCup(cup) {
  if (cup <= config.minAmounts.CUP) return config.rates.RATE_MIN;
  if (cup >= config.thresholds.CUP_MAX) return config.rates.RATE_MAX;
  const slope = (config.rates.RATE_MAX - config.rates.RATE_MIN) / (config.thresholds.CUP_MAX - config.minAmounts.CUP);
  return config.rates.RATE_MIN + slope * (cup - config.minAmounts.CUP);
}

function cupToArs(cup) {
  return cup * rateForCup(cup);
}

function arsToCup(ars) {
  if (ars >= config.rates.RATE_MAX * config.thresholds.CUP_MAX) {
    return Math.floor(ars / config.rates.RATE_MAX);
  }
  let low = config.minAmounts.CUP;
  let high = config.thresholds.CUP_MAX;
  let mid, est;
  for (let i = 0; i < 50; i++) {
    mid = (low + high) / 2;
    est = cupToArs(mid);
    if (est > ars) high = mid;
    else low = mid;
  }
  return mid;
}

function calculate() {
  if (!config) {
    alert('La configuración aún no se ha cargado. Por favor espera un momento.');
    return;
  }

  const from = document.getElementById('currencyFrom').value;
  const to = document.getElementById('currencyTo').value;
  const raw = document.getElementById('amount').value;
  const num = parseFloat(raw.replace(/\./g, '').replace(/,/g, ''));
  const out = document.getElementById('resultText');
  const copyBtn = document.getElementById('btnCopiar');
  const feedback = document.getElementById('copyFeedback');
  const resultContainer = document.getElementById('resultContainer');
  
  out.textContent = '';
  out.className = 'result';
  lastResult = '';
  feedback.classList.remove('show');
  copyBtn.style.display = 'none';

  if (from === to) {
    out.textContent = 'Seleccione monedas diferentes.';
    out.className = 'result result-error';
    return;
  }
  
  if (!raw || isNaN(num) || num <= 0) {
    out.textContent = 'Ingrese un monto válido.';
    out.className = 'result result-error';
    return;
  }

  if (from === 'ARS' && to === 'CUP') {
    if (num < config.minAmounts.ARS) {
      out.textContent = `ARS ≥ ${formatArgentineNumber(config.minAmounts.ARS)}.`;
      out.className = 'result result-error';
      return;
    }
    const cup = Math.round(arsToCup(num));
    out.textContent = `💲 Con ${formatArgentineNumber(num)} ARS recibís aprox. ${formatArgentineNumber(cup)} CUP.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${formatArgentineNumber(num)} ARS y recibir ${formatArgentineNumber(cup)} CUP.`;
  }
  else if (from === 'CUP' && to === 'ARS') {
    if (num < config.minAmounts.CUP) {
      out.textContent = `CUP ≥ ${formatArgentineNumber(config.minAmounts.CUP)}.`;
      out.className = 'result result-error';
      return;
    }
    const ars = Math.round(cupToArs(num));
    out.textContent = `💲 Recibis aprox. ${formatArgentineNumber(num)} CUP con ${formatArgentineNumber(ars)} ARS.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${formatArgentineNumber(ars)} ARS y recibir ${formatArgentineNumber(num)} CUP.`;
  }
  else if (from === 'ARS' && to === 'MLC') {
    if (num < config.minAmounts.ARS) {
      out.textContent = `ARS ≥ ${formatArgentineNumber(config.minAmounts.ARS)}.`;
      out.className = 'result result-error';
      return;
    }
    const mlc = (num / config.rates.RATE_MLC).toFixed(2);
    out.textContent = `💲 Con ${formatArgentineNumber(num)} ARS recibís aprox. ${mlc} MLC.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${formatArgentineNumber(num)} ARS y recibir ${mlc} MLC.`;
  }
  else if (from === 'MLC' && to === 'ARS') {
    if (num < config.minAmounts.MLC) {
      out.textContent = `MLC ≥ ${config.minAmounts.MLC}.`;
      out.className = 'result result-error';
      return;
    }
    const ars = Math.round(num * config.rates.RATE_MLC);
    out.textContent = `💲 Recibis aprox. ${num} MLC con ${formatArgentineNumber(ars)} ARS.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${formatArgentineNumber(ars)} ARS y recibir ${num} MLC.`;
  }
  else if (from === 'ARS' && to === 'USD') {
    if (num < config.minAmounts.ARS) {
      out.textContent = `ARS ≥ ${formatArgentineNumber(config.minAmounts.ARS)}.`;
      out.className = 'result result-error';
      return;
    }
    const usd = Math.round(num / (config.rates.RATE_USD * (1 + config.rates.USD_EXTRA)));
    out.textContent = `💲 Con ${formatArgentineNumber(num)} ARS recibís aprox. ${formatArgentineNumber(usd)} USDT.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${formatArgentineNumber(num)} ARS y recibir ${formatArgentineNumber(usd)} USDT.`;
  }
  else if (from === 'USD' && to === 'ARS') {
    const ars = Math.round(num * (1 + config.rates.USD_EXTRA) * config.rates.RATE_USD);
    out.textContent = `💲 Recibis aprox. ${formatArgentineNumber(num)} USD Efectivo con ${formatArgentineNumber(ars)} ARS.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${formatArgentineNumber(ars)} ARS y recibir ${formatArgentineNumber(num)} USD Efectivo.`;
  }
  else {
    out.textContent = '⛔ Conversión CUP ⇄ MLC no permitida.';
    out.className = 'result result-error';
    return;
  }

  if (lastResult) {
    resultContainer.style.display = 'block';
    copyBtn.style.display = 'flex';
  }
}

async function copyResult() {
  if (!lastResult) {
    alert('No hay resultado para copiar. Calcula primero un monto válido.');
    return;
  }

  try {
    await navigator.clipboard.writeText(lastResult);
    const feedback = document.getElementById('copyFeedback');
    const copyBtn = document.getElementById('btnCopiar');
    
    feedback.textContent = '¡Copiado al portapapeles!';
    feedback.classList.add('show');
    copyBtn.classList.add('copied');
    
    setTimeout(() => {
      feedback.classList.remove('show');
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Error al copiar:', error);
    alert('No se pudo copiar al portapapeles. Por favor, copia manualmente: ' + lastResult);
  }
}

function sendToWhatsApp() {
  if (!lastResult) {
    alert('Primero calcula un monto válido antes de enviar.');
    return;
  }
  const phone = '5491165218910';
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lastResult)}`, '_blank');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadConfig);
} else {
  loadConfig();
}
