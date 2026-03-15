// --- Configuración (Google Web App) ---
// PASO 1: Reemplaza esta URL por la URL de implementación de tu Google Web App
const GOOGLE_APP_URL = "https://script.google.com/macros/s/AKfycbyz6ImJvCx3PYuApw6GDn_3zuTeUN3-eT7F2g8JJdrZSUG9FUl4aRP0yhTmWR4f_yaFsw/exec";

const UI = {
    locationName: document.getElementById('location-name'),
    refreshBtn: document.getElementById('refresh-btn'),
    // Weather
    weatherIcon: document.getElementById('weather-icon'),
    currentTemp: document.getElementById('current-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    tempMin: document.getElementById('temp-min'),
    tempMax: document.getElementById('temp-max'),
    sunriseTime: document.getElementById('sunrise-time'),
    sunsetTime: document.getElementById('sunset-time'),
    dayNightStatus: document.getElementById('day-night-status'),
    weatherJoke: document.getElementById('weather-joke'),
    waterJoke: document.getElementById('water-joke'),
    // AQI
    aqiRing: document.getElementById('aqi-ring'),
    aqiValue: document.getElementById('aqi-value'),
    aqiStatus: document.getElementById('aqi-status'),
    // Water
    waterInfoBtn: document.getElementById('water-info-btn'),
    riskBadge: document.getElementById('risk-badge'),
    rainProb: document.getElementById('rain-probability'),
    // Fugas Display
    reportsList: document.getElementById('reports-list'),
    // Buttons & Modals
    btnReportMain: document.getElementById('btn-report-main'),
    // Modals IDs
    modalReportMenu: document.getElementById('modal-report-menu'),
    modalNuevaFuga: document.getElementById('modal-nueva-fuga'),
    modalResolverFuga: document.getElementById('modal-resolver-fuga'),
    modalInfo: document.getElementById('info-modal'),
    modalLoading: document.getElementById('modal-loading'),
    loadingText: document.getElementById('loading-text'),
    // Modal buttons/inputs
    btnNuevaFuga: document.getElementById('btn-nueva-fuga'),
    btnFugaResuelta: document.getElementById('btn-fuga-resuelta'),
    btnEnviarFuga: document.getElementById('btn-enviar-fuga'),
    fugaCalle: document.getElementById('fuga-calle'),
    fugaNumero: document.getElementById('fuga-numero'),
    fugaDelegacion: document.getElementById('fuga-delegacion'),
    fugaCp: document.getElementById('fuga-cp'),
    fugaDescInput: document.getElementById('fuga-desc'),
    searchFugas: document.getElementById('search-fugas'),
    resolveListContainer: document.getElementById('resolve-list-container'),
    // Install Flow
    installBtnTop: document.getElementById('install-btn-top'),
    installToast: document.getElementById('install-toast'),
    toastInstallBtn: document.getElementById('toast-install-btn'),
    toastCloseBtn: document.getElementById('toast-close-btn'),
    // Forecast & QR
    forecastList: document.getElementById('forecast-list'),
    desktopQrBtn: document.getElementById('desktop-qr-btn'),
    modalQr: document.getElementById('modal-qr'),
    modalJoke: document.getElementById('modal-joke'),
    jokeIcon: document.getElementById('joke-icon'),
    jokeText: document.getElementById('joke-text'),
    btnSymbolsIndex: document.getElementById('btn-symbols-index'),
    modalSymbols: document.getElementById('modal-symbols'),
    modalIosInstall: document.getElementById('modal-ios-install')
};

let deferredPrompt;

let currentCoords = { lat: 19.4326, lon: -99.1332 }; // Default CDMX
let fugasData = [];

// Closes any open modal
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
}

// Attach close events
document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAllModals();
    });
});

function showLoading(text) {
    UI.loadingText.textContent = text;
    UI.modalLoading.classList.add('active');
}
function hideLoading() {
    UI.modalLoading.classList.remove('active');
}

