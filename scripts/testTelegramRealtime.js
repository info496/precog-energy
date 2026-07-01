require("dotenv").config();

const {
  getFusionSolarStations,
  getFusionSolarRealtime
} = require("../services/fusionSolarClient");

const {
  sendTelegramMessage
} = require("../services/telegramAlert");

(async () => {
  try {

    const stationsData = await getFusionSolarStations();

    const realtimeData = await getFusionSolarRealtime(
      stationsData.stations.map(s => s.code)
    );

    const realtimeMap = new Map();

    realtimeData.plants.forEach(p => {
      realtimeMap.set(p.code, p);
    });

    let faults = 0;
    const lines = [];

    for (const station of stationsData.stations) {

      const rt = realtimeMap.get(station.code);

      if (!rt) continue;

      if (rt.status.code === "FAULT") faults++;

      lines.push(
        `${rt.status.emoji} ${station.name}\n` +
        `   Stato: ${rt.status.label}\n` +
        `   Produzione oggi: ${rt.todayEnergyKwh.toFixed(2)} kWh`
      );
    }


const operativi = stationsData.total - faults;

const message =
`☀️ PRECOG Energy | Monitor FV
🟢 FusionSolar ONLINE
──────────────────
🎯 Impianti: ${stationsData.total}
🟢 Operativi: ${operativi}
🔴 Guasti: ${faults}
──────────────────
${stationsData.stations.map(station => {

  const rt = realtimeMap.get(station.code);

  return `${rt.status.emoji} ${station.name}
📈 ${rt.todayEnergyKwh.toFixed(2).replace(".", ",")} kWh`;

}).join("\n")}

──────────────────
🤖 Powered by PRECOG Energy`;

    await sendTelegramMessage(
      message,
      process.env.TELEGRAM_FV_CHAT_ID
    );

    console.log("✅ Messaggio Telegram inviato.");

  } catch (err) {

    console.error(err);

  }
})();