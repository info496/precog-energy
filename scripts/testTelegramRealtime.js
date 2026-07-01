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

const plantRealtimeList = realtimeData?.plants || [];

plantRealtimeList.forEach(p => {
  realtimeMap.set(p.code, p);
});

const devicesData = await getFusionSolarDevices(
  stationsData.stations.map(s => s.code)
);

const deviceList = devicesData?.data?.data || [];

const batteryDevices = deviceList.filter(
  d => d.devTypeId === 39
);

const batteryRealtime = await getFusionSolarDeviceRealtime(
  batteryDevices.map(d => d.id),
  39
);

const batteryRealtimeList =
  batteryRealtime?.data?.data?.data ||
  batteryRealtime?.data?.data ||
  [];

if (!batteryRealtimeList.length) {
  console.log("⚠️ Nessun dato realtime batteria:", batteryRealtime);
}

const batteryMap = new Map();

for (const battery of batteryDevices) {
  const rt = batteryRealtimeList.find(
    b => b.devId === battery.id
  );

  if (!rt) continue;

  batteryMap.set(
    battery.stationCode,
    rt.dataItemMap || {}
  );
}

const inverterDevices = deviceList.filter(
  d => d.devTypeId === 1
);

const inverterRealtime = await getFusionSolarDeviceRealtime(
  inverterDevices.map(d => d.id),
  1
);

const inverterRealtimeList =
  inverterRealtime?.data?.data?.data ||
  inverterRealtime?.data?.data ||
  [];

if (!inverterRealtimeList.length) {
  console.log("⚠️ Nessun dato realtime inverter:", inverterRealtime);
}

const inverterRealtimeMap = new Map();

inverterRealtimeList.forEach(inv => {
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

const battery = batteryMap.get(station.code);

let batteryLine = "";

if (!battery || battery.battery_soc == null) {

  batteryLine = `\n🔋 🔴 <b>OFFLINE</b>`;

} else {

  const charged =
    (battery.charge_cap || 0)
      .toFixed(2)
      .replace(".", ",");

  const discharged =
    (battery.discharge_cap || 0)
      .toFixed(2)
      .replace(".", ",");

  batteryLine =
`\n🔋 ${battery.battery_soc}% ⬆️ ${charged} kWh ⬇️ ${discharged} kWh`;

}

return `${rt.status.emoji} ${station.name}
⚡ ${currentPowerKw.toFixed(2).replace(".", ",")} kW | 📈 ${rt.todayEnergyKwh.toFixed(2).replace(".", ",")} kWh${batteryLine}`;

}).join("\n\n")}
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