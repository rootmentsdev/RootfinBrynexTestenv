/*  ────────────────────────────────────────────────
 *  Security.jsx  – hybrid opening-balance logic
 *  ────────────────────────────────────────────────*/
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { CSVLink } from "react-csv";
import Headers from "../components/Header.jsx";
import useFetch from "../hooks/useFetch.jsx";
import openingBalanceMap from "../data/openingBalance.json";
import { useSidebar } from "../hooks/useSidebar.js";
import { ArrowLeft, Calendar, Download, Printer, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ---------- CSV helpers ---------- */
const csvHeaders = [
  { label: "Date", key: "date" },      { label: "Invoice", key: "invoice" },
  { label: "Customer", key: "customer" }, { label: "Category", key: "category" },
  { label: "Sub", key: "sub" },        { label: "Security In", key: "secIn" },
  { label: "Security Out (Cash)", key: "secOutCash" },
  { label: "Security Out (Razorpay)", key: "secOutRbl" },
  { label: "Difference", key: "difference" },
];
const csvHeadersAllStores = [
  { label: "Store", key: "store" }, { label: "LocCode", key: "locCode" },
  { label: "Security In", key: "secIn" },
  { label: "Security Out (Cash)", key: "secOutCash" },
  { label: "Security Out (Razorpay)", key: "secOutRbl" },
  { label: "Difference", key: "difference" },
];

/* ---------- Store master list ---------- */
const AllLoation = [
  { locName: "Z-Edapally1",   locCode: "144" },
  { locName: "G-Edappally",   locCode: "702" },
  { locName: "SG-Trivandrum", locCode: "700" },
  { locName: "Z- Edappal",    locCode: "100" },
  { locName: "Z.Perinthalmanna", locCode: "133" },
  { locName: "Z.Kottakkal",   locCode: "122" },
  { locName: "G.Kottayam",    locCode: "701" },
  { locName: "G.Perumbavoor", locCode: "703" },
  { locName: "G.Thrissur",    locCode: "704" },
  { locName: "G.Chavakkad",   locCode: "706" },
  { locName: "G.Calicut",     locCode: "712" },
  { locName: "G.Vadakara",    locCode: "708" },
  { locName: "G.Edappal",     locCode: "707" },
  { locName: "G.Perinthalmanna", locCode: "709" },
  { locName: "G.Kottakkal",   locCode: "711" },
  { locName: "G.Manjeri",     locCode: "710" },
  { locName: "G.Palakkad",    locCode: "705" },
  { locName: "G.Kalpetta",    locCode: "717" },
  { locName: "G.Kannur",      locCode: "716" },
  { locName: "G.Mg Road",     locCode: "718" },
];
const getStoreName = (c) => AllLoation.find((l) => l.locCode === c)?.locName || "Unknown";

/* ---------- helpers ---------- */
const getMonthStart = (iso) => iso.slice(0, 7) + "-01";           // YYYY-MM-01
const getManualOpening = (locCode, date) =>
  openingBalanceMap[locCode]?.[getMonthStart(date)] ?? null;
const dayBefore = (iso) => {
  const d = new Date(iso); d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

const formatNumber = (num) => {
  if (!num || isNaN(num) || num === 0) return "0";
  return new Intl.NumberFormat('en-IN').format(num);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const datePart = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  return (
    <div className="flex flex-col">
      <span>{datePart}</span>
      <span className="text-[10px] text-gray-400">{timePart}</span>
    </div>
  );
};

const Security = () => {
  const navigate = useNavigate();
  const isSidebarOpen = useSidebar();
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const firstOfMonth = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-01`;
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate,   setToDate]   = useState(today);
  const [selectedStore, setSelectedStore] = useState("current"); // "current" | "all" | "cluster"
  const [rentAll, setRentAll]     = useState([]); // all-store mode
  const [returnAll, setReturnAll] = useState([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [allStoreOpenings, setAllStoreOpenings] = useState({}); // locCode -> opening balance

  const user = JSON.parse(localStorage.getItem("rootfinuser"));
  const isClusterManager = (user?.role || "").toLowerCase() === "cluster_manager";
  const clusterStores = isClusterManager
    ? AllLoation.filter(s => (user.allowedLocCodes || []).includes(s.locCode))
    : [];
  const baseAPI = "https://rentalapi.brynex.live/api/GetBooking";

  const [loading, setLoading] = useState(false);

  /* ---------- hybrid opening-balance calc ---------- */
  const calcOpeningCash = async () => {
    if (selectedStore !== "current") return;

    const loc = user.locCode;
    const manualOpen = getManualOpening(loc, fromDate);

    /* ——— NEW LOGIC path ——— */
    if (manualOpen !== null) {
      const monthStart = getMonthStart(fromDate);
      if (fromDate === monthStart) { setOpeningCash(manualOpen); return; }

      const urlIn  = `${baseAPI}/GetRentoutList?LocCode=${loc}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`;
      const urlOut = `${baseAPI}/GetReturnList?LocCode=${loc}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`;

      try {
        const [r1, r2] = await Promise.all([fetch(urlIn), fetch(urlOut)]);
        const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
        const secIn  = (j1?.dataSet?.data || []).reduce((s,t)=>s + +(t.securityAmount||0),0);
        const secOut = (j2?.dataSet?.data || []).reduce((s,t)=>s + +(t.securityAmount||0),0);
        setOpeningCash(manualOpen + (secIn - secOut));
        return;
      } catch {
        setOpeningCash(manualOpen);   // graceful fallback
        return;
      }
    }

    /* ——— OLD LOGIC path ——— */
    try {
      const urlIn  = `${baseAPI}/GetRentoutList?LocCode=${loc}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`;
      const urlOut = `${baseAPI}/GetReturnList?LocCode=${loc}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`;
      const [r1, r2] = await Promise.all([fetch(urlIn), fetch(urlOut)]);
      const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
      const secIn  = (j1?.dataSet?.data || []).reduce((s,t)=>s + +(t.securityAmount||0),0);
      const secOut = (j2?.dataSet?.data || []).reduce((s,t)=>s + +(t.securityAmount||0),0);
      setOpeningCash(secIn - secOut);
    } catch {
      setOpeningCash(0);
    }
  };

  /* run calc when store/date changes (current-store mode) */
  useEffect(() => { if (selectedStore==="current") calcOpeningCash(); },
            [selectedStore, fromDate, user.locCode]);

  /* ---------- data fetch for current store ---------- */
  const apiRentCur = `${baseAPI}/GetRentoutList?LocCode=${user.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
  const apiRetCur  = `${baseAPI}/GetReturnList?LocCode=${user.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
  const fetchOpts = useMemo(()=>({}),[]);
  const { data: rentData } = useFetch(selectedStore==="current"?apiRentCur:null, fetchOpts);
  const { data: retData  } = useFetch(selectedStore==="current"?apiRetCur :null, fetchOpts);

  /* ---------- handleFetch (all-store / cluster mode) ---------- */
  const handleFetch = async () => {
    if (selectedStore !== "all" && selectedStore !== "cluster") { await calcOpeningCash(); return; }

    setLoading(true);
    const storesToFetch = selectedStore === "cluster" ? clusterStores : AllLoation;
    const tmpRent=[], tmpRet=[];
    const openingMap = {};

    for (const store of storesToFetch) {
      const u1=`${baseAPI}/GetRentoutList?LocCode=${store.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const u2=`${baseAPI}/GetReturnList?LocCode=${store.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;

      // Calculate opening balance for this store (same logic as calcOpeningCash)
      const manualOpen = getManualOpening(store.locCode, fromDate);
      try {
        if (manualOpen !== null) {
          const monthStart = getMonthStart(fromDate);
          if (fromDate === monthStart) {
            openingMap[store.locCode] = manualOpen;
          } else {
            const [oR1, oR2] = await Promise.all([
              fetch(`${baseAPI}/GetRentoutList?LocCode=${store.locCode}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`),
              fetch(`${baseAPI}/GetReturnList?LocCode=${store.locCode}&DateFrom=${monthStart}&DateTo=${dayBefore(fromDate)}`),
            ]);
            const [oj1, oj2] = await Promise.all([oR1.json(), oR2.json()]);
            const oSecIn  = (oj1?.dataSet?.data || []).reduce((acc,t)=>acc + +(t.securityAmount||0),0);
            const oSecOut = (oj2?.dataSet?.data || []).reduce((acc,t)=>acc + +(t.securityAmount||0),0);
            openingMap[store.locCode] = manualOpen + (oSecIn - oSecOut);
          }
        } else {
          const [oR1, oR2] = await Promise.all([
            fetch(`${baseAPI}/GetRentoutList?LocCode=${store.locCode}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`),
            fetch(`${baseAPI}/GetReturnList?LocCode=${store.locCode}&DateFrom=2025-01-01&DateTo=${dayBefore(fromDate)}`),
          ]);
          const [oj1, oj2] = await Promise.all([oR1.json(), oR2.json()]);
          const oSecIn  = (oj1?.dataSet?.data || []).reduce((acc,t)=>acc + +(t.securityAmount||0),0);
          const oSecOut = (oj2?.dataSet?.data || []).reduce((acc,t)=>acc + +(t.securityAmount||0),0);
          openingMap[store.locCode] = oSecIn - oSecOut;
        }
      } catch { openingMap[store.locCode] = 0; }

      try {
        const [r1,r2]=await Promise.all([fetch(u1),fetch(u2)]);
        const [j1,j2]=await Promise.all([r1.json(),r2.json()]);
        if(j1?.dataSet?.data) tmpRent.push(...j1.dataSet.data.map(d=>({...d,locCode:store.locCode,Category:"RentOut"})));
        if(j2?.dataSet?.data) tmpRet .push(...j2.dataSet.data.map(d=>({...d,locCode:store.locCode,Category:"Return" })));
      } catch(e){ console.error("Fetch err",e);}
    }

    setRentAll(tmpRent.map(d => ({ ...d, _openingForStore: openingMap[d.locCode] || 0 })));
    setReturnAll(tmpRet.map(d => ({ ...d, _openingForStore: openingMap[d.locCode] || 0 })));
    setAllStoreOpenings(openingMap);
    setLoading(false);
  };

  /* ---------- build rows ---------- */
  let tableRows=[];
  if(selectedStore==="current"){
    const rentList = rentData?.dataSet?.data || [];
    const retList  = retData?.dataSet?.data  || [];

    // Build a map keyed by invoiceNo for quick lookup
    const rentMap = {};
    rentList.forEach(t => { rentMap[t.invoiceNo] = t; });
    const retMap  = {};
    retList.forEach(t  => { retMap[t.invoiceNo]  = t; });

    // All unique invoice numbers across both lists
    const allInvoices = [...new Set([
      ...rentList.map(t => t.invoiceNo),
      ...retList.map(t  => t.invoiceNo),
    ])];

    tableRows = allInvoices.map(inv => {
      const r = rentMap[inv];
      const x = retMap[inv];
      const hasBoth = r && x;
      return {
        date:       r ? r.rentOutDate  : x.returnedDate,
        returnDate: x ? x.returnedDate : null,
        invoice:    inv,
        customer:   r ? r.customerName : x.customerName,
        category:   hasBoth ? "RentOut + Return" : r ? "RentOut" : "Return",
        sub:        hasBoth ? "Security" : r ? "Security" : "Security Refund",
        secIn:      r ? +(r.securityAmount  || 0) : 0,
        secOutCash: x ? +(x.returnCashAmount || 0) : 0,
        secOutRbl:  x ? +(x.rblRazorPay      || 0) : 0,
        merged:     hasBoth,
      };
    });

    tableRows.sort((a, b) => new Date(a.date) - new Date(b.date));

  } else {
    const combined=[...rentAll,...returnAll];
    const acc = {};

    // First seed all stores that have an opening balance
    for (const [lc, opening] of Object.entries(allStoreOpenings)) {
      if (opening === 0) continue;
      const name = getStoreName(lc);
      if (!acc[name]) acc[name] = { store: name, locCode: lc, secIn: opening, secOutCash: 0, secOutRbl: 0 };
    }

    // Then add transaction data
    combined.forEach(t => {
      const name = getStoreName(t.locCode);
      if (!acc[name]) acc[name] = {
        store: name,
        locCode: t.locCode,
        secIn: allStoreOpenings[t.locCode] || 0,
        secOutCash: 0,
        secOutRbl: 0
      };
      if (t.Category === "Return") {
        acc[name].secOutCash += +(t.returnCashAmount || 0);
        acc[name].secOutRbl  += +(t.rblRazorPay || 0);
      } else {
        acc[name].secIn += +(t.securityAmount || 0);
      }
    });

    tableRows = Object.values(acc).map(r => ({ ...r, diff: r.secIn - (r.secOutCash + r.secOutRbl) }));
  }

  const totIn      = tableRows.reduce((s,r)=>s+(r.secIn||0),0);
  const totOutCash = tableRows.reduce((s,r)=>s+(r.secOutCash||0),0);
  const totOutRbl  = tableRows.reduce((s,r)=>s+(r.secOutRbl||0),0);
  const totOut     = totOutCash + totOutRbl;
  const adjIn = selectedStore==="current" ? totIn + openingCash : totIn;

  /* ---------- CSV data ---------- */
  const csvData = (selectedStore==="all"||selectedStore==="cluster")
    ? tableRows.map(r=>({store:r.store,locCode:r.locCode,secIn:r.secIn,secOutCash:r.secOutCash,secOutRbl:r.secOutRbl,difference:r.diff}))
    : [
        ...(selectedStore==="current"?[{
          date:"OPENING CASH", invoice:"", customer:"", category:"", sub:"",
          secIn:openingCash, secOutCash:0, secOutRbl:0, difference:0
        }]:[]),
        ...tableRows.map(r=>({
          date:r.date, invoice:r.invoice, customer:r.customer||"",
          category:r.category||"", sub:r.sub||"",
          secIn:r.secIn, secOutCash:r.secOutCash, secOutRbl:r.secOutRbl,
          difference:r.secIn-(r.secOutCash+r.secOutRbl)
        }))
      ];

  /* ---------- print helper ---------- */
  const printRef = useRef(null);
  const handlePrint = () => {
    const html = `<html><head><title>Security</title><style>
      @page{size:tabloid;margin:10mm}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #000;padding:8px}
    </style></head><body>${printRef.current.innerHTML}</body></html>`;
    const w = window.open(""); w.document.write(html); w.document.close(); w.print();
  };

  /* ---------- UI ---------- */
  return (
    <>
      <Helmet><title>Security Report | RootFin</title></Helmet>
      
      <div className={`transition-all duration-300 min-h-screen bg-white ${isSidebarOpen ? 'ml-[240px]' : 'ml-0'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-8 py-5 border-b border-gray-100">
          <button onClick={() => navigate(-1)} className="h-8 w-8 flex items-center justify-center rounded-md bg-gray-500 text-white hover:bg-gray-600 transition shadow-sm">
            <ArrowLeft size={16} />
          </button>
          <div className="text-[15px] text-gray-500 flex items-center gap-1.5">
            Reports <span className="text-gray-300">/</span> <span className="text-[#1f2937] font-medium">Security Report</span>
          </div>
        </div>

        <div className="p-8">
          {/* Filters */}
          <div className="flex items-end gap-4 mb-8">
            <div className="w-[180px] flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-500">From Date</label>
              <div className="relative">
                <input type="date" value={fromDate}
                       onChange={e=>setFromDate(e.target.value)}
                       className="w-full border border-gray-200 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors z-10 bg-transparent" />
                
              </div>
            </div>
            
            <div className="w-[180px] flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-500">To Date</label>
              <div className="relative">
                <input type="date" value={toDate}
                       onChange={e=>setToDate(e.target.value)}
                       className="w-full border border-gray-200 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors z-10 bg-transparent" />
                
              </div>
            </div>

            <div className="w-[200px] flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-500">Store</label>
              <div className="relative">
                <select value={selectedStore}
                        onChange={e=>setSelectedStore(e.target.value)}
                        className="w-full border border-gray-200 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors appearance-none bg-transparent relative z-10 cursor-pointer">
                  <option value="current">
                    {getStoreName(user.locCode)}
                  </option>
                  {isClusterManager && clusterStores.length > 0 &&
                    <option value="cluster">My Stores (All Assigned)</option>}
                  {(user.power||"").toLowerCase()==="admin" &&
                    <option value="all">All Stores (Totals)</option>}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-0" size={16} />
              </div>
            </div>

            <button onClick={handleFetch} disabled={loading}
                    className="bg-[#a855f7] hover:bg-[#9333ea] text-white px-8 h-[38px] rounded-md transition-colors disabled:opacity-70 flex items-center justify-center font-medium text-sm ml-2">
              {loading ? (
                <><svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>Fetching</>
              ) : "Fetch Data"}
            </button>

            <div className="flex-1"></div>

            <CSVLink headers={(selectedStore==="all"||selectedStore==="cluster")?csvHeadersAllStores:csvHeaders}
                     data={csvData}
                     filename={`${fromDate}_to_${toDate}_security_report.csv`}
                     className="ml-auto">
              <button className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-gray-700 px-5 h-[38px] rounded-md transition-colors flex items-center justify-center gap-2 font-medium text-sm">
                Export CSV <Download size={16} className="text-gray-600" />
              </button>
            </CSVLink>

            <button onClick={handlePrint}
                    className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-gray-700 px-5 h-[38px] rounded-md transition-colors flex items-center justify-center gap-2 font-medium text-sm">
              Print PDF <Printer size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Report Table */}
          <div ref={printRef} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 bg-[#1f2937] text-white text-[11px] uppercase tracking-wider font-semibold z-20">
                  {(selectedStore==="all"||selectedStore==="cluster")?(
                    <tr>
                      <th className="px-6 py-4">Store</th>
                      <th className="px-6 py-4">LocCode</th>
                      <th className="px-6 py-4 text-center">Security In</th>
                      <th className="px-6 py-4 text-center">Security Out (Cash)</th>
                      <th className="px-6 py-4 text-center">Security Out (Razorpay)</th>
                      <th className="px-6 py-4 text-center">Difference</th>
                    </tr>
                  ):(
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Invoice No.</th>
                      <th className="px-6 py-4">Customer Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Sub Category</th>
                      <th className="px-6 py-4 text-center">Security In</th>
                      <th className="px-6 py-4 text-center">Security Out (Cash)</th>
                      <th className="px-6 py-4 text-center">Security Out (Razorpay)</th>
                      <th className="px-6 py-4 text-center">Difference</th>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {selectedStore==="current" && (
                    <tr className="font-bold text-[#1f2937] bg-white">
                      <td className="px-6 py-4" colSpan={5}>Total</td>
                      <td className="px-6 py-4 text-center">{formatNumber(openingCash)}</td>
                      <td className="px-6 py-4 text-center">0</td>
                      <td className="px-6 py-4 text-center">0</td>
                      <td className="px-6 py-4 text-center">0</td>
                    </tr>
                  )}

                  {tableRows.length > 0 ? tableRows.map((r,i)=>(
                    (selectedStore==="all"||selectedStore==="cluster")?(
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-[#1f2937]">{r.store}</td>
                        <td className="px-6 py-4 text-gray-600">{r.locCode}</td>
                        <td className="px-6 py-4 text-center text-[#1f2937]">{formatNumber(r.secIn) || ""}</td>
                        <td className="px-6 py-4 text-center text-[#1f2937]">{formatNumber(r.secOutCash) || ""}</td>
                        <td className="px-6 py-4 text-center text-[#1f2937]">{formatNumber(r.secOutRbl) || ""}</td>
                        <td className="px-6 py-4 text-center text-[#1f2937]">{formatNumber(r.diff) || ""}</td>
                      </tr>
                    ):(
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5 text-gray-600">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600 font-medium">{r.invoice}</td>
                        <td className="px-6 py-3.5 text-gray-600">{r.customer}</td>
                        <td className="px-6 py-3.5 text-gray-600">{r.category}</td>
                        <td className="px-6 py-3.5 text-gray-600">{r.sub}</td>
                        <td className="px-6 py-3.5 text-center text-[#1f2937]">{r.secIn ? formatNumber(r.secIn) : ""}</td>
                        <td className="px-6 py-3.5 text-center text-[#1f2937]">{r.secOutCash ? formatNumber(r.secOutCash) : ""}</td>
                        <td className="px-6 py-3.5 text-center text-[#1f2937]">{r.secOutRbl ? formatNumber(r.secOutRbl) : ""}</td>
                        <td className="px-6 py-3.5 text-center text-[#1f2937]">{formatNumber(r.secIn - (r.secOutCash + r.secOutRbl))}</td>
                      </tr>
                    )
                  )):(
                    <tr>
                      <td colSpan={(selectedStore==="all"||selectedStore==="cluster")?6:9} className="px-6 py-8 text-center text-gray-500">
                        No records found for the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="sticky bottom-0 bg-[#f3f4f6] z-20 border-t border-gray-200">
                  <tr className="font-bold text-[#1f2937]">
                    <td colSpan={(selectedStore==="all"||selectedStore==="cluster")?2:5} className="px-6 py-4">Total</td>
                    <td className="px-6 py-4 text-center">{formatNumber(adjIn)}</td>
                    <td className="px-6 py-4 text-center">{formatNumber(totOutCash)}</td>
                    <td className="px-6 py-4 text-center">{formatNumber(totOutRbl)}</td>
                    <td className="px-6 py-4 text-center">{formatNumber(adjIn - totOut)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Security;
