require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { getPunMgpRange } = require('../services/gmeRequest');
const { normalizePun } = require('../services/normalizePun');

const BLOCK_DAYS = 7;
const SLEEP_MS = 1500;

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function savePunToStorage(dateYYYYMMDD, data) {
  const storageDir = path.join(__dirname, '..', 'storage');
  fs.mkdirSync(storageDir, { recursive: true });

  fs.writeFileSync(
    path.join(storageDir, `pun_${dateYYYYMMDD}.json`),
    JSON.stringify(data, null, 2)
  );
}

function fileExists(dateYYYYMMDD) {
  const storageDir = path.join(__dirname, '..', 'storage');
  return fs.existsSync(path.join(storageDir, `pun_${dateYYYYMMDD}.json`));
}

async function importBlock(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  console.log(`[BLOCCO] ${start} -> ${end}`);

  const result = await getPunMgpRange(start, end);
  const rows = result.decoded || [];

  const uniqueDates = [
    ...new Set(rows.map(r => String(r.FlowDate)))
  ].sort();

  console.log(`  Giorni trovati: ${uniqueDates.length}`);

  let imported = 0;

  for (const dateYYYYMMDD of uniqueDates) {
    const dayRows = rows.filter(
      r => String(r.FlowDate) === dateYYYYMMDD
    );

    const normalized = normalizePun(dayRows, dateYYYYMMDD);

    savePunToStorage(dateYYYYMMDD, normalized);

    imported++;

    console.log(
      `    OK ${dateYYYYMMDD} | ${normalized.average} €/MWh`
    );
  }

  return imported;
}

async function main() {
  const startDate = new Date('2023-01-01');
  const endDate = new Date();

  let currentStart = new Date(startDate);

  let totalImported = 0;
  let totalSkippedBlocks = 0;
  let totalErrors = 0;

  console.log('');
  console.log('====================================');
  console.log('PRECOG Historical PUN Import');
  console.log('====================================');
  console.log(`Periodo: ${formatDate(startDate)} -> ${formatDate(endDate)}`);
  console.log(`Blocco: ${BLOCK_DAYS} giorni`);
  console.log('');

  while (currentStart <= endDate) {
    let currentEnd = addDays(currentStart, BLOCK_DAYS - 1);

    if (currentEnd > endDate) {
      currentEnd = new Date(endDate);
    }

    const blockDates = [];
    let d = new Date(currentStart);

    while (d <= currentEnd) {
      blockDates.push(formatDate(d));
      d = addDays(d, 1);
    }

    const missingDates = blockDates.filter(
      dateYYYYMMDD => !fileExists(dateYYYYMMDD)
    );

    if (missingDates.length === 0) {
      totalSkippedBlocks++;
      console.log(
        `[SKIP BLOCCO] ${formatDate(currentStart)} -> ${formatDate(currentEnd)}`
      );

      currentStart = addDays(currentEnd, 1);
      continue;
    }

    try {
      const imported = await importBlock(currentStart, currentEnd);
      totalImported += imported;

      await sleep(SLEEP_MS);

    } catch (err) {
      totalErrors++;

      console.error(
        `[ERRORE BLOCCO] ${formatDate(currentStart)} -> ${formatDate(currentEnd)} | ${err.message}`
      );

      if (err.message.includes('429')) {
        console.error('');
        console.error('Rate limit GME raggiunto. Rilancia lo script tra qualche minuto.');
        break;
      }
    }

    currentStart = addDays(currentEnd, 1);
  }

  console.log('');
  console.log('====================================');
  console.log('IMPORT COMPLETATO');
  console.log('====================================');
  console.log(`Giorni importati : ${totalImported}`);
  console.log(`Blocchi saltati  : ${totalSkippedBlocks}`);
  console.log(`Errori           : ${totalErrors}`);
  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});