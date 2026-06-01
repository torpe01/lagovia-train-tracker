const express = require("express");
const cors = require("cors");
const { getDepartures } = require("./departures");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * GET /departures?q=<station_substring>
 *
 * Success shape:
 * {
 *   "query": "Bru",
 *   "generatedAt": "2024-06-01T10:30:00.000Z",
 *   "stations": [
 *     {
 *       "id": "BE.NMBS.008891009",
 *       "name": "Brussel-Centraal",
 *       "departures": [
 *         {
 *           "train": "IC 1234",
 *           "destination": "Gent-Sint-Pieters",
 *           "scheduledTime": "10:35",
 *           "scheduledTimestamp": 1717234500,
 *           "delayMinutes": 2,
 *           "canceled": false,
 *           "platform": "3"
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * Error shape (400):
 * {
 *   "error": "QUERY_TOO_SHORT",
 *   "message": "Query must be at least 3 characters.",
 *   "minLength": 3,
 *   "received": 2
 * }
 */
app.get("/departures", async (req, res) => {
  const q = (req.query.q || "").trim();

  if (q.length < 3) {
    return res.status(400).json({
      error: "QUERY_TOO_SHORT",
      message: "Query must be at least 3 characters.",
      minLength: 3,
      received: q.length,
    });
  }

  try {
    const result = await getDepartures(q);
    return res.json(result);
  } catch (err) {
    console.error("[/departures] error:", err.message);
    return res.status(502).json({
      error: "UPSTREAM_ERROR",
      message: "Failed to fetch data from iRail. Please try again.",
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found." });
});

app.listen(PORT, () => {
  console.log("Lagovia API running on http://localhost:" + PORT);
  console.log("   Try: http://localhost:" + PORT + "/departures?q=Bru");
});
