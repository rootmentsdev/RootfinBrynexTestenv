import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2, ArrowLeft, X, ChevronDown, Search, Settings, Check, ShoppingBag, ShoppingCart, Edit, MoreHorizontal } from "lucide-react";
import Head from "../components/Head";
import ImageUpload from "../components/ImageUpload";
import baseUrl from "../api/api";

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

const ShoeSalesItemGroupCreate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [showAccounts, setShowAccounts] = useState(false);
  const [itemType, setItemType] = useState("goods");
  const [createAttributes, setCreateAttributes] = useState(true);
  const [attributeRows, setAttributeRows] = useState([
    { id: 1, attribute: "", options: [], optionInput: "" }
  ]);
  const [showSingleItemModal, setShowSingleItemModal] = useState(false);
  const [itemGroupName, setItemGroupName] = useState("");
  const [itemGroupSku, setItemGroupSku] = useState("");
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [sellable, setSellable] = useState(true);
  const [purchasable, setPurchasable] = useState(true);
  const [returnable, setReturnable] = useState(true);
  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [newManufacturer, setNewManufacturer] = useState("");
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [category, setCategory] = useState("other");
  const [unit, setUnit] = useState("pcs");
  const [inventoryValuation, setInventoryValuation] = useState("FIFO (First In First Out)");
  const [taxPreference, setTaxPreference] = useState("taxable");
  const [exemptionReason, setExemptionReason] = useState("");
  const [intraStateTaxRate, setIntraStateTaxRate] = useState("");
  const [interStateTaxRate, setInterStateTaxRate] = useState("");
  const [itemRows, setItemRows] = useState([]);
  const [generatedItems, setGeneratedItems] = useState([]);
  const [manualItemsSnapshot, setManualItemsSnapshot] = useState([]);
  const [itemSkuManuallyEdited, setItemSkuManuallyEdited] = useState({}); // Track which items have manually edited SKU
  const previousGeneratedItemsRef = useRef([]); // Store previous items to preserve manual edits
  const [priceIncludesGST, setPriceIncludesGST] = useState(true);
  const [groupImages, setGroupImages] = useState([]);
  // Snapshot of attribute rows when the group was loaded (edit mode) to detect newly added attributes/options
  const initialAttributeRowsRef = useRef([]);

  const API_ROOT = (baseUrl?.baseUrl || "").replace(/\/$/, "");
  const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

  // Fetch manufacturers from backend
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch(`${API_ROOT}/api/shoe-sales/manufacturers?isActive=true`);
        if (response.ok) {
          const data = await response.json();
          const manufacturerNames = data.map((m) => m.name);
          setManufacturers(manufacturerNames);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.manufacturers, JSON.stringify(manufacturerNames));
          }
        } else {
          const stored = loadStoredList(STORAGE_KEYS.manufacturers);
          setManufacturers(stored);
        }
      } catch (error) {
        console.error("Error fetching manufacturers:", error);
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
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.brands, JSON.stringify(brandNames));
          }
        } else {
          const stored = loadStoredList(STORAGE_KEYS.brands);
          setBrands(stored);
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
        const stored = loadStoredList(STORAGE_KEYS.brands);
        setBrands(stored);
      }
    };
    fetchBrands();
  }, []);

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

  // Generate SKU from item group name (similar to ShoeSalesItemCreate.jsx)
  const generateSkuPreview = useCallback((name = "", size = "", attributeCombo = []) => {
    const words = name
      .replace(/[^a-zA-Z0-9\s-]/g, " ")
      .split(/[\s-_,]+/)
      .filter(Boolean);

    if (words.length === 0) {
      return "";
    }

    const alphaWords = words.filter((word) => /[A-Za-z]/.test(word));
    const numericWords = words.filter((word) => /^\d+$/.test(word));

    // Build SKU with shorter format but still unique
    let letters = "";
    
    if (alphaWords.length > 0) {
      // Take minimal characters but ensure uniqueness, especially for last word
      if (alphaWords.length === 1) {
        // Single word: take first 3 chars
        letters = alphaWords[0].slice(0, 3).toUpperCase();
      } else if (alphaWords.length === 2) {
        // Two words: first 2 chars from first, first 2 chars from second
        letters = (alphaWords[0].slice(0, 2) + alphaWords[1].slice(0, 2)).toUpperCase();
      } else if (alphaWords.length === 3) {
        // Three words: first letter of first two + first 3 chars of last (ensures uniqueness)
        letters = (alphaWords[0][0] + alphaWords[1][0] + alphaWords[2].slice(0, 3)).toUpperCase();
      } else {
        // Four or more words: first letter of first two + first 2 chars from rest
        letters = (alphaWords[0][0] + alphaWords[1][0]).toUpperCase();
        for (let i = 2; i < alphaWords.length && letters.length < 6; i++) {
          letters += alphaWords[i].slice(0, 2).toUpperCase();
        }
      }
    }

    if (!letters && words.length > 0) {
      letters = words[0].slice(0, 4).toUpperCase();
    }

    let base = letters || "IGRP";
    const digits = numericWords.join("");
    if (digits) {
      base += `-${digits}`;
    }

    // Add attribute combination to SKU for uniqueness (if provided)
    // This ensures each color/size combination gets a unique SKU
    if (attributeCombo && attributeCombo.length > 0) {
      // Create a short code from the attribute values
      const attrCode = attributeCombo
        .map(attr => {
          if (!attr) return "";
          // Take first 2 chars of each attribute value
          return attr.slice(0, 2).toUpperCase();
        })
        .filter(Boolean)
        .join("");
      
      if (attrCode) {
        base += `-${attrCode}`;
      }
    } else if (size && size.trim()) {
      // Fallback to size if no attribute combo provided
      base += `-${size.trim()}`;
    }

    return base;
  }, []);

  // Auto-generate SKU when item group name changes (only in create mode)
  useEffect(() => {
    if (!isEditMode && !skuManuallyEdited && itemGroupName) {
      setItemGroupSku(generateSkuPreview(itemGroupName));
    }
  }, [itemGroupName, skuManuallyEdited, generateSkuPreview, isEditMode]);

  // Fetch item group data when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchItemGroup = async () => {
        try {
          setLoading(true);
          const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
          const response = await fetch(`${API_URL}/api/shoe-sales/item-groups/${id}`);
          
          if (!response.ok) {
            throw new Error("Failed to fetch item group");
          }
          
          const data = await response.json();
          
          // Populate all form fields with existing data
          const rawAttributeRows = Array.isArray(data.attributeRows)
            ? data.attributeRows.map((row, idx) => ({
                id: idx + 1,
                attribute: row?.attribute || "",
                options: Array.isArray(row?.options) ? row.options : [],
                optionInput: ""
              }))
            : [];
          const validAttributeRows = rawAttributeRows.filter(
            (row) =>
              row.attribute.trim() !== "" &&
              row.options.some((opt) => typeof opt === "string" && opt.trim() !== "")
          );
          const hasAttributeRows = validAttributeRows.length > 0;
          const shouldUseAttributes =
            (data.createAttributes !== undefined ? data.createAttributes : hasAttributeRows) && hasAttributeRows;

          setItemGroupName(data.name || "");
          setItemGroupSku(data.sku || "");
          setSkuManuallyEdited(!!data.sku);
          setItemType(data.itemType || "goods");
          setUnit(data.unit || "");
          setSelectedManufacturer(data.manufacturer || "");
          setSelectedBrand(data.brand || "");
          if (data.manufacturer) {
            setManufacturers((prev) =>
              prev.includes(data.manufacturer) ? prev : [...prev, data.manufacturer]
            );
          }
          if (data.brand) {
            setBrands((prev) =>
              prev.includes(data.brand) ? prev : [...prev, data.brand]
            );
          }
          setInventoryValuation(data.inventoryValuationMethod || "FIFO (First In First Out)");
          setTaxPreference(data.taxPreference || "taxable");
          setExemptionReason(data.exemptionReason || "");
          setIntraStateTaxRate(data.intraStateTaxRate || data.taxRateIntra || "");
          setInterStateTaxRate(data.interStateTaxRate || data.taxRateInter || "");
          setCreateAttributes(shouldUseAttributes);
          setSellable(data.sellable !== undefined ? data.sellable : true);
          setPurchasable(data.purchasable !== undefined ? data.purchasable : true);
          setReturnable(data.returnable !== undefined ? data.returnable : true);
          setGroupImages(data.groupImages || data.images || []);
          
          // Set attribute rows if they exist
          setAttributeRows(rawAttributeRows.length > 0 ? rawAttributeRows : [{ id: 1, attribute: "", options: [], optionInput: "" }]);
          // Keep a snapshot to compare later (edit mode)
          initialAttributeRowsRef.current = (rawAttributeRows || []).map(r => ({
            attribute: (r.attribute || "").toLowerCase().trim(),
            options: Array.isArray(r.options) ? [...r.options] : []
          }));
          
          // Set items - either from generated items or manual items
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            if (shouldUseAttributes) {
              // Items were generated from attributes
              const loadedItems = data.items.map(item => {
                // Regenerate item name from attributeCombination to reflect any changes made in edit mode
                let itemName = item.name || "";
                if (item.attributeCombination && Array.isArray(item.attributeCombination) && item.attributeCombination.length > 0) {
                  const optionsStr = item.attributeCombination.join("/");
                  itemName = `${data.name || "Item"} - ${optionsStr}`;
                  console.log(`Loading item: original name="${item.name}", regenerated name="${itemName}", attributeCombination=`, item.attributeCombination);
                }
                
                // Extract size from attributeCombination if size attribute exists
                const sizeAttributeIndex = rawAttributeRows.findIndex(row => row.attribute?.toLowerCase() === "size");
                const sizeValue = sizeAttributeIndex !== -1 && item.attributeCombination && item.attributeCombination[sizeAttributeIndex]
                  ? item.attributeCombination[sizeAttributeIndex]
                  : (item.size || "");
                
                return {
                  id: item._id || item.id || `item-${Date.now()}-${Math.random()}`,
                  _id: item._id && item._id.match(/^[0-9a-fA-F]{24}$/) ? item._id : undefined, // Only set _id if it's a valid MongoDB ObjectId
                  name: itemName, // Use regenerated name based on current attributeCombination
                  sku: item.sku || "",
                  size: sizeValue, // Include size
                  costPrice: item.costPrice !== undefined && item.costPrice !== null ? item.costPrice.toString() : "",
                  sellingPrice: item.sellingPrice !== undefined && item.sellingPrice !== null ? item.sellingPrice.toString() : "",
                  upc: item.upc || "",
                  hsnCode: item.hsnCode || "",
                  isbn: item.isbn || "",
                  reorderPoint: item.reorderPoint || "",
                  sac: item.sac || "",
                  stock: item.stock || 0,
                  attributeCombination: item.attributeCombination || [],
                  warehouseStocks: item.warehouseStocks || [] // PRESERVE warehouse stocks
                };
              });
              console.log(`Loaded ${loadedItems.length} items from database:`, loadedItems);
              setGeneratedItems(loadedItems);
              // Update the ref so regeneration preserves these values
              previousGeneratedItemsRef.current = loadedItems;
            } else {
              // Manual items
              const manualItems = data.items.map(item => ({
                id: item._id || item.id || `item-${Date.now()}-${Math.random()}`,
                _id: item._id && item._id.match(/^[0-9a-fA-F]{24}$/) ? item._id : undefined, // Only set _id if it's a valid MongoDB ObjectId
                name: item.name || "",
                sku: item.sku || "",
                costPrice: item.costPrice !== undefined && item.costPrice !== null ? item.costPrice.toString() : "",
                sellingPrice: item.sellingPrice !== undefined && item.sellingPrice !== null ? item.sellingPrice.toString() : "",
                upc: item.upc || "",
                hsnCode: item.hsnCode || "",
                isbn: item.isbn || "",
                reorderPoint: item.reorderPoint || "",
                sac: item.sac || "",
                stock: item.stock || 0,
                warehouseStocks: item.warehouseStocks || [] // PRESERVE warehouse stocks
              }));
              setItemRows(manualItems);
              setManualItemsSnapshot(manualItems);
            }
          }
          
        } catch (error) {
          console.error("Error fetching item group:", error);
          alert("Failed to load item group data. Please try again.");
          navigate("/shoe-sales/item-groups");
        } finally {
          setLoading(false);
        }
      };
      
      fetchItemGroup();
    }
  }, [isEditMode, id, navigate]);

  // Generate items from attribute rows - combining all attribute options
  useEffect(() => {
    // In edit mode, only regenerate if user actually ADDED a new attribute or option
    if (isEditMode) {
      const normalizedCurrent = (attributeRows || []).map(r => ({
        attribute: (r.attribute || "").toLowerCase().trim(),
        options: Array.isArray(r.options) ? r.options : []
      }));
      const normalizedInitial = initialAttributeRowsRef.current || [];
      // Detect new attribute row
      const currentAttrSet = new Set(normalizedCurrent.map(r => r.attribute).filter(Boolean));
      const initialAttrSet = new Set(normalizedInitial.map(r => r.attribute).filter(Boolean));
      let added = false;
      for (const attr of currentAttrSet) {
        if (!initialAttrSet.has(attr)) {
          added = true;
          break;
        }
      }
      // Detect new option appended to any existing attribute
      if (!added) {
        for (const curr of normalizedCurrent) {
          const ini = normalizedInitial.find(r => r.attribute === curr.attribute);
          if (!ini) continue;
          const iniSet = new Set(ini.options);
          const newOpt = (curr.options || []).some(opt => !iniSet.has(opt));
          if (newOpt) {
            added = true;
            break;
          }
        }
      }
      if (!added) {
        // No new attributes/options introduced → do not regenerate
        return;
      }
      // else fall through to regeneration logic below
    }
    if (!createAttributes || !attributeRows || attributeRows.length === 0) {
      // Only clear generatedItems if we're switching away from attribute mode
      // Don't clear if we have existing items that should be preserved
      if (previousGeneratedItemsRef.current.length === 0) {
        setGeneratedItems([]);
      } else {
        // Preserve existing items even if attributes are empty/invalid
        // This happens when toggling checkbox in edit mode
        setGeneratedItems(previousGeneratedItemsRef.current);
      }
      return;
    }

    // Get all rows with attributes and options
    const validRows = attributeRows.filter(row => row.attribute && row.options.length > 0);
    
    if (validRows.length === 0) {
      // Preserve existing items if we have them
      // Only clear if we're starting fresh
      if (previousGeneratedItemsRef.current.length === 0) {
        setGeneratedItems([]);
      } else {
        // Preserve existing items even if attributes are temporarily invalid
        setGeneratedItems(previousGeneratedItemsRef.current);
      }
      return;
    }

    // Generate cartesian product of all options
    const generateCombinations = (arrays) => {
      if (arrays.length === 0) return [[]];
      if (arrays.length === 1) return arrays[0].map(opt => [opt]);
      
      const [first, ...rest] = arrays;
      const restCombinations = generateCombinations(rest);
      const result = [];
      
      first.forEach(option => {
        restCombinations.forEach(combo => {
          result.push([option, ...combo]);
        });
      });
      
      return result;
    };

    const optionArrays = validRows.map(row => row.options);
    const combinations = generateCombinations(optionArrays);
    
    console.log(`Generating ${combinations.length} item combinations from attributes:`, {
      validRows: validRows.map(r => ({ attribute: r.attribute, options: r.options })),
      combinations: combinations,
      previousItemsCount: previousGeneratedItemsRef.current.length
    });
    
    // Find size attribute index
    const sizeAttributeIndex = validRows.findIndex(row => row.attribute?.toLowerCase() === "size");
    
    const items = combinations.map((combo, idx) => {
      // Extract size from attribute combination if size attribute exists
      const sizeValue = sizeAttributeIndex !== -1 && combo[sizeAttributeIndex] ? combo[sizeAttributeIndex] : "";
      
      // Create item name: "ItemGroupName - option1/option2/option3"
      const optionsStr = combo.join("/");
      const itemName = `${itemGroupName || "Item"} - ${optionsStr}`;
      
      // For SKU generation, use base name without size in the name part
      const baseName = itemGroupName || "Item";
      
      // Check if this item already exists in previous items (by matching attribute combination or by ID)
      // First try to match by attribute combination
      let existingItem = previousGeneratedItemsRef.current.find(existing => 
        JSON.stringify(existing.attributeCombination) === JSON.stringify(combo)
      );
      
      // If not found by combination, try to match by name (for backward compatibility)
      if (!existingItem) {
        existingItem = previousGeneratedItemsRef.current.find(existing => 
          existing.name === itemName
        );
      }
      
      if (existingItem) {
        console.log(`Found existing item for combination [${combo.join(", ")}], preserving data`);
      } else {
        console.log(`Creating new item for combination [${combo.join(", ")}]`);
      }
      
      // If item exists and SKU was manually edited, preserve it
      // Otherwise, auto-generate SKU from item name + size + attribute combination
      const itemSku = existingItem && itemSkuManuallyEdited[existingItem.id]
        ? existingItem.sku
        : generateSkuPreview(baseName, sizeValue, combo);
      
      // Preserve other fields from existing item if it exists
      return {
        id: existingItem?.id || `item-${Date.now()}-${idx}`,
        name: itemName,
        sku: itemSku,
        size: existingItem?.size || sizeValue, // Store size
        costPrice: existingItem?.costPrice !== undefined && existingItem?.costPrice !== null ? existingItem.costPrice.toString() : "",
        sellingPrice: existingItem?.sellingPrice !== undefined && existingItem?.sellingPrice !== null ? existingItem.sellingPrice.toString() : "0",
        upc: existingItem?.upc || "",
        hsnCode: existingItem?.hsnCode || "",
        isbn: existingItem?.isbn || "",
        reorderPoint: existingItem?.reorderPoint || "",
        sac: existingItem?.sac || "",
        stock: existingItem?.stock || 0,
        attributeCombination: combo // Store which options were combined
      };
    });
    
    // Preserve items from previous items that don't match any generated combinations
    // These are likely transferred/manually added items without attribute combinations
    const matchedIds = new Set(items.map(item => item.id));
    const unmatchedItems = previousGeneratedItemsRef.current.filter(existing => {
      // Check if this item doesn't have a matching attribute combination
      const existingCombo = existing.attributeCombination || [];
      const hasMatchingCombo = combinations.some(combo => 
        JSON.stringify(existingCombo) === JSON.stringify(combo)
      );
      // Also check if it's not already matched by ID
      const alreadyMatched = matchedIds.has(existing.id);
      // Include items that don't have matching combinations
      // This includes transferred items (with empty attributeCombination) or items without attribute combinations
      return !hasMatchingCombo && !alreadyMatched && (existingCombo.length === 0 || !existing.attributeCombination);
    });
    
    // Combine generated items with unmatched items (transferred items)
    const allItems = [...items, ...unmatchedItems];
    
    setGeneratedItems(allItems);
    // Update ref with new items for next regeneration
    previousGeneratedItemsRef.current = allItems;
  }, [createAttributes, attributeRows, itemGroupName, generateSkuPreview, itemSkuManuallyEdited]);

  // Copy to All handlers
  useEffect(() => {
    if (!createAttributes) {
      setManualItemsSnapshot(itemRows);
    }
  }, [createAttributes, itemRows]);

  const handleCopyToAll = (field) => {
    if (createAttributes) {
      // For generated items
      if (generatedItems.length === 0) return;
      const firstValue = generatedItems[0][field] || "";
      const updated = generatedItems.map((item) => ({
        ...item,
        [field]: firstValue,
      }));
      setGeneratedItems(updated);
      previousGeneratedItemsRef.current = updated;
    } else {
      // For manual items
      if (itemRows.length === 0) return;
      const firstValue = itemRows[0][field] || "";
      const updated = itemRows.map((item) => ({
        ...item,
        [field]: firstValue,
      }));
      setItemRows(updated);
    }
  };

  const switchToAttributeMode = () => {
    setManualItemsSnapshot(itemRows);
    // If we have itemRows and no generatedItems, convert itemRows to generatedItems
    // This preserves items when switching from manual to attribute mode
    if (itemRows.length > 0 && generatedItems.length === 0) {
      const convertedItems = itemRows.map(item => ({
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random()}`,
        attributeCombination: item.attributeCombination || []
      }));
      setGeneratedItems(convertedItems);
      previousGeneratedItemsRef.current = convertedItems;
    } else if (generatedItems.length > 0) {
      // Preserve existing generatedItems
      previousGeneratedItemsRef.current = generatedItems;
    }
    setItemRows([]);
    setCreateAttributes(true);
  };

  const switchToManualMode = () => {
    setCreateAttributes(false);
    if (manualItemsSnapshot.length > 0) {
      setItemRows(
        manualItemsSnapshot.map((item) => ({
          ...item,
          id: item.id || `item-${Date.now()}-${Math.random()}`
        }))
      );
    } else if (itemRows.length === 0) {
      setItemRows([
        {
          id: Date.now(),
          name: "",
          sku: "",
          costPrice: "",
          sellingPrice: "0",
          upc: "",
          hsnCode: "",
          isbn: "",
          reorderPoint: "",
          sac: ""
        }
      ]);
    }
  };

  const handleCreateAttributesToggle = (checked) => {
    if (checked) {
      switchToAttributeMode();
    } else {
      setShowSingleItemModal(true);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!itemGroupName || itemGroupName.trim() === "") {
      alert("Item Group Name is required");
      return;
    }
    
    if (!unit || unit.trim() === "") {
      alert("Unit is required");
      return;
    }

    if (taxPreference === "non-taxable" && (!exemptionReason || exemptionReason.trim() === "")) {
      alert("Exemption reason is required for non-taxable items");
      return;
    }
    
    try {
      const normalizedIntra = taxPreference === "taxable" ? (intraStateTaxRate || "") : "";
      const normalizedInter = taxPreference === "taxable" ? (interStateTaxRate || "") : "";
      const normalizedExemption = taxPreference === "non-taxable" ? exemptionReason.trim() : "";

      // Get items (either generated or manual)
      const items = createAttributes ? generatedItems : itemRows;
      
      // Filter out items without names (required field)
      const validItems = items.filter(item => item && item.name && item.name.trim() !== "");
      
      // Check for duplicate SKUs within the items being saved
      const skuMap = new Map();
      const duplicateSkus = [];
      validItems.forEach((item, idx) => {
        if (item.sku && item.sku.trim()) {
          const sku = item.sku.trim().toUpperCase();
          if (skuMap.has(sku)) {
            duplicateSkus.push({ sku, indices: [skuMap.get(sku), idx] });
          } else {
            skuMap.set(sku, idx);
          }
        }
      });
      
      if (duplicateSkus.length > 0) {
        const duplicateSkuList = [...new Set(duplicateSkus.map(d => d.sku))].join(", ");
        alert(`Duplicate SKUs found within the group: ${duplicateSkuList}. Each item must have a unique SKU.`);
        return;
      }
      
      // Check for duplicate SKUs with existing items in database (for standalone items)
      // Note: For item groups, SKUs are unique within the group, but we should still check against standalone items
      // SKIP THIS CHECK IN EDIT MODE - SKUs are already unique
      if (!isEditMode) {
        const skusToCheck = validItems.filter(item => item.sku && item.sku.trim()).map(item => item.sku.trim().toUpperCase());
        if (skusToCheck.length > 0) {
          try {
            const checkPromises = skusToCheck.map(async (sku) => {
              const response = await fetch(`${API_ROOT}/api/shoe-sales/items?sku=${encodeURIComponent(sku)}`);
              if (response.ok) {
                const data = await response.json();
                const items = Array.isArray(data) ? data : (data.items || []);
                return items.some(item => item.sku?.toUpperCase() === sku);
              }
              return false;
            });
            
            const results = await Promise.all(checkPromises);
            const existingSkus = skusToCheck.filter((_, idx) => results[idx]);
            
            if (existingSkus.length > 0) {
              alert(`The following SKUs already exist in the system: ${existingSkus.join(", ")}. Please use different SKUs.`);
              return;
            }
          } catch (error) {
            console.error("Error checking SKU uniqueness:", error);
            // Continue with save even if check fails (network issue)
          }
        }
      }
      
      console.log("Items to save:", validItems.length, validItems);
      
      // Create item group data
      const itemGroupData = {
        name: itemGroupName.trim(),
        sku: itemGroupSku.trim(),
        itemType,
        unit,
        manufacturer: selectedManufacturer || "",
        brand: selectedBrand || "",
        category: category || "other",
        inventoryValuationMethod: inventoryValuation || "",
        taxPreference,
        exemptionReason: normalizedExemption,
        intraStateTaxRate: normalizedIntra,
        interStateTaxRate: normalizedInter,
        taxRateIntra: normalizedIntra,
        taxRateInter: normalizedInter,
        createAttributes,
        attributeRows: attributeRows || [],
        sellable,
        purchasable,
        returnable,
        trackInventory: itemType === "goods",
        items: validItems.map(item => {
          // Regenerate item name from attributeCombination before saving to ensure consistency
          let itemName = item.name.trim();
          if (createAttributes && item.attributeCombination && Array.isArray(item.attributeCombination) && item.attributeCombination.length > 0) {
            const optionsStr = item.attributeCombination.join("/");
            itemName = `${itemGroupName.trim()} - ${optionsStr}`;
          }
          
          return {
            _id: item._id && item._id.match(/^[0-9a-fA-F]{24}$/) ? item._id : undefined, // Only include _id if it's a valid MongoDB ObjectId
            name: itemName,
            sku: item.sku || "",
            size: item.size || "", // Include size field
            costPrice: parseFloat(item.costPrice) || 0,
            sellingPrice: parseFloat(item.sellingPrice) || 0,
            upc: item.upc || "",
            hsnCode: item.hsnCode || "",
            isbn: item.isbn || "",
            reorderPoint: item.reorderPoint || "",
            sac: item.sac || "",
            stock: parseFloat(item.stock) || 0, // Add stock field for each item
            attributeCombination: item.attributeCombination || [],
            returnable: null, // Items inherit returnable status from group
            warehouseStocks: item.warehouseStocks || [], // PRESERVE warehouse stocks
          };
        }),
        stock: 0,
        reorder: "",
      };
      
      console.log("Item group data being sent:", {
        name: itemGroupData.name,
        itemsCount: itemGroupData.items.length,
        items: itemGroupData.items
      });

      // Get user's warehouse information
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
      
      // Process images: extract base64 data and format properly
      const processedGroupImages = groupImages.map(img => {
        let base64Data = img.base64 || img.data || img;
        if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
          base64Data = base64Data.split(",")[1] || base64Data;
        }
        return {
          filename: img.name || img.filename || "image",
          contentType: img.type || img.contentType || "image/jpeg",
          data: base64Data,
        };
      });

      // Add warehouse information to itemGroupData
      const itemGroupDataWithWarehouse = {
        ...itemGroupData,
        userWarehouse: userWarehouse,
        userLocName: userLocName,
        groupImages: processedGroupImages,
      };
      
      // Save to backend
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const url = isEditMode 
        ? `${API_URL}/api/shoe-sales/item-groups/${id}`
        : `${API_URL}/api/shoe-sales/item-groups`;
      
      const response = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemGroupDataWithWarehouse),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: isEditMode ? "Failed to update item group" : "Failed to save item group" }));
        const errorMessage = errorData.errors 
          ? errorData.errors.join(", ") 
          : (errorData.message || (isEditMode ? "Failed to update item group" : "Failed to save item group"));
        
        // If it's a SKU duplicate error (409), show a clear alert
        if (response.status === 409) {
          alert(errorMessage);
          return; // Stop execution, don't navigate
        }
        
        throw new Error(errorMessage);
      }

      // Navigate to groups page or detail page
      if (isEditMode) {
        navigate(`/shoe-sales/item-groups/${id}`);
      } else {
        navigate("/shoe-sales/item-groups");
      }
    } catch (error) {
      console.error("Error saving item group:", error);
      alert(error.message || "Failed to save item group. Please try again.");
    }
  };

  // Enter key to save item group
  useEnterToSave((e) => {
    const syntheticEvent = e || { preventDefault: () => {} };
    handleSave(syntheticEvent);
  }, loading);

  if (loading) {
    return (
      <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
        <div className="rounded-2xl border border-[#e4e6f2] bg-white shadow-lg p-8 text-center">
          <p className="text-lg font-medium text-[#475569]">Loading item group...</p>
        </div>
      </div>
    );
  }

  const selectedTaxRateValue = intraStateTaxRate || interStateTaxRate;

  return (
    <div className="p-6 ml-64 bg-[#f5f7fb] min-h-screen">
      <Head
        title={isEditMode ? "Edit Item Group" : "New Item Group"}
        description={isEditMode ? "Update item group details and attributes." : "Define a reusable item group template with shared pricing and attributes."}
        actions={
          <Link
            to={isEditMode ? `/shoe-sales/item-groups/${id}` : "/shoe-sales/item-groups"}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5f5] px-4 text-sm font-medium text-[#1f2937] transition hover:bg-white"
          >
            <ArrowLeft size={16} />
            {isEditMode ? "Back to Details" : "Back to Groups"}
          </Link>
        }
      />

      <div className="space-y-6">
        <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)]">
          <div className="grid gap-8 border-b border-[#e7ebf8] px-8 py-8 md:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
                    Item Group Name*
                  </label>
                  <input
                    type="text"
                    value={itemGroupName}
                    onChange={(e) => {
                      setItemGroupName(e.target.value);
                      if (!skuManuallyEdited) {
                        setItemGroupSku(generateSkuPreview(e.target.value));
                      }
                    }}
                    className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                    placeholder="Enter group name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={itemGroupSku}
                    onChange={(e) => {
                      setSkuManuallyEdited(true);
                      setItemGroupSku(e.target.value.toUpperCase());
                    }}
                    className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                    placeholder="e.g. IGRP-001"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize this item group..."
                  className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {itemType === "goods" ? (
                  <FloatingCheckbox 
                    label="Returnable Item" 
                    checked={returnable}
                    onChange={(e) => setReturnable(e.target.checked)}
                  />
                ) : (
                  <FloatingCheckbox label="Receivable Item" />
                )}
                <UnitSelect
                  label="Unit*"
                  placeholder="Select or type to add"
                  value={unit}
                  onChange={setUnit}
                  options={unitOptions}
                />
                <ManufacturerSelect
                  label="Manufacturer"
                  placeholder="Select or add manufacturer"
                  value={selectedManufacturer}
                  onChange={setSelectedManufacturer}
                  manufacturers={manufacturers}
                  onManageClick={() => setShowManufacturerModal(true)}
                />
                <BrandSelect
                  label="Brand"
                  placeholder="Select or add brand"
                  value={selectedBrand}
                  onChange={setSelectedBrand}
                  brands={brands}
                  onManageClick={() => setShowBrandModal(true)}
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
                        onChange={(e) => setCategory(e.target.value)}
                        className="text-[#4285f4]"
                      />
                      Shirt Sales
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        value="shoe"
                        checked={category === "shoe"}
                        onChange={(e) => setCategory(e.target.value)}
                        className="text-[#4285f4]"
                      />
                      Shoe Sales
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        value="other"
                        checked={category === "other"}
                        onChange={(e) => setCategory(e.target.value)}
                        className="text-[#4285f4]"
                      />
                      Other
                    </label>
                  </div>
                </fieldset>
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
                    Tax Preference*
                  </legend>
                  <div className="flex flex-wrap gap-4 text-sm font-medium text-[#1f2937]">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="taxPreference"
                        value="taxable"
                        checked={taxPreference === "taxable"}
                        onChange={(e) => {
                          setTaxPreference(e.target.value);
                          setExemptionReason("");
                        }}
                        className="text-[#4285f4]"
                      />
                      Taxable
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="taxPreference"
                        value="non-taxable"
                        checked={taxPreference === "non-taxable"}
                        onChange={(e) => setTaxPreference(e.target.value)}
                        className="text-[#4285f4]"
                      />
                      Non-Taxable
                    </label>
                  </div>
                  {taxPreference === "non-taxable" && (
                    <div className="max-w-sm">
                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                        Exemption Reason*
                        <input
                          type="text"
                          value={exemptionReason}
                          onChange={(e) => setExemptionReason(e.target.value)}
                          placeholder="Select or type to add"
                          className="mt-1 w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#4285f4] focus:outline-none"
                        />
                      </label>
                    </div>
                  )}
                </fieldset>
                {itemType === "goods" && (
                  <InventoryValuationSelect
                    label="Inventory Valuation Method"
                    value={inventoryValuation}
                    onChange={setInventoryValuation}
                  />
                )}
              </div>

              {/* Default Tax Rates Section */}
              {taxPreference === "taxable" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#1f2937]">Default Tax Rates</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TaxRateSelect
                      label="Intra State Tax Rate"
                      value={intraStateTaxRate}
                      onChange={setIntraStateTaxRate}
                      type="intra"
                    />
                    <TaxRateSelect
                      label="Inter State Tax Rate"
                      value={interStateTaxRate}
                      onChange={setInterStateTaxRate}
                      type="inter"
                    />
                  </div>
                  <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#475569] shadow-sm w-fit">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
                      checked={priceIncludesGST}
                      onChange={(e) => setPriceIncludesGST(e.target.checked)}
                    />
                    Price Includes GST
                  </label>
                </div>
              )}

              {itemType === "service" ? (
                <div className="space-y-6 rounded-2xl border border-[#e3e8f9] bg-[#f8f9ff] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createAttributes}
                        onChange={(e) => handleCreateAttributesToggle(e.target.checked)}
                        className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
                      />
                      Create Attributes and Options
                    </label>
                    <button
                      onClick={() => {
                        setAttributeRows([...attributeRows, { id: Date.now(), attribute: "", options: [], optionInput: "" }]);
                      }}
                      className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      + Add more attributes
                    </button>
                  </div>
                  {createAttributes && (
                    <div className="space-y-4">
                      {attributeRows.map((row, rowIndex) => (
                        <div key={row.id} className="grid gap-4 md:grid-cols-[240px,1fr]">
                          <div className="flex flex-col gap-1 text-sm text-[#475569]">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
                              Attribute*
                            </label>
                            <input
                              type="text"
                              value={row.attribute}
                              onChange={(e) => {
                                const updated = [...attributeRows];
                                updated[rowIndex].attribute = e.target.value;
                                setAttributeRows(updated);
                              }}
                              placeholder="eg: color"
                              className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
                              Options*
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-[#d7dcf5] px-3 py-2 min-h-[2.5rem]">
                                {row.options.map((opt, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-md bg-[#e0e7ff] px-2 py-1 text-sm text-[#3730a3]"
                                  >
                                    {opt}
                                    <button
                                      onClick={() => {
                                        const updated = [...attributeRows];
                                        updated[rowIndex].options = updated[rowIndex].options.filter((_, i) => i !== idx);
                                        setAttributeRows(updated);
                                      }}
                                      className="hover:text-[#1e1b4b]"
                                    >
                                      <X size={14} />
                                    </button>
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  value={row.optionInput}
                                  onChange={(e) => {
                                    const updated = [...attributeRows];
                                    updated[rowIndex].optionInput = e.target.value;
                                    setAttributeRows(updated);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && row.optionInput.trim()) {
                                      e.preventDefault();
                                      const updated = [...attributeRows];
                                      updated[rowIndex].options = [...updated[rowIndex].options, updated[rowIndex].optionInput.trim()];
                                      updated[rowIndex].optionInput = "";
                                      setAttributeRows(updated);
                                    }
                                  }}
                                  data-handle-enter="true"
                                  placeholder={row.options.length === 0 ? "Enter options separated by commas" : ""}
                                  className="flex-1 border-0 bg-transparent px-0 py-0 text-sm text-[#1f2937] focus:outline-none"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  setAttributeRows(attributeRows.filter((_, i) => i !== rowIndex));
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f1b5b5] bg-[#fff5f5] text-[#c2410c] hover:bg-[#fee2e2]"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 rounded-2xl border border-[#e3e8f9] bg-[#f8f9ff] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createAttributes}
                        onChange={(e) => handleCreateAttributesToggle(e.target.checked)}
                        className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
                      />
                      Create Attributes and Options
                    </label>
                    <button
                      onClick={() => {
                        setAttributeRows([...attributeRows, { id: Date.now(), attribute: "", options: [], optionInput: "" }]);
                      }}
                      className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      + Add more attributes
                    </button>
                  </div>
                  {createAttributes && (
                    <div className="space-y-4">
                      {attributeRows.map((row, rowIndex) => (
                        <div key={row.id} className="grid gap-4 md:grid-cols-[240px,1fr]">
                          <div className="flex flex-col gap-1 text-sm text-[#475569]">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
                              Attribute*
                            </label>
                            <input
                              type="text"
                              value={row.attribute}
                              onChange={(e) => {
                                const updated = [...attributeRows];
                                updated[rowIndex].attribute = e.target.value;
                                setAttributeRows(updated);
                              }}
                              placeholder="eg: color"
                              className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4444]">
                              Options*
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-[#d7dcf5] px-3 py-2 min-h-[2.5rem]">
                                {row.options.map((opt, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-md bg-[#e0e7ff] px-2 py-1 text-sm text-[#3730a3]"
                                  >
                                    {opt}
                                    <button
                                      onClick={() => {
                                        const updated = [...attributeRows];
                                        updated[rowIndex].options = updated[rowIndex].options.filter((_, i) => i !== idx);
                                        setAttributeRows(updated);
                                      }}
                                      className="hover:text-[#1e1b4b]"
                                    >
                                      <X size={14} />
                                    </button>
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  value={row.optionInput}
                                  onChange={(e) => {
                                    const updated = [...attributeRows];
                                    updated[rowIndex].optionInput = e.target.value;
                                    setAttributeRows(updated);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && row.optionInput.trim()) {
                                      e.preventDefault();
                                      const updated = [...attributeRows];
                                      updated[rowIndex].options = [...updated[rowIndex].options, updated[rowIndex].optionInput.trim()];
                                      updated[rowIndex].optionInput = "";
                                      setAttributeRows(updated);
                                    }
                                  }}
                                  data-handle-enter="true"
                                  placeholder={row.options.length === 0 ? "Enter options separated by commas" : ""}
                                  className="flex-1 border-0 bg-transparent px-0 py-0 text-sm text-[#1f2937] focus:outline-none"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  setAttributeRows(attributeRows.filter((_, i) => i !== rowIndex));
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f1b5b5] bg-[#fff5f5] text-[#c2410c] hover:bg-[#fee2e2]"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <ImageUpload
              onImagesSelect={(images) => setGroupImages(images)}
              existingImages={groupImages}
              onRemoveImage={(index) => {
                setGroupImages(groupImages.filter((_, i) => i !== index));
              }}
              multiple={true}
            />
          </div>

          <div className="space-y-6 px-8 py-8">
            <fieldset className="flex flex-wrap gap-6 rounded-2xl border border-[#e3e8f9] bg-[#f8f9ff] px-4 py-4 text-sm font-medium text-[#1f2937]">
              <legend className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                Select your Item Type
              </legend>
              <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sellable}
                  onChange={(e) => setSellable(e.target.checked)}
                  className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
                />
                Sellable
              </label>
              <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={purchasable}
                  onChange={(e) => setPurchasable(e.target.checked)}
                  className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
                />
                Purchasable
              </label>
              {itemType === "goods" && <FloatingCheckbox label="Track Inventory" defaultChecked />}
            </fieldset>

            <div className="overflow-x-auto rounded-2xl border border-[#e3e8f9]">
              <table className="min-w-full divide-y divide-[#e6eafb] text-xs uppercase tracking-[0.12em] text-[#64748b]">
                <thead className="bg-[#f5f6ff]">
                  <tr>
                    <>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>{createAttributes ? "ITEM" : "ITEM NAME*"}</div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>SIZE</div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>SKU</div>
                        <div className="mt-1 flex gap-2 text-[10px] font-normal">
                          <button className="table-link-button">Generate SKU</button>
                          <button className="table-link-button">Clear</button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>HSN CODE</div>
                        <div className="mt-1 flex gap-2 text-[10px] font-normal">
                          <button 
                            onClick={() => handleCopyToAll("hsnCode")}
                            className="table-link-button"
                          >
                            COPY TO ALL
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>REORDER POINT</div>
                        <div className="mt-1 flex gap-2 text-[10px] font-normal">
                          <button 
                            onClick={() => handleCopyToAll("reorderPoint")}
                            className="table-link-button"
                          >
                            COPY TO ALL
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>COST PRICE (₹)*</div>
                        <div className="mt-1 flex gap-2 text-[10px] font-normal">
                          <button className="table-link-button">PER UNIT</button>
                          <button 
                            onClick={() => handleCopyToAll("costPrice")}
                            className="table-link-button"
                          >
                            COPY TO ALL
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>SELLING PRICE (₹)*</div>
                        <div className="mt-1 flex gap-2 text-[10px] font-normal">
                          <button className="table-link-button">PER UNIT</button>
                          <button 
                            onClick={() => handleCopyToAll("sellingPrice")}
                            className="table-link-button"
                          >
                            COPY TO ALL
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]">
                        <div>PRICE WITH GST (₹)</div>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#495580]"></th>
                    </>
                  </tr>
                </thead>
                <tbody>
                  {!createAttributes ? (
                    // Manual item entry when attributes are disabled
                    <>
                      {itemRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-6 text-center text-sm font-medium text-[#94a3b8]"
                          >
                            No manual items available
                          </td>
                        </tr>
                      )}
                      {itemRows.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-[#fafbff]">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const updated = [...itemRows];
                                updated[idx].name = e.target.value;
                                // Regenerate SKU if not manually edited
                                if (!itemSkuManuallyEdited[item.id || idx]) {
                                  updated[idx].sku = generateSkuPreview(e.target.value, item.size || "");
                                }
                                setItemRows(updated);
                              }}
                              placeholder="Item Name"
                              className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.size || ""}
                              onChange={(e) => {
                                const updated = [...itemRows];
                                updated[idx].size = e.target.value;
                                // Regenerate SKU if not manually edited
                                if (!itemSkuManuallyEdited[item.id || idx]) {
                                  updated[idx].sku = generateSkuPreview(item.name || "", e.target.value);
                                }
                                setItemRows(updated);
                              }}
                              placeholder="Size"
                              className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.sku}
                              onChange={(e) => {
                                const updated = [...itemRows];
                                updated[idx].sku = e.target.value.toUpperCase();
                                setItemRows(updated);
                                // Mark as manually edited
                                setItemSkuManuallyEdited(prev => ({ ...prev, [item.id || idx]: true }));
                              }}
                              onFocus={(e) => {
                                // Auto-generate SKU if empty and not manually edited
                                if (!item.sku && !itemSkuManuallyEdited[item.id || idx] && item.name) {
                                  const updated = [...itemRows];
                                  updated[idx].sku = generateSkuPreview(item.name, item.size || "");
                                  setItemRows(updated);
                                }
                              }}
                              placeholder="Auto-generated or enter manually"
                              className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.hsnCode || ""}
                              onChange={(e) => {
                                const updated = [...itemRows];
                                updated[idx].hsnCode = e.target.value;
                                setItemRows(updated);
                              }}
                              placeholder="Enter HSN"
                              className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.reorderPoint || ""}
                              onChange={(e) => {
                                const updated = [...itemRows];
                                updated[idx].reorderPoint = e.target.value;
                                setItemRows(updated);
                              }}
                              placeholder="Enter quantity"
                              className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.costPrice}
                              onChange={(e) => {
                                const updated = [...itemRows];
                                updated[idx].costPrice = e.target.value;
                                setItemRows(updated);
                              }}
                              placeholder="0"
                              className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.sellingPrice}
                              onChange={(e) => {
                                const updated = [...itemRows];
                                updated[idx].sellingPrice = e.target.value;
                                setItemRows(updated);
                              }}
                              placeholder="0"
                              className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const gstDetails = calculateGSTDetails(
                                item.sellingPrice,
                                selectedTaxRateValue,
                                priceIncludesGST
                              );
                              if (!gstDetails) {
                                return <span className="text-sm text-[#94a3b8]">—</span>;
                              }
                              return priceIncludesGST ? (
                                <div className="text-xs text-[#1f2937] space-y-0.5">
                                  <div>Base: ₹{gstDetails.basePrice}</div>
                                  <div>GST ({gstDetails.percentage}%): ₹{gstDetails.gstAmount}</div>
                                  <div className="text-[11px] text-[#64748b]">Total: ₹{gstDetails.finalPrice}</div>
                                </div>
                              ) : (
                                <div className="text-xs text-[#1f2937] space-y-0.5">
                                  <div>Total: ₹{gstDetails.finalPrice}</div>
                                  <div className="text-[11px] text-[#64748b]">
                                    GST ({gstDetails.percentage}%): ₹{gstDetails.gstAmount}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                const confirmDelete = window.confirm(`Are you sure you want to delete "${item.name || "this item"}"?`);
                                if (confirmDelete) {
                                  setItemRows(itemRows.filter((_, i) => i !== idx));
                                }
                              }}
                              className="table-action-button inline-flex h-6 w-6 items-center justify-center rounded bg-[#ef4444] text-white hover:bg-[#dc2626]"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : createAttributes && generatedItems.length > 0 ? (
                    // Auto-generated items from attributes
                    generatedItems.map((item, idx) => {
                      // Always regenerate name from attributeCombination to show latest changes
                      let displayName = item.name;
                      if (item.attributeCombination && Array.isArray(item.attributeCombination) && item.attributeCombination.length > 0) {
                        const optionsStr = item.attributeCombination.join("/");
                        displayName = `${itemGroupName || "Item"} - ${optionsStr}`;
                      }
                      
                      // Extract size from attributeCombination or use stored size
                      const sizeAttributeIndex = attributeRows.findIndex(row => row.attribute?.toLowerCase() === "size");
                      const sizeValue = sizeAttributeIndex !== -1 && item.attributeCombination && item.attributeCombination[sizeAttributeIndex] 
                        ? item.attributeCombination[sizeAttributeIndex] 
                        : (item.size || "");
                      
                      // Base name for SKU generation (without size in the name)
                      const baseName = itemGroupName || "Item";
                      
                      return (
                      <tr key={item.id} className="hover:bg-[#fafbff]">
                        <td className="px-4 py-3 text-sm font-medium text-[#1f2937]">
                          <div className="flex items-center gap-2">
                            <span>{displayName}</span>
                            <button
                              onClick={() => {
                                const newName = window.prompt("Enter item name", item.name);
                                if (newName !== null) {
                                  const trimmedName = newName.trim();
                                  if (trimmedName !== "") {
                                    const updated = [...generatedItems];
                                    updated[idx].name = trimmedName;
                                    // If SKU hasn't been manually edited, regenerate with new name + size + attribute combo
                                    if (!itemSkuManuallyEdited[item.id]) {
                                      updated[idx].sku = generateSkuPreview(baseName, sizeValue, item.attributeCombination);
                                    }
                                    setGeneratedItems(updated);
                                    previousGeneratedItemsRef.current = updated;
                                  }
                                }
                              }}
                              className="table-action-button inline-flex h-6 w-6 items-center justify-center rounded bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={sizeValue}
                            onChange={(e) => {
                              const updated = [...generatedItems];
                              const newSize = e.target.value;
                              updated[idx].size = newSize;
                              // Update attributeCombination if size attribute exists
                              if (sizeAttributeIndex !== -1 && updated[idx].attributeCombination) {
                                updated[idx].attributeCombination[sizeAttributeIndex] = newSize;
                              }
                              // Regenerate SKU if not manually edited
                              if (!itemSkuManuallyEdited[item.id]) {
                                updated[idx].sku = generateSkuPreview(baseName, newSize, updated[idx].attributeCombination);
                              }
                              setGeneratedItems(updated);
                              previousGeneratedItemsRef.current = updated;
                            }}
                            placeholder="Size"
                            className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => {
                              const updated = [...generatedItems];
                              updated[idx].sku = e.target.value.toUpperCase();
                              setGeneratedItems(updated);
                              // Update ref as well
                              previousGeneratedItemsRef.current = updated;
                              // Mark as manually edited
                              setItemSkuManuallyEdited(prev => ({ ...prev, [item.id]: true }));
                            }}
                            onFocus={(e) => {
                              // Auto-generate SKU if empty and not manually edited
                              if (!item.sku && !itemSkuManuallyEdited[item.id] && baseName) {
                                const updated = [...generatedItems];
                                updated[idx].sku = generateSkuPreview(baseName, sizeValue, item.attributeCombination);
                                setGeneratedItems(updated);
                                previousGeneratedItemsRef.current = updated;
                              }
                            }}
                            placeholder="Auto-generated or enter manually"
                            className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.hsnCode || ""}
                            onChange={(e) => {
                              const updated = [...generatedItems];
                              updated[idx].hsnCode = e.target.value;
                              setGeneratedItems(updated);
                              previousGeneratedItemsRef.current = updated;
                            }}
                            placeholder="Enter HSN"
                            className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.reorderPoint || ""}
                            onChange={(e) => {
                              const updated = [...generatedItems];
                              updated[idx].reorderPoint = e.target.value;
                              setGeneratedItems(updated);
                              previousGeneratedItemsRef.current = updated;
                            }}
                            placeholder="Enter quantity"
                            className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.costPrice}
                            onChange={(e) => {
                              const updated = [...generatedItems];
                              updated[idx].costPrice = e.target.value;
                              setGeneratedItems(updated);
                            }}
                            placeholder="0"
                            className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.sellingPrice}
                            onChange={(e) => {
                              const updated = [...generatedItems];
                              updated[idx].sellingPrice = e.target.value;
                              setGeneratedItems(updated);
                            }}
                            placeholder="0"
                            className="w-full rounded border border-[#d7dcf5] bg-white px-2 py-1.5 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const gstDetails = calculateGSTDetails(
                              item.sellingPrice,
                              selectedTaxRateValue,
                              priceIncludesGST
                            );
                            if (!gstDetails) {
                              return <span className="text-sm text-[#94a3b8]">—</span>;
                            }
                            return priceIncludesGST ? (
                              <div className="text-xs text-[#1f2937] space-y-0.5">
                                <div>Base: ₹{gstDetails.basePrice}</div>
                                <div>GST ({gstDetails.percentage}%): ₹{gstDetails.gstAmount}</div>
                                <div className="text-[11px] text-[#64748b]">Total: ₹{gstDetails.finalPrice}</div>
                              </div>
                            ) : (
                              <div className="text-xs text-[#1f2937] space-y-0.5">
                                <div>Total: ₹{gstDetails.finalPrice}</div>
                                <div className="text-[11px] text-[#64748b]">
                                  GST ({gstDetails.percentage}%): ₹{gstDetails.gstAmount}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => {
                              const confirmDelete = window.confirm(`Are you sure you want to delete "${displayName}"?`);
                              if (confirmDelete) {
                                const updated = generatedItems.filter((_, i) => i !== idx);
                                setGeneratedItems(updated);
                                previousGeneratedItemsRef.current = updated;
                              }
                            }}
                            className="table-action-button inline-flex h-6 w-6 items-center justify-center rounded bg-[#ef4444] text-white hover:bg-[#dc2626]"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-sm font-medium text-[#94a3b8]"
                      >
                        Please enter attributes and options to generate items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSave}
                  className="rounded-md bg-[#3762f9] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2748c9]"
                >
                  {isEditMode ? "Update Item Group" : "Save Item Group"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manufacturer Modal */}
      {showManufacturerModal && (
        <ManufacturerModal
          onClose={() => {
            setShowManufacturerModal(false);
            setNewManufacturer("");
          }}
          onAdd={async (name) => {
            if (name.trim()) {
              try {
                const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
                const createdBy = currentUser.username || currentUser.locName || "System";
                
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
                  setManufacturers((prev) =>
                    prev.includes(manufacturerName) ? prev : [...prev, manufacturerName]
                  );
                  setSelectedManufacturer(manufacturerName);
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

      {/* Brand Modal */}
      {showBrandModal && (
        <BrandModal
          onClose={() => {
            setShowBrandModal(false);
            setNewBrand("");
          }}
          onAdd={async (name) => {
            if (name.trim()) {
              try {
                const currentUser = JSON.parse(localStorage.getItem("rootfinuser")) || {};
                const createdBy = currentUser.username || currentUser.locName || "System";
                
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
                  setBrands((prev) =>
                    prev.includes(brandName) ? prev : [...prev, brandName]
                  );
                  setSelectedBrand(brandName);
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

      {/* Single Item Confirmation Modal */}
      {showSingleItemModal && (
        <SingleItemModal
          onYes={() => {
            switchToManualMode();
            setShowSingleItemModal(false);
            // Navigate to items section - you can add navigation here if needed
          }}
          onNo={() => {
            setShowSingleItemModal(false);
            // Stay on page, keep attributes visible
          }}
          onClose={() => {
            setShowSingleItemModal(false);
            // Reset checkbox if user closes modal
            setCreateAttributes(true);
          }}
        />
      )}
    </div>
  );
};

const InventoryValuationSelect = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const containerRef = useRef(null);

  const options = [
    "FIFO (First In First Out)",
    "WAC (Weighted Average Costing)",
    "LIFO (Last In First Out)",
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
      return options;
    }
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [search]);

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
        <span className={`transition-colors duration-150 ${value ? "text-[#1f2937]" : "text-[#9ca3af]"}`}>{displayValue || "Select valuation method"}</span>
        <ChevronDown
          size={16}
          className={`ml-3 text-[#9ca3af] transition-transform duration-200 ease-in-out ${open ? "rotate-180" : "rotate-0"}`}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#d7dcf5] bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-2 border-b border-[#edf1ff] px-3 py-2">
            <Search size={14} className="text-[#9ca3af]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-8 w-full border-none text-sm text-[#1f2937] outline-none placeholder:text-[#9ca3af]"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="py-2">
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
                        ? "bg-[#f1f5f9] text-[#1f2937]"
                        : isHovered
                        ? "bg-[#2563eb] text-white"
                        : "bg-white text-[#475569] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && (
                      <Check size={16} className={isHovered ? "text-white" : "text-[#2563eb]"} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SingleItemModal = ({ onYes, onNo, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-white transition hover:bg-[#1d4ed8]"
        >
          <X size={16} />
        </button>
        <div className="px-8 py-8">
          <h2 className="mb-8 text-2xl font-semibold text-[#1f2937]">Do you want to create a single item?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={onYes}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-[#2563eb] bg-[#2563eb] p-8 text-center transition-all duration-200 hover:bg-[#1d4ed8] hover:border-[#1d4ed8] hover:shadow-lg"
            >
              <ShoppingBag size={40} className="text-white" />
              <p className="text-sm font-medium leading-relaxed text-white">
                Yes, proceed to the Items section to create a single item.
              </p>
            </button>
            <button
              onClick={onNo}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-[#2563eb] bg-[#2563eb] p-8 text-center transition-all duration-200 hover:bg-[#1d4ed8] hover:border-[#1d4ed8] hover:shadow-lg"
            >
              <ShoppingCart size={40} className="text-white" />
              <p className="text-sm font-medium leading-relaxed text-white">
                No, continue on this page to create items in a group.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoeSalesItemGroupCreate;
const FloatingCheckbox = ({ label, defaultChecked = false, checked, onChange }) => (
  <label className="inline-flex items-center gap-3 rounded-lg border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-medium text-[#1f2937] shadow-sm">
    <input
      type="checkbox"
      checked={checked !== undefined ? checked : defaultChecked}
      onChange={onChange}
      className="h-4 w-4 rounded border-[#cbd5f5] text-[#4285f4] focus:ring-[#4285f4]"
    />
    {label}
  </label>
);

const FloatingSelect = ({ label, placeholder, options = [] }) => (
  <label className="flex w-full flex-col gap-1 text-sm text-[#475569]">
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
    <select className="rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none">
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
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

const ManufacturerSelect = ({ label, placeholder, value, onChange, manufacturers, onManageClick }) => {
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

  const filteredManufacturers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return manufacturers;
    }
    return manufacturers.filter((m) => m.toLowerCase().includes(term));
  }, [manufacturers, search]);

  const displayValue = value || "";

  return (
    <div className="relative flex w-full flex-col gap-1 text-sm text-[#475569]" ref={containerRef}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
          open ? "border-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" : "border-[#d7dcf5]"
        } bg-white text-[#1f2937] cursor-pointer`}
        onClick={() => setOpen((prev) => !prev)}
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
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-scroll py-2 manufacturer-select-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
            <style>{`
              .manufacturer-select-scroll::-webkit-scrollbar {
                width: 8px;
              }
              .manufacturer-select-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              .manufacturer-select-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .manufacturer-select-scroll::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}</style>
            {filteredManufacturers.length === 0 && manufacturers.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No manufacturers added yet</p>
            ) : filteredManufacturers.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No matching results</p>
            ) : (
              filteredManufacturers.map((manufacturer) => {
                const isSelected = value === manufacturer;
                return (
                  <button
                    key={manufacturer}
                    type="button"
                    onClick={() => {
                      onChange(manufacturer);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`select-option flex w-full items-center rounded-md px-4 py-2 text-left text-sm transition ${
                      isSelected
                        ? "bg-[#f6f8ff] text-[#2563eb] font-semibold"
                        : "bg-white text-[#475569] hover:bg-[#f6f8ff]"
                    }`}
                  >
                    {manufacturer}
                  </button>
                );
              })
            )}
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e7ebf8] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1f2937]">Add Manufacturer</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#9ca3af] hover:bg-[#f1f5f9] hover:text-[#475569] transition"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
              Manufacturer Name*
            </label>
            <input
              type="text"
              value={newManufacturer}
              onChange={(e) => setNewManufacturer(e.target.value)}
              placeholder="Enter manufacturer name"
              className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
              autoFocus
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-[#f1f5f9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newManufacturer.trim()}
              className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-white disabled:bg-[#f1f5f9] disabled:text-[#9ca3af] disabled:cursor-not-allowed"
            >
              Add Manufacturer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BrandSelect = ({ label, placeholder, value, onChange, brands, onManageClick }) => {
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

  const filteredBrands = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return brands;
    }
    return brands.filter((b) => b.toLowerCase().includes(term));
  }, [brands, search]);

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
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-[#d7dcf5] bg-white shadow-[0_24px_48px_-28px_rgba(15,23,42,0.45)]">
          <div className="flex items-center gap-2 border-b border-[#edf1ff] px-3 py-2 text-[#475569]">
            <Search size={14} className="text-[#9ca3af]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-8 w-full border-none text-sm text-[#1f2937] outline-none placeholder:text-[#9ca3af]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-scroll py-2 brand-select-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
            <style>{`
              .brand-select-scroll::-webkit-scrollbar {
                width: 8px;
              }
              .brand-select-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              .brand-select-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .brand-select-scroll::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}</style>
            {filteredBrands.length === 0 && brands.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No brands added yet</p>
            ) : filteredBrands.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#9ca3af]">No matching results</p>
            ) : (
              filteredBrands.map((brand) => {
                const isSelected = value === brand;
                return (
                  <div
                    key={brand}
                    onClick={() => {
                      onChange(brand);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center px-4 py-2 text-left text-sm cursor-pointer transition-all duration-150 ease-in-out ${
                      isSelected
                        ? "text-[#2563eb] font-semibold"
                        : "text-[#475569] hover:text-[#2563eb]"
                    }`}
                  >
                    {brand}
                  </div>
                );
              })
            )}
          </div>
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
        </div>
      )}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md rounded-2xl border border-[#d7dcf5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e7ebf8] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1f2937]">Add Brand</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#9ca3af] hover:bg-[#f1f5f9] hover:text-[#475569] transition"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
              Brand Name*
            </label>
            <input
              type="text"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Enter brand name"
              className="w-full rounded-lg border border-[#d7dcf5] px-3 py-2 text-sm text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
              autoFocus
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-[#f1f5f9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newBrand.trim()}
              className="rounded-md border border-[#d7dcf5] px-4 py-2 text-sm font-medium text-[#475569] transition hover:bg-white disabled:bg-[#f1f5f9] disabled:text-[#9ca3af] disabled:cursor-not-allowed"
            >
              Add Brand
            </button>
          </div>
        </form>
      </div>
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