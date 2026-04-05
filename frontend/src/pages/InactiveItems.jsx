import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import baseUrl from "../api/api";
import { mapLocNameToWarehouse as mapWarehouse } from "../utils/warehouseMapping";

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");

const InactiveItems = () => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Get user info for filtering
  const userStr = localStorage.getItem("rootfinuser");
  const user = userStr ? JSON.parse(userStr) : null;
  const userEmail = user?.email || user?.username || "";
  const adminEmails = ['officerootments@gmail.com'];
  const isAdminEmail = userEmail && adminEmails.some(email => userEmail.toLowerCase() === email.toLowerCase());
  const isAdmin = isAdminEmail ||
    user?.power === "admin" ||
    (user?.locCode && (user.locCode === '858' || user.locCode === '103'));

  // Fallback locations mapping
  const fallbackLocations = [
    { "locName": "Z-Edapally1", "locCode": "144" },
    { "locName": "Warehouse", "locCode": "858" },
    { "locName": "G-Edappally", "locCode": "702" },
    { "locName": "HEAD OFFICE01", "locCode": "759" },
    { "locName": "SG-Trivandrum", "locCode": "700" },
    { "locName": "Z- Edappal", "locCode": "100" },
    { "locName": "Z.Perinthalmanna", "locCode": "133" },
    { "locName": "Z.Kottakkal", "locCode": "122" },
    { "locName": "G.Kottayam", "locCode": "701" },
    { "locName": "G.Perumbavoor", "locCode": "703" },
    { "locName": "G.Thrissur", "locCode": "704" },
    { "locName": "G.Chavakkad", "locCode": "706" },
    { "locName": "G.Calicut ", "locCode": "712" },
    { "locName": "G.Vadakara", "locCode": "708" },
    { "locName": "G.Edappal", "locCode": "707" },
    { "locName": "G.Perinthalmanna", "locCode": "709" },
    { "locName": "G.Kottakkal", "locCode": "711" },
    { "locName": "G.Manjeri", "locCode": "710" },
    { "locName": "G.Palakkad ", "locCode": "705" },
    { "locName": "G.Kalpetta", "locCode": "717" },
    { "locName": "G.Kannur", "locCode": "716" },
    { "locName": "G.Mg Road", "locCode": "718" },
    { "locName": "Production", "locCode": "101" },
    { "locName": "Office", "locCode": "102" },
    { "locName": "WAREHOUSE", "locCode": "103" }
  ];

  // Get location name - prioritize locCode lookup over username
  let userLocName = "";
  if (user?.locCode) {
    const location = fallbackLocations.find(loc => loc.locCode === user.locCode || loc.locCode === String(user.locCode));
    if (location) {
      userLocName = location.locName;
    }
  }
  if (!userLocName) {
    userLocName = user?.username || user?.locName || "";
  }

  // Helper function to map locName to warehouse name
  // Use the shared warehouse mapping utility
  const mapLocNameToWarehouse = (locName) => {
    if (!locName) return "";
    return mapWarehouse(locName);
  };

  const userWarehouse = mapLocNameToWarehouse(userLocName);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Build query params with warehouse filtering
      const groupsParams = new URLSearchParams({
        page: "1",
        limit: "100",
      });
      const itemsParams = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      // Pass warehouse for both non-admin users AND admins viewing a specific store
      if (userWarehouse) {
        groupsParams.append("warehouse", userWarehouse);
        itemsParams.append("warehouse", userWarehouse);
      }
      groupsParams.append("isAdmin", isAdmin.toString());
      itemsParams.append("isAdmin", isAdmin.toString());
      if (user?.power) groupsParams.append("userPower", user.power);
      if (user?.locCode) groupsParams.append("locCode", user.locCode);
      if (user?.power) itemsParams.append("userPower", user.power);
      if (user?.locCode) itemsParams.append("locCode", user.locCode);

      const [groupsRes, itemsRes, vendorsRes] = await Promise.all([
        fetch(`${API_ROOT}/api/shoe-sales/item-groups?${groupsParams}`),
        fetch(`${API_ROOT}/api/shoe-sales/items?${itemsParams}`),
        fetch(`${API_ROOT}/api/purchase/vendors?userId=${encodeURIComponent(userEmail)}${user?.power ? `&userPower=${encodeURIComponent(user.power)}` : ""}`),
      ]);
      if (!groupsRes.ok) throw new Error("Failed to load item groups");
      if (!itemsRes.ok) throw new Error("Failed to load items");
      if (!vendorsRes.ok) throw new Error("Failed to load vendors");

      const groupsData = await groupsRes.json();
      const itemsData = await itemsRes.json();
      const vendorsData = await vendorsRes.json();

      // Handle paginated response for groups
      let groupsList = [];
      if (Array.isArray(groupsData)) {
        groupsList = groupsData;
      } else if (groupsData.groups && Array.isArray(groupsData.groups)) {
        groupsList = groupsData.groups;
      }

      // Fetch full details for each group to get items with isActive status
      const fullGroupsPromises = groupsList.map(async (group) => {
        const groupId = group._id || group.id;
        try {
          const fullRes = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`);
          if (fullRes.ok) {
            return await fullRes.json();
          }
          return group;
        } catch {
          return group;
        }
      });
      const fullGroupsList = await Promise.all(fullGroupsPromises);

      // Handle paginated response for items
      let itemsList = [];
      if (Array.isArray(itemsData)) {
        itemsList = itemsData;
      } else if (itemsData.items && Array.isArray(itemsData.items)) {
        itemsList = itemsData.items;
      }

      setGroups(fullGroupsList);
      setItems(itemsList);
      setVendors(vendorsData || []);
      console.log("Vendors loaded:", vendorsData?.length || 0);
      console.log("Inactive vendors found:", (vendorsData || []).filter(v => v.isActive === false || v.status === 'inactive').length);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const inactiveGroups = useMemo(
    () => groups.filter((g) => (g?.isActive === false) || (String(g?.isActive).toLowerCase() === "false")),
    [groups]
  );
  const inactiveItems = useMemo(
    () => {
      // Get set of all group item IDs for filtering
      const groupItemIds = new Set();
      groups.forEach((group) => {
        if (Array.isArray(group.items)) {
          group.items.forEach((item) => {
            const itemId = item._id?.toString() || item.id?.toString();
            if (itemId) {
              groupItemIds.add(itemId);
            }
          });
        }
      });
      
      return items.filter((i) => {
        // Only include items that are inactive AND are truly standalone (not from groups)
        const isInactive = (i?.isActive === false) || (String(i?.isActive).toLowerCase() === "false");
        const itemId = i._id?.toString() || i.id?.toString();
        const isFromGroup = i?.isFromGroup || i?.itemGroupId || (itemId && groupItemIds.has(itemId));
        return isInactive && !isFromGroup;
      });
    },
    [items, groups]
  );
  const inactiveVendors = useMemo(
    () => vendors.filter((v) => (v?.isActive === false) || (v?.status === 'inactive')),
    [vendors]
  );
  const activeGroups = useMemo(
    () => groups.filter((g) => !(g?.isActive === false || String(g?.isActive).toLowerCase() === "false")),
    [groups]
  );

  // Extract inactive items from all groups (both active and inactive)
  const inactiveItemsFromGroups = useMemo(() => {
    const result = [];
    groups.forEach((group) => {
      if (Array.isArray(group.items)) {
        group.items.forEach((item) => {
          if ((item?.isActive === false) || (String(item?.isActive).toLowerCase() === "false")) {
            result.push({
              ...item,
              groupId: group._id || group.id,
              groupName: group.name,
              isFromGroup: true,
            });
          }
        });
      }
    });
    return result;
  }, [groups]);

  const activateGroup = async (groupId) => {
    try {
      setSaving(true);

      // IMPORTANT: The list API returns summarized groups (no full items).
      // Fetch the full item group by id before updating.
      const fullRes = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`);
      if (!fullRes.ok) throw new Error("Failed to load item group");
      const fullGroup = await fullRes.json();

      const payload = {
        name: fullGroup.name,
        sku: fullGroup.sku || "",
        itemType: fullGroup.itemType || "goods",
        unit: fullGroup.unit || "",
        manufacturer: fullGroup.manufacturer || "",
        brand: fullGroup.brand || "",
        taxPreference: fullGroup.taxPreference || "taxable",
        intraStateTaxRate: fullGroup.intraStateTaxRate || "",
        interStateTaxRate: fullGroup.interStateTaxRate || "",
        inventoryValuationMethod: fullGroup.inventoryValuationMethod || "",
        createAttributes: fullGroup.createAttributes !== undefined ? fullGroup.createAttributes : true,
        attributeRows: fullGroup.attributeRows || [],
        sellable: fullGroup.sellable !== undefined ? fullGroup.sellable : true,
        purchasable: fullGroup.purchasable !== undefined ? fullGroup.purchasable : true,
        trackInventory: fullGroup.trackInventory !== undefined ? fullGroup.trackInventory : false,
        items: Array.isArray(fullGroup.items) ? fullGroup.items : [],
        stock: fullGroup.stock || 0,
        reorder: fullGroup.reorder || "",
        isActive: true,
      };

      const res = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to activate group");
      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to activate group");
    } finally {
      setSaving(false);
    }
  };

  const activateItem = async (itemId) => {
    try {
      setSaving(true);
      const item = items.find((i) => (i._id || i.id) === itemId);
      if (!item) {
        alert("Item not found");
        return;
      }
      
      // Fetch full item details first to ensure we have all fields
      const fullItemRes = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`);
      if (!fullItemRes.ok) throw new Error("Failed to load item details");
      const fullItem = await fullItemRes.json();
      
      // Prepare payload with all required fields
      const payload = {
        ...fullItem,
        isActive: true,
      };
      
      const res = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to activate item");
      }
      
      await fetchData();
      alert("Item activated successfully");
    } catch (e) {
      alert(e.message || "Failed to activate item");
    } finally {
      setSaving(false);
    }
  };

  const activateVendor = async (vendorId) => {
    try {
      setSaving(true);
      const vendor = vendors.find((v) => (v._id || v.id) === vendorId);
      if (!vendor) return;

      const res = await fetch(`${API_ROOT}/api/purchase/vendors/${vendorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vendor, isActive: true, status: 'active' }),
      });
      if (!res.ok) throw new Error("Failed to activate vendor");

      // Update localStorage if it exists
      try {
        const savedVendors = JSON.parse(localStorage.getItem("vendors") || "[]");
        const updatedVendorsList = savedVendors.map(v => {
          if ((v._id || v.id) === vendorId) {
            return { ...v, isActive: true, status: 'active' };
          }
          return v;
        });
        localStorage.setItem("vendors", JSON.stringify(updatedVendorsList));
      } catch (localErr) {
        console.warn("Failed to update localStorage:", localErr);
      }

      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to activate vendor");
    } finally {
      setSaving(false);
    }
  };

  const activateItemFromGroup = async (itemId, groupId) => {
    try {
      setSaving(true);

      // Fetch the full group
      const groupRes = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`);
      if (!groupRes.ok) throw new Error("Failed to load group");
      const group = await groupRes.json();

      // Find and activate the item in the group
      const updatedItems = group.items.map((i) => {
        const iId = i._id?.toString() || i.id?.toString() || "";
        if (iId === itemId.toString()) {
          return { ...i, isActive: true };
        }
        return i;
      });

      const payload = {
        name: group.name,
        sku: group.sku || "",
        itemType: group.itemType || "goods",
        unit: group.unit || "",
        manufacturer: group.manufacturer || "",
        brand: group.brand || "",
        taxPreference: group.taxPreference || "taxable",
        intraStateTaxRate: group.intraStateTaxRate || "",
        interStateTaxRate: group.interStateTaxRate || "",
        inventoryValuationMethod: group.inventoryValuationMethod || "",
        createAttributes: group.createAttributes !== undefined ? group.createAttributes : true,
        attributeRows: group.attributeRows || [],
        sellable: group.sellable !== undefined ? group.sellable : true,
        purchasable: group.purchasable !== undefined ? group.purchasable : true,
        trackInventory: group.trackInventory !== undefined ? group.trackInventory : false,
        items: updatedItems,
        stock: group.stock || 0,
        reorder: group.reorder || "",
        isActive: group.isActive !== undefined ? group.isActive : true,
      };

      const res = await fetch(`${API_ROOT}/api/shoe-sales/item-groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to activate item");
      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to activate item");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="ml-64 flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#cbd5f5] border-t-[#3762f9]" />
          <p className="text-sm font-medium text-[#475569]">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ml-64 p-6">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1f2937]">Inactive Items Management</h1>
        <p className="text-sm text-[#64748b] mt-1">Manage and activate inactive items, groups, and vendors</p>
      </div>
      
      <div className="rounded-xl border border-[#e1e5f5] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1f2937]">Inactive Item Groups</h2>
          <Link to="/shoe-sales/item-groups" className="text-sm text-[#3762f9] hover:underline font-medium">Go to Groups</Link>
        </div>
        {inactiveGroups.length === 0 ? (
          <p className="text-sm text-[#64748b] py-4">No inactive groups.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#eef2ff]">
            <table className="min-w-full divide-y divide-[#eef2ff]">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748b]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#eef2ff]">
                {inactiveGroups.map((g) => {
                  const id = g._id || g.id;
                  return (
                    <tr key={id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#1f2937]">{g.name}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{Array.isArray(g.items) ? g.items.length : 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => activateGroup(id)}
                          disabled={saving}
                          className="no-blue-button inline-flex items-center rounded-md bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
                        >
                          {saving ? "Activating..." : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[#e1e5f5] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1f2937]">Inactive Standalone Items</h2>
          <Link to="/shoe-sales/items" className="text-sm text-[#3762f9] hover:underline font-medium">Go to Items</Link>
        </div>
        {inactiveItems.length === 0 ? (
          <p className="text-sm text-[#64748b] py-4">No inactive items.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#eef2ff]">
            <table className="min-w-full divide-y divide-[#eef2ff]">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748b]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#eef2ff]">
                {inactiveItems.map((it) => {
                  const id = it._id || it.id;
                  return (
                    <tr key={id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#1f2937]">{it.itemName || "Untitled"}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{it.sku || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => activateItem(id)}
                          disabled={saving}
                          className="no-blue-button inline-flex items-center rounded-md bg-[#16a34a] px-4 py-2 text-sm font-medium text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
                        >
                          {saving ? "Activating..." : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e1e5f5] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1f2937]">Inactive Items from Groups</h2>
          <Link to="/shoe-sales/item-groups" className="text-sm text-[#3762f9] hover:underline font-medium">Go to Groups</Link>
        </div>
        {inactiveItemsFromGroups.length === 0 ? (
          <p className="text-sm text-[#64748b] py-4">No inactive items in groups.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#eef2ff]">
            <table className="min-w-full divide-y divide-[#eef2ff]">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Group</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748b]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#eef2ff]">
                {inactiveItemsFromGroups.map((it) => {
                  const id = it._id || it.id;
                  return (
                    <tr key={id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#1f2937]">{it.name || it.itemName || "Untitled"}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{it.sku || "—"}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{it.groupName}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => activateItemFromGroup(id, it.groupId)}
                          disabled={saving}
                          className="no-blue-button inline-flex items-center rounded-md bg-[#16a34a] px-4 py-2 text-sm font-medium text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
                        >
                          {saving ? "Activating..." : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e1e5f5] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1f2937]">Inactive Vendors</h2>
          <Link to="/purchase/vendors" className="text-sm text-[#3762f9] hover:underline font-medium">Go to Vendors</Link>
        </div>
        {inactiveVendors.length === 0 ? (
          <p className="text-sm text-[#64748b] py-4">No inactive vendors.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#eef2ff]">
            <table className="min-w-full divide-y divide-[#eef2ff]">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">Email</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748b]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#eef2ff]">
                {inactiveVendors.map((v) => {
                  const id = v._id || v.id;
                  return (
                    <tr key={id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#1f2937]">{v.displayName || v.name || "Untitled"}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{v.companyName || "—"}</td>
                      <td className="px-6 py-4 text-sm text-[#64748b]">{v.email || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => activateVendor(id)}
                          disabled={saving}
                          className="no-blue-button inline-flex items-center rounded-md bg-[#16a34a] px-4 py-2 text-sm font-medium text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
                        >
                          {saving ? "Activating..." : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InactiveItems;


