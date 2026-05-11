import { startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, subDays } from "date-fns";

export const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "this_week", label: "Semana Atual" },
  { value: "last_week", label: "Semana Anterior" },
  { value: "this_month", label: "Este Mês" },
  { value: "custom", label: "Personalizado" },
];

export const SALES_CRITERIA = [
  { value: "wins", label: "Maior número de vendas" },
  { value: "conversion", label: "Maior Conversão %" },
  { value: "leads", label: "Maior número de leads" },
];

export const COLLECTION_CRITERIA = [
  { value: "payment_rate", label: "Maior taxa de pagamento" },
  { value: "payments", label: "Maior número de pagamentos" },
  { value: "orders", label: "Maior carteira trabalhada" },
  { value: "attempts", label: "Maior número de tentativas" },
  { value: "conversion", label: "Maior conversão %" },
];

// Returns today's date string in SP timezone as "yyyy-MM-dd"
function todaySP() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// Returns a date object at midnight local for a given "yyyy-MM-dd" string
function dateFromStr(str) {
  return new Date(str + "T00:00:00");
}

export function getDateRange(period, customStart, customEnd) {
  const todayStr = todaySP();
  const todayDate = dateFromStr(todayStr);

  if (period === "today") {
    return { start: startOfDay(todayDate), end: endOfDay(todayDate) };
  }
  if (period === "yesterday") {
    const yStr = subDays(todayDate, 1).toLocaleDateString("en-CA");
    const y = dateFromStr(yStr);
    return { start: startOfDay(y), end: endOfDay(y) };
  }
  if (period === "this_week") {
    return { start: startOfWeek(todayDate, { weekStartsOn: 1 }), end: endOfWeek(todayDate, { weekStartsOn: 1 }) };
  }
  if (period === "last_week") {
    const lastWeek = subWeeks(todayDate, 1);
    return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
  }
  if (period === "this_month") {
    const d = dateFromStr(todayStr);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
  if (period === "custom" && customStart && customEnd) {
    return { start: startOfDay(dateFromStr(customStart)), end: endOfDay(dateFromStr(customEnd)) };
  }
  return { start: startOfDay(todayDate), end: endOfDay(todayDate) };
}

export function getCriteriaValue(row, criteria, type) {
  if (type === "sales") {
    if (criteria === "conversion") return `${row.conversion}%`;
    if (criteria === "wins") return `${row.wins} vendas`;
    if (criteria === "leads") return `${row.leads} leads`;
  }
  if (type === "collection") {
    if (criteria === "payment_rate") return `${row.paymentRate}%`;
    if (criteria === "payments") return `${row.payments} pgtos`;
    if (criteria === "orders") return `${row.orders} pedidos`;
    if (criteria === "attempts") return `${row.attempts} tent.`;
    if (criteria === "conversion") return `${row.conversionRate}%`;
  }
  return "—";
}

export function getCriteriaNumeric(row, criteria, type) {
  if (type === "sales") {
    if (criteria === "conversion") return parseFloat(row.conversion);
    if (criteria === "wins") return row.wins;
    if (criteria === "leads") return row.leads;
    if (criteria === "calls") return row.calls;
    if (criteria === "answer_rate") return parseFloat(row.answerRate);
  }
  if (type === "collection") {
    if (criteria === "payment_rate") return parseFloat(row.paymentRate);
    if (criteria === "payments") return row.payments;
    if (criteria === "orders") return row.orders;
    if (criteria === "attempts") return row.attempts;
    if (criteria === "conversion") return parseFloat(row.conversionRate);
  }
  return 0;
}