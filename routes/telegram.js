const express = require("express");
const router = express.Router();

const { sendTelegramMessage } = require("../services/telegramAlert");

router.post("/test", async (req, res) => {
  try {
    const message = `
⚠️ PRECOG Energy Alert

Messaggio Telegram di test.

Sistema alert correttamente collegato.
`;

    const result = await sendTelegramMessage(message);

    res.json({
      success: true,
      message: "Messaggio Telegram inviato correttamente",
      telegram: result
    });
  } catch (error) {
    console.error("Errore invio Telegram:", error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post("/test-fv", async (req, res) => {
  try {
    const message = `
☀️ PRECOG Energy | Alert FV CAP FVG

Messaggio Telegram di test.

✅ Canale Alert FV correttamente collegato.
`;

    const result = await sendTelegramMessage(
      message,
      process.env.TELEGRAM_FV_CHAT_ID
    );

    res.json({
      success: true,
      message: "Messaggio Telegram FV inviato correttamente",
      telegram: result
    });
  } catch (error) {
    console.error("Errore invio Telegram FV:", error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;