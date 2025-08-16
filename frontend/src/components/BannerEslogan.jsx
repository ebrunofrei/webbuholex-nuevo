import React from "react";
import { motion } from "framer-motion";

export default function BannerEslogan() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
      style={{
        background: "#fff7e6",
        border: "1.5px solid #a46a32",
        color: "#a46a32",
        borderRadius: 12,
        fontWeight: 600,
        fontSize: "1.09rem",
        maxWidth: 520,
        margin: "22px auto 25px auto",
        boxShadow: "0 1px 12px #a46a3222",
        padding: "13px 24px",
        letterSpacing: 0.2,
        textAlign: "center"
      }}
    >
      <span style={{ fontWeight: 700, color: "#a46a32" }}>
        BúhoLex:
      </span>{" "}
      justicia sin privilegios.
      <span style={{ color: "#1e2940", fontWeight: 500 }}>
        {" "}LitisBot te acompaña y te defiende.
      </span>
    </motion.div>
  );
}
