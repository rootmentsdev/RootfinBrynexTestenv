import { useState, useEffect } from "react";
import { Trash2, Bell, Mail, MapPin, Search, Check } from "lucide-react";
import Header from "../components/Header";
import baseUrl from "../api/api";
import useSidebar from "../hooks/useSidebar";

const ReorderAlerts = () => {
  const isSidebarOpen = useSidebar();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/reorder-alerts`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}/resolve`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to resolve alert");
      setAlerts(alerts.map(a => a._id === alertId ? { ...a, status: "resolved" } : a));
    } catch (error) {
      alert("Failed to resolve alert");
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm("Delete this alert?")) return;
    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete alert");
      setAlerts(alerts.filter(a => a._id !== alertId));
    } catch (error) {
      alert("Failed to delete alert");
    }
  };

  const handleNotify = async (alertId) => {
    try {
      const response = await fetch(`${API_URL}/api/reorder-alerts/${alertId}/notify`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to notify");
      alert("Notification sent!");
    } catch (error) {
      alert("Failed to send notification");
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) { alert("Please enter an email address"); return; }
    try {
      setTestingEmail(true);
      const response = await fetch(`${API_URL}/api/reorder-alerts/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send test email");
      }
      alert("✅ Test email sent successfully!");
      setShowTestEmail(false);
      setTestEmail("");
    } catch (error) {
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === "active");
  const resolvedAlerts = alerts.filter(a => a.status === "resolved");
  const displayedAlerts = filter === "active" ? activeAlerts : resolvedAlerts;

  const filteredAlerts = displayedAlerts.filter(alert => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (alert.itemName && alert.itemName.toLowerCase().includes(q)) ||
      (alert.itemSku && alert.itemSku.toLowerCase().includes(q)) ||
      (alert.itemGroup && alert.itemGroup.toLowerCase().includes(q)) ||
      (alert.warehouse && alert.warehouse.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <Header title="Reorder Alerts" />
      <div className={`transition-all duration-300 min-h-screen bg-white flex flex-col ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="px-8 py-8 flex-1">
          
          {/* Header Section */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-lg font-bold text-[#111827] uppercase tracking-wide">REORDER ALERT</h1>
              <p className="text-sm text-[#9CA3AF]">Monitor products that need reordering</p>
            </div>
            <button
              onClick={() => setShowTestEmail(!showTestEmail)}
              className="flex flex-row items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-[#111827] hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Mail size={18} className="text-[#8B5CF6]" />
              <span>Test Email</span>
            </button>
          </div>

          {/* Test Email Panel */}
          {showTestEmail && (
            <div className="mb-6 bg-white rounded-md border border-[#E5E7EB] shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">Test Email Configuration</h3>
              <p className="text-xs text-[#6B7280] mb-4">Send a test email to verify your email settings.</p>
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-4 h-9 rounded-md border border-[#E5E7EB] bg-white text-sm text-[#111827] focus:border-[#8B5CF6] focus:outline-none transition-colors"
                />
                <button
                  onClick={() => { setShowTestEmail(false); setTestEmail(""); }}
                  className="h-9 px-4 text-xs font-bold uppercase tracking-wider text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] rounded-md hover:bg-[#E5E7EB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="h-9 px-4 text-xs font-bold uppercase tracking-wider text-white bg-[#8B5CF6] rounded-md hover:bg-[#7C3AED] transition-colors disabled:opacity-50"
                >
                  {testingEmail ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* Search & Tabs Section */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            {/* Search Bar */}
            <div className="relative w-full sm:w-[400px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by SKU (e.g. BLCB9), product name, category, or location..."
                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-md text-sm focus:outline-none focus:border-[#8B5CF6] placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center bg-[#F3F4F6] rounded-xl p-1">
              <button
                onClick={() => setFilter("active")}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "active" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
                }`}
              >
                Active Alerts
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === "active" ? "bg-[#8B5CF6] text-white" : "bg-[#E5E7EB] text-[#6B7280]"
                }`}>
                  {activeAlerts.length}
                </span>
              </button>
              <button
                onClick={() => setFilter("resolved")}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "resolved" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
                }`}
              >
                Resolved
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === "resolved" ? "bg-[#8B5CF6] text-white" : "bg-[#E5E7EB] text-[#6B7280]"
                }`}>
                  {resolvedAlerts.length}
                </span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-md border border-[#E5E7EB] overflow-hidden">
            {/* Table Header */}
            <div className="bg-[#222222] text-white text-[10px] font-bold uppercase tracking-wider px-6 py-3 flex items-center">
              <div className="w-[45%]">ITEM DETAILS</div>
              <div className="w-[15%]">WAREHOUSE LOCATION</div>
              <div className="w-[15%] text-center">CURRENT STOCK</div>
              <div className="w-[15%] text-center">REORDER POINT</div>
              <div className="w-[10%] text-center flex justify-end pr-2">ACTIONS</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8B5CF6]"></div>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="py-20 text-center text-[#6B7280] text-sm">
                No alerts found.
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB]">
                {filteredAlerts.map((alert) => (
                  <div key={alert._id} className="flex items-center px-6 py-4 hover:bg-[#FAFAFA] transition-colors">
                    
                    {/* ITEM DETAILS */}
                    <div className="w-[45%] pr-4">
                      {alert.itemSku && (
                        <div className="inline-block bg-[#F3E8FF] text-[#8B5CF6] text-[10px] font-bold px-2 py-0.5 rounded-sm mb-1.5">
                          SKU : {alert.itemSku}
                        </div>
                      )}
                      <h3 className="text-sm font-bold text-[#374151] leading-tight mb-0.5">{alert.itemName}</h3>
                      <p className="text-xs text-[#9CA3AF]">Group: {alert.itemGroup || "—"}</p>
                    </div>

                    {/* WAREHOUSE LOCATION */}
                    <div className="w-[15%] flex items-center gap-2">
                      <MapPin size={16} className="text-[#8B5CF6]" />
                      <span className="text-sm text-[#374151]">{alert.warehouse || "—"}</span>
                    </div>

                    {/* CURRENT STOCK */}
                    <div className="w-[15%] text-center">
                      <span className="text-sm font-bold text-[#ef4444]">{alert.currentStock}</span>
                      <span className="text-xs text-[#9CA3AF] ml-1">/{alert.reorderPoint} Target</span>
                    </div>

                    {/* REORDER POINT */}
                    <div className="w-[15%] text-center">
                      <span className="text-sm font-bold text-[#111827]">{alert.reorderPoint}</span>
                    </div>

                    {/* ACTIONS */}
                    <div className="w-[10%] flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDelete(alert._id)} 
                        className="p-1.5 bg-[#FFE4E6] text-[#ef4444] rounded hover:bg-[#FECDD3] transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleResolve(alert._id)} 
                        className="p-1.5 bg-[#F3F4F6] text-[#9CA3AF] rounded hover:bg-[#E5E7EB] transition-colors"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => handleNotify(alert._id)} 
                        className="p-1.5 bg-[#8B5CF6] text-white rounded hover:bg-[#7C3AED] transition-colors"
                      >
                        <Bell size={16} />
                      </button>
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default ReorderAlerts;
