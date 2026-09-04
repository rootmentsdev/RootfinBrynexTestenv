import { useState, useEffect } from "react";

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleSidebarChange = (e) => {
      if (e.detail && typeof e.detail.isOpen === "boolean") {
        setIsOpen(e.detail.isOpen);
      }
    };
    window.addEventListener("sidebar-changed", handleSidebarChange);
    return () => window.removeEventListener("sidebar-changed", handleSidebarChange);
  }, []);

  return isOpen;
}

export default useSidebar;

