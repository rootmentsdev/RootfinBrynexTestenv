import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Check, Settings, X, Package, DollarSign, ShoppingCart, Warehouse, Image, Info, AlertCircle } from "lucide-react";
import Head from "../components/Head";
import ImageUpload from "../components/ImageUpload";
import baseUrl from "../api/api";

const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");
const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

const STORAGE_KEYS = {
  manufacturers: "shoeSalesManufacturers",
  brands: "shoeSalesBrands",
};

const loadStoredList = (key) => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage`, error);
  }
  return [];
};

const unitOptions = [
  "box",
  "cm",
  "dz",
  "ft",
  "g",
  "in",
  "kg",
  "km",
  "lb",
  "mg",
  "ml",
  "m",
  "pcs",
  "PCS",
];

const inventoryAccountGroups = [
  {
    group: "Stock",
    options: [
      { label: "Finished Goods", value: "Finished Goods" },
      { label: "Inventory Asset", value: "Inventory Asset" },
      { label: "Work In Progress", value: "Work In Progress" },
    ],
  },
  {
    group: "Expenses",
    options: [
      { label: "Cost of Goods Sold", value: "Cost of Goods Sold" },
      { label: "Inventory Adjustments", value: "Inventory Adjustments" },
    ],
  },
];

const inventoryValuationGroups = [
  {
    group: "Standard Methods",
    options: [
      { label: "FIFO (First In First Out)", value: "FIFO (First In First Out)" },
      { label: "WAC (Weighted Average Costing)", value: "WAC (Weighted Average Costing)" },
      { label: "LIFO (Last In First Out)", value: "LIFO (Last In First Out)" },
    ],
  },
];

const taxPreferenceGroups = [
  {
    group: "Standard",
    options: [
      { label: "Taxable", value: "taxable" },
      { label: "Non-Taxable", value: "non-taxable" },
    ],
  },
  {
    group: "Special",
    options: [
      { label: "Out of Scope", value: "out-of-scope" },
      { label: "Non-GST Supply", value: "non-gst-supply" },
      { label: "Exempt", value: "exempt" },
    ],
  },
];

const initialFormData = {
  type: "goods",
  itemName: "",
  sku: "",
  unit: "pcs",
  hsnCode: "",
  manufacturer: "",
  brand: "",
  returnable: true,
  sellable: true,
  purchasable: true,
  taxPreference: "taxable",
  dimensions: "",
  weight: "",
  upc: "",
  mpn: "",
  ean: "",
  isbn: "",
  size: "",
  inventoryValuationMethod: "",
  sellingPrice: "",
  salesAccount: "",
  salesDescription: "",
  costPrice: "",
  costAccount: "",
  preferredVendor: "",
  purchaseDescription: "",
  taxRateIntra: "",
  taxRateInter: "",
  inventoryAccount: "",
  reorderPoint: "",
  exemptionReason: "",
  sac: "",
  images: [],
};

const ShoeSalesItemCreate = () => {
  const navigate = useNavigate();
  const { id: groupId, itemId } = useParams(); // Get groupId and itemId from URL
  const isEditMode = !!itemId; // If itemId exists, we're in edit mode
  const isStandaloneItem = isEditMode && !groupId; // Editing standalone item (has itemId but no groupId)
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState({ loading: false, error: null });
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [trackInventory, setTrackInventory] = useState(true);
  const [trackBin, setTrackBin] = useState(false);
  const [trackingMethod, setTrackingMethod] = useState("none");
  const [itemGroup, setItemGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [standaloneItem, setStandaloneItem] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState("");
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [category, setCategory] = useState("other");
  const [attributeValues, setAttributeValues] = useState([]);
  const [priceIncludesGST, setPriceIncludesGST] = useState(true);

  // Fetch manufacturers from backend
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch(`${API_ROOT}/api/shoe-sales/manufacturers?isActive=true`);
        if (response.ok) {
          const data = await response.json();
          const manufacturerNames = data.map((m) => m.name);
          setManufacturers(manufacturerNames);
          // Also update localStorage as cache
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.manufacturers, JSON.stringify(manufacturerNames));
          }
        } else {
          // Fallback to localStorage if API fails
          const stored = loadStoredList(STORAGE_KEYS.manufacturers);
          setManufacturers(stored);
        }
      } catch (error) {
        console.error("Error fetching manufacturers:", error);
        // Fallback to localStorage if API fails
        const stored = loadStoredList(STORAGE_KEYS.manufacturers);
        setManufacturers(stored);
      }
    };
    fetchManufacturers();
  }, []);

  // Fetch brands from backend
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch(`${API_ROOT}/api/shoe-sales/brands?isActive=true`);
        if (response.ok) {
          const data = await response.json();
          const brandNames = data.map((b) => b.name);
          setBrands(brandNames);
          // Also update localStorage as cache
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brandNames));
          }
        } else {
          // Fallback to localStorage if API fails
          const stored = loadStoredList(STORAGE_KEYS.brands);
          setBrands(stored);
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
        // Fallback to localStorage if API fails
        const stored = loadStoredList(STORAGE_KEYS.brands);
        setBrands(stored);
      }
    };
    fetchBrands();
  }, []);

  // Fetch standalone item data if editing a standalone item
  useEffect(() => {
    if (isStandaloneItem && itemId) {
      const fetchStandaloneItem = async () => {
        try {
          setLoadingGroup(true);
          const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`);
          
          if (!response.ok) {
            throw new Error("Failed to fetch item");
          }
          
          const data = await response.json();
          setStandaloneItem(data);
          
          // Prefill form with item data
          setFormData((prev) => ({
            ...prev,
            type: data.type || "goods",
            itemName: data.itemName || "",
            sku: data.sku || "",
            unit: data.unit || "",
            hsnCode: data.hsnCode || "",
            manufacturer: data.manufacturer || "",
            brand: data.brand || "",
            returnable: data.returnable !== undefined ? data.returnable : true,
            sellable: data.sellable !== undefined ? data.sellable : true,
            purchasable: data.purchasable !== undefined ? data.purchasable : true,
            taxPreference: data.taxPreference || "taxable",
            dimensions: data.dimensions || "",
            weight: data.weight || "",
            upc: data.upc || "",
            mpn: data.mpn || "",
            ean: data.ean || "",
            isbn: data.isbn || "",
            size: data.size || "",
            inventoryValuationMethod: data.inventoryValuationMethod || data.inventoryValuation || "",
            sellingPrice: data.sellingPrice?.toString() || "",
            salesAccount: data.salesAccount || "",
            salesDescription: data.salesDescription || "",
            costPrice: data.costPrice?.toString() || "",
            costAccount: data.costAccount || "",
            preferredVendor: data.preferredVendor || "",
            purchaseDescription: data.purchaseDescription || "",
            taxRateIntra: data.taxRateIntra || "",
            taxRateInter: data.taxRateInter || "",
            inventoryAccount: data.inventoryAccount || "",
            reorderPoint: data.reorderPoint || "",
            exemptionReason: data.exemptionReason || "",
            sac: data.sac || "",
            images: data.images || [],
          }));
          setAttributeValues(data.attributeCombination || []);
          setSelectedManufacturer(data.manufacturer || "");
          setSelectedBrand(data.brand || "");
          // Note: Manufacturers and brands are now fetched from backend, 
          // so we don't need to add them to state here
          
          setTrackInventory(data.trackInventory !== undefined ? data.trackInventory : true);
          setTrackBin(data.trackBin !== undefined ? data.trackBin : false);
          setTrackingMethod(data.trackingMethod || "none");
          setSkuManuallyEdited(!!data.sku);
        } catch (error) {
          console.error("Error fetching standalone item:", error);
          alert("Failed to load item data. Please try again.");
          navigate(`/shoe-sales/items/${itemId}`);
        } finally {
          setLoadingGroup(false);
        }
      };
      
      fetchStandaloneItem();
    }
  }, [isStandaloneItem, itemId, navigate]);

  // Fetch item group data if adding to a group or editing an item
  useEffect(() => {
    if (groupId) {
      const fetchItemGroup = async () => {
        try {
          setLoadingGroup(true);
          const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${groupId}`);
          
          if (!response.ok) {
            throw new Error("Failed to fetch item group");
          }
          
          const data = await response.json();
          setItemGroup(data);
          
          // Prefill form fields with group data
          setFormData((prev) => ({
            ...prev,
            type: data.itemType || "goods",
            unit: data.unit || "",
            manufacturer: data.manufacturer || "",
            brand: data.brand || "",
            taxPreference: data.taxPreference || "taxable",
            taxRateIntra: data.intraStateTaxRate || data.taxRateIntra || "",
            taxRateInter: data.interStateTaxRate || data.taxRateInter || "",
            inventoryValuationMethod: data.inventoryValuationMethod || "",
            returnable: data.returnable !== undefined ? data.returnable : true,
            sellable: data.sellable !== undefined ? data.sellable : true,
            purchasable: data.purchasable !== undefined ? data.purchasable : true,
            exemptionReason: data.exemptionReason || "",
            sac: data.sac || "",
          }));
          setSelectedManufacturer(data.manufacturer || "");
          setSelectedBrand(data.brand || "");
          // Note: Manufacturers and brands are now fetched from backend, 
          // so we don't need to add them to state here
          
          setTrackInventory(data.trackInventory !== undefined ? data.trackInventory : true);
          
          // If in edit mode, find and load the specific item
          if (isEditMode && itemId && data.items && Array.isArray(data.items)) {
            const foundItem = data.items.find(i => {
              const itemIdStr = (i._id?.toString() || i.id || "").toString();
              return itemIdStr === itemId.toString();
            });
            
            if (foundItem) {
              setCurrentItem(foundItem);
              
              // Check if "size" is one of the attributes and extract it
              let sizeValue = "";
              if (data.attributeRows && Array.isArray(data.attributeRows) && foundItem.attributeCombination) {
                const sizeIndex = data.attributeRows.findIndex(row => 
                  row?.attribute?.toLowerCase() === "size"
                );
                if (sizeIndex !== -1 && foundItem.attributeCombination[sizeIndex]) {
                  sizeValue = foundItem.attributeCombination[sizeIndex];
                }
              }
              
              // Prefill form with item data
              setFormData((prev) => ({
                ...prev,
                itemName: foundItem.name || "",
                sku: foundItem.sku || "",
                costPrice: foundItem.costPrice?.toString() || "",
                sellingPrice: foundItem.sellingPrice?.toString() || "",
                upc: foundItem.upc || "",
                hsnCode: foundItem.hsnCode || "",
                isbn: foundItem.isbn || "",
                reorderPoint: foundItem.reorderPoint || "",
                sac: foundItem.sac || "",
                size: sizeValue || "", // Set size from attributes
              }));
              setSkuManuallyEdited(!!foundItem.sku);
              setAttributeValues(foundItem.attributeCombination || []);
            } else {
              alert("Item not found. Redirecting to item group.");
              navigate(`/shoe-sales/item-groups/${groupId}/items/${itemId}`);
            }
          }
        } catch (error) {
          console.error("Error fetching item group:", error);
          alert("Failed to load item group data. Please try again.");
          if (isEditMode && itemId) {
            navigate(`/shoe-sales/item-groups/${groupId}/items/${itemId}`);
          } else {
            navigate(groupId ? `/shoe-sales/item-groups/${groupId}` : "/shoe-sales/item-groups");
          }
        } finally {
          setLoadingGroup(false);
        }
      };
      
      fetchItemGroup();
    }
  }, [groupId, itemId, isEditMode, navigate]);

  useEffect(() => {
    if (!trackInventory) {
      setTrackBin(false);
      setTrackingMethod("none");
      setFormData((prev) => ({
        ...prev,
        inventoryAccount: "",
        inventoryValuationMethod: "",
      }));
    }
  }, [trackInventory]);

  const extractGSTPercentage = useCallback((taxRate) => {
    if (!taxRate) return null;
    const match = taxRate.match(/\[(\d+(?:\.\d+)?)%\]/);
    if (match) {
      const parsed = parseFloat(match[1]);
      return Number.isNaN(parsed) ? null : parsed;
    }
    const fallback = parseFloat(taxRate);
    return Number.isNaN(fallback) ? null : fallback;
  }, []);

  const calculateGSTDetails = useCallback((amount, taxRate, isInclusive = false) => {
    if (!amount || !taxRate) return null;
    const price = parseFloat(amount);
    if (!Number.isFinite(price) || price === 0) return null;

    const percentage = extractGSTPercentage(taxRate);
    if (percentage === null) return null;

    let basePrice = 0;
    let gstAmount = 0;
    let finalPrice = 0;

    if (isInclusive) {
      basePrice = price / (1 + percentage / 100);
      gstAmount = price - basePrice;
      finalPrice = price;
    } else {
      basePrice = price;
      gstAmount = price * (percentage / 100);
      finalPrice = price + gstAmount;
    }

    return {
      basePrice: basePrice.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      percentage,
    };
  }, [extractGSTPercentage]);

  const generateSkuPreview = useCallback((name = "", size = "") => {
    const words = name
      .replace(/[^a-zA-Z0-9\s-]/g, " ")
      .split(/[\s-_,]+/)
      .filter(Boolean);

    if (words.length === 0) {
      return "";
    }

    const alphaWords = words.filter((word) => /[A-Za-z]/.test(word));
    const numericWords = words.filter((word) => /^\d+$/.test(word));

    let letters = alphaWords.map((word) => word[0].toUpperCase()).join("");

    if (!letters && alphaWords.length > 0) {
      letters = alphaWords[0].slice(0, 3).toUpperCase();
    }

    if (!letters) {
      letters = words[0].slice(0, 3).toUpperCase();
    }

    let base = letters || "ITEM";
    const digits = numericWords.join("");
    if (digits) {
      base += `-${digits}`;
    }

    // Add size to SKU if provided
    if (size && size.trim()) {
      base += `-${size.trim()}`;
    }

    return base;
  }, []);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if ((field === "itemName" || field === "size") && !skuManuallyEdited) {
        const itemName = field === "itemName" ? value : prev.itemName;
        const size = field === "size" ? value : prev.size;
        next.sku = generateSkuPreview(itemName, size);
      }
      if (field === "type") {
        if (value === "service") {
          next.hsnCode = "";
        } else {
          next.sac = "";
        }
      }
      return next;
    });
  };

  const handleSkuChange = (event) => {
    const value = event.target.value;
    setSkuManuallyEdited(true);
    setFormData((prev) => ({ ...prev, sku: value.toUpperCase() }));
  };

const handleCheckboxChange = (field) => (event) => {
  const checked = event.target.checked;
  setFormData((prev) => {
    const next = { ...prev, [field]: checked };

    if (field === "sellable" && !checked) {
      next.sellingPrice = "";
      next.salesAccount = "";
      next.salesDescription = "";
    }

    if (field === "purchasable" && !checked) {
      next.costPrice = "";
      next.costAccount = "";
      next.preferredVendor = "";
      next.purchaseDescription = "";
    }

    return next;
  });
};

  const handleSelectChange = (field) => (value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "taxPreference" && value === "taxable") {
        next.exemptionReason = "";
      }
      return next;
    });
  };

  // Allow editing of per-attribute values (e.g., color, size) for a single group item
  const handleAttributeValueChange = (attrIndex, attrLabel) => (event) => {
    const value = event.target.value;
    setAttributeValues((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      next[attrIndex] = value;
      // Keep dedicated size field synchronized if this attribute is "size"
      if (typeof attrLabel === "string" && attrLabel.toLowerCase() === "size") {
        setFormData((p) => ({ ...p, size: value }));
      }
      return next;
    });
  };

  const handleManufacturerSelect = (value) => {
    setSelectedManufacturer(value);
    setFormData((prev) => ({ ...prev, manufacturer: value }));
  };

  const handleBrandSelect = (value) => {
    setSelectedBrand(value);
    setFormData((prev) => ({ ...prev, brand: value }));
  };

  const handleCategorySelect = (value) => {
    setCategory(value);
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleRadioChange = (field, value) => () => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Check if SKU already exists
  const checkSkuExists = async (sku) => {
    if (!sku || !sku.trim()) return false;
    try {
      const response = await fetch(`${API_ROOT}/api/shoe-sales/items?sku=${encodeURIComponent(sku.trim().toUpperCase())}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current item if editing
        const items = Array.isArray(data) ? data : (data.items || []);
        if (isEditMode && itemId) {
          // When editing, exclude the current item from the check
          return items.some(item => {
            const itemIdStr = (item._id?.toString() || item.id || "").toString();
            return item.sku?.toUpperCase() === sku.trim().toUpperCase() && itemIdStr !== itemId.toString();
          });
        }
        return items.some(item => item.sku?.toUpperCase() === sku.trim().toUpperCase());
      }
      return false;
    } catch (error) {
      console.error("Error checking SKU:", error);
      return false;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: null });

    try {
      // Check SKU uniqueness for standalone items
      if (!groupId && formData.sku && formData.sku.trim()) {
        const skuExists = await checkSkuExists(formData.sku);
        if (skuExists) {
          setStatus({ loading: false, error: "SKU already exists. Please use a different SKU." });
          alert("SKU already exists. Please use a different SKU.");
          return;
        }
      }

      // If adding to a group or editing an item in a group
      if (groupId && itemGroup) {
        // Validate required fields
        if (!formData.itemName || formData.itemName.trim() === "") {
          setStatus({ loading: false, error: "Item name is required." });
          return;
        }

        // Create/update the item object matching the group's item schema
        const itemData = {
          name: formData.itemName.trim(),
          sku: formData.sku || "",
          costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
          sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : 0,
          upc: formData.upc || "",
          hsnCode: formData.hsnCode || "",
          isbn: formData.isbn || "",
          reorderPoint: formData.reorderPoint || "",
          sac: formData.type === "service" ? (formData.sac || "") : "",
          returnable: formData.returnable !== undefined ? formData.returnable : true,
        };

        let updatedItems;
        // Track per-attribute changes (e.g., size/color) to update group-level options conditionally
        const attrRows = Array.isArray(itemGroup.attributeRows) ? itemGroup.attributeRows : [];
        const changedPrevValues = new Map(); // index -> previous
        const changedNextValues = new Map(); // index -> next
        if (isEditMode && currentItem) {
          // Update existing item - preserve _id, id, stock, warehouseStocks, and attributeCombination
          updatedItems = itemGroup.items.map(i => {
            const itemIdStr = (i._id?.toString() || i.id || "").toString();
            if (itemIdStr === itemId.toString()) {
              // Update attributeCombination with size value if size attribute exists
              let updatedAttributeCombination = [...(i.attributeCombination || [])];
              // Prefer values from editable attributeValues; fallback to existing
              for (let ai = 0; ai < attrRows.length; ai++) {
                const label = (attrRows[ai]?.attribute || "").toLowerCase();
                const prevVal = updatedAttributeCombination[ai] || "";
                let newVal = (attributeValues && attributeValues[ai] !== undefined) ? attributeValues[ai] : prevVal;
                // Keep dedicated size field in sync
                if (label === "size") {
                  if (formData.size) newVal = formData.size;
                }
                if (newVal !== prevVal) {
                  changedPrevValues.set(ai, prevVal);
                  changedNextValues.set(ai, newVal);
                }
                updatedAttributeCombination[ai] = newVal;
              }
              
              // Regenerate item name from updated attributeCombination
              let updatedItemName = itemData.name.trim();
              if (updatedAttributeCombination.length > 0) {
                const optionsStr = updatedAttributeCombination.join("/");
                updatedItemName = `${itemGroup.name} - ${optionsStr}`;
                console.log(`Regenerated item name: "${updatedItemName}" from combination:`, updatedAttributeCombination);
              }
              
              return {
                ...i,
                _id: i._id || i.id, // Preserve _id
                id: i.id || i._id, // Preserve id
                ...itemData,
                name: updatedItemName, // Use regenerated name with updated attributes
                stock: i.stock !== undefined ? i.stock : 0, // Preserve stock
                warehouseStocks: i.warehouseStocks || [], // Preserve warehouse stocks
                attributeCombination: updatedAttributeCombination, // Update attribute combination with size
              };
            }
            return i;
          });
        } else {
          // Add new item - initialize with user's warehouse
          const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
          const userLocName = currentUser.username || currentUser.locName || "";
          
          // Helper function to map locName to warehouse name
          const mapLocNameToWarehouse = (locName) => {
            if (!locName) return "Warehouse";
            // Remove prefixes like "G.", "Z.", "SG."
            let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
            // Add "Branch" if not already present and not "Warehouse"
            if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
              warehouse = `${warehouse} Branch`;
            }
            return warehouse || "Warehouse";
          };
          
          const userWarehouse = mapLocNameToWarehouse(userLocName);
          
          const newItem = {
            ...itemData,
            stock: 0,
            attributeCombination: [],
            warehouseStocks: [{
              warehouse: userWarehouse,
              openingStock: 0,
              openingStockValue: 0,
              stockOnHand: 0,
              committedStock: 0,
              availableForSale: 0,
              physicalOpeningStock: 0,
              physicalStockOnHand: 0,
              physicalCommittedStock: 0,
              physicalAvailableForSale: 0,
            }],
          };
          updatedItems = [...(itemGroup.items || []), newItem];
        }
        
        // Get current user for history tracking
        const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
        const changedBy = currentUser.username || currentUser.locName || "System";
        const userLocName = currentUser.username || currentUser.locName || "";
        
        // Helper function to map locName to warehouse name
        const mapLocNameToWarehouse = (locName) => {
          if (!locName) return "Warehouse";
          // Remove prefixes like "G.", "Z.", "SG."
          let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
          // Add "Branch" if not already present and not "Warehouse"
          if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
            warehouse = `${warehouse} Branch`;
          }
          return warehouse || "Warehouse";
        };
        
        const userWarehouse = mapLocNameToWarehouse(userLocName);

        // Conditionally update group-level attribute options for the specific attribute changed:
        // - If a new size value was introduced, add it to the "size" options (if not already there)
        // - If the old size value is no longer used by any item in the group, remove it
        let updatedAttributeRows = Array.isArray(itemGroup.attributeRows)
          ? itemGroup.attributeRows.map((r) => ({ ...r, options: Array.isArray(r.options) ? [...r.options] : [] }))
          : [];
        if (isEditMode && currentItem && updatedAttributeRows.length > 0 && changedNextValues.size > 0) {
          // For each changed attribute, add new option if missing and remove old if unused
          changedNextValues.forEach((newVal, idx) => {
            const row = updatedAttributeRows[idx];
            if (!row) return;
            if (newVal && !row.options.includes(newVal)) {
              row.options.push(newVal);
              row.options.sort((a, b) => {
                const na = parseFloat(a), nb = parseFloat(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return a.toString().localeCompare(b.toString());
              });
            }
            const oldVal = changedPrevValues.get(idx);
            if (oldVal && oldVal !== newVal) {
              const usedElsewhere = updatedItems.some((it) => {
                const combo = it?.attributeCombination || [];
                return combo[idx] === oldVal;
              });
              if (!usedElsewhere) {
                row.options = row.options.filter((opt) => opt !== oldVal);
              }
            }
          });
        }

        // Prepare update payload with all group fields preserved
        const updatePayload = {
          name: itemGroup.name,
          sku: itemGroup.sku || "",
          itemType: itemGroup.itemType || "goods",
          unit: itemGroup.unit || "",
          manufacturer: itemGroup.manufacturer || "",
          brand: itemGroup.brand || "",
          taxPreference: formData.taxPreference || "taxable",
          exemptionReason: formData.taxPreference === "non-taxable" ? (formData.exemptionReason || "") : "",
          intraStateTaxRate: formData.taxPreference === "taxable" ? (formData.taxRateIntra || "") : "",
          interStateTaxRate: formData.taxPreference === "taxable" ? (formData.taxRateInter || "") : "",
          inventoryValuationMethod: itemGroup.inventoryValuationMethod || "",
          createAttributes: itemGroup.createAttributes !== undefined ? itemGroup.createAttributes : true,
          attributeRows: updatedAttributeRows,
          sellable: itemGroup.sellable !== undefined ? itemGroup.sellable : true,
          purchasable: itemGroup.purchasable !== undefined ? itemGroup.purchasable : true,
          trackInventory: itemGroup.trackInventory !== undefined ? itemGroup.trackInventory : false,
          items: updatedItems,
          stock: itemGroup.stock || 0,
          reorder: itemGroup.reorder || "",
          isActive: itemGroup.isActive !== undefined ? itemGroup.isActive : true,
          itemId: isEditMode ? itemId : undefined, // Include itemId for history tracking
          changedBy: changedBy,
          userWarehouse: userWarehouse,
          userLocName: userLocName,
        };
        
        console.log("Saving item group with updated items:", {
          updatedItems: updatedItems.map(i => ({ name: i.name, returnable: i.returnable, attributeCombination: i.attributeCombination })),
          updatedAttributeRows: updatedAttributeRows.map(r => ({ attribute: r.attribute, options: r.options }))
        });
        
        const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${groupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || payload?.errors?.join(", ") || (isEditMode ? "Failed to update item." : "Failed to add item to group."));
        }

        // Navigate back to the item detail page if editing, or group detail page if creating
        if (isEditMode && itemId) {
          navigate(`/shoe-sales/item-groups/${groupId}/items/${itemId}`);
        } else {
          navigate(`/shoe-sales/item-groups/${groupId}`);
        }
      } else if (isStandaloneItem) {
        // Update standalone item
        // Process images: extract base64 data and format properly
        const processedImages = formData.images.map(img => {
          // Check if it's already a processed image object
          if (img.filename && img.contentType && img.data) {
            return img;
          }
          let base64Data = img.base64 || img;
          // Remove data URL prefix if present
          if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          return {
            filename: img.name || "image",
            contentType: img.type || "image/jpeg",
            data: base64Data,
          };
        });
        
        const updatePayload = {
          ...formData,
          images: processedImages,
          trackInventory,
          trackBin,
          trackingMethod,
          sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : 0,
          costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
          warehouseStocks: standaloneItem?.warehouseStocks || [], // Preserve warehouse stocks
        };

        console.log("Updating standalone item with payload:", { returnable: updatePayload.returnable, itemId });

        const response = await fetch(`${API_ROOT}/api/shoe-sales/items/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Failed to update item.");
        }

        navigate(`/shoe-sales/items/${itemId}`);
      } else {
        // Create standalone item (original behavior)
        // Get current user for history tracking
        const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
        const changedBy = currentUser.username || currentUser.locName || "System";
        const userLocName = currentUser.username || currentUser.locName || "";
        
        // Helper function to map locName to warehouse name
        const mapLocNameToWarehouse = (locName) => {
          if (!locName) return "Warehouse";
          // Remove prefixes like "G.", "Z.", "SG."
          let warehouse = locName.replace(/^[A-Z]\.?\s*/i, "").trim();
          // Add "Branch" if not already present and not "Warehouse"
          if (warehouse && warehouse.toLowerCase() !== "warehouse" && !warehouse.toLowerCase().includes("branch")) {
            warehouse = `${warehouse} Branch`;
          }
          return warehouse || "Warehouse";
        };
        
        const userWarehouse = mapLocNameToWarehouse(userLocName);
        
        // Process images: extract base64 data and format properly
        const processedImages = formData.images.map(img => {
          let base64Data = img.base64 || img;
          // Remove data URL prefix if present
          if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          return {
            filename: img.name || "image",
            contentType: img.type || "image/jpeg",
            data: base64Data,
          };
        });
        
        const response = await fetch(`${API_ROOT}/api/shoe-sales/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            images: processedImages,
            trackInventory,
            trackBin,
            trackingMethod,
            sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : 0,
            costPrice: formData.costPrice ? Number(formData.costPrice) : 0,
            changedBy: changedBy,
            createdBy: changedBy,
            userWarehouse: userWarehouse,
            userLocName: userLocName,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Failed to save item.");
        }

        setFormData(initialFormData);
        setAttributeValues([]);
        setSkuManuallyEdited(false);
        setTrackInventory(true);
        setTrackBin(false);
        setTrackingMethod("none");
        navigate("/shoe-sales/items");
      }
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Something went wrong." });
      return;
    }

    setStatus({ loading: false, error: null });
  };

  // Enter key to save item
  useEnterToSave((e) => {
    const syntheticEvent = e || { preventDefault: () => {} };
    handleSubmit(syntheticEvent);
  }, status.loading);

  // Calculate attribute summary BEFORE any early returns (hooks must be called unconditionally)
  // Filter out "size" since it has its own dedicated field
  const attributeSummary = useMemo(() => {
    if (!itemGroup || !Array.isArray(itemGroup.attributeRows)) return [];
    return itemGroup.attributeRows
      .map((row, idx) => ({
        label: row.attribute,
        value: attributeValues[idx] || "",
        originalIndex: idx
      }))
      .filter((item) => item.label && item.label.toLowerCase() !== "size");
  }, [itemGroup, attributeValues]);

  // Early return for loading state - AFTER all hooks
  if (loadingGroup) {
    return (
      <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
        <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-lg p-8 text-center">
          <p className="text-lg font-medium text-[#475569]">Loading item group...</p>
        </div>
      </div>
    );
  }

  const backUrl = isStandaloneItem && itemId
    ? `/shoe-sales/items/${itemId}`
    : (isEditMode && itemId
      ? `/shoe-sales/item-groups/${groupId}/items/${itemId}`
      : (groupId ? `/shoe-sales/item-groups/${groupId}` : "/shoe-sales/items"));
  const backText = isStandaloneItem
    ? "Back to Item"
    : (isEditMode 
      ? "Back to Item"
      : (groupId ? "Back to Group" : "Back to Items"));
  const pageTitle = isStandaloneItem
    ? "Edit Item"
    : (isEditMode
      ? `Edit Item - ${currentItem?.name || "Item"}` 
      : (groupId ? `Add Item to ${itemGroup?.name || "Group"}` : "New Item"));
  const pageDescription = isEditMode
    ? "Edit item details for sales, purchasing, and inventory tracking."
    : (groupId 
      ? "Add a new item to this item group." 
      : "Capture product details for sales, purchasing, and inventory tracking.");

  const selectedTaxRate = formData.taxRateIntra || formData.taxRateInter;
  const shouldShowGSTSummary = !!(formData.sellable && formData.sellingPrice && selectedTaxRate);
  const gstDetails = shouldShowGSTSummary
    ? calculateGSTDetails(formData.sellingPrice, selectedTaxRate, priceIncludesGST)
    : null;

  return (
    <div className="ml-64 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Enhanced Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{pageTitle}</h1>
              <p className="text-sm text-slate-600">{pageDescription}</p>
            </div>
          <Link
            to={backUrl}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md w-full sm:w-auto justify-center sm:justify-start"
          >
            <ArrowLeft size={16} />
            {backText}
          </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-8 py-4 sm:py-8">
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Error Alert */}
        {status.error && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 backdrop-blur-sm px-6 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-sm">⚠</span>
                </div>
                <p className="text-sm font-medium text-red-800">{status.error}</p>
              </div>
          </div>
        )}

          {/* Basic Information Section */}
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-8">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                    <Package className="w-4 h-4 text-blue-600" />
                </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
                    <p className="text-sm text-slate-600">Configure the fundamental details of your item</p>
                  </div>
                </div>

                {/* Core Fields */}
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                <FloatingField
                  label="Item Name*"
                  placeholder="Enter item name"
                  required
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange("itemName")}
                  disabled={status.loading}
                />
                <FloatingField
                  label="Size"
                  placeholder="Select size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange("size")}
                  disabled={status.loading}
                />
                <FloatingField
                  label="SKU"
                      placeholder="Auto-generated or enter manually"
                  name="sku"
                  value={formData.sku}
                  onChange={handleSkuChange}
                  disabled={status.loading}
                      hint={
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Info className="w-3 h-3" />
                          Auto-generated
                        </div>
                      }
                />
                <UnitSelect
                  label="Unit*"
                  placeholder="Select or type to add"
                  value={formData.unit}
                  onChange={(value) => setFormData((prev) => ({ ...prev, unit: value }))}
                  options={unitOptions}
                />
                  <FloatingField
                    label="HSN Code"
                      placeholder="Enter HSN code"
                    name="hsnCode"
                    value={formData.hsnCode}
                    onChange={handleChange("hsnCode")}
                    disabled={status.loading}
                  />
              </div>

                  {/* Brand & Manufacturer */}
                  <div className="grid gap-6 md:grid-cols-2">
                <ManufacturerSelect
                  label="Manufacturer"
                  placeholder="Select or add manufacturer"
                  value={selectedManufacturer}
                  onChange={handleManufacturerSelect}
                  options={manufacturers}
                  onManageClick={() => setShowManufacturerModal(true)}
                  disabled={status.loading}
                />
                <BrandSelect
                  label="Brand"
                  placeholder="Select or add brand"
                  value={selectedBrand}
                  onChange={handleBrandSelect}
                  options={brands}
                  onManageClick={() => setShowBrandModal(true)}
                  disabled={status.loading}
                />
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
                    Category*
                  </legend>
                  <div className="flex flex-wrap gap-4 text-sm font-medium text-[#1f2937]">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        value="shirt"
                        checked={category === "shirt"}
                        onChange={(e) => handleCategorySelect(e.target.value)}
                        className="text-[#4285f4]"
                        disabled={status.loading}
                      />
                      Shirt Sales
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        value="shoe"
                        checked={category === "shoe"}
                        onChange={(e) => handleCategorySelect(e.target.value)}
                        className="text-[#4285f4]"
                        disabled={status.loading}
                      />
                      Shoe Sales
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        value="other"
                        checked={category === "other"}
                        onChange={(e) => handleCategorySelect(e.target.value)}
                        className="text-[#4285f4]"
                        disabled={status.loading}
                      />
                      Other
                    </label>
                  </div>
                </fieldset>
                  </div>

                  {/* Variant Attributes */}
                {itemGroup && Array.isArray(itemGroup.attributeRows) && itemGroup.attributeRows.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-500" />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Variant Attributes</h3>
                          <p className="text-xs text-slate-600">Configure attributes for this item variant</p>
                        </div>
                      </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {itemGroup.attributeRows.map((row, idx) => {
                        const label = row?.attribute || `Attribute ${idx + 1}`;
                        const currentVal = (attributeValues && attributeValues[idx]) || "";
                        const options = Array.isArray(row?.options) ? row.options : [];
                          const optionsHint = options.length > 0 ? `Available: ${options.join(", ")}` : "Enter custom value";
                        return (
                            <div key={`${label}-${idx}`} className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {label}
                            </label>
                            <input
                              type="text"
                              value={currentVal}
                              onChange={handleAttributeValueChange(idx, label)}
                              placeholder={options.length ? `e.g. ${options[0]}` : "Enter value"}
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                              disabled={status.loading}
                            />
                              <p className="text-xs text-slate-500">{optionsHint}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                  {/* Additional Settings */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                <FloatingCheckbox
                  label="Returnable Item"
                  name="returnable"
                  checked={formData.returnable}
                  onChange={handleCheckboxChange("returnable")}
                  disabled={status.loading}
                />
                    </div>
                    <div className="space-y-4">
                <SearchableSelect
                  label="Tax Preference*"
                  placeholder="Select tax preference"
                  value={formData.taxPreference}
                  onChange={handleSelectChange("taxPreference")}
                  groups={taxPreferenceGroups}
                  required
                  disabled={status.loading}
                />
                {formData.taxPreference === "non-taxable" && (
                        <div className="relative">
                    <FloatingField
                      label="Exemption Reason*"
                            placeholder="Enter exemption reason"
                      name="exemptionReason"
                      value={formData.exemptionReason}
                      onChange={handleChange("exemptionReason")}
                      disabled={status.loading}
                      required
                    />
                          <div className="absolute -top-1 -right-1">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          </div>
                  </div>
                )}
              </div>
                  </div>
                </div>
            </div>

              {/* Image Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-slate-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Product Images</h3>
                    <p className="text-xs text-slate-600">Upload high-quality images of your item</p>
                  </div>
                </div>
            <ImageUpload
              onImagesSelect={(images) =>
                setFormData((prev) => ({
                  ...prev,
                  images: images,
                }))
              }
              existingImages={formData.images}
              onRemoveImage={(index) => {
                setFormData((prev) => ({
                  ...prev,
                  images: prev.images.filter((_, i) => i !== index),
                }));
              }}
              multiple={true}
            />
              </div>
            </div>
          </div>

          {/* Sales & Purchase Information */}
          <div className="space-y-6 sm:space-y-8">
              <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
                {/* Sales Information */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Sales Information</h3>
                        <p className="text-sm text-slate-600">Configure pricing and sales settings</p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="sellable"
                      checked={formData.sellable}
                      onChange={handleCheckboxChange("sellable")}
                      disabled={status.loading}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    Sellable
                  </label>
                  </div>

                {formData.taxPreference === "taxable" && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-4">Tax Configuration</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <TaxRateSelect
                        label="Intra State Tax Rate"
                        value={formData.taxRateIntra}
                        onChange={(value) => setFormData((prev) => ({ ...prev, taxRateIntra: value }))}
                        type="intra"
                      />
                      <TaxRateSelect
                        label="Inter State Tax Rate"
                        value={formData.taxRateInter}
                        onChange={(value) => setFormData((prev) => ({ ...prev, taxRateInter: value }))}
                        type="inter"
                      />
                    </div>
                        <div className="mt-4">
                          <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        name="priceIncludesGST"
                        checked={priceIncludesGST}
                        onChange={(event) => setPriceIncludesGST(event.target.checked)}
                        disabled={status.loading}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                            Price includes GST
                    </label>
                        </div>
                      </div>
                  </div>
                )}

                <FloatingField
                  label="Selling Price"
                  placeholder="0.00"
                    prefix="₹"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange("sellingPrice")}
                  disabled={!formData.sellable || status.loading}
                />

                  {/* GST Summary */}
                {shouldShowGSTSummary && gstDetails && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                      <h4 className="text-sm font-semibold text-slate-900 mb-4">Price Breakdown</h4>
                      {priceIncludesGST ? (
                    <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Base Price (Excl. GST)
                        </label>
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-4 py-3">
                              <span className="text-sm font-semibold text-slate-600">₹</span>
                              <span className="text-lg font-bold text-slate-900 ml-2">{gstDetails.basePrice}</span>
                        </div>
                      </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              GST Amount ({gstDetails.percentage}%)
                        </label>
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-4 py-3">
                              <span className="text-sm font-semibold text-slate-600">₹</span>
                              <span className="text-lg font-bold text-slate-900 ml-2">{gstDetails.gstAmount}</span>
                        </div>
                      </div>
                          <div className="md:col-span-2 pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-600">
                              Total inclusive price: <span className="font-bold text-slate-900">₹{gstDetails.finalPrice}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Price with GST
                      </label>
                            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-4 py-3">
                              <span className="text-sm font-semibold text-slate-600">₹</span>
                              <span className="text-lg font-bold text-slate-900 ml-2">{gstDetails.finalPrice}</span>
                      </div>
                          </div>
                          <p className="text-sm text-slate-600">
                            GST Amount ({gstDetails.percentage}%): ₹{gstDetails.gstAmount}
                      </p>
                    </div>
                      )}
                    </div>
                )}
                </div>

                {/* Purchase Information */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100">
                        <ShoppingCart className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Purchase Information</h3>
                        <p className="text-sm text-slate-600">Configure cost and procurement settings</p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="purchasable"
                      checked={formData.purchasable}
                      onChange={handleCheckboxChange("purchasable")}
                      disabled={status.loading}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    Purchasable
                  </label>
                  </div>

                <FloatingField
                  label="Cost Price"
                  placeholder="0.00"
                    prefix="₹"
                  name="costPrice"
                  value={formData.costPrice}
                  onChange={handleChange("costPrice")}
                  disabled={!formData.purchasable || status.loading}
                />
                </div>
              </div>

            {/* Inventory & Tracking */}
            <div className="border-t border-slate-200 pt-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100">
                    <Warehouse className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Inventory & Tracking</h3>
                    <p className="text-sm text-slate-600">Configure inventory management settings</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
              <FloatingField
                label="Reorder Point"
                    placeholder="Enter quantity threshold"
                name="reorderPoint"
                value={formData.reorderPoint}
                onChange={handleChange("reorderPoint")}
                disabled={status.loading}
              />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-slate-200 pt-6 sm:pt-8">
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="text-sm text-slate-600 text-center sm:text-left">
                  {groupId ? "This item will be added to the selected group" : "A new standalone item will be created"}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  to={backUrl}
                    className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={status.loading}
                    className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                    {status.loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {groupId ? "Adding to Group..." : "Saving..."}
                      </span>
                    ) : (
                      groupId ? "Add to Group" : "Save Item"
                    )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
      </div>
      {showManufacturerModal && (
        <ManufacturerModal
          onClose={() => {
            setShowManufacturerModal(false);
            setNewManufacturer("");
          }}
          onAdd={async (name) => {
            if (name.trim()) {
              try {
                // Get current user for createdBy
                const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
                const createdBy = currentUser.username || currentUser.locName || "System";
                
                // Save to backend
                const response = await fetch(`${API_ROOT}/api/shoe-sales/manufacturers`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: name.trim(),
                    createdBy: createdBy,
                  }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  const manufacturerName = data.name;
                  
                  // Update local state
                  setManufacturers((prev) =>
                    prev.includes(manufacturerName) ? prev : [...prev, manufacturerName]
                  );
                  handleManufacturerSelect(manufacturerName);
                  setShowManufacturerModal(false);
                  setNewManufacturer("");
                } else {
                  const errorData = await response.json().catch(() => ({ message: "Failed to create manufacturer" }));
                  alert(errorData.message || "Failed to create manufacturer. Please try again.");
                }
              } catch (error) {
                console.error("Error creating manufacturer:", error);
                alert("Failed to create manufacturer. Please try again.");
              }
            }
          }}
          newManufacturer={newManufacturer}
          setNewManufacturer={setNewManufacturer}
        />
      )}
      {showBrandModal && (
        <BrandModal
          onClose={() => {
            setShowBrandModal(false);
            setNewBrand("");
          }}
          onAdd={async (name) => {
            if (name.trim()) {
              try {
                // Get current user for createdBy
                const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
                const createdBy = currentUser.username || currentUser.locName || "System";
                
                // Save to backend
                const response = await fetch(`${API_ROOT}/api/shoe-sales/brands`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: name.trim(),
                    createdBy: createdBy,
                  }),
                });
                
                if (response.ok) {
                  const data = await response.json();
                  const brandName = data.name;
                  
                  // Update local state
                  setBrands((prev) =>
                    prev.includes(brandName) ? prev : [...prev, brandName]
                  );
                  handleBrandSelect(brandName);
                  setShowBrandModal(false);
                  setNewBrand("");
                } else {
                  const errorData = await response.json().catch(() => ({ message: "Failed to create brand" }));
                  alert(errorData.message || "Failed to create brand. Please try again.");
                }
              } catch (error) {
                console.error("Error creating brand:", error);
                alert("Failed to create brand. Please try again.");
              }
            }
          }}
          newBrand={newBrand}
          setNewBrand={setNewBrand}
        />
      )}
    </div>
  );
};

