import { useState, useEffect } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import Select from "react-select";
import Header from "../components/Header";
import baseUrl from "../api/api";

// Function to format location names with proper spacing
const formatLocationName = (name) => {
    if (!name) return name;
    
    // Trim whitespace first
    let formatted = name.trim();
    
    // Pattern: Single letter (G, Z, S, etc.) followed immediately by a capital letter
    // Example: "GKannur" -> "G Kannur", "GCalicut" -> "G Calicut"
    formatted = formatted.replace(/^([A-Z])([A-Z][a-z])/g, '$1 $2');
    
    // Also handle cases like "Gkannur" (lowercase after prefix)
    formatted = formatted.replace(/^([A-Z])([a-z])/g, '$1 $2');
    
    return formatted;
};

// Fallback locations for backward compatibility
const fallbackLocations = [
    { value: "Production", locCode: "101" },
    { value: "Office", locCode: "102" },
    { value: "WAREHOUSE", locCode: "103" },
    { value: "Z-Edapally1", locCode: "144" },
    { value: "G-Edappally", locCode: "702" },
    { value: "SG-Trivandrum", locCode: "700" },
    { value: "Z- Edappal", locCode: "100" },
    { value: "Z.Perinthalmanna", locCode: "133" },
    { value: "Z.Kottakkal", locCode: "122" },
    { value: "G.Kottayam", locCode: "701" },
    { value: "G.Perumbavoor", locCode: "703" },
    { value: "G.Thrissur", locCode: "704" },
    { value: "G.Chavakkad", locCode: "706" },
    { value: "G.Calicut ", locCode: "712" },
    { value: "G.Vadakara", locCode: "708" },
    { value: "G.Edappal", locCode: "707" },
    { value: "G.Perinthalmanna", locCode: "709" },
    { value: "G.Kottakkal", locCode: "711" },
    { value: "G.Manjeri", locCode: "710" },
    { value: "G.Palakkad ", locCode: "705" },
    { value: "G.Kalpetta", locCode: "717" },
    { value: "G.Kannur", locCode: "716" },
    { value: "G.MG Road", locCode: "718" },
     { value: "Dappr Squad", locCode: "555" }
];