// Weather dictionaries (Material style & Funny texts)
function getWeatherMapping(code) {
    if (code === 0) return { icon: 'clear_day', desc: 'Despejado', color: '#F9AB00', fill: 1, 
        joke: "Ponte bloqueador o serás un camarón." };
    if ([1,2,3].includes(code)) return { icon: 'partly_cloudy_day', desc: 'Parcialmente Nublado', color: '#A0C2FA', fill: 1,
        joke: "Clima perfecto para no hacer nada." };
    if ([45,48].includes(code)) return { icon: 'foggy', desc: 'Niebla', color: '#9AA0A6', fill: 0,
        joke: "Parece Silent Hill afuera." };
    if ([51,53,55,56,57].includes(code)) return { icon: 'rainy_light', desc: 'Llovizna', color: '#8AB4F8', fill: 0,
        joke: "Salpicones fastidiosos." };
    if ([61,63,65,66,67,80,81,82].includes(code)) return { icon: 'rainy', desc: 'Lluvia', color: '#1A73E8', fill: 1,
        joke: "¡Corre a meter la ropa que se moja!" };
    if ([71,73,75,77,85,86].includes(code)) return { icon: 'weather_snowy', desc: 'Nieve', color: '#8AB4F8', fill: 1,
        joke: "¿Quieres hacer un muñeco?" };
    if ([95,96,99].includes(code)) return { icon: 'thunderstorm', desc: 'Tormenta', color: '#F9AB00', fill: 1,
        joke: "Thor está jugando boliche." };
    return { icon: 'cloud', desc: 'Nublado', color: '#9AA0A6', fill: 1, joke: "Ni fú ni fá." };
}

