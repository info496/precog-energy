// =====================================================
// PRECOG ENERGY
// File......: routes/pun.js
// Version...: 1.0.0
// Data......: 28/06/2026
// Autore....: Massimiliano Panipucci + ChatGPT
//
// Descrizione:
// Gestione API PUN GME
// - Ultimo dato disponibile
// - Grafici 15 minuti e orari
// - Storico giornaliero, mensile e annuale
// - PUN Oggi e PUN D+1
// - Aggiornamento manuale dati GME
// =====================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  updatePunToday,
  updatePunTomorrow,
  updatePunForDate,
  fetchPunForDate
} = require('../cron/updatePun');

const router = express.Router();

// =====================================================
// DATE UTILITIES
// -----------------------------------------------------
// Funzioni di utilità per la gestione delle date nel
// formato YYYYMMDD utilizzato dal GME.
// =====================================================

// Restituisce la data odierna nel formato YYYYMMDD.

function todayYYYYMMDD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Restituisce il giorno successivo nel formato YYYYMMDD.

function nextDayYYYYMMDD(date) {
  const d = new Date(
    Number(date.substring(0, 4)),
    Number(date.substring(4, 6)) - 1,
    Number(date.substring(6, 8)) + 1
  );

  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  );
}

// Legge tutti i file PUN presenti nella cartella storage.

function loadHistoricalPunFiles() {
  const storageDir = path.join(__dirname, '..', 'storage');

  if (!fs.existsSync(storageDir)) {
    return [];
  }

  const files = fs.readdirSync(storageDir)
    .filter(file =>
      file.startsWith('pun_') &&
      file.endsWith('.json')
    )
    .sort();

  return files
    .map(file => {
      const fullPath = path.join(storageDir, file);

      try {
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } catch (err) {
        console.error(
          `[PUN] Errore lettura file storico ${file}:`,
          err.message
        );

        return null;
      }
    })
    .filter(Boolean);
}


// =====================================================
// Raggruppa i valori e ne calcola la media.
// =====================================================


function averageGroups(groups, labelKey) {
  return Object.keys(groups)
    .sort()
    .map(label => ({
      [labelKey]: label,
      price: Number((groups[label].sum / groups[label].count).toFixed(2))
    }));
}

// =====================================================
// Costruisce il grafico quartorario (96 punti).
// =====================================================


function buildQuarterHourChart(data) {
  const groups = {};

  for (const item of data.hours || []) {
    const period = Number(item.period);
    const price = Number(item.price);

    if (!period || Number.isNaN(price)) continue;

    const minutes = ((period - 1) % 96) * 15;
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    const label = `${hh}:${mm}`;

    if (!groups[label]) {
      groups[label] = { sum: 0, count: 0 };
    }

    groups[label].sum += price;
    groups[label].count += 1;
  }

  return averageGroups(groups, 'time');
}

// =====================================================
// Costruisce il grafico orario (24 punti).
// =====================================================

function buildHourlyChart(data) {
  const groups = {};

  for (const item of data.hours || []) {
    const period = Number(item.period);
    const price = Number(item.price);

    if (!period || Number.isNaN(price)) continue;

    const hourIndex = Math.floor(((period - 1) % 96) / 4);
    const label = `${String(hourIndex).padStart(2, '0')}:00`;

    if (!groups[label]) {
      groups[label] = { sum: 0, count: 0 };
    }

    groups[label].sum += price;
    groups[label].count += 1;
  }

  return averageGroups(groups, 'time');
}

// =====================================================
// Costruisce il grafico giornaliero.
// -----------------------------------------------------
// Utilizza la media giornaliera del PUN già calcolata
// e restituisce un punto per ogni giorno disponibile.
// =====================================================