export default ShoeSalesItemCreate;

const FloatingField = ({
  label,
  placeholder,
  required = false,
  inputType = "input",
  hint,
  prefix,
  name,
  value,
  onChange,
  disabled = false,
}) => (
  <div className="space-y-2">
    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {inputType === "textarea" ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
    ) : inputType === "select" ? (
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">{placeholder}</option>
      </select>
    ) : (
      <div className="relative">
        <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
          {prefix && (
            <div className="flex items-center pl-4 pr-2 border-r border-slate-200">
              <span className="text-sm font-semibold text-slate-600">{prefix}</span>
            </div>
          )}
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
            className="w-full rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
          {hint && (
            <div className="pr-4">
              <span className="text-xs text-slate-400">{hint}</span>
      </div>
    )}
        </div>
      </div>
    )}
  </div>
);

const FloatingCheckbox = ({ label, name, checked, onChange, disabled = false }) => (
  <label className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300 transition">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed"
    />
    {label}
  </label>
);

const FloatingRadio = ({ name, label, value, checked, onChange, disabled = false }) => (
  <label className="inline-flex items-center gap-2 rounded-full border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="text-[#4285f4] focus:ring-[#4285f4] disabled:cursor-not-allowed"
    />
    {label}
  </label>
);

const SearchableSelect = ({ label, placeholder, value, onChange, groups, disabled = false, required = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const normalizedGroups = useMemo(
    () =>
      groups.map((group) => ({
        group: group.group,
        options: group.options.map((option) =>
          typeof option === "string" ? { label: option, value: option } : option
        ),
      })),
    [groups]
  );

  const optionMap = useMemo(() => {
    const map = new Map();
    normalizedGroups.forEach((group) => {
      group.options.forEach((option) => {
        map.set(option.value, option.label);
      });
    });
    return map;
  }, [normalizedGroups]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return groups;
    }
    return normalizedGroups
      .map((group) => ({
        group: group.group,
        options: group.options.filter((option) => option.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.options.length > 0);
  }, [normalizedGroups, search]);

  const displayValue = value ? optionMap.get(value) || value : "";

  return (
    <div className="relative flex w-full flex-col gap-1 text-sm text-[#475569]" ref={containerRef}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
        {label}
        {required && <span className="text-[#ef4444]"> *</span>}
      </span>
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          open ? "border-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" : "border-[#d7dcf5]"
        } ${disabled ? "bg-[#f1f5f9] text-[#9ca3af]" : "bg-white text-[#1f2937]"} ${disabled ? "" : "cursor-pointer"}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        <span className={value ? "text-[#1f2937]" : "text-[#9ca3af]"}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-[#9ca3af] transition-transform ${open ? "rotate-180" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#d7dcf5] bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-2 border-b border-[#edf1ff] px-3 py-2 text-[#475569]">
            <Search size={14} className="text-[#9ca3af]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-8 w-full border-none text-sm text-[#1f2937] outline-none placeholder:text-[#9ca3af]"
            />
          </div>
          <div className="max-h-60 overflow-y-scroll py-2 searchable-select-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
            <style>{`
              .searchable-select-scroll::-webkit-scrollbar {
                width: 8px;
              }
              .searchable-select-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              .searchable-select-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .searchable-select-scroll::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}</style>
            {filteredGroups.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No matching results</p>
            )}
            {filteredGroups.map((group) => (
              <div key={group.group}>
                <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
                  {group.group}
                </p>
                {group.options.map((option) => {
                  const isSelected = value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`select-option flex w-full items-center rounded-md px-4 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-[#e9f0ff] font-semibold text-[#1f2937]"
                          : "bg-white text-[#475569] hover:bg-[#f6f8ff]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoCard = ({ title, children, fullWidth, actions }) => (
  <div className={`space-y-6 ${fullWidth ? "" : ""}`}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-1">Configure {title.toLowerCase()} settings</p>
      </div>
      {actions}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const UnitSelect = ({ label, placeholder, value, onChange, options = [] }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [options, search]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1 text-sm text-[#475569]" ref={containerRef}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
          open ? "border-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" : "border-[#d7dcf5] hover:border-[#94a3b8]"
        } bg-white text-[#1f2937] cursor-pointer`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`transition-colors duration-150 ${value ? "text-[#1f2937]" : "text-[#9ca3af]"}`}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-[#9ca3af] transition-transform duration-200 ease-in-out ${open ? "rotate-180" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#d7dcf5] bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)] dropdown-animate">
          <style>{`
            @keyframes dropdownFadeIn {
              from {
                opacity: 0;
                transform: translateY(-8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .dropdown-animate {
              animation: dropdownFadeIn 0.2s ease-out;
            }
          `}</style>
          <div className="flex items-center gap-2 bg-[#2563eb] px-3 py-2 text-white rounded-t-xl">
            <Search size={14} className="text-white" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim() && !filteredOptions.includes(search.trim())) {
                  e.preventDefault();
                  onChange(search.trim());
                  setOpen(false);
                  setSearch("");
                }
              }}
              placeholder="Select or type to add"
              className="h-8 w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/80"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-scroll py-2 unit-select-scroll bg-white rounded-b-xl" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
            <style>{`
              .unit-select-scroll::-webkit-scrollbar {
                width: 8px;
              }
              .unit-select-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              .unit-select-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .unit-select-scroll::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}</style>
            {filteredOptions.length === 0 && search.trim() ? (
              <div
                onClick={() => {
                  onChange(search.trim());
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center px-4 py-2 text-left text-sm cursor-pointer transition-all duration-150 ease-in-out text-[#2563eb] hover:bg-[#e9f0ff] font-semibold"
              >
                Add "{search.trim()}"
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No matching results</p>
            ) : (
              <>
                {search.trim() && !filteredOptions.includes(search.trim()) && (
                  <div
                    onClick={() => {
                      onChange(search.trim());
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center px-4 py-2 text-left text-sm cursor-pointer transition-all duration-150 ease-in-out text-[#2563eb] hover:bg-[#e9f0ff] font-semibold border-b border-[#e7ebf8]"
                  >
                    Add "{search.trim()}"
                  </div>
                )}
                {filteredOptions.map((option) => {
                  const isSelected = value === option;
                  return (
                    <div
                      key={option}
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`flex w-full items-center px-4 py-2 text-left text-sm cursor-pointer transition-all duration-150 ease-in-out ${
                        isSelected
                          ? "text-[#2563eb] font-semibold"
                          : "text-[#475569] hover:text-[#2563eb]"
                      }`}
                    >
                      {option}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TaxRateSelect = ({ label, value, onChange, type }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const containerRef = useRef(null);

  // Tax rate options based on type
  const taxRateOptions = type === "intra" 
    ? [
        "GST0 [0%]",
        "GST5 [5%]",
        "GST12 [12%]",
        "GST18 [18%]",
        "GST28 [28%]",
      ]
    : [
        "IGST0 [0%]",
        "IGST5 [5%]",
        "IGST12 [12%]",
        "IGST18 [18%]",
        "IGST28 [28%]",
      ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
        setHoveredIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return taxRateOptions;
    }
    return taxRateOptions.filter((o) => o.toLowerCase().includes(term));
  }, [search, taxRateOptions]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1 text-sm text-[#475569]" ref={containerRef}>
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] cursor-pointer border-b border-dotted border-[#64748b] pb-0.5 inline-block w-fit">
        {label}
      </label>
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all duration-200 ease-in-out ${
          open ? "border-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" : "border-[#d7dcf5] hover:border-[#94a3b8]"
        } bg-white text-[#1f2937] cursor-pointer`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`transition-colors duration-150 ${value ? "text-[#1f2937]" : "text-[#9ca3af]"}`}>
          {displayValue || "Select tax rate"}
        </span>
        <ChevronDown
          size={16}
          className={`ml-3 text-[#9ca3af] transition-transform duration-200 ease-in-out ${open ? "rotate-180" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#d7dcf5] bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-2 border-b border-[#edf1ff] px-3 py-2 bg-[#2563eb] rounded-t-xl">
            <Search size={14} className="text-white" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-8 w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/80"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#64748b]">
              Tax
            </div>
            <div className="max-h-60 overflow-y-scroll tax-rate-select-scroll">
              <style>{`
                .tax-rate-select-scroll::-webkit-scrollbar {
                  width: 8px;
                }
                .tax-rate-select-scroll::-webkit-scrollbar-track {
                  background: #f1f5f9;
                  border-radius: 4px;
                }
                .tax-rate-select-scroll::-webkit-scrollbar-thumb {
                  background: #cbd5e1;
                  border-radius: 4px;
                }
                .tax-rate-select-scroll::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
              `}</style>
              {filteredOptions.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No matching results</p>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = value === option;
                  const isHovered = hoveredIndex === index;
                  return (
                    <div
                      key={option}
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                        setSearch("");
                        setHoveredIndex(-1);
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(-1)}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all duration-150 ease-in-out ${
                        isSelected
                          ? "bg-[#2563eb] text-white"
                          : isHovered
                          ? "bg-[#2563eb] text-white"
                          : "bg-white text-[#475569] hover:bg-[#f8fafc]"
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && (
                        <Check size={16} className="text-white" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ManufacturerSelect = ({ label, placeholder, value, onChange, options = [], onManageClick, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, search]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1 text-sm text-[#475569]" ref={containerRef}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          open ? "border-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" : "border-[#d7dcf5]"
        } ${disabled ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed" : "bg-white text-[#1f2937] cursor-pointer"}`}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
      >
        <span className={displayValue ? "text-[#1f2937]" : "text-[#9ca3af]"}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-[#9ca3af] transition-transform ${open ? "rotate-180" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#d7dcf5] bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-2 border-b border-[#edf1ff] px-3 py-2 text-[#475569]">
            <Search size={14} className="text-[#9ca3af]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search manufacturer"
              className="h-8 w-full border-none text-sm text-[#1f2937] outline-none placeholder:text-[#9ca3af]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-2 manufacturer-select-scroll">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No matching results</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`select-option flex w-full items-center rounded-md px-4 py-2 text-left text-sm transition ${
                    value === option
                      ? "bg-[#f6f8ff] font-semibold text-[#2563eb]"
                      : "bg-white text-[#475569] hover:bg-[#f6f8ff]"
                  }`}
                >
                  {option}
                </button>
              ))
            )}
          </div>
          {onManageClick && (
            <div className="border-t border-[#edf1ff] px-3 py-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick();
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition"
              >
                <Settings size={14} />
                Manage Manufacturers
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BrandSelect = ({ label, placeholder, value, onChange, options = [], onManageClick, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, search]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1 text-sm text-[#475569]" ref={containerRef}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          open ? "border-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" : "border-[#d7dcf5]"
        } ${disabled ? "bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed" : "bg-white text-[#1f2937] cursor-pointer"}`}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
      >
        <span className={displayValue ? "text-[#1f2937]" : "text-[#9ca3af]"}>{displayValue || placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-[#9ca3af] transition-transform ${open ? "rotate-180" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#d7dcf5] bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-2 border-b border-[#edf1ff] px-3 py-2 text-[#475569]">
            <Search size={14} className="text-[#9ca3af]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brand"
              className="h-8 w-full border-none text-sm text-[#1f2937] outline-none placeholder:text-[#9ca3af]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-2 brand-select-scroll">
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No matching results</p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center px-4 py-2 text-left text-sm cursor-pointer transition ${
                    value === option
                      ? "text-[#2563eb] font-semibold"
                      : "text-[#475569] hover:text-[#2563eb]"
                  }`}
                >
                  {option}
                </div>
              ))
            )}
          </div>
          {onManageClick && (
            <div className="border-t border-[#edf1ff] px-3 py-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageClick();
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition"
              >
                <Settings size={14} />
                Manage Brands
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ManufacturerModal = ({ onClose, onAdd, newManufacturer, setNewManufacturer }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newManufacturer.trim()) {
      onAdd(newManufacturer.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Add Manufacturer</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Manufacturer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newManufacturer}
              onChange={(e) => setNewManufacturer(e.target.value)}
              placeholder="Enter manufacturer name"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              autoFocus
            />
          </div>
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newManufacturer.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              Add Manufacturer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BrandModal = ({ onClose, onAdd, newBrand, setNewBrand }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newBrand.trim()) {
      onAdd(newBrand.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Add Brand</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Enter brand name"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              autoFocus
            />
          </div>
          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newBrand.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              Add Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};