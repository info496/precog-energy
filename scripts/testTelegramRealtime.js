require("dotenv").config();

const {
  getFusionSolarStations,
  getFusionSolarRealtime,
  getFusionSolarDevices,
  getFusionSolarDeviceRealtime
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


const devicesData = await getFusionSolarDevices(
  stationsData.stations.map(s => s.code)
);

const inverterDevices = devicesData.data.data.filter(
  d => d.devTypeId === 1
);

const inverterRealtime = await getFusionSolarDeviceRealtime(
  inverterDevices.map(d => d.id)
);

const inverterRealtimeMap = new Map();

inverterRealtime.data.data.forEach(inv => {
  inverterRealtimeMap.set(inv.devId, inv.dataItemMap || {});
});

const powerByStation = new Map();

for (const inverter of inverterDevices) {
  const kpi = inverterRealtimeMap.get(inverter.id);
  const power = kpi?.active_power || 0;

  const current = powerByStation.get(inverter.stationCode) || 0;
  powerByStation.set(inverter.stationCode, current + power);
}

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

const currentPowerKw = powerByStation.get(station.code) || 0;

return `${rt.status.emoji} ${station.name}
⚡ ${currentPowerKw.toFixed(2).replace(".", ",")} kW | 📈 ${rt.todayEnergyKwh.toFixed(2).replace(".", ",")} kWh`;

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