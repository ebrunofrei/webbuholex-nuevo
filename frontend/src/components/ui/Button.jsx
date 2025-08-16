// src/components/ui/Button.jsx

import React from "react";

export default function Button({ children, ...props }) {
  return (
    <button
      className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition"
      {...props}
    >
      {children}
    </button>
  );
}