async function fetchAPIs(lat, lon) {
    currentCoords = {lat, lon};
    UI.locationName.textContent = "Actualizando...";
    
    try {
        const [weatherRes, aqiRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=weather_code,precipitation_probability_max,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`)
        ]);

        if (!weatherRes.ok || !aqiRes.ok) throw new Error("Fetch Failed");

        const weatherData = await weatherRes.json();
        const aqiData = await aqiRes.json();

        processWeather(weatherData);
        processAQI(aqiData.current.us_aqi || 0);
        processWaterRisk(weatherData.daily.precipitation_probability_max || [0]);
        processForecast(weatherData.daily);
        
        UI.locationName.textContent = "Magia lista en tu ubicación";

    } catch (err) {
        console.error(err);
        UI.locationName.textContent = "Modo Off-grid";
    }

    // Load active reports
    fetchFugas();
}

function processWeather(data) {
    const currentTemp = Math.round(data.current.temperature_2m);
    const minTemp = Math.round(data.daily.temperature_2m_min[0]);
    const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
    const info = getWeatherMapping(data.current.weather_code);

    UI.currentTemp.textContent = currentTemp;
    UI.tempMin.textContent = minTemp;
    UI.tempMax.textContent = maxTemp;
    UI.weatherDesc.textContent = info.desc;
    UI.weatherJoke.textContent = info.joke;
    
    UI.weatherIcon.textContent = info.icon;
    UI.weatherIcon.style.color = info.color;
    UI.weatherIcon.style.fontVariationSettings = `'FILL' ${info.fill}`;
    
    // Sunrise & Sunset
    try {
        const sr = data.daily.sunrise[0].split('T')[1];
        const ss = data.daily.sunset[0].split('T')[1];
        UI.sunriseTime.textContent = sr;
        UI.sunsetTime.textContent = ss;
    } catch(e) { console.error("Error parsing sun times", e); }
    
    // Dynamic theme & Day/Night text
    const isDay = data.current.is_day === 1;
    UI.dayNightStatus.textContent = isDay ? "Día" : "Noche";
    applyDynamicTheme(data.current.weather_code, isDay);
}

function applyDynamicTheme(code, isDay) {
    document.body.className = ''; // remove all previous themes
    
    let themeClass = 'theme-day-clear';
    
    if ([0, 1, 2].includes(code)) {
        themeClass = isDay ? 'theme-day-clear' : 'theme-night-clear';
    } else if ([3, 45, 48].includes(code)) {
        themeClass = isDay ? 'theme-day-cloudy' : 'theme-night-cloudy';
    } else if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code)) {
        themeClass = isDay ? 'theme-day-rain' : 'theme-night-rain';
    } else if ([71,73,75,77,85,86].includes(code)) {
        themeClass = isDay ? 'theme-day-cloudy' : 'theme-night-clear'; // Use cloudy for snow
    } else {
        themeClass = isDay ? 'theme-day-cloudy' : 'theme-night-cloudy';
    }
    
    document.body.classList.add(themeClass);
}

function processAQI(aqi) {
    UI.aqiValue.textContent = aqi;
    UI.aqiRing.className = 'aqi-ring'; // Clean classes
    UI.aqiStatus.className = 'status-text';

    if (aqi <= 50) { 
        UI.aqiStatus.textContent = "Aire Limpio";
        UI.aqiRing.classList.add('bg-good');
        UI.aqiStatus.classList.add('theme-good');
    } else if (aqi <= 100) { 
        UI.aqiStatus.textContent = "Regular";
        UI.aqiRing.classList.add('bg-mod');
        UI.aqiStatus.classList.add('theme-mod');
    } else { 
        UI.aqiStatus.textContent = "Tóxico";
        UI.aqiRing.classList.add('bg-bad');
        UI.aqiStatus.classList.add('theme-bad');
    }
}

function processWaterRisk(rainProbs) {
    let avgRain = 0;
    if (rainProbs && rainProbs.length > 0) {
        avgRain = rainProbs.reduce((a, b) => a + b, 0) / rainProbs.length;
    }
    
    UI.rainProb.textContent = `Prob. lluvia (7 días): ${Math.round(avgRain)}%`;
    UI.riskBadge.className = 'risk-badge';

    if (avgRain < 25) {
        UI.riskBadge.textContent = "Riesgo Alto ⚠️";
        UI.riskBadge.classList.add('bg-bad');
        UI.waterJoke.textContent = "Toca bañarse a jicarazos pronto.";
    } else if (avgRain < 50) {
        UI.riskBadge.textContent = "Riesgo Medio 🟡";
        UI.riskBadge.classList.add('bg-mod');
        UI.waterJoke.textContent = "Cierra la llave mientras te jabonas, eh.";
    } else {
        UI.riskBadge.textContent = "Riesgo Bajo 💧";
        UI.riskBadge.classList.add('bg-good');
        UI.waterJoke.textContent = "Las presas andan contentas.";
    }
}

function processForecast(daily) {
    if (!UI.forecastList) return;
    UI.forecastList.innerHTML = '';
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for(let i = 0; i < daily.time.length; i++) {
        if(i > 6) break; // Maximum 7 days
        
        // Fix timezone issue when parsing strings YYYY-MM-DD
        const dateObj = new Date(daily.time[i] + 'T12:00:00');
        const dayName = i === 0 ? 'Hoy' : days[dateObj.getDay()];
        const min = Math.round(daily.temperature_2m_min[i]);
        const max = Math.round(daily.temperature_2m_max[i]);
        const wCode = daily.weather_code[i];
        
        const info = getWeatherMapping(wCode);
        
        const row = document.createElement('div');
        row.className = 'forecast-row';
        row.innerHTML = `
            <span class="material-symbols-rounded forecast-icon" style="color: ${info.color}">${info.icon}</span>
            <span class="forecast-day">${dayName}</span>
            <div class="forecast-temp">
                <span>${min}°</span>
                <span>/</span>
                <span style="color: var(--text-main); font-weight: 600;">${max}°</span>
            </div>
        `;
        
        row.addEventListener('click', () => {
            showJokeModal(wCode, min, max);
        });
        
        UI.forecastList.appendChild(row);
    }
}

function showJokeModal(code, min, max) {
    closeAllModals();
    
    const wInfo = getWeatherMapping(code);
    let jokeDesc = `<b>${wInfo.desc}:</b> ${wInfo.joke}<br><br>`;
    let icon = wInfo.icon;
    let colorClass = "pink-icon";
    
    // Add Mexican temperature slang
    if (max >= 28) {
        jokeDesc += "¡Además hace un calorón! 🔥 Échate una limonada bien helada o busca una sombrita.";
        icon = "local_fire_department";
        colorClass = "pink-icon";
    } else if (min <= 12) {
        jokeDesc += "¡Y hace frío loco! 🥶 Saca la cobija de tigre y llévate tu chamarra buena.";
        icon = "ac_unit";
        colorClass = "blue-icon";
    } else {
        jokeDesc += "Temperatura a toda madre 😎. Perfecto para ir por unos tacos al pastor.";
        colorClass = "green-icon";
    }
    
    // If it's raining heavily, let the rain icon override the temp icon
    if ([51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99].includes(code)) {
        colorClass = "blue-icon";
        icon = wInfo.icon; // Keep the rain/snow icon
    }
    
    UI.jokeIcon.textContent = icon;
    UI.jokeIcon.className = `material-symbols-rounded modal-icon ${colorClass}`;
    UI.jokeText.innerHTML = jokeDesc;
    
    UI.modalJoke.classList.add('active');
}

function initData() {
    if (!navigator.geolocation) {
        UI.locationName.textContent = "Sin GPS";
        return;
    }
    UI.locationName.textContent = "Rastreando...";
    
    navigator.geolocation.getCurrentPosition(
        position => fetchAPIs(position.coords.latitude, position.coords.longitude),
        error => {
            console.error(error);
            UI.locationName.textContent = "Usando base CDMX (GPS denegado)";
            fetchAPIs(19.4326, -99.1332);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
}

// ---------------- Google Sheets Fetching Logic ---------------- //

async function fetchFugas() {
    // Si la url de google app script tiene XXXXXX, creamos mock data para que la app se vea bien
    if (GOOGLE_APP_URL.includes("XXXXXX")) {
        setTimeout(() => {
            fugasData = [
                { id: 1, desc: "Tubo roto en la esquina del parque.", date: "14/03", status: "activo" },
                { id: 2, desc: "Agua saliendo de la alcantarilla en Av. Central.", date: "13/03", status: "activo" }
            ];
            renderFugasList();
        }, 1500);
        return;
    }

    try {
        const response = await fetch(`${GOOGLE_APP_URL}?action=get`);
        const result = await response.json();
        fugasData = result.data || [];
        renderFugasList();
    } catch (e) {
        console.error("Error fetching sheet data", e);
        UI.reportsList.innerHTML = `<p style="text-align:center; color: var(--text-sec); padding: 1rem;">Radar desconectado. Revisa tu conexión.</p>`;
    }
}

function renderFugasList() {
    UI.reportsList.innerHTML = "";
    const activas = fugasData.filter(f => f.status === "activo");

    if (activas.length === 0) {
        UI.reportsList.innerHTML = `<div class="loading-container"><span class="material-symbols-rounded" style="font-size:3rem; color: var(--good-color)">thumb_up</span><p>No hay fugas activas detectadas.</p></div>`;
        return;
    }

    activas.forEach(f => {
        const d = document.createElement('div');
        d.className = 'fuga-item';
        d.innerHTML = `
            <div class="fuga-item-text">
                <span class="fuga-item-desc">${f.desc}</span>
                <span class="fuga-item-date">${f.date}</span>
            </div>
        `;
        UI.reportsList.appendChild(d);
    });
}

function renderResolveList() {
    UI.resolveListContainer.innerHTML = '';
    const filterText = UI.searchFugas.value.toLowerCase();
    
    const activas = fugasData.filter(f => f.status === "activo" && f.desc.toLowerCase().includes(filterText));
    
    if (activas.length === 0) {
        UI.resolveListContainer.innerHTML = '<p style="text-align:center; padding:1rem; color:var(--text-sec)">No se encontraron coincidencias.</p>';
        return;
    }

    activas.forEach(f => {
        const d = document.createElement('div');
        d.className = 'resolve-item';
        d.style.display = 'flex';
        d.style.justifyContent = 'space-between';
        d.style.alignItems = 'center';
        d.style.padding = '1rem';
        d.style.marginBottom = '0.5rem';
        d.style.background = 'rgba(255,255,255,0.05)';
        d.style.borderRadius = 'var(--radius-sm)';
        d.style.cursor = 'pointer';

        d.innerHTML = `
            <div class="resolve-item-text" style="flex: 1; color: var(--text-main); font-weight: 500;">${f.desc}</div>
            <button class="icon-btn small" style="background: var(--good-color); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;">
                <span class="material-symbols-rounded" style="color: #000; font-size: 1.2rem;">check</span>
            </button>
        `;
        
        // El clic en cualquier parte del item resuelve
        d.addEventListener('click', () => markFugaResolved(f.id));
        UI.resolveListContainer.appendChild(d);
    });
}

async function markFugaResolved(id) {
    closeAllModals();
    showLoading("Avisando a los plomeros del Sheet...");
    
    if (GOOGLE_APP_URL.includes("XXXXXX")) {
        setTimeout(() => {
            const f = fugasData.find(x => x.id === id);
            if(f) f.status = 'resuelto';
            hideLoading();
            renderFugasList();
        }, 2000);
        return;
    }

    try {
        await fetch(GOOGLE_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'resolve', id: id })
        });
        
        // Damos un segundo de margen para que Google actualice su base de datos
        setTimeout(() => {
            fetchFugas(); // Refresh list
            hideLoading();
            alert("¡Fuga marcada como resuelta!");
        }, 1500);
    } catch (e) {
        console.error(e);
        hideLoading();
        alert("Falla de conexión al actualizar.");
    }
}

// ---------------- Push Notifications Logic ---------------- //
// Request notification permission and schedule a reminder
async function requestNotificationAndSchedule() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
        console.log("Notificaciones permitidas. Programando Push (Simulado via SW)...");
        // We tell the Service Worker to schedule a notification. 
        // Real logic usually requires server Push API, but we simulate it locally with SW Background Sync / Timeout or Message API
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_PUSH',
                // For demo/testing, you can change 48 hours to 10 seconds: delay(10000)
                delay: 48 * 60 * 60 * 1000 // 48 horas en milisegundos
            });
        }
    }
}

// ---------------- Install PWA Logic ---------------- //

// iOS Detection
const isIOS = () => {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

// PWA Standalone Detection
const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
};

// Initial Install UI Setup
function setupInstallUI() {
    if (isStandalone()) {
        UI.installBtnTop.style.display = 'none';
        return;
    }

    if (isIOS()) {
        // iOS doesn't fire beforeinstallprompt, so we show the button manually
        UI.installBtnTop.style.display = 'flex';
        
        if (!sessionStorage.getItem('installToastShown')) {
            setTimeout(() => {
                UI.installToast.classList.add('active');
                sessionStorage.setItem('installToastShown', 'true');
            }, 3000); // Wait 3s to not overwhelm
        }
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show top install button (Android/PC)
    UI.installBtnTop.style.display = 'flex';
    
    // Show install toast if not already shown in this session
    if (!sessionStorage.getItem('installToastShown')) {
        setTimeout(() => {
            UI.installToast.classList.add('active');
            sessionStorage.setItem('installToastShown', 'true');
        }, 3000);
    }
});

async function handleInstallClick() {
    if (deferredPrompt) {
        // For browsers with native prompt (Android/Chrome)
        UI.installBtnTop.style.display = 'none';
        UI.installToast.classList.remove('active');
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome !== 'accepted') {
            UI.installBtnTop.style.display = 'flex';
        }
        deferredPrompt = null;
    } else if (isIOS()) {
        // For iOS, show instructions
        closeAllModals();
        UI.modalIosInstall.classList.add('active');
        UI.installToast.classList.remove('active');
    }
}

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    UI.installBtnTop.style.display = 'none';
    UI.installToast.classList.remove('active');
});

UI.installBtnTop.addEventListener('click', handleInstallClick);
UI.toastInstallBtn.addEventListener('click', handleInstallClick);
UI.toastCloseBtn.addEventListener('click', () => {
    UI.installToast.classList.remove('active');
});

// ---------------- Events ---------------- //

UI.refreshBtn.addEventListener('click', initData);

UI.waterInfoBtn.addEventListener('click', () => {
    closeAllModals();
    UI.modalInfo.classList.add('active');
});

if(UI.desktopQrBtn) {
    UI.desktopQrBtn.addEventListener('click', () => {
        closeAllModals();
        UI.modalQr.classList.add('active');
    });
}

if(UI.btnSymbolsIndex) {
    UI.btnSymbolsIndex.addEventListener('click', () => {
        closeAllModals();
        UI.modalSymbols.classList.add('active');
    });
}

// Boton Flotante (Reportar Fuga Main)
UI.btnReportMain.addEventListener('click', () => {
    UI.modalReportMenu.classList.add('active');
});

// BOTONES DE MENU REPORTE
UI.btnNuevaFuga.addEventListener('click', () => {
    closeAllModals();
    
    // Limpiar los campos para el nuevo reporte
    UI.fugaCalle.value = '';
    UI.fugaNumero.value = '';
    UI.fugaDelegacion.value = '';
    UI.fugaCp.value = '';
    UI.fugaDescInput.value = '';
    
    UI.modalNuevaFuga.classList.add('active');
});

UI.btnFugaResuelta.addEventListener('click', () => {
    closeAllModals();
    UI.searchFugas.value = '';
    renderResolveList();
    UI.modalResolverFuga.classList.add('active');
});

UI.searchFugas.addEventListener('input', renderResolveList);

UI.btnEnviarFuga.addEventListener('click', async () => {
    const desc = UI.fugaDescInput.value.trim();
    const calle = UI.fugaCalle.value.trim();
    const numero = UI.fugaNumero.value.trim();
    const delegacion = UI.fugaDelegacion.value.trim();
    const cp = UI.fugaCp.value.trim();
    
    if(!desc || !calle || !numero || !delegacion) { 
        alert("Por favor, llena los campos principales de la ubicación y la descripción."); 
        return; 
    }
    
    closeAllModals();
    showLoading("Guardando reporte en la base de datos...");
    
    const payload = {
        action: 'new',
        data: {
            id: Date.now(),
            lat: `${calle} #${numero}`, // Reutilizamos las columnas lat/lon del Sheets para guardar la dirección
            lon: `${delegacion} CP: ${cp}`,
            date: new Date().toLocaleDateString('es-ES'),
            desc: desc,
            status: "activo"
        }
    };

    if (GOOGLE_APP_URL.includes("XXXXXX")) {
        // Mocking
        setTimeout(() => {
            fugasData.push(payload.data);
            hideLoading();
            renderFugasList();
            requestNotificationAndSchedule();
            alert("¡Reporte exitoso! (Aviso: Usando Mock Data, ingresa tu URL de Google).");
        }, 2000);
        return;
    }

    try {
        // Usamos post con fetch normal (sin no-cors primero para ver si falla, 
        // pero Google Apps Script usualmente requiere redirección, 
        // así que el truco es usar un formulario o Content-Type: text/plain)
        await fetch(GOOGLE_APP_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload)
        });
        
        // Al usar no-cors no podemos leer la respuesta, pero el envío se hace.
        console.log("Payload enviado:", payload);
        
        // Damos un segundo de margen para que Google actualice
        setTimeout(() => {
            fetchFugas();
        }, 1500);
        
        hideLoading();
        requestNotificationAndSchedule();
        alert("¡Reporte enviado exitosamente con la dirección proporcionada!");
    } catch (e) {
        console.error(e);
        hideLoading();
        alert("Error de conexión al enviar reporte.");
    }
});

// Run
initData();
setupInstallUI();

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.error('SW Error', err));
    });
}
