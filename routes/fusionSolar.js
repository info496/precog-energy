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

router.get("/realtime", async (req, res) => {
  try {
    const {
      getFusionSolarStations,
      getFusionSolarRealtime
    } = require("../services/fusionSolarClient");

    const stationsData = await getFusionSolarStations();

    const stationCodes = stationsData.stations.map(station => station.code);

    const realtimeData = await getFusionSolarRealtime(stationCodes);

    res.json({
      success: true,
      stations: stationsData.stations,
      realtime: realtimeData
    });
  } catch (error) {
    console.error("Errore realtime FusionSolar:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null
    });
  }
});

router.get("/devices", async (req, res) => {
  try {
    const {
      getFusionSolarStations,
      getFusionSolarDevices
    } = require("../services/fusionSolarClient");

    const stationsData = await getFusionSolarStations();

    const stationCodes = stationsData.stations.map(station => station.code);

    const devicesData = await getFusionSolarDevices(stationCodes);

    res.json({
      success: true,
      stations: stationsData.stations,
      devices: devicesData
    });
  } catch (error) {
    console.error("Errore dispositivi FusionSolar:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
      details: error.response?.data || null
    });
  }
});

module.exports = router;

