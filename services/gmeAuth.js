const axios = require('axios');

async function getGmeToken() {
  const baseUrl = process.env.GME_BASE_URL;
  const login = process.env.GME_USERNAME;
  const password = process.env.GME_PASSWORD;

  if (!baseUrl || !login || !password) {
    throw new Error('Variabili GME mancanti: GME_BASE_URL, GME_USERNAME, GME_PASSWORD');
  }

  const url = `${baseUrl}/api/v1/Auth`;
  const response = await axios.post(url, {
    Login: login,
    Password: password
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  const data = response.data;
  if (!data.success && !data.Success) {
    throw new Error(`Login GME fallito: ${data.reason || data.Reason || 'motivo non specificato'}`);
  }

  const token = data.token || data.Token;
  if (!token) throw new Error('Token GME non presente nella risposta');

  return token;
}

module.exports = { getGmeToken };
