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

module.exports = {
  fusionSolarLogin,
  getFusionSolarStations
};