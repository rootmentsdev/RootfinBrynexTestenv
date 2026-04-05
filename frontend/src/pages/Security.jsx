/*  ────────────────────────────────────────────────
 *  Security.jsx  – hybrid opening-balance logic
 *  ────────────────────────────────────────────────*/
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { CSVLink } from "react-csv";
import Headers from "../components/Header.jsx";
import useFetch from "../hooks/useFetch.jsx";
import openingBalanceMap from "../data/openingBalance.json";

/* ---------- CSV helpers ---------- */
const csvHeaders = [
  { label: "Date", key: "date" },      { label: "Invoice", key: "invoice" },
  { label: "Customer", key: "customer" }, { label: "Category", key: "category" },
  { label: "Sub", key: "sub" },        { label: "Security In", key: "secIn" },
  { label: "Security Out (Cash)", key: "secOutCash" },
  { label: "Security Out (RBL)", key: "secOutRbl" },
  { label: "Difference", key: "difference" },
];
const csvHeadersAllStores = [
  { label: "Store", key: "store" }, { label: "LocCode", key: "locCode" },
  { label: "Security In", key: "secIn" },
  { label: "Security Out (Cash)", key: "secOutCash" },
  { label: "Security Out (RBL)", key: "secOutRbl" },
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

const Security = () => {
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState("2025-01-01");
  const [toDate,   setToDate]   = useState(today);
  const [selectedStore, setSelectedStore] = useState("current"); // "current" | "all"
  const [rentAll, setRentAll]     = useState([]); // all-store mode
  const [returnAll, setReturnAll] = useState([]);
  const [openingCash, setOpeningCash] = useState(0);

  const user = JSON.parse(localStorage.getItem("rootfinuser"));
  const baseAPI = "https://rentalapi.rootments.live/api/GetBooking";

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

  /* ---------- handleFetch (all-store mode) ---------- */
  const handleFetch = async () => {
    if (selectedStore !== "all") { await calcOpeningCash(); return; }

    const tmpRent=[], tmpRet=[];
    for (const s of AllLoation) {
      const u1=`${baseAPI}/GetRentoutList?LocCode=${s.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      const u2=`${baseAPI}/GetReturnList?LocCode=${s.locCode}&DateFrom=${fromDate}&DateTo=${toDate}`;
      try {
        const [r1,r2]=await Promise.all([fetch(u1),fetch(u2)]);
        const [j1,j2]=await Promise.all([r1.json(),r2.json()]);
        if(j1?.dataSet?.data) tmpRent.push(...j1.dataSet.data.map(d=>({...d,locCode:s.locCode,Category:"RentOut"})));
        if(j2?.dataSet?.data) tmpRet .push(...j2.dataSet.data.map(d=>({...d,locCode:s.locCode,Category:"Return" })));
      } catch(e){ console.error("Fetch err",e);}
    }
    setRentAll(tmpRent); setReturnAll(tmpRet);
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
  } else {
    const combined=[...rentAll,...returnAll];
    tableRows=Object.values(combined.reduce((acc,t)=>{
      const name=getStoreName(t.locCode);
      if(!acc[name]) acc[name]={store:name,locCode:t.locCode,secIn:0,secOutCash:0,secOutRbl:0};
      if(t.Category==="Return"){
        acc[name].secOutCash += +(t.returnCashAmount||0);
        acc[name].secOutRbl  += +(t.rblRazorPay||0);
      } else {
        acc[name].secIn += +(t.securityAmount||0);
      }
      return acc;
    },{})).map(r=>({...r,diff:r.secIn-(r.secOutCash+r.secOutRbl)}));
  }

  const totIn      = tableRows.reduce((s,r)=>s+(r.secIn||0),0);
  const totOutCash = tableRows.reduce((s,r)=>s+(r.secOutCash||0),0);
  const totOutRbl  = tableRows.reduce((s,r)=>s+(r.secOutRbl||0),0);
  const totOut     = totOutCash + totOutRbl;
  const adjIn = selectedStore==="current" ? totIn + openingCash : totIn;

  /* ---------- CSV data ---------- */
  const csvData = selectedStore==="all"
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
      <Headers title="Security Report" />
      <div className="ml-[240px] p-6 bg-gray-100 min-h-screen">

        {/* filters */}
        <div className="flex gap-4 mb-6 w-[1000px]">
          <div className="w-full flex flex-col">
            <label>From *</label>
            <input type="date" value={fromDate}
                   onChange={e=>setFromDate(e.target.value)}
                   className="border p-2"/>
          </div>
          <div className="w-full flex flex-col">
            <label>To *</label>
            <input type="date" value={toDate}
                   onChange={e=>setToDate(e.target.value)}
                   className="border p-2"/>
          </div>
          <div className="w-full flex flex-col">
            <label>Store</label>
            <select value={selectedStore}
                    onChange={e=>setSelectedStore(e.target.value)}
                    className="border p-2">
              <option value="current">
                Current Store ({getStoreName(user.locCode)})
              </option>
              {(user.power||"").toLowerCase()==="admin" &&
                <option value="all">All Stores (Totals)</option>}
            </select>
          </div>
          <button onClick={handleFetch}
                  className="bg-blue-600 text-white px-10 h-[40px] mt-6 rounded-md">
            Fetch
          </button>
        </div>

        {/* report */}
        <div ref={printRef} className="bg-white p-4 shadow rounded-lg">
          <div className="max-h-[420px] overflow-y-auto relative">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-gray-500 text-white z-20">
                {selectedStore==="all"?(
                  <tr>
                    <th className="border p-2">Store</th>
                    <th className="border p-2">LocCode</th>
                    <th className="border p-2">Security In</th>
                    <th className="border p-2">Security Out (Cash)</th>
                    <th className="border p-2">Security Out (RBL)</th>
                    <th className="border p-2">Difference</th>
                  </tr>
                ):(
                  <tr>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Invoice</th>
                    <th className="border p-2">Customer</th>
                    <th className="border p-2">Category</th>
                    <th className="border p-2">Sub</th>
                    <th className="border p-2">Security In</th>
                    <th className="border p-2">Security Out (Cash)</th>
                    <th className="border p-2">Security Out (RBL)</th>
                    <th className="border p-2">Difference</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {selectedStore==="current" && openingCash!==0 && (
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-2">OPENING CASH</td>
                    <td className="border p-2" colSpan={4}></td>
                    <td className="border p-2">{openingCash}</td>
                    <td className="border p-2">0</td>
                    <td className="border p-2">0</td>
                    <td className="border p-2">0</td>
                  </tr>
                )}

                {tableRows.length ? tableRows.map((r,i)=>(
                  selectedStore==="all"?(
                    <tr key={i}>
                      <td className="border p-2">{r.store}</td>
                      <td className="border p-2">{r.locCode}</td>
                      <td className="border p-2">{r.secIn}</td>
                      <td className="border p-2">{r.secOutCash}</td>
                      <td className="border p-2">{r.secOutRbl}</td>
                      <td className="border p-2">{r.diff}</td>
                    </tr>
                  ):(
                    <tr key={i} className={r.merged ? "bg-blue-50" : ""}>
                      <td className="border p-2">
                        {r.date}
                        {r.merged && r.returnDate && (
                          <div className="text-[10px] text-gray-400">↩ {r.returnDate}</div>
                        )}
                      </td>
                      <td className="border p-2">{r.invoice}</td>
                      <td className="border p-2">{r.customer}</td>
                      <td className="border p-2">{r.category}</td>
                      <td className="border p-2">{r.sub}</td>
                      <td className="border p-2">{r.secIn}</td>
                      <td className="border p-2">{r.secOutCash}</td>
                      <td className="border p-2">{r.secOutRbl}</td>
                      <td className="border p-2">{r.secIn - (r.secOutCash + r.secOutRbl)}</td>
                    </tr>
                  )
                )):(
                  <tr><td colSpan={selectedStore==="all"?6:9}
                          className="text-center p-4">No data found</td></tr>
                )}
              </tbody>

              <tfoot className="sticky bottom-0 bg-white z-20">
                <tr className="font-semibold">
                  <td colSpan={selectedStore==="all"?2:5}
                      className="border p-2 text-left">Totals</td>
                  <td className="border p-2">{adjIn}</td>
                  <td className="border p-2">{totOutCash}</td>
                  <td className="border p-2">{totOutRbl}</td>
                  <td className="border p-2">{adjIn - totOut}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* buttons */}
        <button onClick={handlePrint}
                className="mt-6 w-[200px] float-right bg-blue-600 text-white py-2 rounded-lg">
          📄 Print / PDF
        </button>
        <CSVLink headers={selectedStore==="all"?csvHeadersAllStores:csvHeaders}
                 data={csvData}
                 filename={`${fromDate}_to_${toDate}_security_report.csv`}>
          <button className="mt-6 me-4 w-[200px] float-right bg-green-600 text-white py-2 rounded-lg">
            ⬇️ Download CSV
          </button>
        </CSVLink>
      </div>
    </>
  );
};

export default Security;
