import { createRequire } from "module";
const require = createRequire(import.meta.url);
let openingBalanceMap = {};
try { openingBalanceMap = require("../../frontend/src/data/openingBalance.json"); }
catch { openingBalanceMap = {}; }

const TWS_BASE = "https://rentalapi.rootments.live/api/GetBooking";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache: key -> { data, expiresAt }
const cache = new Map();

const ALL_STORES = [
  { locName: "Z-Edapally1",      locCode: "144" },
  { locName: "G-Edappally",      locCode: "702" },
  { locName: "SG-Trivandrum",    locCode: "700" },
  { locName: "Z- Edappal",       locCode: "100" },
  { locName: "Z.Perinthalmanna", locCode: "133" },
  { locName: "Z.Kottakkal",      locCode: "122" },
  { locName: "G.Kottayam",       locCode: "701" },
  { locName: "G.Perumbavoor",    locCode: "703" },
  { locName: "G.Thrissur",       locCode: "704" },
  { locName: "G.Chavakkad",      locCode: "706" },
  { locName: "G.Calicut",        locCode: "712" },
  { locName: "G.Vadakara",       locCode: "708" },
  { locName: "G.Edappal",        locCode: "707" },
  { locName: "G.Perinthalmanna", locCode: "709" },
  { locName: "G.Kottakkal",      locCode: "711" },
  { locName: "G.Manjeri",        locCode: "710" },
  { locName: "G.Palakkad",       locCode: "705" },
  { locName: "G.Kalpetta",       locCode: "717" },
  { locName: "G.Kannur",         locCode: "716" },
  { locName: "G.Mg Road",        locCode: "718" },
];

const getMonthStart = (iso) => iso.slice(0, 7) + "-01";
const dayBefore = (iso) => {
  const d = new Date(iso); d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};
const getManualOpening = (locCode, date) =>
  openingBalanceMap[locCode]?.[getMonthStart(date)] ?? null;

const safeFetch = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
};

const processStore = async (s, fromDate, toDate) => {
  const monthStart  = getMonthStart(fromDate);
  const manualOpen  = getManualOpening(s.locCode, fromDate);
  const prevDay     = dayBefore(fromDate);
  const openFrom    = manualOpen !== null ? monthStart : "2025-01-01";
  const skipOpen    = fromDate === monthStart && manualOpen !== null;

  const [openRent, openRet, txRent, txRet] = await Promise.all([
    skipOpen ? Promise.resolve({}) : safeFetch(`${TWS_BASE}/GetRentoutList?LocCode=${s.locCode}&DateFrom=${openFrom}&DateTo=${prevDay}`),
    skipOpen ? Promise.resolve({}) : safeFetch(`${TWS_BASE}/GetReturnList?LocCode=${s.locCode}&DateFrom=${openFrom}&DateTo=${prevDay}`),
    safeFetch(`${TWS_BASE}/GetRentoutList?LocCode=${s.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`),
    safeFetch(`${TWS_BASE}/GetReturnList?LocCode=${s.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`),
  ]);

  let opening = 0;
  if (manualOpen !== null) {
    if (skipOpen) {
      opening = manualOpen;
    } else {
      const oIn  = (openRent?.dataSet?.data || []).reduce((a, t) => a + +(t.securityAmount || 0), 0);
      const oOut = (openRet?.dataSet?.data  || []).reduce((a, t) => a + +(t.securityAmount || 0), 0);
      opening = manualOpen + (oIn - oOut);
    }
  } else {
    const oIn  = (openRent?.dataSet?.data || []).reduce((a, t) => a + +(t.securityAmount || 0), 0);
    const oOut = (openRet?.dataSet?.data  || []).reduce((a, t) => a + +(t.securityAmount || 0), 0);
    opening = oIn - oOut;
  }

  const secIn      = opening + (txRent?.dataSet?.data || []).reduce((a, t) => a + +(t.securityAmount  || 0), 0);
  const secOutCash = (txRet?.dataSet?.data || []).reduce((a, t) => a + +(t.returnCashAmount || 0), 0);
  const secOutRbl  = (txRet?.dataSet?.data || []).reduce((a, t) => a + +(t.rblRazorPay     || 0), 0);

  return { store: s.locName, locCode: s.locCode, secIn, secOutCash, secOutRbl, diff: secIn - (secOutCash + secOutRbl) };
};

// In-flight deduplication: if same key is already being fetched, wait for it
const inFlight = new Map();

export const getSecurityReportAllStores = async (req, res) => {
  const { fromDate, toDate, refresh } = req.query;
  if (!fromDate || !toDate)
    return res.status(400).json({ message: "fromDate and toDate are required" });

  const cacheKey = `${fromDate}__${toDate}`;

  // Return cached result if fresh and not forced refresh
  if (refresh !== "1") {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[SecurityReport] Cache HIT for ${cacheKey}`);
      return res.json({ data: cached.data, cached: true });
    }
  }

  // Deduplicate concurrent identical requests
  if (inFlight.has(cacheKey)) {
    console.log(`[SecurityReport] Waiting for in-flight request: ${cacheKey}`);
    try {
      const data = await inFlight.get(cacheKey);
      return res.json({ data, cached: false });
    } catch (err) {
      return res.status(500).json({ message: "Fetch failed", error: err.message });
    }
  }

  // Start fetch and register as in-flight
  const fetchPromise = Promise.all(ALL_STORES.map(s => processStore(s, fromDate, toDate)));
  inFlight.set(cacheKey, fetchPromise);

  try {
    console.log(`[SecurityReport] Fetching all stores for ${cacheKey}`);
    const results = await fetchPromise;
    cache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
    inFlight.delete(cacheKey);
    res.json({ data: results, cached: false });
  } catch (err) {
    inFlight.delete(cacheKey);
    console.error("SecurityReport error:", err);
    res.status(500).json({ message: "Failed to fetch security report", error: err.message });
  }
};
