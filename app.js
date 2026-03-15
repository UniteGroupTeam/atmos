const UI = {
    aqiValue: document.getElementById('aqi-value'),
    aqiDesc: document.getElementById('aqi-description'),
    progressCircle: document.querySelector('.progress-ring__circle'),
    waterRisk: document.getElementById('water-risk'),
    rainProb: document.getElementById('rain-probability'),
    status: document.querySelector('.status'),
    btnReport: document.getElementById('btn-report')
};

const circumference = 90 * 2 * Math.PI;
UI.progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
UI.progressCircle.style.strokeDashoffset = circumference;

function setProgress(percent) {
    const offset = circumference - percent / 100 * circumference;
    UI.progressCircle.style.strokeDashoffset = offset;
}

function updateStatus(msg) {
    UI.status.textContent = msg;
}

async function initData() {
    if (!navigator.geolocation) {
        updateStatus("ERROR: GEOLOCALIZACIÓN NO SOPORTADA");
        return;
    }

    updateStatus("OBTENIENDO COORDENADAS GPS...");
    
    // Automatically use coordinates if granted or prompt user
    navigator.geolocation.getCurrentPosition(
        position => fetchAPIs(position.coords.latitude, position.coords.longitude),
        error => {
            updateStatus("ERROR: PERMISOS DE UBICACIÓN DENEGADOS");
            console.error(error);
            // Default to a generic location (e.g., CDMX for testing if denied, or just stop)
            // fetchAPIs(19.4326, -99.1332);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
}

async function fetchAPIs(lat, lon) {
    updateStatus("CONECTANDO A OPEN-METEO NODE...");
    
    try {
        const [aqiRes, weatherRes] = await Promise.all([
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`),
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_probability_max&timezone=auto`)
        ]);

        if (!aqiRes.ok || !weatherRes.ok) throw new Error("API Falla");

        const aqiData = await aqiRes.json();
        const weatherData = await weatherRes.json();

        processAQI(aqiData.current.us_aqi || 0);
        processWaterRisk(weatherData.daily.precipitation_probability_max || [0]);
        
        updateStatus("SISTEMA EN LÍNEA - DATOS RECIBIDOS");
        UI.status.style.animation = "none";
        UI.status.style.opacity = "0.7";
    } catch (err) {
        updateStatus("ERROR: FALLA EN ENLACE SATELITAL");
        console.error(err);
    }
}

function processAQI(aqi) {
    // Animating numbers
    let current = 0;
    const interval = setInterval(() => {
        current += Math.ceil(aqi / 20) || 1;
        if (current >= aqi) {
            current = aqi;
            clearInterval(interval);
        }
        UI.aqiValue.textContent = current;
    }, 40);
    
    // Scale AQI for circle (max 300 roughly)
    const percent = Math.min((aqi / 300) * 100, 100);
    setTimeout(() => setProgress(percent), 100);

    let desc, colorClass, strokeClass;
    if (aqi <= 50) { 
        desc = "ÓPTIMO"; 
        colorClass = "risk-low"; 
        strokeClass = "stroke-risk-low";
    } else if (aqi <= 100) { 
        desc = "ACEPTABLE"; 
        colorClass = "risk-med"; 
        strokeClass = "stroke-risk-med";
    } else if (aqi <= 200) {
        desc = "DAÑINO";
        colorClass = "risk-high";
        strokeClass = "stroke-risk-high";
    } else { 
        desc = "PELIGROSO"; 
        colorClass = "risk-high"; 
        strokeClass = "stroke-risk-high";
    }

    UI.aqiDesc.textContent = `ESTADO: ${desc}`;
    
    UI.progressCircle.classList.remove('stroke-risk-low', 'stroke-risk-med', 'stroke-risk-high');
    UI.aqiValue.classList.remove('risk-low', 'risk-med', 'risk-high');
    UI.aqiDesc.classList.remove('risk-low', 'risk-med', 'risk-high');
    
    UI.progressCircle.classList.add(strokeClass);
    UI.aqiValue.classList.add(colorClass);
    UI.aqiDesc.classList.add(colorClass);
}

function processWaterRisk(rainProbs) {
    // Average rain probability over the next available days (often 7)
    let avgRain = 0;
    if (rainProbs && rainProbs.length > 0) {
        avgRain = rainProbs.reduce((a, b) => a + b, 0) / rainProbs.length;
    }
    
    UI.rainProb.textContent = `Prob. media lluvia 7 días: ${Math.round(avgRain)}%`;

    let riskLevel, riskClass;
    if (avgRain < 25) {
        riskLevel = "CRÍTICO";
        riskClass = "risk-high";
    } else if (avgRain < 50) {
        riskLevel = "MODERADO";
        riskClass = "risk-med";
    } else {
        riskLevel = "BAJO";
        riskClass = "risk-low";
    }

    // Typewriter effect approach
    let i = 0;
    UI.waterRisk.textContent = "";
    UI.waterRisk.classList.remove('risk-low', 'risk-med', 'risk-high');
    
    const typing = setInterval(() => {
        if (i < riskLevel.length) {
            UI.waterRisk.textContent += riskLevel.charAt(i);
            i++;
        } else {
            clearInterval(typing);
            UI.waterRisk.classList.add(riskClass);
        }
    }, 70);
}

UI.btnReport.addEventListener('click', async () => {
    const reportText = '🚨 [ATMOS_SYS] REPORTE DE FUGA DE AGUA 🚨\nSe ha detectado una anomalía hídrica en mi ubicación actual.\n#CyberpunkCity #AtmosApp';
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Atmos: Reporte de Fuga',
                text: reportText,
                url: window.location.href
            });
            updateStatus("REPORTE ENVIADO EXITOSAMENTE");
        } catch (err) {
            console.error('Error al compartir', err);
        }
    } else {
        alert("TRANSMISIÓN CANCELADA: Web Share API no disponible en este dispositivo.");
    }
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW_NODE: Online', reg.scope))
            .catch(err => console.error('SW_NODE: Error', err));
    });
}

// Start sequence
setTimeout(initData, 1000);
