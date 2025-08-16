import React from "react";

const PieDocumentoPreview = ({ logo, slogan, nombre }) => (
  <div
    style={{
      width: 420,
      height: 60,
      margin: "22px auto",
      borderRadius: 7,
      border: "2px solid #e7be5b",
      background: "#fff8e2",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 22px",
      boxShadow: "0 4px 16px #e7be5b22",
    }}
  >
    <img
      src={logo}
      alt="logo"
      style={{
        width: 43,
        height: 43,
        borderRadius: 8,
        border: "1.5px solid #e7be5b",
        background: "#fff",
        objectFit: "contain",
      }}
    />
    <div style={{ flex: 1, marginLeft: 12, marginRight: 12 }}>
      <div
        style={{
          color: "#c09522",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "0.03em",
          lineHeight: 1.1,
          textAlign: "center",
        }}
      >
        {`FIRMADO ELECTRÓNICAMENTE por ${nombre?.toUpperCase()}`}
        <span style={{ color: "#a25423", fontWeight: 400, fontSize: 14 }}>
          {" • "}{slogan || "Oficina Virtual Legal"}
        </span>
      </div>
      <div
        style={{
          color: "#886505",
          fontSize: 11,
          fontWeight: 400,
          textAlign: "center",
          marginTop: 2,
          letterSpacing: "0.01em",
        }}
      >
        Autenticidad validable por QR • {new Date().toLocaleDateString()}
      </div>
    </div>
    <img
      src="/qr_preview.png"
      alt="qr"
      style={{
        width: 34,
        height: 34,
        opacity: 0.8,
        filter: "grayscale(0.3)",
      }}
    />
  </div>
);

export default PieDocumentoPreview;
