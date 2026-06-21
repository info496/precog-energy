const axios = require('axios');
const { getGmeToken } = require('./gmeAuth');
const { decodeBase64ZipToJson } = require('./decodeGmeZip');

async function requestGmeData(payload) {
  const token = await getGmeToken();
  const baseUrl = process.env.GME_BASE_URL;
  const url = `${baseUrl}/api/v1/RequestData`;

  const response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    timeout: 60000
  });

  const data = response.data;
  if (data.resultRequest || data.ResultRequest) {
    throw new Error(`RequestData GME fallita: ${data.resultRequest || data.ResultRequest}`);
  }

  const content = data.contentResponse || data.ContentResponse;
  const decoded = decodeBase64ZipToJson(content);

  return {
    requestId: data.requestId || data.RequestId,
    formatType: data.formatType || data.FormatType,
    decoded
  };
}

async function getPunMgp(dateYYYYMMDD) {
  return requestGmeData({
    Platform: 'PublicMarketResults',
    Segment: 'MGP',
    DataName: 'ME_ZonalPrices',
    IntervalStart: Number(dateYYYYMMDD),
    IntervalEnd: Number(dateYYYYMMDD),
    Attributes: {}
  });
}

module.exports = { requestGmeData, getPunMgp };
