const axios = require('axios');

const {
  getGmeToken,
  clearGmeToken
} = require('./gmeAuth');

const { decodeBase64ZipToJson } = require('./decodeGmeZip');

async function requestGmeData(payload) {

  const baseUrl = process.env.GME_BASE_URL;
  const url = `${baseUrl}/api/v1/RequestData`;

  for (let attempt = 1; attempt <= 2; attempt++) {

    const token = await getGmeToken();

    try {

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        timeout: 60000
      });

      const data = response.data;

      if (data.resultRequest || data.ResultRequest) {
        throw new Error(
          data.resultRequest || data.ResultRequest
        );
      }

      const content =
        data.contentResponse || data.ContentResponse;

      return {
        requestId: data.requestId || data.RequestId,
        formatType: data.formatType || data.FormatType,
        decoded: decodeBase64ZipToJson(content)
      };

    } catch (err) {

      const status = err.response?.status;
      const message =
  err.response?.data?.data?.resultRequest ||
  err.response?.data?.resultRequest ||
  err.response?.data?.ResultRequest ||
  err.message;

      if (
        attempt === 1 &&
        (
          status === 401 ||
          String(message).toLowerCase().includes("token expired")
        )
      ) {

        console.warn(
          "[GME] Token scaduto, nuovo login..."
        );

        clearGmeToken();

        continue;
      }

      throw err;
    }
  }
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

async function getPunMgpRange(startDateYYYYMMDD, endDateYYYYMMDD) {
  return requestGmeData({
    Platform: 'PublicMarketResults',
    Segment: 'MGP',
    DataName: 'ME_ZonalPrices',
    IntervalStart: Number(startDateYYYYMMDD),
    IntervalEnd: Number(endDateYYYYMMDD),
    Attributes: {}
  });
}

module.exports = {
  requestGmeData,
  getPunMgp,
  getPunMgpRange
};