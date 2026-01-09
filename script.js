// Configuración cargada desde prices.json
let config = null;
let lastResult = '';

// Cargar configuración al iniciar
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

// Inicializar aplicación después de cargar configuración
function initializeApp() {
  updateDisabledOptions();
  hideResultContainer();
  document.getElementById('currencyFrom').addEventListener('change', updateDisabledOptions);
  document.getElementById('currencyTo').addEventListener('change', updateDisabledOptions);
  document.getElementById('amount').addEventListener('input', formatNumericInput);
}

// Formatear entrada numérica con comas
function formatNumericInput(event) {
  const input = event.target;
  let value = input.value.replace(/,/g, '');
  
  // Limitar a 9 dígitos
  if (value.length > 9) {
    value = value.slice(0, 9);
  }
  
  // Formatear con comas cada 3 dígitos
  if (value) {
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  input.value = value;
}

// Actualizar opciones deshabilitadas según selección
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

// Ocultar contenedor de resultados inicialmente
function hideResultContainer() {
  const resultContainer = document.getElementById('resultContainer');
  if (resultContainer) {
    resultContainer.style.display = 'none';
  }
}

// Intercambiar monedas
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

// Calcular tasa para CUP según cantidad
function rateForCup(cup) {
  if (cup <= config.minAmounts.CUP) return config.rates.RATE_MIN;
  if (cup >= config.thresholds.CUP_MAX) return config.rates.RATE_MAX;
  const slope = (config.rates.RATE_MAX - config.rates.RATE_MIN) / (config.thresholds.CUP_MAX - config.minAmounts.CUP);
  return config.rates.RATE_MIN + slope * (cup - config.minAmounts.CUP);
}

// Convertir CUP a ARS
function cupToArs(cup) {
  return cup * rateForCup(cup);
}

// Convertir ARS a CUP
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

// Función principal de cálculo
function calculate() {
  if (!config) {
    alert('La configuración aún no se ha cargado. Por favor espera un momento.');
    return;
  }

  const from = document.getElementById('currencyFrom').value;
  const to = document.getElementById('currencyTo').value;
  const raw = document.getElementById('amount').value;
  const num = parseFloat(raw.replace(/,/g, ''));
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

  // ARS → CUP
  if (from === 'ARS' && to === 'CUP') {
    if (num < config.minAmounts.ARS) {
      out.textContent = `ARS ≥ ${config.minAmounts.ARS.toLocaleString()}.`;
      out.className = 'result result-error';
      return;
    }
    const cup = Math.round(arsToCup(num));
    out.textContent = `💲 Con ${num.toLocaleString()} ARS recibís aprox. ${cup.toLocaleString()} CUP.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${num.toLocaleString()} ARS y recibir ${cup.toLocaleString()} CUP.`;
  }
  // CUP → ARS
  else if (from === 'CUP' && to === 'ARS') {
    if (num < config.minAmounts.CUP) {
      out.textContent = `CUP ≥ ${config.minAmounts.CUP.toLocaleString()}.`;
      out.className = 'result result-error';
      return;
    }
    const ars = Math.round(cupToArs(num));
    out.textContent = `💲 Recibis aprox. ${num.toLocaleString()} CUP con ${ars.toLocaleString()} ARS.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${ars.toLocaleString()} ARS y recibir ${num.toLocaleString()} CUP.`;
  }
  // ARS → MLC
  else if (from === 'ARS' && to === 'MLC') {
    if (num < config.minAmounts.ARS) {
      out.textContent = `ARS ≥ ${config.minAmounts.ARS.toLocaleString()}.`;
      out.className = 'result result-error';
      return;
    }
    const mlc = (num / config.rates.RATE_MLC).toFixed(2);
    out.textContent = `💲 Con ${num.toLocaleString()} ARS recibís aprox. ${mlc} MLC.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${num.toLocaleString()} ARS y recibir ${mlc} MLC.`;
  }
  // MLC → ARS
  else if (from === 'MLC' && to === 'ARS') {
    if (num < config.minAmounts.MLC) {
      out.textContent = `MLC ≥ ${config.minAmounts.MLC}.`;
      out.className = 'result result-error';
      return;
    }
    const ars = Math.round(num * config.rates.RATE_MLC);
    out.textContent = `💲 Recibis aprox. ${num} MLC con ${ars.toLocaleString()} ARS.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${ars.toLocaleString()} ARS y recibir ${num} MLC.`;
  }
  // ARS → USD Efectivo
  else if (from === 'ARS' && to === 'USD') {
    if (num < config.minAmounts.ARS) {
      out.textContent = `ARS ≥ ${config.minAmounts.ARS.toLocaleString()}.`;
      out.className = 'result result-error';
      return;
    }
    const usd = Math.round(num / (config.rates.RATE_USD * (1 + config.rates.USD_EXTRA)));
    out.textContent = `💲 Con ${num.toLocaleString()} ARS recibís aprox. ${usd.toLocaleString()} USDT.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${num.toLocaleString()} ARS y recibir ${usd.toLocaleString()} USDT.`;
  }
  // USD Efectivo → ARS
  else if (from === 'USD' && to === 'ARS') {
    const ars = Math.round(num * (1 + config.rates.USD_EXTRA) * config.rates.RATE_USD);
    out.textContent = `💲 Recibis aprox. ${num.toLocaleString()} USD Efectivo con ${ars.toLocaleString()} ARS.`;
    out.className = 'result result-success';
    lastResult = `Quiero enviar ${ars.toLocaleString()} ARS y recibir ${num.toLocaleString()} USD Efectivo.`;
  }
  // CUP ⇄ MLC bloqueado
  else {
    out.textContent = '⛔ Conversión CUP ⇄ MLC no permitida.';
    out.className = 'result result-error';
    return;
  }

  // Mostrar botón copiar si hay resultado válido
  if (lastResult) {
    resultContainer.style.display = 'block';
    copyBtn.style.display = 'flex';
  }
}

// Copiar resultado al portapapeles
async function copyResult() {
  if (!lastResult) {
    alert('No hay resultado para copiar. Calcula primero un monto válido.');
    return;
  }

  try {
    await navigator.clipboard.writeText(lastResult);
    const feedback = document.getElementById('copyFeedback');
    const copyBtn = document.getElementById('btnCopiar');
    
    // Mostrar feedback visual
    feedback.textContent = '¡Copiado al portapapeles!';
    feedback.classList.add('show');
    copyBtn.classList.add('copied');
    
    // Restaurar después de 2 segundos
    setTimeout(() => {
      feedback.classList.remove('show');
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Error al copiar:', error);
    alert('No se pudo copiar al portapapeles. Por favor, copia manualmente: ' + lastResult);
  }
}

// Enviar a WhatsApp
function sendToWhatsApp() {
  if (!lastResult) {
    alert('Primero calcula un monto válido antes de enviar.');
    return;
  }
  const phone = '5491165218910';
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lastResult)}`, '_blank');
}

// Cargar configuración cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadConfig);
} else {
  loadConfig();
}
