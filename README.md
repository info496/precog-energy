# PRECOG Energy - Starter Render GME API

Backend Node.js/Express per leggere API GME, decodificare `contentResponse` Base64 ZIP e pubblicare un JSON PUN pronto per Flazio.

## Endpoint principali

- `GET /api/health`
- `POST /api/pun/update` con body opzionale `{ "date": "20260614" }`
- `GET /api/pun/latest`
- `GET /public/pun_latest.json`

## Variabili ambiente Render

```env
GME_BASE_URL=https://api.mercatoelettrico.org/request
GME_USERNAME=...
GME_PASSWORD=...
GME_TEST_DATE=20260614
```

## Avvio locale

```bash
npm install
cp .env.example .env
npm start
```

Poi test:

```bash
curl -X POST http://localhost:3000/api/pun/update -H "Content-Type: application/json" -d '{"date":"20260614"}'
curl http://localhost:3000/api/pun/latest
```

## Render

1. Caricare questo progetto su GitHub.
2. Render → New → Web Service.
3. Collegare il repository.
4. Build command: `npm install`
5. Start command: `npm start`
6. Inserire le variabili ambiente.

## Nota importante

Il cron interno `14:15 Europe/Rome` funziona solo se il servizio Render è attivo. Per affidabilità usare Render Cron Job che chiama:

```text
POST https://TUO-SERVIZIO.onrender.com/api/pun/update
```

nel primo pomeriggio dopo la pubblicazione GME.
