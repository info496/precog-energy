const axios = require("axios");

async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID mancanti nel file .env");
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML"
  });

  return response.data;
}

module.exports = {
  sendTelegramMessage
};