const axios = require("axios");

let cachedSession = null;

function getFusionSolarConfig() {
  const baseUrl = process.env.FUSIONSOLAR_BASE_URL;
  const username = process.env.FUSIONSOLAR_API_USER;
  const password = process.env.FUSIONSOLAR_API_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error("Variabili FusionSolar mancanti nel file .env");
  }

  return { baseUrl, username, password };
}

async function fusionSolarLogin() {
  const { baseUrl, username, password } = getFusionSolarConfig();

  const response = await axios.post(`${baseUrl}/thirdData/login`, {
    userName: username,
    systemCode: password
  });

  const token =
    response.headers["xsrf-token"] ||
    response.headers["x-xsrf-token"] ||
    response.headers["XSRF-TOKEN"];

  const cookies = response.headers["set-cookie"];

  if (!token) {
    throw new Error("Token FusionSolar non ricevuto dal login");
  }

  cachedSession = {
    token,
    cookies,
    createdAt: Date.now()
  };

  return {
    success: true,
    data: response.data,
    token,
    cookies
  };
}

async function getFusionSolarSession(forceLogin = false) {
  const maxAgeMs = 10 * 60 * 1000;

  if (
    !forceLogin &&
    cachedSession &&
    Date.now() - cachedSession.createdAt < maxAgeMs
  ) {
    return cachedSession;
  }

  return fusionSolarLogin();
}

function buildFusionSolarHeaders(session) {
  return {
    "Content-Type": "application/json",
    "XSRF-TOKEN": session.token,
    "xsrf-token": session.token,
    "x-xsrf-token": session.token,
    "X-Requested-With": "XMLHttpRequest",
    Cookie: session.cookies ? session.cookies.join("; ") : "",
    Accept: "application/json"
  };
}

async function fusionSolarPost(path, body, retry = true) {
  const { baseUrl } = getFusionSolarConfig();
  let session = await getFusionSolarSession();

  let response = await axios.post(
    `${baseUrl}${path}`,
    body,
    {
      headers: buildFusionSolarHeaders(session)
    }
  );

  if (retry && response.data?.failCode === 305) {
    console.log("[FusionSolar] USER_MUST_RELOGIN, rinnovo sessione...");
    session = await getFusionSolarSession(true);

    response = await axios.post(
      `${baseUrl}${path}`,
      body,
      {
        headers: buildFusionSolarHeaders(session)
      }
    );
  }

  return response;
}

function mapFusionSolarHealthState(value) {
  switch (value) {
    case 3:
      return {
        code: "NORMAL",
        label: "Normale",
        emoji: "🟢"
      };

    case 2:
      return {
        code: "FAULT",
        label: "Guasto",
        emoji: "🔴"
      };

    default:
      return {
        code: "UNKNOWN",
        label: `Sconosciuto (${value})`,
        emoji: "⚪"
      };
  }
}

async function getFusionSolarStations() {
  const response = await fusionSolarPost(
    "/thirdData/stations",
    {
      pageNo: 1,
      pageSize: 100
    }
  );

  const stations = response.data.data?.list || [];

  const totalCapacityKw = stations.reduce(
    (sum, station) => sum + (station.capacity || 0),
    0
  );

  return {
    success: true,
    total: stations.length,
    totalCapacityKw,
    stations: stations.map(station => ({
      name: station.plantName,
      code: station.plantCode,
      capacityKw: station.capacity,
      address: station.plantAddress,
      latitude: station.latitude,
      longitude: station.longitude,
      gridConnectionDate: station.gridConnectionDate
    }))
  };
}

async function getFusionSolarRealtime(stationCodes) {
  const response = await fusionSolarPost(
    "/thirdData/getStationRealKpi",
    {
      stationCodes: stationCodes.join(",")
    }
  );

  const realtimeList = response.data.data || [];

  return {
    success: true,
    updatedAt: response.data.params?.currentTime || null,
    plants: realtimeList.map(item => {
      const kpi = item.dataItemMap || {};
      const status = mapFusionSolarHealthState(kpi.real_health_state);

      return {
        code: item.stationCode,
        status,
        todayEnergyKwh: kpi.day_power || 0,
        totalEnergyKwh: kpi.total_power || 0,
        todayGridEnergyKwh: kpi.day_on_grid_energy || 0,
        todaySelfUseEnergyKwh: kpi.day_use_energy || 0,
        monthEnergyKwh: kpi.month_power || 0
      };
    })
  };
}

async function getFusionSolarDevices(stationCodes) {
  const response = await fusionSolarPost(
    "/thirdData/getDevList",
    {
      stationCodes: stationCodes.join(",")
    }
  );

  return {
    success: response.data?.success === true,
    data: response.data
  };
}

async function getFusionSolarDeviceRealtime(devIds, devTypeId = 1) {
  const response = await fusionSolarPost(
    "/thirdData/getDevRealKpi",
    {
      devIds: devIds.join(","),
      devTypeId
    }
  );

  return {
    success: response.data?.success === true,
    data: response.data
  };
}

async function getFusionSolarAlarms(stationCodes) {
  const response = await fusionSolarPost(
    "/thirdData/getAlarmList",
    {
      stationCodes: stationCodes.join(","),
      pageNo: 1,
      pageSize: 100
    }
  );

  return {
    success: response.data?.success === true,
    data: response.data
  };
}

module.exports = {
  fusionSolarLogin,
  getFusionSolarStations,
  getFusionSolarRealtime,
  getFusionSolarDevices,
  getFusionSolarDeviceRealtime,
  getFusionSolarAlarms
};