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

router.get("/device-realtime", async (req, res) => {

  try {

    const {
      getFusionSolarStations,
      getFusionSolarDevices,
      getFusionSolarDeviceRealtime
    } = require("../services/fusionSolarClient");

    const stations = await getFusionSolarStations();

    const devices = await getFusionSolarDevices(
      stations.stations.map(s => s.code)
    );

   const inverterIds =
  devices.data.data
    .filter(d => d.devTypeId === 1)
    .map(d => d.id);

    const realtime =
      await getFusionSolarDeviceRealtime(inverterIds);

    res.json({
      success: true,
      realtime
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
      details: err.response?.data || null
    });

  }

});

router.get("/battery-realtime", async (req, res) => {
  try {
    const {
      getFusionSolarStations,
      getFusionSolarDevices,
      getFusionSolarDeviceRealtime
    } = require("../services/fusionSolarClient");

    const stations = await getFusionSolarStations();

    const devices = await getFusionSolarDevices(
      stations.stations.map(s => s.code)
    );

    const batteries =
      devices.data.data
        .filter(d => d.devTypeId === 39)
        .map(d => ({
          id: d.id,
          name: d.devName,
          model: d.model,
          stationCode: d.stationCode
        }));

    const realtime = await getFusionSolarDeviceRealtime(
      batteries.map(b => b.id),
      39
    );

    res.json({
      success: true,
      batteries,
      realtime
    });

  } catch (err) {
    console.error("Errore batterie FusionSolar:", err.message);

    res.status(500).json({
      success: false,
      message: err.message,
      details: err.response?.data || null
    });
  }
});

module.exports = router;

