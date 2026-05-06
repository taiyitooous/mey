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
  { value: "conversion", label: "Maior Conversão %" },
  { value: "wins", label: "Maior número de vendas" },
  { value: "leads", label: "Maior número de leads" },
  { value: "calls", label: "Maior número de ligações" },
  { value: "answer_rate", label: "Maior taxa de atendimento" },
];

export const COLLECTION_CRITERIA = [
  { value: "payment_rate", label: "Maior taxa de pagamento" },
  { value: "payments", label: "Maior número de pagamentos" },
  { value: "orders", label: "Maior carteira trabalhada" },
  { value: "attempts", label: "Maior número de tentativas" },
  { value: "conversion", label: "Maior conversão %" },
];

export function getDateRange(period, customStart, customEnd) {
  const now = new Date();
  const spNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

  if (period === "today") {
    return { start: startOfDay(spNow), end: endOfDay(spNow) };
  }
  if (period === "yesterday") {
    const yesterday = subDays(spNow, 1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }
  if (period === "this_week") {
    return { start: startOfWeek(spNow, { weekStartsOn: 1 }), end: endOfWeek(spNow, { weekStartsOn: 1 }) };
  }
  if (period === "last_week") {
    const lastWeek = subWeeks(spNow, 1);
    return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
  }
  if (period === "this_month") {
    const start = new Date(spNow.getFullYear(), spNow.getMonth(), 1);
    const end = new Date(spNow.getFullYear(), spNow.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
  if (period === "custom" && customStart && customEnd) {
    return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
  }
  return { start: startOfDay(spNow), end: endOfDay(spNow) };
}

export function getCriteriaValue(row, criteria, type) {
  if (type === "sales") {
    if (criteria === "conversion") return `${row.conversion}%`;
    if (criteria === "wins") return `${row.wins} vendas`;
    if (criteria === "leads") return `${row.leads} leads`;
    if (criteria === "calls") return `${row.calls} lig.`;
    if (criteria === "answer_rate") return `${row.answerRate}%`;
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