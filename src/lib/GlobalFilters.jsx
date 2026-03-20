import React, { createContext, useContext, useState } from "react";
import { startOfDay, startOfYesterday, endOfYesterday, startOfWeek, startOfMonth } from "date-fns";

const Ctx = createContext(null);

export const TIME_OPTIONS = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
];

export function getDateRange(key) {
  const now = new Date();
  switch (key) {
    case "ontem": return { start: startOfYesterday(), end: endOfYesterday() };
    case "semana": return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
    case "mes": return { start: startOfMonth(now), end: now };
    default: return { start: startOfDay(now), end: now };
  }
}

export function GlobalFiltersProvider({ children }) {
  const [timeFilter, setTimeFilter] = useState("hoje");
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <Ctx.Provider value={{ timeFilter, setTimeFilter, searchQuery, setSearchQuery }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGlobalFilters() {
  return useContext(Ctx);
}