const AdminClose = () => {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [cashDate, setCashDate] = useState("");
    const [cash, setCash] = useState("");
    const [closingCash, setClosingCash] = useState("");
    const [bank, setBank] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [AllLocations, setAllLocations] = useState(fallbackLocations.map((loc) => ({
        ...loc,
        label: formatLocationName(loc.value),
    })));

    const currentUser = JSON.parse(localStorage.getItem("rootfinuser"));
    const email = currentUser?.email;

    useEffect(() => {
        // Use fallback locations directly — these are the correct stores
        setAllLocations(fallbackLocations.map(loc => ({
            ...loc,
            label: formatLocationName(loc.value),
        })));
    }, []);

    // Load existing closing data when location and date are selected
    useEffect(() => {
        const loadExistingData = async () => {
            if (!selectedLocation || !cashDate) {
                // Clear form if location or date is not selected
                setCash("");
                setClosingCash("");
                setBank("");
                setIsEditMode(false);
                return;
            }

            setLoadingData(true);
            try {
                const response = await fetch(
                    `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${selectedLocation.locCode}&date=${cashDate}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.data) {
                        // Pre-fill form with existing data
                        setCash(data.data.cash?.toString() || "");
                        setClosingCash(data.data.Closecash?.toString() || "");
                        setBank(data.data.bank?.toString() || "");
                        setIsEditMode(true);
                        console.log("✅ Loaded existing closing data for editing:", data.data);
                    }
                } else if (response.status === 404) {
                    // No existing data - clear form for new entry
                    setCash("");
                    setClosingCash("");
                    setBank("");
                    setIsEditMode(false);
                    console.log("ℹ️ No existing closing data - ready for new entry");
                }
            } catch (error) {
                console.error("Error loading existing data:", error);
                // Don't clear form on error - let user enter data
            } finally {
                setLoadingData(false);
            }
        };

        loadExistingData();
    }, [selectedLocation, cashDate]);

    const apiUrl5 = `${baseUrl.baseUrl}user/saveCashBank`;

    const handleSubmit = async () => {
        if (!selectedLocation || !cashDate || !cash || !closingCash || !bank) {
            alert("Please fill in all fields.");
            return;
        }
    
        const payload = {
            totalAmount: closingCash,    // Physical cash (from "Closing Cash" field) → Closecash in DB
            totalCash: cash,             // Calculated closing (from "Cash" field) → cash in DB
            totalBankAmount: bank,
            date: cashDate,
            locCode: selectedLocation.locCode,
            email,
        };
    
        try {
            setLoading(true);
            const res = await fetch(apiUrl5, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
    
            const data = await res.json();
    
            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }
    
            alert(data.message || `Data ${isEditMode ? 'updated' : 'saved'} successfully!`);
            
            // Reload the data to confirm the update
            if (isEditMode) {
                const reloadResponse = await fetch(
                    `${baseUrl.baseUrl}user/getsaveCashBank?locCode=${selectedLocation.locCode}&date=${cashDate}`
                );
                if (reloadResponse.ok) {
                    const reloadData = await reloadResponse.json();
                    console.log("✅ Data after update:", reloadData.data);
                }
            }
        } catch (err) {
            console.error(err);
            alert(err.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    // Enter key to save admin close
    useEnterToSave((e) => {
        const syntheticEvent = e || { preventDefault: () => {} };
        handleSubmit();
    }, loading);
    

    return (
        <>
            <Header title="Admin Close" />
            <div className="ml-[290px] mt-[80px] p-4">
                {isEditMode && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
                        <p className="text-yellow-800 font-semibold">
                            ✏️ Edit Mode: Updating existing closing data for {selectedLocation?.label} on {cashDate}
                        </p>
                    </div>
                )}
                
                <div className="mb-6">
                    <label className="block mb-2 font-semibold text-gray-700">
                        Location
                    </label>
                    <Select
                        options={AllLocations}
                        value={selectedLocation}
                        onChange={setSelectedLocation}
                        placeholder="Select a location"
                        className="w-full"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Cash Date
                        </label>
                        <input
                            type="date"
                            value={cashDate}
                            onChange={(e) => setCashDate(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    {loadingData ? (
                        <div className="col-span-2 text-center py-4">
                            <p className="text-gray-600">Loading existing data...</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">
                                    Cash (Calculated Closing)
                                </label>
                                <input
                                    type="text"
                                    value={cash}
                                    onChange={(e) => setCash(e.target.value)}
                                    placeholder="Enter calculated closing cash"
                                    className="w-full p-2 border rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">Opening + Day's transactions (for next day opening)</p>
                            </div>

                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">
                                    Closing Cash (Physical Count)
                                </label>
                                <input
                                    type="text"
                                    value={closingCash}
                                    onChange={(e) => setClosingCash(e.target.value)}
                                    placeholder="Enter physical cash counted"
                                    className="w-full p-2 border rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">Actual cash counted from denominations</p>
                            </div>

                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">
                                    Bank
                                </label>
                                <input
                                    type="text"
                                    value={bank}
                                    onChange={(e) => setBank(e.target.value)}
                                    placeholder="Enter bank amount"
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        </>
                    )}
                </div>

                <button
                    className="mt-6 p-2 bg-blue-500 w-1/2 rounded-md text-white hover:bg-blue-700 transition-all duration-200 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
                    onClick={handleSubmit}
                    disabled={loading || loadingData}
                >
                    {loading ? "Saving..." : isEditMode ? "Update Close" : "Save Close"}
                </button>
            </div>
        </>
    );
};

export default AdminClose;
