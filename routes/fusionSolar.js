const express = require("express");
const router = express.Router();

const { fusionSolarLogin } = require("../services/fusionSolarClient");

router.get("/login-test", async (req, res) => {
  try {
    const result = await fusionSolarLogin();
    res.json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null
    });
  }
});

router.get("/stations", async (req, res) => {
  try {
    const { getFusionSolarStations } = require("../services/fusionSolarClient");

    const result = await getFusionSolarStations();

    res.json(result);
  } catch (error) {
    console.error("Errore lettura impianti FusionSolar:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null
    });
  }
});

module.exports = router;

