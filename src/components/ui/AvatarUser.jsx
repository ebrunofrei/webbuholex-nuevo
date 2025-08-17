import React from "react";

export default function AvatarUser({ photoURL, displayName, email, onClick }) {
  const initial = (displayName?.[0] || email?.[0] || "U").toUpperCase();
  return (
    <button
      onClick={onClick}
      aria-label="Mi cuenta"
      className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-400 text-[#b03a1a] font-bold shadow-md hover:ring-2 hover:ring-yellow-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-700"
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt="avatar"
          className="w-10 h-10 rounded-full object-cover border-2 border-white"
        />
      ) : (
        <span className="text-lg select-none">{initial}</span>
      )}
    </button>
  );
}
