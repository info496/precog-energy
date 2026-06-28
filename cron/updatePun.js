require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPunMgp } = require('../services/gmeRequest');
const { normalizePun } = require('../services/normalizePun');
const { sendTelegramMessage } = require('../services/telegramAlert');

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

function getTelegramStatePath() {
  const storageDir = path.join(__dirname, '..', 'storage');
  fs.mkdirSync(storageDir, { recursive: true });
  return path.join(storageDir, 'telegram_alert_state.json');
}

function readTelegramState() {
  const statePath = getTelegramStatePath();

  if (!fs.existsSync(statePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function writeTelegramState(state) {
  const statePath = getTelegramStatePath();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function sendPunPublishedAlert(data) {
  const state = readTelegramState();

  // Evita di inviare due volte per la stessa data
  if (state.lastPublishedPun === data.date) {
    return;
  }

  const punMWh = Number(data.average).toFixed(3);
  const punKWh = (Number(data.average) / 1000).toFixed(6);

  const date =
    `${data.date.substring(6, 8)}/` +
    `${data.date.substring(4, 6)}/` +
    `${data.date.substring(0, 4)}`;

  const message =
`📢 PRECOG Energy

⚡ PUN ${date} PUBBLICATO

💶 ${punMWh} €/MWh
💶 ${punKWh} €/kWh`;

  await sendTelegramMessage(message);

  state.lastPublishedPun = data.date;
  writeTelegramState(state);
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
  const data = await updatePunForDateStorageOnly(tomorrowYYYYMMDD());

  await sendPunPublishedAlert(data);

  return data;
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