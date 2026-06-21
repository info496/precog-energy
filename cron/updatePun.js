require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPunMgp } = require('../services/gmeRequest');
const { normalizePun } = require('../services/normalizePun');

function todayYYYYMMDD() {
  return dateToYYYYMMDD(new Date());
}

function tomorrowYYYYMMDD() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateToYYYYMMDD(date);
}

function dateToYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function savePunToStorage(dateYYYYMMDD, data) {
  const storageDir = path.join(__dirname, '..', 'storage');
  fs.mkdirSync(storageDir, { recursive: true });

  fs.writeFileSync(
    path.join(storageDir, `pun_${dateYYYYMMDD}.json`),
    JSON.stringify(data, null, 2)
  );
}

function savePunAsLatest(data) {
  const publicDir = path.join(__dirname, '..', 'public');
  fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(
    path.join(publicDir, 'pun_latest.json'),
    JSON.stringify(data, null, 2)
  );
}

async function fetchPunForDate(dateYYYYMMDD) {
  const result = await getPunMgp(dateYYYYMMDD);
  return normalizePun(result.decoded, dateYYYYMMDD);
}

async function updatePunForDate(dateYYYYMMDD) {
  const data = await fetchPunForDate(dateYYYYMMDD);

  savePunToStorage(dateYYYYMMDD, data);
  savePunAsLatest(data);

  return data;
}

async function updatePunForDateStorageOnly(dateYYYYMMDD) {
  const data = await fetchPunForDate(dateYYYYMMDD);

  if (!data.average || data.count === 0) {
    throw new Error(`PUN ${dateYYYYMMDD} non ancora pubblicato`);
  }

  savePunToStorage(dateYYYYMMDD, data);

  return data;
}

async function updatePunToday() {
  const date = process.env.GME_TEST_DATE || todayYYYYMMDD();
  return updatePunForDate(date);
}

async function updatePunTomorrow() {
  return updatePunForDateStorageOnly(tomorrowYYYYMMDD());
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

module.exports = {
  updatePunToday,
  updatePunForDate,
  updatePunTomorrow,
  updatePunForDateStorageOnly,
  fetchPunForDate
};