import { useMemo, useState, useEffect } from "react";
import Header from "../components/Header";
import { Link, useLocation } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const PurchaseVendors = () => {
  const isSidebarOpen = useSidebar();
  const location = useLocation();
  const [vendors, setVendors] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Load vendors from API and localStorage
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

        // Get user info - use email as primary identifier
        const userStr = localStorage.getItem("rootfinuser");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.email || null;
        const userPower = user?.power || "";

        let vendorsFromAPI = [];

        // Try to fetch from PostgreSQL API first
        if (userId) {
          try {
            const response = await fetch(`${API_URL}/api/purchase/vendors?userId=${encodeURIComponent(userId)}${userPower ? `&userPower=${encodeURIComponent(userPower)}` : ""}`);
            if (response.ok) {
              const data = await response.json();
              vendorsFromAPI = Array.isArray(data) ? data : [];
            }
          } catch (apiError) {
            console.warn("API fetch failed, trying localStorage:", apiError);
          }
        }

        // Fallback to localStorage if API returns no vendors or fails
        let vendorsFromLocalStorage = [];
        try {
          const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          vendorsFromLocalStorage = Array.isArray(savedVendors) ? savedVendors : [];
        } catch (localError) {
          console.warn("Error reading localStorage:", localError);
        }

        // Combine both sources, prioritizing API results
        // Use a Map to avoid duplicates (by displayName or id)
        const vendorMap = new Map();

        // Add API vendors first
        vendorsFromAPI.forEach(vendor => {
          const key = vendor.displayName || vendor.companyName || vendor._id || vendor.id;
          if (key) vendorMap.set(key, vendor);
        });

        // Add localStorage vendors if not already present
        vendorsFromLocalStorage.forEach(vendor => {
          const key = vendor.displayName || vendor.companyName || vendor.id;
          if (key && !vendorMap.has(key)) {
            vendorMap.set(key, vendor);
          }
        });

        // Convert to array and ensure each vendor has an id field (use _id if id doesn't exist)
        const allVendors = Array.from(vendorMap.values()).map(vendor => ({
          ...vendor,
          id: vendor.id || vendor._id || vendor.displayName || vendor.companyName,
        }));

        setVendors(allVendors);
      } catch (error) {
        console.error("Error loading vendors:", error);
        // Final fallback to localStorage only
        try {
          const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
          setVendors(savedVendors);
        } catch {
          setVendors([]);
        }
      }
    };

    loadVendors();

    // Listen for storage events to update when vendors are added from another tab/window
    const handleStorageChange = (e) => {
      if (e.key === "vendors") {
        loadVendors();
      }
    };

    // Listen for custom event when vendor is saved in the same tab
    const handleVendorSaved = () => {
      loadVendors();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("vendorSaved", handleVendorSaved);

    // Also reload when location changes (when coming back from create page)
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("vendorSaved", handleVendorSaved);
    };
  }, [location]);

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    // First filter out inactive vendors (only show active by default)
    const activeVendors = vendors.filter(v => {
      // If explicitly marked as inactive in either field, filter it out
      if (v.isActive === false || v.isActive === 'false' || v.status === 'inactive') {
        return false;
      }
      return true;
    });

    if (!searchTerm) return activeVendors;
    const term = searchTerm.toLowerCase();
    return activeVendors.filter((v) => {
      const name = (v.displayName || v.companyName || v.name || `${v.firstName || ""} ${v.lastName || ""}`).toLowerCase();
      const company = (v.companyName || "").toLowerCase();
      const email = (v.email || "").toLowerCase();
      const phone = (v.phone || v.mobile || "").toLowerCase();
      return name.includes(term) || company.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [vendors, searchTerm]);

  const allSelected = useMemo(() => selected.size > 0 && selected.size === filteredVendors.length && filteredVendors.length > 0, [selected, filteredVendors.length]);

  const toggleAll = (checked) => {
    if (checked) {
      setSelected(new Set(filteredVendors.map((v) => v.id)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleOne = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <>
      <Header title="All Vendors" />
      <div className={`transition-all duration-300 min-h-screen bg-[#fcfcfc] p-3 sm:p-6 ${isSidebarOpen ? 'lg:ml-64 ml-0' : 'ml-0'}`}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">All Vendors</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (filteredVendors.length === 0) return alert("No vendors to export");

              const headers = ["Name", "Company Name", "Email", "Work Phone", "GST Treatment", "Payables", "Unused Credits"];
              const rows = filteredVendors.map(v => [
                v.displayName || `${v.firstName || ""} ${v.lastName || ""}`.trim(),
                v.companyName || "-",
                v.email || "-",
                v.phone || v.mobile || "-",
                v.gstTreatment || "-",
                v.payables || 0,
                v.credits || 0
              ]);

              const csvContent = [
                headers.map(h => `"${h}"`).join(","),
                ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
              ].join("\n");

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement("a");
              link.setAttribute("href", URL.createObjectURL(blob));
              link.setAttribute("download", `all_vendors_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-2 rounded-lg bg-[#f0f0f0] px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Export CSV
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <Link
            to="/purchase/vendors/new"
            className="flex items-center gap-2 rounded-lg bg-[#9f54e5] hover:bg-[#8e45cd] px-4 py-2 text-sm font-medium text-white transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Vendor
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative w-full sm:w-[400px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input
            type="text"
            placeholder="Search vendors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#232323] text-white">
                <th className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-center w-10">
                  #
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider">Name</th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider">Company Name</th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider">Email</th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider">Work Phone</th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider">GST Treatment</th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-right">Payables (BCY)</th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-right">Unused Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-8 text-center text-gray-500">
                    {searchTerm ? "No vendors found matching your search." : "No vendors added yet. Click 'New' to add a vendor."}
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v, index) => (
                  <tr key={v.id} className="hover:bg-gray-50/70 transition-colors text-gray-800">
                    <td className="px-5 py-4 text-center text-sm text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Link
                        to={`/purchase/vendors/${v._id || v.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {v.displayName || v.companyName || v.name || `${v.firstName || ""} ${v.lastName || ""}`.trim()}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{v.companyName || "-"}</td>
                    <td className="px-5 py-4 text-gray-600">{v.email || "-"}</td>
                    <td className="px-5 py-4 text-gray-600">{v.phone || v.mobile || "-"}</td>
                    <td className="px-5 py-4 whitespace-pre-line text-gray-600">{v.gstTreatment || "-"}</td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">{currency(v.payables || 0)}</td>
                    <td className="px-5 py-4 text-right text-gray-600 font-medium">{currency(v.credits || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  );
};

export default PurchaseVendors;


