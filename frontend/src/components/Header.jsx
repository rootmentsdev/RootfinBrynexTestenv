import { IoPersonCircleOutline } from "react-icons/io5";
import Rootments from '../assets/Rootments.jpg';
import { useState, useEffect } from "react";
import baseUrl from '../api/api';
import salesInventoryAccessConfig from '../config/salesInventoryAccess.json';

const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";

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

const Header = (prop) => {
    // Correct and complete store locations (primary source)
    // Only show main store locations (filter out duplicates and unwanted ones)
    const fallbackLocations = [
       
        { "locName": "Warehouse", "locCode": "858" },
        { "locName": "G-Edappally", "locCode": "702" },
        { "locName": "HEAD OFFICE01", "locCode": "759" },
        { "locName": "SG-Trivandrum", "locCode": "700" },
         { "locName": "Z-Edapally", "locCode": "144" },
        { "locName": "Z-Edappal", "locCode": "100" },
        { "locName": "Z-Perinthalmanna", "locCode": "133" },
        { "locName": "Z-Kottakkal", "locCode": "122" },
        { "locName": "G-Kottayam", "locCode": "701" },
        { "locName": "G-Perumbavoor", "locCode": "703" },
        { "locName": "G-Thrissur", "locCode": "704" },
        { "locName": "G-Chavakkad", "locCode": "706" },
        { "locName": "G-Calicut", "locCode": "712" },
        { "locName": "G-Vadakara", "locCode": "708" },
        { "locName": "G-Edappal", "locCode": "707" },
        { "locName": "G-Perinthalmanna", "locCode": "709" },
        { "locName": "G-Kottakkal", "locCode": "711" },
        { "locName": "G-Manjeri", "locCode": "710" },
        { "locName": "G-Palakkad", "locCode": "705" },
        { "locName": "G-Kalpetta", "locCode": "717" },
        { "locName": "G-Kannur", "locCode": "716" },
        { "locName": "G-Mg Road", "locCode": "718" },
        { "locName": "Production", "locCode": "101" },
        { "locName": "Office", "locCode": "102" },
              { "locName": "WAREHOUSE", "locCode": "103" },
                         { "locName": "Dappr Squad", "locCode": "555" }
              
        
    ];

    const [AllLoation, setAllLoation] = useState(fallbackLocations);

    const [Value, setValue] = useState({ locCode: '', locName: '' });

    const [logOut, setlogOut] = useState(false);
    const [selectedValue, setSelectedValue] = useState("");
    
    // Initialize currentUser from localStorage immediately to prevent blank display
    const getInitialUser = () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem("rootfinuser"));
            return storedUser || {};
        } catch (error) {
            return {};
        }
    };
    const [currentUser, setCurrentUser] = useState(getInitialUser());

    // Function to sync user from localStorage
    const syncUserFromStorage = (locations) => {
        try {
            const storedUser = JSON.parse(localStorage.getItem("rootfinuser"));
            if (storedUser) {
                const locationName = locations.find(loc => loc.locCode === storedUser.locCode)?.locName || storedUser.username;
                setCurrentUser({ ...storedUser, username: locationName });
                setSelectedValue(storedUser.locCode);
            }
        } catch (error) {
            console.error("Error syncing user from storage:", error);
        }
    };

    useEffect(() => {
        // Fetch store names from backend
        const fetchStores = async () => {
            try {
                const response = await fetch(`${API_URL}/api/stores`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.stores && Array.isArray(data.stores)) {
                        // Create a map of fallback locations for reference
                        const fallbackMap = new Map(fallbackLocations.map(f => [f.locCode, f.locName]));
                        
                        // Map backend stores to location format, preferring fallback names if backend name is just a code
                        const backendStores = data.stores.map(store => ({
                            locName: fallbackMap.get(store.locCode) || store.name,
                            locCode: store.locCode
                        }));
                        
                        // Merge with fallback locations, avoiding duplicates
                        const mergedLocations = [...backendStores];
                        const backendCodes = new Set(backendStores.map(s => s.locCode));
                        
                        // Add fallback locations that aren't in backend
                        fallbackLocations.forEach(fallback => {
                            if (!backendCodes.has(fallback.locCode)) {
                                mergedLocations.push(fallback);
                            }
                        });
                        
                        // Sort by name
                        const sortedLocations = mergedLocations.sort((a, b) => 
                            a.locName.localeCompare(b.locName)
                        );
                        setAllLoation(sortedLocations);
                        
                        // Sync user from storage with proper location name
                        syncUserFromStorage(sortedLocations);
                        return;
                    }
                }
            } catch (error) {
                console.error("Error fetching stores:", error);
            }
            
            // Fallback: use only the specified fallback locations
            const sortedLocations = [...fallbackLocations].sort((a, b) => 
                a.locName.localeCompare(b.locName)
            );
            setAllLoation(sortedLocations);
            
            // Sync user from storage with fallback locations
            syncUserFromStorage(sortedLocations);
        };

        fetchStores();
    }, []);

    // Additional useEffect to periodically sync user from localStorage
    // This ensures the location stays visible even if state is lost
    useEffect(() => {
        const syncInterval = setInterval(() => {
            if (AllLoation.length > 0) {
                syncUserFromStorage(AllLoation);
            }
        }, 1000); // Check every second

        // Also listen for storage changes (in case localStorage is updated from another tab/window)
        const handleStorageChange = (e) => {
            if (e.key === 'rootfinuser' && AllLoation.length > 0) {
                syncUserFromStorage(AllLoation);
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearInterval(syncInterval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [AllLoation]);

    const handleChange = (e) => {
        const selectedCode = e.target.value;
        const selectedItem = AllLoation.find(item => item.locCode === selectedCode);
        if (selectedItem) {
            setSelectedValue(selectedItem.locCode);
            setValue({
                locCode: selectedItem.locCode,
                locName: selectedItem.locName,
            });

            const updatedUser = {
                ...currentUser,
                locCode: selectedItem.locCode,
                username: selectedItem.locName,
            };

            localStorage.setItem("rootfinuser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
            window.location.reload()
        }
    };

    const HanndleRemove = () => {
        try {
            localStorage.removeItem("rootfinuser");
            window.location.reload();
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    // Get display name with fallback to localStorage
    const getDisplayName = () => {
        if (currentUser?.username) {
            return currentUser.username;
        }
        // Fallback: try to get from localStorage directly
        try {
            const storedUser = JSON.parse(localStorage.getItem("rootfinuser"));
            if (storedUser?.username) {
                return storedUser.username;
            }
        } catch (error) {
            // Ignore errors
        }
        return "";
    };

    const displayName = getDisplayName();

    // Check if user has access to Sales and Inventory (beta features)
    // Show BETA badge only for non-admin test users (not for admin)
    const userEmail = currentUser?.email?.toLowerCase() || "";
    const isAdmin = currentUser?.power === 'admin';
    const isInBetaList = salesInventoryAccessConfig.allowedEmails
        .map(email => email.toLowerCase())
        .includes(userEmail);
    const hasBetaAccess = !isAdmin && isInBetaList; // Only show badge for non-admin beta testers

    return (
        <nav className="bg-white ml-[250px] border-gray-200 dark:border-gray-700">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <a href="#" className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img src={Rootments} className="h-8 rounded-md" alt="Flowbite Logo" />
                    <span className="self-center text-2xl font-semibold whitespace-nowrap text-black">{prop.title}</span>
                    {hasBetaAccess && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md animate-pulse">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            BETA
                        </span>
                    )}
                </a>

                <div
                    onClick={() => setlogOut((prev) => !prev)}
                    className="hidden cursor-pointer w-full md:block md:w-auto"
                    id="navbar-multi-level"
                >
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <h2 className="text-sm font-semibold text-gray-800">{formatLocationName(displayName)}</h2>
                            <p className="text-xs text-gray-500">Location: {formatLocationName(displayName)}</p>
                        </div>
                        <IoPersonCircleOutline className="text-4xl text-green-600" />
                    </div>
                </div>
            </div>

            {logOut && (
                <div className="flex flex-col items-stretch w-64 rounded-lg shadow-lg bg-white absolute right-5 top-16 p-4 space-y-3 border border-gray-100 z-50">
                    <div className="pb-3 border-b border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Current Location</p>
                        <p className="text-sm font-semibold text-gray-800">{formatLocationName(displayName)}</p>
                    </div>
                    
                    {(currentUser.power === 'admin' || (currentUser.role || '').toLowerCase() === 'cluster_manager') && (
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-600">Switch Location</label>
                            <select
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm transition-colors"
                                value={selectedValue}
                                onChange={handleChange}
                            >
                                <option value="">-- Select a location --</option>
                                {(currentUser.power === 'admin'
                                    ? AllLoation
                                    : AllLoation.filter(item => (currentUser.allowedLocCodes || []).includes(item.locCode))
                                ).map((item) => (
                                    <option key={item.locCode} value={item.locCode}>
                                        {formatLocationName(item.locName)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <button
                        className="w-full px-3 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer font-medium text-sm transition-colors"
                        onClick={HanndleRemove}
                    >
                        Logout
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Header;
