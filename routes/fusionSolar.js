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

module.exports = router;