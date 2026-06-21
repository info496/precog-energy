require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPunMgp } = require('../services/gmeRequest');
const { normalizePun } = require('../services/normalizePun');

function todayYYYYMMDD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

async function fetchPunForDate(dateYYYYMMDD) {
  const result = await getPunMgp(dateYYYYMMDD);
  return normalizePun(result.decoded, dateYYYYMMDD);
}

async function updatePunForDate(dateYYYYMMDD) {
  const normalized = await fetchPunForDate(dateYYYYMMDD);

  const storageDir = path.join(__dirname, '..', 'storage');
  const publicDir = path.join(__dirname, '..', 'public');
  fs.mkdirSync(storageDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(path.join(storageDir, `pun_${dateYYYYMMDD}.json`), JSON.stringify(normalized, null, 2));
  fs.writeFileSync(path.join(publicDir, 'pun_latest.json'), JSON.stringify(normalized, null, 2));

  return normalized;
}

async function updatePunToday() {
  const date = process.env.GME_TEST_DATE || todayYYYYMMDD();
  return updatePunForDate(date);
}

if (require.main === module) {
  updatePunToday()
    .then(data => {
      console.log('PUN aggiornato:', data.date, data.average, 'records:', data.count);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { updatePunToday, updatePunForDate, fetchPunForDate };