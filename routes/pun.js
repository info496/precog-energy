const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  updatePunToday,
  updatePunForDate,
  fetchPunForDate
} = require('../cron/updatePun');

const router = express.Router();

function todayYYYYMMDD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

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
        return JSON.parse(
          fs.readFileSync(fullPath, 'utf8')
        );
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

function averageGroups(groups, labelKey) {
  return Object.keys(groups)
    .sort()
    .map(label => ({
      [labelKey]: label,
      price: Number((groups[label].sum / groups[label].count).toFixed(2))
    }));
}

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

router.get('/chart', (req, res) => {
  const frame = String(req.query.frame || '15m').toLowerCase();

  const supportedFrames = ['15m', 'hourly'];

  if (!supportedFrames.includes(frame)) {
    return res.status(400).json({
      ok: false,
      error: 'Time frame non supportato in questa versione',
      supportedFrames
    });
  }

  const file = path.join(__dirname, '..', 'public', 'pun_latest.json');

  if (!fs.existsSync(file)) {
    return res.status(404).json({
      ok: false,
      error: 'File PUN non disponibile'
    });
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  const points = frame === 'hourly'
    ? buildHourlyChart(data)
    : buildQuarterHourChart(data);

  res.json({
    ok: true,
    frame,
    date: data.date,
    source: data.source,
    unit: '€/MWh',
    points
  });
});

router.get('/today', async (req, res) => {
  try {
    const date = todayYYYYMMDD();
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

router.get('/tomorrow', async (req, res) => {
  try {
    const today = todayYYYYMMDD();
    const tomorrowYYYYMMDD = nextDayYYYYMMDD(today);

    const data = await fetchPunForDate(tomorrowYYYYMMDD);

    if (!data || !data.average || data.count === 0) {
      return res.json({
        ok: true,
        published: false,
        date: tomorrowYYYYMMDD
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
      date: nextDayYYYYMMDD(todayYYYYMMDD())
    });
  }
});

router.post('/update', async (req, res) => {
  try {
    const date = req.body?.date;
    const data = date
      ? await updatePunForDate(String(date))
      : await updatePunToday();

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

module.exports = router;