import { IoPersonCircleOutline } from "react-icons/io5";
import Rootments from '../assets/Rootments.jpg';
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
    
    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();

    // Generate breadcrumbs from path
    const getBreadcrumbs = () => {
        const paths = location.pathname.split('/').filter(Boolean);
        if (paths.length === 0) return null; // Root path (Day Book, etc)
        
        // Map common path segments
        const pathMap = {
            'shoe-sales': 'Sales',
            'invoices': 'Invoice',
            'orders': 'Order',
            'customers': 'Customer',
            'inventory': 'Inventory',
            'items': 'Items',
            'item-groups': 'Item Groups',
            'adjustments': 'Adjustments',
            'transfer-orders': 'Transfer Orders',
            'store-orders': 'Store Orders',
            'manage-users': 'Manage Users',
        };

        const breadcrumbs = [];
        
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const isLast = i === paths.length - 1;
            
            // Skip ID segments unless it's the last one
            if (path.length > 20 || !isNaN(path)) {
                if (isLast) breadcrumbs.push({ name: prop.title || 'Details', isLast: true });
                continue;
            }
            
            // If it's the last part ("new", "edit", etc) or just standard last part, use prop.title if available to be accurate
            if (isLast && prop.title) {
                 breadcrumbs.push({ name: prop.title, isLast: true });
                 continue;
            }

            const name = pathMap[path] || (path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '));
            breadcrumbs.push({ name, isLast });
        }
        
        return breadcrumbs;
    };
    
    const breadcrumbs = getBreadcrumbs();

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
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
    const isClusterManager = (currentUser?.role || "").toLowerCase() === "cluster_manager";

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-full px-6 py-3.5 flex flex-wrap items-center justify-between mx-auto">
                <div className="flex items-center gap-3">
                    {breadcrumbs && breadcrumbs.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2.5 rounded-lg bg-[#5a5a5a] hover:bg-[#4a4a4a] text-white transition-colors flex items-center justify-center">
                                <ArrowLeft size={18} />
                            </button>
                            <div className="flex items-center gap-2 text-[15px]">
                                {breadcrumbs.map((crumb, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className={crumb.isLast ? "font-semibold text-gray-900 text-lg" : "text-gray-500"}>
                                            {crumb.name}
                                        </span>
                                        {!crumb.isLast && <span className="text-gray-400">/</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        prop.title && <h1 className="text-xl font-bold text-gray-800">{prop.title}</h1>
                    )}
                    <a href="#" className="flex items-center space-x-3 rtl:space-x-reverse ml-2">
                        {hasBetaAccess && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md animate-pulse">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                BETA
                            </span>
                        )}
                    </a>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                    {/* Location Selector */}
                    {(isAdmin || isClusterManager) ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 shadow-sm transition-colors cursor-pointer"
                                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', width: 'max-content', gap: '8px' }}
                            >
                                <span className="text-gray-500 flex-shrink-0 flex items-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </span>
                                <span className="text-sm font-medium text-gray-700" style={{ whiteSpace: 'nowrap' }}>
                                    {currentUser?.locCode 
                                        ? formatLocationName(AllLoation.find(l => l.locCode === currentUser.locCode)?.locName || "Select Location") 
                                        : "-- Select Location --"}
                                </span>
                                <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                    {(isAdmin
                                        ? AllLoation
                                        : AllLoation.filter(item => (currentUser?.allowedLocCodes || []).includes(item.locCode))
                                    ).map((item) => (
                                        <button
                                            key={item.locCode}
                                            type="button"
                                            onClick={() => {
                                                handleChange({ target: { value: item.locCode } });
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${currentUser?.locCode === item.locCode ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-700'}`}
                                        >
                                            {formatLocationName(item.locName)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        currentUser?.locCode && (
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-sm font-medium text-gray-700">
                                <span className="text-purple-500 mr-1.5">📍</span>
                                {formatLocationName(displayName)}
                            </div>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Header;
