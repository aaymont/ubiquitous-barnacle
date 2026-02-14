import React from "react";

const btnStyle: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #2563eb",
  borderRadius: "6px",
  background: "#2563eb",
  color: "#fff",
  fontSize: "0.875rem",
  cursor: "pointer",
  textDecoration: "none",
};

export function OpenInMyGeotabButton({
  label,
  page,
  id,
  gotoPage,
}: {
  label: string;
  page: "user" | "device";
  id: string;
  gotoPage?: (page: string, params?: Record<string, unknown>) => void;
}) {
  const handleClick = () => {
    if (gotoPage) {
      try {
        if (page === "user") {
          gotoPage("user", { id });
        } else {
          gotoPage("device", { id });
        }
      } catch {
        openNativeHash();
      }
    } else {
      openNativeHash();
    }
  };

  function openNativeHash() {
    try {
      if (typeof window !== "undefined" && window.parent && window.parent.location) {
        const hash = page === "device" ? `device,id:${id}` : `user,id:${id}`;
        (window.parent as Window).location.hash = hash;
      }
    } catch {
      // cross-origin; show fallback
    }
  }

  return (
    <button type="button" style={btnStyle} onClick={handleClick} aria-label={label}>
      {label}
    </button>
  );
}
