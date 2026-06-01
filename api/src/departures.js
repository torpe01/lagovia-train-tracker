/**
 * departures.js
 * Core logic: search stations by substring, then fetch liveboards from iRail.
 *
 * iRail docs: https://docs.irail.be/
 * No API key required. Rate limit: 3 req/sec, 5 burst.
 */

const axios = require("axios");

const IRAIL_BASE = "https://api.irail.be";
const DEPARTURE_WINDOW_MINUTES = 15;
const MAX_STATIONS = 6; // cap parallel requests to respect iRail rate limits

// Shared axios instance with a descriptive User-Agent (iRail best practice)
const irail = axios.create({
  baseURL: IRAIL_BASE,
  timeout: 8000,
  headers: {
    "User-Agent": "lagovia-train-tracker/1.0.0 (github.com/your-username/lagovia-api)",
    Accept: "application/json",
  },
});

/**
 * Fetch all Belgian stations and filter by substring match.
 * iRail caches this endpoint heavily (ETags), so repeated calls are cheap.
 *
 * @param {string} query - substring to match against station names
 * @returns {Promise<Array>} matching station objects from iRail
 */
async function findStations(query) {
  const { data } = await irail.get("/stations/", {
    params: { format: "json", lang: "en" },
  });

  const lower = query.toLowerCase();
  const stations = data.station || [];

  return stations.filter((s) =>
    s.name.toLowerCase().includes(lower) ||
    (s.standardname && s.standardname.toLowerCase().includes(lower))
  );
}

/**
 * Fetch the liveboard for one station and filter to departures
 * within the next DEPARTURE_WINDOW_MINUTES minutes.
 *
 * @param {string} stationId - iRail station id (e.g. "BE.NMBS.008891009")
 * @param {string} stationName - human-readable name for the response
 * @returns {Promise<Object>} { id, name, departures: [...] }
 */
async function fetchLiveboard(stationId, stationName) {
  const { data } = await irail.get("/liveboard/", {
    params: {
      id: stationId,
      format: "json",
      lang: "en",
      arrdep: "departure",
      alerts: "false",
    },
  });

  const nowSec = Math.floor(Date.now() / 1000);
  const windowEndSec = nowSec + DEPARTURE_WINDOW_MINUTES * 60;

  const raw = data.departures?.departure || [];

  const departures = raw
    .filter((d) => {
      const scheduled = parseInt(d.time, 10);
      return scheduled >= nowSec && scheduled <= windowEndSec;
    })
    .map((d) => ({
      train: d.vehicle.replace("BE.NMBS.", "").replace(/\./g, " ").trim(),
      destination: d.station,
      scheduledTime: formatTime(parseInt(d.time, 10)),
      scheduledTimestamp: parseInt(d.time, 10),
      delayMinutes: Math.round(parseInt(d.delay, 10) / 60),
      canceled: d.canceled === "1",
      platform: d.platform || null,
    }));

  return {
    id: stationId,
    name: stationName,
    departures,
  };
}

/**
 * Main export: find stations matching query, fetch their liveboards,
 * return only departures within the next 15 minutes.
 *
 * @param {string} query - at least 3 chars (enforced in route handler)
 * @returns {Promise<Object>} full response object
 */
async function getDepartures(query) {
  // 1. Find matching stations
  const matched = await findStations(query);
  const capped = matched.slice(0, MAX_STATIONS);

  // 2. Fetch all liveboards in parallel
  const results = await Promise.allSettled(
    capped.map((s) => fetchLiveboard(s.id, s.name))
  );

  // 3. Collect fulfilled results; log failures
  const stations = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      stations.push(result.value);
    } else {
      console.warn("[liveboard] failed:", result.reason?.message);
    }
  }

  return {
    query,
    generatedAt: new Date().toISOString(),
    windowMinutes: DEPARTURE_WINDOW_MINUTES,
    stationsFound: matched.length,
    stationsQueried: capped.length,
    stations,
  };
}

/**
 * Convert a Unix timestamp (seconds) to "HH:MM" in Belgium local time.
 */
function formatTime(unixSec) {
  return new Date(unixSec * 1000).toLocaleTimeString("en-BE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Brussels",
  });
}

module.exports = { getDepartures };
