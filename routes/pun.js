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