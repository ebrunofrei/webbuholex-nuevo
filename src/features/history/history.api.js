// src/features/history/history.api.js
export async function fetchCases(token) {
  const res = await fetch("/api/cases", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo cargar casos");
  return res.json();
}

export async function fetchCase(caseId, token) {
  const res = await fetch(`/api/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("No se pudo cargar el caso");
  return res.json();
}

export async function createCase(data, token) {
  const res = await fetch("/api/cases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("No se pudo crear caso");
  return res.json();
}
