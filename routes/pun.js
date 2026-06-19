const express = require('express');
const fs = require('fs');
const path = require('path');
const { updatePunToday, updatePunForDate } = require('../cron/updatePun');

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

router.post('/update', async (req, res) => {
  try {
    const date = req.body?.date;
    const data = date ? await updatePunForDate(String(date)) : await updatePunToday();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
