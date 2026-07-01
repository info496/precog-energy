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

  return {
    success: true,
    data: response.data
  };
}

module.exports = {
  fusionSolarLogin,
  getFusionSolarStations
};