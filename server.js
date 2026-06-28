require('dotenv').config();
const express = require('express');
const cors = require('cors');
const punRoutes = require('./routes/pun');
const telegramRoutes = require('./routes/telegram');
const {
  updatePunToday,
  updatePunTomorrow
} = require('./cron/updatePun');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/public', express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  });
});

app.use('/api/pun', punRoutes);
app.use('/api/telegram', telegramRoutes);

const cron = require('node-cron');

if (process.env.ENABLE_INTERNAL_CRON === 'true') {

  // Aggiornamento PUN del giorno corrente
  cron.schedule('15 14 * * *', async () => {
    console.log('[CRON] Avvio aggiornamento PUN oggi 14:15');

    try {
      await updatePunToday();
      console.log('[CRON] Aggiornamento PUN oggi completato');
    } catch (err) {
      console.error(
        '[CRON] Errore aggiornamento PUN oggi:',
        err.message
      );
    }
  }, {
    timezone: 'Europe/Rome'
  });

  // Tentativi pubblicazione PUN D+1
  cron.schedule('15,30 13 * * *', async () => {
    console.log('[CRON] Tentativo aggiornamento PUN D+1');

    try {
      const data = await updatePunTomorrow();

      console.log(
        `[CRON] PUN D+1 aggiornato: ${data.date} ${data.average}`
      );
    } catch (err) {
      console.log(
        '[CRON] PUN D+1 non ancora disponibile'
      );
    }
  }, {
    timezone: 'Europe/Rome'
  });

  cron.schedule('0,15 14 * * *', async () => {
    console.log('[CRON] Tentativo aggiornamento PUN D+1');

    try {
      const data = await updatePunTomorrow();

      console.log(
        `[CRON] PUN D+1 aggiornato: ${data.date} ${data.average}`
      );
    } catch (err) {
      console.log(
        '[CRON] PUN D+1 non ancora disponibile'
      );
    }
  }, {
    timezone: 'Europe/Rome'
  });

  console.log('[CRON] Internal cron ENABLED');

} else {

  console.log('[CRON] Internal cron DISABLED');

}

app.listen(PORT, () => {
  console.log(
    `PRECOG Energy API listening on port ${PORT}`
  );
});