function buildDailyHistoryChart(files) {
  return files
    .filter(item =>
      item &&
      item.date &&
      typeof item.average === 'number' &&
      !Number.isNaN(item.average)
    )
    .map(item => ({
      date: item.date,
      price: Number(item.average.toFixed(2)),
      count: item.count || 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// =====================================================
// Costruisce il grafico mensile.
// -----------------------------------------------------
// Raggruppa le medie giornaliere per mese e calcola
// il valore medio mensile del PUN.
// =====================================================



function buildMonthlyHistoryChart(files) {

  const groups = {};

  for (const item of files) {

    if (
      !item ||
      !item.date ||
      !Array.isArray(item.hours)
    ) {
      continue;
    }

    const month =
      item.date.substring(0, 4) +
      "-" +
      item.date.substring(4, 6);

    if (!groups[month]) {
      groups[month] = {
        sum: 0,
        count: 0
      };
    }

    for (const qh of item.hours) {

      const price = Number(qh.price);

      if (Number.isNaN(price)) continue;

      groups[month].sum += price;
      groups[month].count += 1;

    }

  }

  return Object.keys(groups)
    .sort()
    .map(month => ({

      month,

      price: Number(
        (groups[month].sum / groups[month].count).toFixed(6)
      ),

      count: groups[month].count

    }));

}

// =====================================================
// Costruisce il grafico annuale sovrapposto.
// -----------------------------------------------------
// Raggruppa le medie giornaliere per anno e per mese.
// Restituisce un dataset separato per ogni anno,
// così il frontend può disegnare più linee sovrapposte.
// =====================================================

function buildYearlyHistoryChart(files) {

  const monthLabels = [
    'GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU',
    'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'
  ];

  const groups = {};

  for (const item of files) {

    if (
      !item ||
      !item.date ||
      !Array.isArray(item.hours)
    ) {
      continue;
    }

    const year = item.date.substring(0, 4);
    const month = Number(item.date.substring(4, 6)) - 1;

    if (!groups[year]) {
      groups[year] = Array.from(
        { length: 12 },
        () => ({
          sum: 0,
          count: 0
        })
      );
    }

    for (const qh of item.hours) {
      const price = Number(qh.price);

      if (Number.isNaN(price)) continue;

      groups[year][month].sum += price;
      groups[year][month].count += 1;
    }
  }

  const datasets = Object.keys(groups)
    .sort()
    .map(year => ({
      label: year,
      data: groups[year].map(m => {
        if (!m.count) return null;

        return Number(
          (m.sum / m.count).toFixed(6)
        );
      })
    }));

  return {
    labels: monthLabels,
    datasets
  };
}

// =====================================================
// API ROUTES
// -----------------------------------------------------
// Endpoint REST utilizzati dalla dashboard PRECOG Energy.
// Tutte le risposte sono in formato JSON e vengono
// consumate dal frontend della piattaforma.
// =====================================================

// -----------------------------------------------------
// GET /api/pun/latest
// -----------------------------------------------------
// Restituisce l'ultimo file PUN disponibile salvato
// nella cartella public.
// Utilizzato dalla homepage.
// -----------------------------------------------------

router.get('/latest', (req, res) => {
  const file = path.join(__dirname, '..', 'public', 'pun_latest.json');

  if (!fs.existsSync(file)) {
    return res.status(404).json({
      error: 'PUN non ancora aggiornato',
      hint: 'Chiama POST /api/pun/update oppure attendi il cron.'
    });
  }

  res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});

// -----------------------------------------------------
// Restituisce il file PUN relativo alla data richiesta.
// Se il file non esiste restituisce null.
// -----------------------------------------------------

function loadPunFileByDate(date) {
  const file = path.join(__dirname, '..', 'storage', `pun_${date}.json`);

  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// -----------------------------------------------------
// GET /api/pun/chart
// -----------------------------------------------------
// Restituisce i dati per i grafici intraday.
//
// Parametri:
// frame = 15m | hourly
// date  = YYYYMMDD (opzionale)
//
// Se il file richiesto non è presente nello storage,
// tenta automaticamente il recupero dal GME.
// -----------------------------------------------------


  router.get('/chart', async (req, res) => {
  const frame = String(req.query.frame || '15m').toLowerCase();

  const supportedFrames = ['15m', 'hourly'];

  if (!supportedFrames.includes(frame)) {
    return res.status(400).json({
      ok: false,
      error: 'Time frame non supportato in questa versione',
      supportedFrames
    });
  }

 const requestedDate = req.query.date ? String(req.query.date) : null;

 let data = null;

if (requestedDate) {
  data = loadPunFileByDate(requestedDate);

  if (!data) {
    data = await fetchPunForDate(requestedDate);
  }
} else {
  const file = path.join(__dirname, '..', 'public', 'pun_latest.json');

  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
}

if (!data) {
  return res.status(404).json({
    ok: false,
    error: 'File PUN non disponibile',
    date: requestedDate
  });
}

  const points = frame === 'hourly'
    ? buildHourlyChart(data)
    : buildQuarterHourChart(data);

  if (frame === 'yearly') {
  return res.json({
    ok: true,
    frame,
    unit: '€/MWh',
    labels: points.labels,
    datasets: points.datasets
  });
}

res.json({
  ok: true,
  frame,
  unit: '€/MWh',
  count: points.length,
  points
});
});

// -----------------------------------------------------
// GET /api/pun/history
// -----------------------------------------------------
// Restituisce lo storico PUN.
//
// Parametri:
// frame = daily | monthly | yearly
// from  = YYYYMMDD
// to    = YYYYMMDD
//
// I dati vengono letti esclusivamente dai file presenti
// nello storage locale.
// -----------------------------------------------------




router.get('/history', async (req, res) => {
  const frame = String(req.query.frame || 'daily').toLowerCase();

  const supportedFrames = ['daily', 'monthly', 'yearly'];

  if (!supportedFrames.includes(frame)) {
    return res.status(400).json({
      ok: false,
      error: 'Time frame storico non supportato',
      supportedFrames
    });
  }

  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

const today = todayYYYYMMDD();
const tomorrow = nextDayYYYYMMDD(today);
const safeTo = to;

    if (frame === 'daily' && from && safeTo) {
    let current = from;

    while (current <= safeTo) {
      const existingFile = loadPunFileByDate(current);

      if (
        !existingFile ||
        typeof existingFile.average !== 'number' ||
        Number.isNaN(existingFile.average) ||
        !existingFile.count ||
        existingFile.count === 0
      ) {
        try {
          const downloadedData = await fetchPunForDate(current);

          if (
            downloadedData &&
            typeof downloadedData.average === 'number' &&
            !Number.isNaN(downloadedData.average) &&
            downloadedData.count > 0
          ) {
            const storageDir = path.join(__dirname, '..', 'storage');
            fs.mkdirSync(storageDir, { recursive: true });

            fs.writeFileSync(
              path.join(storageDir, `pun_${current}.json`),
              JSON.stringify(downloadedData, null, 2)
            );

            console.log(`[PUN HISTORY] Recuperato giorno mancante: ${current}`);
          }
        } catch (err) {
          console.warn(`[PUN HISTORY] Giorno non recuperabile: ${current}`, err.message);
        }
      }

      current = nextDayYYYYMMDD(current);
    }
  }

  const files = loadHistoricalPunFiles();

  const filteredFiles = files.filter(item => {
    if (!item || !item.date) return false;
    if (from && item.date < from) return false;
    if (safeTo && item.date > safeTo) return false;
    return true;
  });

  const points =
    frame === 'yearly'
      ? buildYearlyHistoryChart(filteredFiles)
      : frame === 'monthly'
        ? buildMonthlyHistoryChart(filteredFiles)
        : buildDailyHistoryChart(filteredFiles);

  res.json({
    ok: true,
    frame,
    unit: '€/MWh',
    count: frame === 'yearly'
      ? filteredFiles.length
      : points.length,
    points
  });
});

// -----------------------------------------------------
// GET /api/pun/today
// -----------------------------------------------------
// Restituisce il PUN del giorno corrente.
//
// Cerca prima il file nello storage locale.
// Se assente prova il download dal GME.
// -----------------------------------------------------

router.get('/today', async (req, res) => {
  try {
    const date = todayYYYYMMDD();

    const localData = loadPunFileByDate(date);

    if (
      localData &&
      typeof localData.average === 'number' &&
      !Number.isNaN(localData.average) &&
      localData.count > 0
    ) {
      return res.json({
        ok: true,
        published: true,
        data: localData
      });
    }

    const data = await fetchPunForDate(date);

    if (!data || !data.average || data.count === 0) {
      return res.json({
        ok: true,
        published: false,
        date
      });
    }

    res.json({
      ok: true,
      published: true,
      data
    });

  } catch (err) {
    res.json({
      ok: true,
      published: false,
      date: todayYYYYMMDD()
    });
  }
});

// -----------------------------------------------------
// GET /api/pun/tomorrow
// -----------------------------------------------------
// Restituisce il PUN del giorno successivo (D+1).
//
// Se il dato non è ancora stato pubblicato dal GME,
// restituisce published = false.
// -----------------------------------------------------



router.get('/tomorrow', async (req, res) => {
  try {
    const today = todayYYYYMMDD();
    const tomorrowYYYYMMDD = nextDayYYYYMMDD(today);

    const localData = loadPunFileByDate(tomorrowYYYYMMDD);

    if (
      localData &&
      typeof localData.average === 'number' &&
      !Number.isNaN(localData.average) &&
      localData.count > 0
    ) {
      return res.json({
        ok: true,
        published: true,
        data: localData
      });
    }

    const data = await fetchPunForDate(tomorrowYYYYMMDD);

    if (!data || !data.average || data.count === 0) {
      return res.json({
        ok: true,
        published: false,
        date: tomorrowYYYYMMDD
      });
    }

    const storageDir = path.join(__dirname, '..', 'storage');
    fs.mkdirSync(storageDir, { recursive: true });

    fs.writeFileSync(
      path.join(storageDir, `pun_${tomorrowYYYYMMDD}.json`),
      JSON.stringify(data, null, 2)
    );

    res.json({
      ok: true,
      published: true,
      data
    });

  } catch (err) {
    res.json({
      ok: true,
      published: false,
      date: nextDayYYYYMMDD(todayYYYYMMDD())
    });
  }
});

// -----------------------------------------------------
// POST /api/pun/update-tomorrow
// -----------------------------------------------------
// Aggiorna manualmente il PUN D+1.
// Se il PUN è disponibile invia anche la notifica Telegram.
// -----------------------------------------------------

router.post('/update-tomorrow', async (req, res) => {
  try {
    const data = await updatePunTomorrow();

    res.json({
      ok: true,
      data
    });

  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;
