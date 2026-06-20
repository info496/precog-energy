require('dotenv').config();
const express = require('express');
const cors = require('cors');
const punRoutes = require('./routes/pun');
const { updatePunToday } = require('./cron/updatePun');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/public', express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/pun', punRoutes);

// Aggiornamento automatico: controlla ogni giorno nel primo pomeriggio.
// Su Render free il cron interno funziona solo se il servizio è attivo.
// In produzione è meglio usare Render Cron Job separato che chiama /api/pun/update.
const cron = require('node-cron');

if (process.env.ENABLE_INTERNAL_CRON === 'true') {
  cron.schedule('15 14 * * *', async () => {
    console.log('[CRON] Avvio aggiornamento PUN 14:15');
    try {
      await updatePunToday();
      console.log('[CRON] Aggiornamento PUN completato');
    } catch (err) {
      console.error('[CRON] Errore aggiornamento PUN:', err.message);
    }
  }, { timezone: 'Europe/Rome' });

  console.log('[CRON] Internal cron ENABLED');
} else {
  console.log('[CRON] Internal cron DISABLED');
}
app.listen(PORT, () => {
  console.log(`PRECOG Energy API listening on port ${PORT}`);
});
