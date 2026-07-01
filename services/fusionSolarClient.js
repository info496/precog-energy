const axios = require("axios");

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

    return {
    success: true,
    data: response.data,
    headers: response.headers,
    token,
    cookies
  };
}

async function getFusionSolarStations() {
  const { baseUrl } = getFusionSolarConfig();

  const login = await fusionSolarLogin();

  if (!login.token) {
    throw new Error("Token FusionSolar non ricevuto dal login");
  }

  const response = await axios.post(
    `${baseUrl}/thirdData/stations`,
    {
      pageNo: 1,
      pageSize: 100
    },
    {
      headers: {
        "XSRF-TOKEN": login.token,
        Cookie: login.cookies ? login.cookies.join("; ") : ""
      }
    }
  );

    const stations = response.data.data.list || [];

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

async function getFusionSolarRealtime(stationCodes) {
  const { baseUrl } = getFusionSolarConfig();
  const { token, cookies } = await fusionSolarLogin();

  const response = await axios.post(
    `${baseUrl}/thirdData/getStationRealKpi`,
    {
      stationCodes: stationCodes.join(",")
    },
    {
      headers: {
        "Content-Type": "application/json",
        "XSRF-TOKEN": token,
        Cookie: cookies ? cookies.join("; ") : "",
        Accept: "application/json"
      }
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
  const { baseUrl } = getFusionSolarConfig();
  const { token, cookies } = await fusionSolarLogin();

  const response = await axios.post(
    `${baseUrl}/thirdData/getDevList`,
    {
      stationCodes: stationCodes.join(",")
    },
    {
      headers: {
        "Content-Type": "application/json",
        "XSRF-TOKEN": token,
        Cookie: cookies ? cookies.join("; ") : "",
        Accept: "application/json"
      }
    }
  );

  return {
    success: true,
    data: response.data
  };
}

async function getFusionSolarDeviceRealtime(devIds) {
  const { baseUrl } = getFusionSolarConfig();
  const { token, cookies } = await fusionSolarLogin();

  const response = await axios.post(
    `${baseUrl}/thirdData/getDevRealKpi`,
    {
      devIds: devIds.join(","),
      devTypeId: 1
    },
    {
      headers: {
        "Content-Type": "application/json",
        "XSRF-TOKEN": token,
        "x-xsrf-token": token,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookies ? cookies.join("; ") : "",
        Accept: "application/json"
      }
    }
  );

  return {
    success: true,
    data: response.data
  };
}

module.exports = {
  fusionSolarLogin,
  getFusionSolarStations,
  getFusionSolarRealtime,
  getFusionSolarDevices,
  getFusionSolarDeviceRealtime
};