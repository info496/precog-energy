const axios = require("axios");

function getFusionSolarConfig() {
  const baseUrl = process.env.FUSIONSOLAR_BASE_URL;
  const username = process.env.FUSIONSOLAR_API_USER;
  const password = process.env.FUSIONSOLAR_API_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error("Variabili FusionSolar mancanti nel file .env");
  }

  return {
    baseUrl,
    username,
    password
  };
}

async function fusionSolarLogin() {
  const { baseUrl, username, password } = getFusionSolarConfig();

  const url = `${baseUrl}/thirdData/login`;

  const response = await axios.post(url, {
    userName: username,
    systemCode: password
  });

  return {
    success: true,
    data: response.data
  };
}

module.exports = {
  fusionSolarLogin
};