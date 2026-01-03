// src/features/history/useCases.js
import { useEffect, useState } from "react";
import { fetchCases, fetchCase, createCase } from "./history.api";

export function useCases({ token }) {
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadCases() {
    setLoading(true);
    const { cases } = await fetchCases(token);
    setCases(cases || []);
    setLoading(false);
  }

  async function openCase(caseId) {
    setLoading(true);
    const data = await fetchCase(caseId, token);
    setActiveCase(data.case);
    setMessages(data.messages || []);
    setLoading(false);
  }

  async function newCase(payload = {}) {
    const { case: c } = await createCase(payload, token);
    await loadCases();
    await openCase(c._id);
  }

  useEffect(() => {
    if (token) loadCases();
  }, [token]);

  return {
    cases,
    activeCase,
    messages,
    loading,
    loadCases,
    openCase,
    newCase,
  };
}
