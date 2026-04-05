import { useState, useEffect, useRef } from "react";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { createPortal } from "react-dom";
import Head from "../components/Head";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, ChevronDown, X, Info } from "lucide-react";
import ImageUpload from "../components/ImageUpload";
import baseUrl from "../api/api";

const Input = ({ label, placeholder = "", hint, type = "text", right, ...props }) => (
  <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
    <div className="flex items-center rounded-lg border border-[#d7dcf5] focus-within:border-[#4285f4]">
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2.5 text-base text-[#1f2937] placeholder:text-[#94a3b8] focus:outline-none"
        {...props}
      />
      {right}
    </div>
    {hint && <span className="text-sm text-[#94a3b8]">{hint}</span>}
  </label>
);

const Select = ({ label, children, ...props }) => (
  <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</span>
    <select
      className="rounded-lg border border-[#d7dcf5] px-3 py-2.5 text-base text-[#1f2937] focus:border-[#4285f4] focus:outline-none"
      {...props}
    >
      {children}
    </select>
  </label>
);

const TABS = ["Other Details", "Address", "Contact Persons", "Bank Details", "Custom Fields", "Reporting Tags", "Remarks"];

// GST Treatment Options
const GST_TREATMENT_OPTIONS = [
  {
    id: "registered-regular",
    title: "Registered Business - Regular",
    description: "Business that is registered under GST",
  },
  {
    id: "registered-composition",
    title: "Registered Business - Composition",
    description: "Business that is registered under the Composition Scheme in GST",
  },
  {
    id: "unregistered",
    title: "Unregistered Business",
    description: "Business that has not been registered under GST",
  },
  {
    id: "overseas",
    title: "Overseas",
    description: "Persons with whom you do import or export of supplies outside India",
  },
  {
    id: "sez",
    title: "Special Economic Zone",
    description: "Business (Unit) that is located in a Special Economic Zone (SEZ) of India or a SEZ Developer",
  },
  {
    id: "deemed-export",
    title: "Deemed Export",
    description: "Supply of goods to an Export Oriented Unit or against Advanced Authorization/Export Promotion Capital Goods.",
  },
  {
    id: "tax-deductor",
    title: "Tax Deductor",
    description: "Departments of the State/Central government, governmental agencies or local authorities",
  },
  {
    id: "sez-developer",
    title: "SEZ Developer",
    description: "A person/organisation who owns at least 26% of the equity in creating business units in a Special Economic Zone (SEZ)",
  },
];

// Indian States List
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// All Countries List
const ALL_COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

// World Currencies List
const WORLD_CURRENCIES = [
  "USD - US Dollar",
  "EUR - Euro",
  "GBP - British Pound",
  "JPY - Japanese Yen",
  "AUD - Australian Dollar",
  "CAD - Canadian Dollar",
  "CHF - Swiss Franc",
  "CNY - Chinese Yuan",
  "INR - Indian Rupee",
  "NZD - New Zealand Dollar",
  "SGD - Singapore Dollar",
  "HKD - Hong Kong Dollar",
  "SEK - Swedish Krona",
  "NOK - Norwegian Krone",
  "DKK - Danish Krone",
  "PLN - Polish Zloty",
  "ZAR - South African Rand",
  "BRL - Brazilian Real",
  "MXN - Mexican Peso",
  "KRW - South Korean Won",
  "TRY - Turkish Lira",
  "RUB - Russian Ruble",
  "AED - UAE Dirham",
  "SAR - Saudi Riyal",
  "THB - Thai Baht",
  "MYR - Malaysian Ringgit",
  "IDR - Indonesian Rupiah",
  "PHP - Philippine Peso",
  "VND - Vietnamese Dong",
  "ILS - Israeli Shekel",
  "CLP - Chilean Peso",
  "ARS - Argentine Peso",
  "COP - Colombian Peso",
  "PEN - Peruvian Sol",
  "EGP - Egyptian Pound",
  "PKR - Pakistani Rupee",
  "BDT - Bangladeshi Taka",
  "LKR - Sri Lankan Rupee",
  "NPR - Nepalese Rupee",
  "MMK - Myanmar Kyat",
  "KHR - Cambodian Riel",
  "LAK - Lao Kip",
  "BND - Brunei Dollar",
  "FJD - Fijian Dollar",
  "PGK - Papua New Guinean Kina",
  "SBD - Solomon Islands Dollar",
  "VUV - Vanuatu Vatu",
  "WST - Samoan Tala",
  "XPF - CFP Franc",
  "NZD - New Zealand Dollar",
  "AUD - Australian Dollar",
  "TWD - Taiwan Dollar",
  "HUF - Hungarian Forint",
  "CZK - Czech Koruna",
  "RON - Romanian Leu",
  "BGN - Bulgarian Lev",
  "HRK - Croatian Kuna",
  "RSD - Serbian Dinar",
  "BAM - Bosnia-Herzegovina Convertible Mark",
  "MKD - Macedonian Denar",
  "ALL - Albanian Lek",
  "ISK - Icelandic Krona",
  "UAH - Ukrainian Hryvnia",
  "BYN - Belarusian Ruble",
  "MDL - Moldovan Leu",
  "GEL - Georgian Lari",
  "AMD - Armenian Dram",
  "AZN - Azerbaijani Manat",
  "KZT - Kazakhstani Tenge",
  "KGS - Kyrgyzstani Som",
  "TJS - Tajikistani Somoni",
  "TMT - Turkmenistani Manat",
  "UZS - Uzbekistani Som",
  "MNT - Mongolian Tugrik",
  "AFN - Afghan Afghani",
  "IRR - Iranian Rial",
  "IQD - Iraqi Dinar",
  "JOD - Jordanian Dinar",
  "LBP - Lebanese Pound",
  "SYP - Syrian Pound",
  "YER - Yemeni Rial",
  "OMR - Omani Rial",
  "KWD - Kuwaiti Dinar",
  "BHD - Bahraini Dinar",
  "QAR - Qatari Riyal",
  "NGN - Nigerian Naira",
  "KES - Kenyan Shilling",
  "UGX - Ugandan Shilling",
  "TZS - Tanzanian Shilling",
  "ETB - Ethiopian Birr",
  "GHS - Ghanaian Cedi",
  "XOF - West African CFA Franc",
  "XAF - Central African CFA Franc",
  "ZMW - Zambian Kwacha",
  "MWK - Malawian Kwacha",
  "MZN - Mozambican Metical",
  "AOA - Angolan Kwanza",
  "MAD - Moroccan Dirham",
  "TND - Tunisian Dinar",
  "DZD - Algerian Dinar",
  "LYD - Libyan Dinar",
  "SDG - Sudanese Pound",
  "SSP - South Sudanese Pound",
  "ERN - Eritrean Nakfa",
  "DJF - Djiboutian Franc",
  "SOS - Somali Shilling",
  "MUR - Mauritian Rupee",
  "SCR - Seychellois Rupee",
  "KMF - Comorian Franc",
  "MGA - Malagasy Ariary",
  "BWP - Botswanan Pula",
  "SZL - Swazi Lilangeni",
  "LSL - Lesotho Loti",
  "NAD - Namibian Dollar",
  "ZWL - Zimbabwean Dollar",
  "BIF - Burundian Franc",
  "RWF - Rwandan Franc",
];

// Payment Terms List
const PAYMENT_TERMS = [
  "Due on Receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Due end of the month",
  "Due end of next month",
];

// TDS Options List
const TDS_OPTIONS = [
  "Commission or Brokerage [5%]",
  "Commission or Brokerage (Reduced) [3.75%]",
  "Dividend [10%]",
  "Dividend (Reduced) [7.5%]",
  "Other Interest than securities [10%]",
  "Other Interest than securities (Reduced) [7.5%]",
  "Payment of contractors for Others [2%]",
  "Payment of contractors for Others (Reduced) [1.5%]",
  "Payment of contractors HUF/Indiv [1%]",
  "Payment of contractors HUF/Indiv (Reduced) [0.75%]",
  "Professional Fees [10%]",
  "Professional Fees (Reduced) [7.5%]",
  "Rent on land or furniture etc [10%]",
  "Rent on land or furniture etc (Reduced) [7.5%]",
  "Technical Fees (2%) [2%]",
];

// GST Treatment Dropdown Component
const GSTTreatmentDropdown = ({ value, onChange, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (value) {
      const treatment = GST_TREATMENT_OPTIONS.find((t) => t.id === value);
      setSelectedTreatment(treatment);
    } else {
      setSelectedTreatment(null);
    }
  }, [value]);

  /** ⭐ Position Calculator */
  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  /** ⭐ Handle Open */
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  /** Close on outside click */
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /** Re-align dropdown on render */
  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  /** Follow scroll + resize */
  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredOptions = GST_TREATMENT_OPTIONS.filter((option) =>
    option.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTreatment = (treatmentId) => {
    onChange(treatmentId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearTreatment = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedTreatment(null);
  };

  /** ⭐ Final Dropdown UI */
  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div className="rounded shadow-sm bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: Math.max(dropdownPos.width, 280), maxWidth: '90vw' }}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-7 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        
        {/* Options List */}
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f5f5f5' }}>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#64748b]">
              No options found
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedTreatment?.id === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => handleSelectTreatment(option.id)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "hover:bg-[#f8fafc] text-[#1f2937]"
                  }`}
                >
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                    {option.title}
                  </div>
                  <div className={`text-xs mt-1 leading-tight ${isSelected ? "text-white/90" : "text-[#64748b]"}`}>
                    {option.description}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">GST Treatment</span>
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-base text-[#1f2937] cursor-pointer flex items-center justify-between focus-within:border-[#4285f4] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!selectedTreatment ? "text-[#94a3b8]" : ""}`}>
                {selectedTreatment ? selectedTreatment.title : "Select a GST treatment"}
              </span>
              {selectedTreatment && (
                <button
                  onClick={handleClearTreatment}
                  className="no-blue-button text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded hover:bg-[#f1f5f9] shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>

      {/* Portal */}
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// State Dropdown Component (Source of Supply)
const StateDropdown = ({ value, onChange, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (value) {
      setSelectedState(value);
    } else {
      setSelectedState(null);
    }
  }, [value]);

  /** ⭐ Position Calculator */
  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  /** ⭐ Handle Open */
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  /** Close on outside click */
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /** Re-align dropdown on render */
  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  /** Follow scroll + resize */
  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredStates = INDIAN_STATES.filter((state) =>
    state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectState = (state) => {
    onChange(state);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearState = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedState(null);
  };

  /** ⭐ Final Dropdown UI */
  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div className="rounded shadow-sm bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: Math.max(dropdownPos.width, 280), maxWidth: '90vw' }}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-7 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        
        {/* Options List */}
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f5f5f5' }}>
          {filteredStates.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#64748b]">
              No states found
            </div>
          ) : (
            filteredStates.map((state) => {
              const isSelected = selectedState === state;
              return (
                <div
                  key={state}
                  onClick={() => handleSelectState(state)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "hover:bg-[#f8fafc] text-[#1f2937]"
                  }`}
                >
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                    {state}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">Source of Supply</span>
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-base text-[#1f2937] cursor-pointer flex items-center justify-between focus-within:border-[#4285f4] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!selectedState ? "text-[#94a3b8]" : ""}`}>
                {selectedState || "Please select"}
              </span>
              {selectedState && (
                <button
                  onClick={handleClearState}
                  className="no-blue-button text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded hover:bg-[#f1f5f9] shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>

      {/* Portal */}
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// Currency Dropdown Component
const CurrencyDropdown = ({ value, onChange, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (value) {
      setSelectedCurrency(value);
    } else {
      setSelectedCurrency(null);
    }
  }, [value]);

  /** ⭐ Position Calculator */
  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  /** ⭐ Handle Open */
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  /** Close on outside click */
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /** Re-align dropdown on render */
  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  /** Follow scroll + resize */
  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredCurrencies = WORLD_CURRENCIES.filter((currency) =>
    currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCurrency = (currency) => {
    onChange(currency);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearCurrency = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedCurrency(null);
  };

  /** ⭐ Final Dropdown UI */
  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div className="rounded shadow-sm bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: Math.max(dropdownPos.width, 280), maxWidth: '90vw' }}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-7 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        
        {/* Options List */}
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f5f5f5' }}>
          {filteredCurrencies.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#64748b]">
              No currencies found
            </div>
          ) : (
            filteredCurrencies.map((currency) => {
              const isSelected = selectedCurrency === currency;
              return (
                <div
                  key={currency}
                  onClick={() => handleSelectCurrency(currency)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "hover:bg-[#f8fafc] text-[#1f2937]"
                  }`}
                >
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                    {currency}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">Currency</span>
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-base text-[#1f2937] cursor-pointer flex items-center justify-between focus-within:border-[#4285f4] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!selectedCurrency ? "text-[#94a3b8]" : ""}`}>
                {selectedCurrency || "Please select"}
              </span>
              {selectedCurrency && (
                <button
                  onClick={handleClearCurrency}
                  className="no-blue-button text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded hover:bg-[#f1f5f9] shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>

      {/* Portal */}
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// Payment Terms Dropdown Component
const PaymentTermsDropdown = ({ value, onChange, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (value) {
      setSelectedTerm(value);
    } else {
      setSelectedTerm(null);
    }
  }, [value]);

  /** ⭐ Position Calculator */
  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  /** ⭐ Handle Open */
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  /** Close on outside click */
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /** Re-align dropdown on render */
  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  /** Follow scroll + resize */
  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredTerms = PAYMENT_TERMS.filter((term) =>
    term.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTerm = (term) => {
    onChange(term);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearTerm = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedTerm(null);
  };

  /** ⭐ Final Dropdown UI */
  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div className="rounded shadow-sm bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: Math.max(dropdownPos.width, 280), maxWidth: '90vw' }}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-7 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        
        {/* Options List */}
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ 
          scrollbarWidth: 'thin', 
          scrollbarColor: '#cbd5e1 #f5f5f5'
        }}>
          {filteredTerms.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#64748b]">
              No payment terms found
            </div>
          ) : (
            filteredTerms.map((term) => {
              const isSelected = selectedTerm === term;
              return (
                <div
                  key={term}
                  onClick={() => handleSelectTerm(term)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "hover:bg-[#f8fafc] text-[#1f2937]"
                  }`}
                >
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                    {term}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">Payment Terms</span>
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-base text-[#1f2937] cursor-pointer flex items-center justify-between focus-within:border-[#4285f4] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!selectedTerm ? "text-[#94a3b8]" : ""}`}>
                {selectedTerm || "Please select"}
              </span>
              {selectedTerm && (
                <button
                  onClick={handleClearTerm}
                  className="no-blue-button text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded hover:bg-[#f1f5f9] shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>

      {/* Portal */}
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// TDS Dropdown Component
const TDSDropdown = ({ value, onChange, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTDS, setSelectedTDS] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (value) {
      setSelectedTDS(value);
    } else {
      setSelectedTDS(null);
    }
  }, [value]);

  /** ⭐ Position Calculator */
  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  /** ⭐ Handle Open */
  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  /** Close on outside click */
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /** Re-align dropdown on render */
  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  /** Follow scroll + resize */
  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredTDS = TDS_OPTIONS.filter((tds) =>
    tds.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTDS = (tds) => {
    onChange(tds);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearTDS = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedTDS(null);
  };

  /** ⭐ Final Dropdown UI */
  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div className="rounded shadow-sm bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: Math.max(dropdownPos.width, 280), maxWidth: '90vw' }}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-7 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        
        {/* Options List */}
        <div 
          className="overflow-y-auto overflow-x-hidden" 
          style={{ 
            maxHeight: '200px',
            scrollbarWidth: 'thin', 
            scrollbarColor: '#cbd5e1 #f5f5f5',
            overflowY: 'scroll'
          }}
        >
          {filteredTDS.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#64748b]">
              No TDS options found
            </div>
          ) : (
            <div className="py-1">
              {filteredTDS.map((tds) => {
                const isSelected = selectedTDS === tds;
                return (
                  <div
                    key={tds}
                    onClick={() => handleSelectTDS(tds)}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#2563eb] text-white"
                        : "hover:bg-[#f8fafc] text-[#1f2937]"
                    }`}
                  >
                    <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                      {tds}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">TDS</span>
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-base text-[#1f2937] cursor-pointer flex items-center justify-between focus-within:border-[#4285f4] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!selectedTDS ? "text-[#94a3b8]" : ""}`}>
                {selectedTDS || "Please select"}
              </span>
              {selectedTDS && (
                <button
                  onClick={handleClearTDS}
                  className="no-blue-button text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded hover:bg-[#f1f5f9] shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>

      {/* Portal */}
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// Country Dropdown Component (for Address section)
const CountryDropdown = ({ value, onChange, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (value) {
      setSelectedCountry(value);
    } else {
      setSelectedCountry(null);
    }
  }, [value]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredCountries = ALL_COUNTRIES.filter((country) =>
    country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCountry = (country) => {
    onChange(country);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearCountry = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedCountry(null);
  };

  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div className="rounded shadow-sm bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: Math.max(dropdownPos.width, 280), maxWidth: '90vw' }}>
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-7 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f5f5f5' }}>
          {filteredCountries.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#64748b]">
              No countries found
            </div>
          ) : (
            filteredCountries.map((country) => {
              const isSelected = selectedCountry === country;
              return (
                <div
                  key={country}
                  onClick={() => handleSelectCountry(country)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "hover:bg-[#f8fafc] text-[#1f2937]"
                  }`}
                >
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                    {country}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">Country/Region</span>
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-base text-[#1f2937] cursor-pointer flex items-center justify-between focus-within:border-[#4285f4] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!selectedCountry ? "text-[#94a3b8]" : ""}`}>
                {selectedCountry || "Select"}
              </span>
              {selectedCountry && (
                <button
                  onClick={handleClearCountry}
                  className="no-blue-button text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded hover:bg-[#f1f5f9] shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

// Address State Dropdown Component
const AddressStateDropdown = ({ value, onChange, ...props }) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (value) {
      setSelectedState(value);
    } else {
      setSelectedState(null);
    }
  }, [value]);

  const updatePos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!isOpen) updatePos();
    setIsOpen((p) => !p);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setTimeout(updatePos, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const follow = () => updatePos();
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [isOpen]);

  const filteredStates = INDIAN_STATES.filter((state) =>
    state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectState = (state) => {
    onChange(state);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearState = (e) => {
    e.stopPropagation();
    onChange("");
    setSelectedState(null);
  };

  const dropdownPortal = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 999999,
      }}
    >
      <div className="rounded shadow-sm bg-white border border-[#d7dcf5] overflow-hidden" style={{ width: Math.max(dropdownPos.width, 280), maxWidth: '90vw' }}>
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-2 bg-[#fafbff]">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="h-7 w-full border-none bg-transparent text-sm text-[#1f2937] outline-none placeholder:text-[#94a3b8]"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f5f5f5' }}>
          {filteredStates.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#64748b]">
              No states found
            </div>
          ) : (
            filteredStates.map((state) => {
              const isSelected = selectedState === state;
              return (
                <div
                  key={state}
                  onClick={() => handleSelectState(state)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#2563eb] text-white"
                      : "hover:bg-[#f8fafc] text-[#1f2937]"
                  }`}
                >
                  <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-white" : "text-[#1f2937]"}`}>
                    {state}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">State</span>
        <div className="relative w-full overflow-visible m-0 p-0">
          <div
            ref={buttonRef}
            onClick={toggleDropdown}
            className="w-full rounded-lg border border-[#d7dcf5] bg-white px-3 py-2.5 text-base text-[#1f2937] cursor-pointer flex items-center justify-between focus-within:border-[#4285f4] transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`truncate ${!selectedState ? "text-[#94a3b8]" : ""}`}>
                {selectedState || "Select or type to add"}
              </span>
              {selectedState && (
                <button
                  onClick={handleClearState}
                  className="no-blue-button text-[#64748b] hover:text-[#1f2937] transition-colors inline-flex items-center justify-center bg-transparent border-none p-0.5 rounded hover:bg-[#f1f5f9] shrink-0 m-0"
                  type="button"
                  title="Clear selection"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-[#64748b] transition-transform shrink-0 ml-1.5 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </div>
        </div>
      </label>
      {typeof document !== "undefined" && document.body && createPortal(dropdownPortal, document.body)}
    </>
  );
};

const PurchaseVendorCreate = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("Other Details");
  
  // Refs for scrolling to sections
  const contactsRef = useRef(null);
  const bankRef = useRef(null);
  const shippingRef = useRef(null);
  
  // Primary Contact
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [vendorLanguage, setVendorLanguage] = useState("");
  
  // Other Details
  const [contacts, setContacts] = useState([{ id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "" }]);
  const [gstTreatment, setGstTreatment] = useState("");
  const [sourceOfSupply, setSourceOfSupply] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [currency, setCurrency] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [tds, setTds] = useState("");
  const [enablePortal, setEnablePortal] = useState(false);
  
  // Address
  const [billingAttention, setBillingAttention] = useState("");
  const [billingCountry, setBillingCountry] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPinCode, setBillingPinCode] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingFax, setBillingFax] = useState("");
  
  const [shippingAttention, setShippingAttention] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingAddress2, setShippingAddress2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPinCode, setShippingPinCode] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingFax, setShippingFax] = useState("");
  
  // Bank Details
  const [bankAccounts, setBankAccounts] = useState([{ accountHolderName: "", bankName: "", accountNumber: "", reAccountNumber: "", ifsc: "" }]);

  // Remarks
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  
  // Load vendor data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadVendor = async () => {
        try {
          setLoading(true);
          const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
          const response = await fetch(`${API_URL}/api/purchase/vendors/${id}`);
          
          if (!response.ok) {
            throw new Error("Failed to load vendor");
          }
          
          const vendorData = await response.json();
          
          // Populate form fields with vendor data
          setSalutation(vendorData.salutation || "");
          setFirstName(vendorData.firstName || "");
          setLastName(vendorData.lastName || "");
          setCompanyName(vendorData.companyName || "");
          setDisplayName(vendorData.displayName || "");
          setEmail(vendorData.email || "");
          setPhone(vendorData.phone || "");
          setMobile(vendorData.mobile || "");
          setVendorLanguage(vendorData.vendorLanguage || "");
          setGstTreatment(vendorData.gstTreatment || "");
          setSourceOfSupply(vendorData.sourceOfSupply || "");
          setPan(vendorData.pan || "");
          setGstin(vendorData.gstin || "");
          setCurrency(vendorData.currency || "INR");
          setPaymentTerms(vendorData.paymentTerms || "");
          setTds(vendorData.tds || "");
          setEnablePortal(vendorData.enablePortal || false);
          setContacts(vendorData.contacts && vendorData.contacts.length > 0 
            ? vendorData.contacts.map((c, idx) => ({ ...c, id: c.id || Date.now() + idx }))
            : [{ id: Date.now(), salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "" }]
          );
          setBillingAttention(vendorData.billingAttention || "");
          setBillingAddress(vendorData.billingAddress || "");
          setBillingAddress2(vendorData.billingAddress2 || "");
          setBillingCity(vendorData.billingCity || "");
          setBillingState(vendorData.billingState || "");
          setBillingPinCode(vendorData.billingPinCode || "");
          setBillingCountry(vendorData.billingCountry || "");
          setBillingPhone(vendorData.billingPhone || "");
          setBillingFax(vendorData.billingFax || "");
          setShippingAttention(vendorData.shippingAttention || "");
          setShippingAddress(vendorData.shippingAddress || "");
          setShippingAddress2(vendorData.shippingAddress2 || "");
          setShippingCity(vendorData.shippingCity || "");
          setShippingState(vendorData.shippingState || "");
          setShippingPinCode(vendorData.shippingPinCode || "");
          setShippingCountry(vendorData.shippingCountry || "");
          setShippingPhone(vendorData.shippingPhone || "");
          setShippingFax(vendorData.shippingFax || "");
          setBankAccounts(vendorData.bankAccounts && vendorData.bankAccounts.length > 0
            ? vendorData.bankAccounts
            : [{ accountHolderName: "", bankName: "", accountNumber: "", reAccountNumber: "", ifsc: "" }]
          );
          setRemarks(vendorData.remarks || "");
        } catch (error) {
          console.error("Error loading vendor:", error);
          alert("Failed to load vendor. Redirecting...");
          navigate("/purchase/vendors");
        } finally {
          setLoading(false);
        }
      };
      
      loadVendor();
    }
  }, [id, isEditMode, navigate]);
  
  // Scroll to section based on URL parameter
  useEffect(() => {
    if (!loading) {
      const section = searchParams.get('section');
      if (section) {
        setTimeout(() => {
          if (section === 'contacts') {
            setActiveTab('Contact Persons');
            contactsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (section === 'bank') {
            setActiveTab('Bank Details');
            bankRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (section === 'shipping') {
            setActiveTab('Address');
            shippingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300); // Small delay to ensure tab content is rendered
      }
    }
  }, [loading, searchParams]);
  
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Get user info
      const userStr = localStorage.getItem("rootfinuser");
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?._id || user?.id || user?.email || user?.locCode || null;
      const locCode = user?.locCode || "";
      
      if (!userId) {
        alert("User not logged in. Please log in to save vendors.");
        setSaving(false);
        return;
      }
      
      // Create vendor object
      const vendorData = {
        salutation,
        firstName,
        lastName,
        companyName,
        displayName: displayName || companyName || `${firstName} ${lastName}`,
        email,
        phone,
        mobile,
        vendorLanguage,
        gstTreatment,
        sourceOfSupply,
        pan,
        gstin,
        currency: currency || "INR",
        paymentTerms,
        tds,
        enablePortal,
        contacts: contacts.filter(c => c.firstName || c.lastName || c.email),
        billingAddress: billingAddress || "",
        billingAddress2,
        billingCity,
        billingState,
        billingPinCode,
        billingCountry,
        billingPhone,
        billingFax,
        billingAttention,
        shippingAddress: shippingAddress || "",
        shippingAddress2,
        shippingCity,
        shippingState,
        shippingPinCode,
        shippingCountry,
        shippingPhone,
        shippingFax,
        shippingAttention,
        bankAccounts: bankAccounts.filter(bank => bank.accountHolderName || bank.bankName || bank.accountNumber || bank.ifsc),
        remarks,
        attachments: attachments.map(att => {
          // Extract base64 data - handle both data URL format and plain base64
          let base64Data = att.base64 || att;
          if (typeof base64Data === "string" && base64Data.startsWith("data:")) {
            // Extract the base64 part from data URL (after the comma)
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          return {
            filename: att.name || "attachment",
            contentType: att.type || "application/octet-stream",
            data: base64Data,
          };
        }),
        payables: 0,
        credits: 0,
        itemsToReceive: 0,
        totalItemsOrdered: 0,
        userId,
        locCode,
      };
      
      // Save to PostgreSQL (or MongoDB if not migrated)
      const API_URL = baseUrl?.baseUrl?.replace(/\/$/, "") || "http://localhost:7000";
      const url = isEditMode 
        ? `${API_URL}/api/purchase/vendors/${id}`
        : `${API_URL}/api/purchase/vendors`;
      
      const response = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vendorData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditMode ? 'update' : 'save'} vendor`);
      }
      
      const savedVendor = await response.json();
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event("vendorSaved"));
      
      setSaving(false);
      navigate(`/purchase/vendors/${savedVendor.id || savedVendor._id || id}`);
    } catch (error) {
      console.error("Error saving vendor:", error);
      alert(error.message || "Failed to save vendor. Please try again.");
      setSaving(false);
    }
  };

  // Enter key to save vendor
  useEnterToSave((e) => {
    const syntheticEvent = e || { preventDefault: () => {} };
    save(syntheticEvent);
  }, saving);

  if (loading) {
    return (
      <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
        <div className="text-center py-12">Loading vendor data...</div>
      </div>
    );
  }

  return (
    <div className="ml-64 min-h-screen bg-[#f5f7fb] p-6">
      <Head
        title={isEditMode ? "Edit Vendor" : "New Vendor"}
        description=""
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={isEditMode ? `/purchase/vendors/${id}` : "/purchase/vendors"}
              className="rounded-md border border-[#d7dcf5] px-5 py-2 text-base font-medium text-[#475569] transition hover:bg-white"
            >
              Back
            </Link>
          </div>
        }
      />

      <form onSubmit={save} className="space-y-6">
        <div className="rounded-3xl border border-[#e1e5f5] bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.25)]">
          <div className="px-8 py-8">
            {/* Primary details */}
            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Primary Contact" value={salutation} onChange={(e) => setSalutation(e.target.value)}>
                <option value="">Salutation</option>
                <option value="Mr">Mr</option>
                <option value="Ms">Ms</option>
                <option value="Mrs">Mrs</option>
                <option value="Dr">Dr</option>
              </Select>
              <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              <Input label="Display Name" placeholder="Select or type to add" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </div>
              <Select label="Vendor Language" value={vendorLanguage} onChange={(e) => setVendorLanguage(e.target.value)}>
                <option value="">Select</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Malayalam">Malayalam</option>
              </Select>
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b border-[#e7ebf8]">
              <div className="flex flex-wrap gap-6 text-base">
                {TABS.map((tab) => (
                  <span
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`cursor-pointer select-none px-1 pb-2 transition ${
                      activeTab === tab
                        ? "border-b-2 border-[#2563eb] font-medium text-[#2563eb]"
                        : "text-[#64748b] hover:text-[#1f2937]"
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "Other Details" && (
              <div className="mt-6 grid gap-5 md:grid-cols-[280px_1fr]">
                <div className="space-y-5">
                  {gstTreatment && gstTreatment !== "unregistered" ? (
                    <div className="grid gap-5 md:grid-cols-[280px_1fr]">
                      <GSTTreatmentDropdown
                        value={gstTreatment}
                        onChange={(value) => setGstTreatment(value)}
                      />
                      <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
                        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                          GSTIN / UIN
                          <span className="text-red-500 ml-1">*</span>
                          <Info size={14} className="inline-block ml-1.5 text-[#4285f4] cursor-help" title="UIN" />
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-[#d7dcf5] focus-within:border-[#4285f4] flex-1 min-w-0">
                            <input
                              type="text"
                              value={gstin}
                              onChange={(e) => setGstin(e.target.value)}
                              className="w-full rounded-lg px-4 py-3 text-base text-[#1f2937] placeholder:text-[#94a3b8] focus:outline-none min-w-[300px]"
                              placeholder="Enter GSTIN / UIN"
                            />
                          </div>
                          <button
                            type="button"
                            className="text-sm font-medium text-[#2563eb] hover:underline whitespace-nowrap px-3 py-2"
                          >
                            Get Taxpayer details
                          </button>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <GSTTreatmentDropdown
                      value={gstTreatment}
                      onChange={(value) => setGstTreatment(value)}
                    />
                  )}
                  <StateDropdown
                    value={sourceOfSupply}
                    onChange={(value) => setSourceOfSupply(value)}
                  />
                  <Input label="PAN" value={pan} onChange={(e) => setPan(e.target.value)} />
                  {(!gstTreatment || gstTreatment === "unregistered") && (
                    <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} />
                  )}
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-[#1f2937]">
                    <input type="checkbox" className="h-4 w-4 rounded border-[#cbd5f5] text-[#2563eb] focus:ring-[#2563eb]" />
                    This vendor is MSME registered
                  </label>
                  <CurrencyDropdown
                    value={currency}
                    onChange={(value) => setCurrency(value)}
                  />
                  <PaymentTermsDropdown
                    value={paymentTerms}
                    onChange={(value) => setPaymentTerms(value)}
                  />
                  <TDSDropdown
                    value={tds}
                    onChange={(value) => setTds(value)}
                  />
                  
                  {/* Documents UI - Small Box */}
                  <div className="rounded-lg border border-dashed border-[#d7dcf5] bg-[#f8f9ff] p-4">
                    <p className="text-sm font-medium text-[#475569] mb-3">Documents</p>
                    <ImageUpload
                      onImagesSelect={(files) => setAttachments(files)}
                      existingImages={attachments}
                      onRemoveImage={(index) => {
                        setAttachments(attachments.filter((_, i) => i !== index));
                      }}
                      multiple={true}
                    />
                    <p className="text-xs text-[#94a3b8] mt-2">Max 15 files, 5MB each</p>
                  </div>
                  
                  <label className="inline-flex items-center gap-2 text-sm text-[#1f2937]">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-[#cbd5f5] text-[#2563eb] focus:ring-[#2563eb]"
                      checked={enablePortal}
                      onChange={(e) => setEnablePortal(e.target.checked)}
                    />
                    Enable Portal?
                  </label>
                </div>
              </div>
            )}

            {activeTab === "Address" && (
              <div className="mt-6 grid gap-8 md:grid-cols-2">
                {/* Billing Address */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-[#1f2937]">Billing Address</h4>
                  <div className="space-y-3">
                    <Input label="Attention" value={billingAttention} onChange={(e) => setBillingAttention(e.target.value)} />
                    <CountryDropdown
                      value={billingCountry}
                      onChange={(value) => setBillingCountry(value)}
                    />
                    <Input label="Address" placeholder="Street 1" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
                    <Input label="" placeholder="Street 2" value={billingAddress2} onChange={(e) => setBillingAddress2(e.target.value)} />
                    <Input label="City" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
                    <AddressStateDropdown
                      value={billingState}
                      onChange={(value) => setBillingState(value)}
                    />
                    <Input label="Pin Code" value={billingPinCode} onChange={(e) => setBillingPinCode(e.target.value)} />
                    <Input label="Phone" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} />
                    <Input label="Fax Number" value={billingFax} onChange={(e) => setBillingFax(e.target.value)} />
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#1f2937]">Shipping Address</h4>
                    <button 
                      type="button" 
                      className="text-xs font-medium text-[#2563eb] hover:underline"
                      onClick={() => {
                        setShippingAttention(billingAttention);
                        setShippingCountry(billingCountry);
                        setShippingAddress(billingAddress);
                        setShippingAddress2(billingAddress2);
                        setShippingCity(billingCity);
                        setShippingState(billingState);
                        setShippingPinCode(billingPinCode);
                        setShippingPhone(billingPhone);
                        setShippingFax(billingFax);
                      }}
                    >
                      Copy billing address
                    </button>
                  </div>
                  <div className="space-y-3">
                    <Input label="Attention" value={shippingAttention} onChange={(e) => setShippingAttention(e.target.value)} />
                    <CountryDropdown
                      value={shippingCountry}
                      onChange={(value) => setShippingCountry(value)}
                    />
                    <Input label="Address" placeholder="Street 1" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
                    <Input label="" placeholder="Street 2" value={shippingAddress2} onChange={(e) => setShippingAddress2(e.target.value)} />
                    <Input label="City" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
                    <AddressStateDropdown
                      value={shippingState}
                      onChange={(value) => setShippingState(value)}
                    />
                    <Input label="Pin Code" value={shippingPinCode} onChange={(e) => setShippingPinCode(e.target.value)} />
                    <Input label="Phone" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} />
                    <Input label="Fax Number" value={shippingFax} onChange={(e) => setShippingFax(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Contact Persons" && (
              <div ref={contactsRef} className="mt-6">
                <div className="overflow-x-auto rounded-xl border border-[#e6eafb]">
                  <table className="min-w-full divide-y divide-[#e6eafb]">
                    <thead className="bg-[#f5f6ff]">
                      <tr className="text-left text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                        <th className="px-4 py-2">Salutation</th>
                        <th className="px-4 py-2">First Name</th>
                        <th className="px-4 py-2">Last Name</th>
                        <th className="px-4 py-2">Email Address</th>
                        <th className="px-4 py-2">Work Phone</th>
                        <th className="px-4 py-2">Mobile</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef2ff] text-base">
                      {contacts.map((c, idx) => (
                        <tr key={c.id}>
                          <td className="px-4 py-2">
                            <select 
                              className="w-full rounded-md border border-[#d7dcf5] px-3 py-2 text-base"
                              value={c.salutation}
                              onChange={(e) => {
                                const updated = [...contacts];
                                updated[idx].salutation = e.target.value;
                                setContacts(updated);
                              }}
                            >
                              <option value=""></option>
                              <option value="Mr">Mr</option>
                              <option value="Ms">Ms</option>
                              <option value="Mrs">Mrs</option>
                              <option value="Dr">Dr</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              className="w-full rounded-md border border-[#d7dcf5] px-3 py-2 text-base"
                              value={c.firstName}
                              onChange={(e) => {
                                const updated = [...contacts];
                                updated[idx].firstName = e.target.value;
                                setContacts(updated);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              className="w-full rounded-md border border-[#d7dcf5] px-3 py-2 text-base"
                              value={c.lastName}
                              onChange={(e) => {
                                const updated = [...contacts];
                                updated[idx].lastName = e.target.value;
                                setContacts(updated);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              className="w-full rounded-md border border-[#d7dcf5] px-3 py-2 text-base"
                              type="email"
                              value={c.email}
                              onChange={(e) => {
                                const updated = [...contacts];
                                updated[idx].email = e.target.value;
                                setContacts(updated);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              className="w-full rounded-md border border-[#d7dcf5] px-3 py-2 text-base"
                              value={c.workPhone}
                              onChange={(e) => {
                                const updated = [...contacts];
                                updated[idx].workPhone = e.target.value;
                                setContacts(updated);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              className="w-full rounded-md border border-[#d7dcf5] px-3 py-2 text-base"
                              value={c.mobile}
                              onChange={(e) => {
                                const updated = [...contacts];
                                updated[idx].mobile = e.target.value;
                                setContacts(updated);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              className="text-sm font-medium text-[#ef4444]"
                              onClick={() => setContacts((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => setContacts((prev) => [...prev, { id: Date.now() }])}
                  className="mt-3 text-base font-medium text-[#2563eb] hover:underline"
                >
                  + Add Contact Person
                </button>
              </div>
            )}

            {activeTab === "Bank Details" && (
              <div ref={bankRef} className="mt-6 max-w-xl space-y-6">
                {bankAccounts.map((bank, idx) => (
                  <div key={idx} className="border border-[#e6eafb] rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-[#1f2937]">Bank Account {idx + 1}</h4>
                      {bankAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBankAccounts(bankAccounts.filter((_, i) => i !== idx))}
                          className="text-sm font-medium text-[#ef4444] hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                      <Input
                        label="Account Holder Name"
                        value={bank.accountHolderName || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], accountHolderName: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="Bank Name"
                        value={bank.bankName || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], bankName: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="Account Number*"
                        value={bank.accountNumber || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], accountNumber: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="Re-enter Account Number*"
                        value={bank.reAccountNumber || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], reAccountNumber: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                      <Input
                        label="IFSC*"
                        value={bank.ifsc || ""}
                        onChange={(e) => {
                          const updated = [...bankAccounts];
                          updated[idx] = { ...updated[idx], ifsc: e.target.value };
                          setBankAccounts(updated);
                        }}
                      />
                    </div>
                  ))}
                <button
                  type="button"
                  onClick={() => setBankAccounts([...bankAccounts, { accountHolderName: "", bankName: "", accountNumber: "", reAccountNumber: "", ifsc: "" }])}
                  className="text-base font-medium text-[#2563eb] hover:underline"
                >
                  + Add New Bank
                </button>
              </div>
            )}

            {activeTab === "Custom Fields" && (
              <div className="mt-6 text-base text-[#64748b]">No custom fields configured.</div>
            )}
            {activeTab === "Reporting Tags" && (
              <div className="mt-6 text-base text-[#64748b]">No reporting tags configured.</div>
            )}
            {activeTab === "Remarks" && (
              <div className="mt-6 max-w-3xl">
                <label className="flex w-full flex-col gap-1 text-base text-[#475569]">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                    Remarks (For Internal Use)
                  </span>
                  <textarea className="min-h-[120px] rounded-lg border border-[#d7dcf5] px-3 py-2.5 text-base text-[#1f2937] focus:border-[#4285f4] focus:outline-none" />
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#e7ebf8] px-8 py-4">
            <Link
              to={isEditMode ? `/purchase/vendors/${id}` : "/purchase/vendors"}
              className="rounded-md border border-[#d7dcf5] px-5 py-2 text-base font-medium text-[#475569] transition hover:bg-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#3762f9] px-5 py-2 text-base font-semibold text-white transition hover:bg-[#2748c9] disabled:opacity-60"
            >
              {saving ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update" : "Save")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PurchaseVendorCreate;


