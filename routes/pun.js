const express = require('express');
const fs = require('fs');
const path = require('path');
const {
  updatePunToday,
  updatePunForDate,
  fetchPunForDate
} = require('../cron/updatePun');

const router = express.Router();

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

router.get('/tomorrow', async (req, res) => {
  try {
    const latestFile = path.join(__dirname, '..', 'public', 'pun_latest.json');

    if (!fs.existsSync(latestFile)) {
      return res.status(404).json({
        ok: false,
        published: false,
        error: 'PUN latest non disponibile'
      });
    }

    const latest = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    const date = String(latest.date);

    const tomorrow = new Date(
      Number(date.substring(0, 4)),
      Number(date.substring(4, 6)) - 1,
      Number(date.substring(6, 8)) + 1
    );

    const tomorrowYYYYMMDD =
      tomorrow.getFullYear() +
      String(tomorrow.getMonth() + 1).padStart(2, '0') +
      String(tomorrow.getDate()).padStart(2, '0');

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
      published: false
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