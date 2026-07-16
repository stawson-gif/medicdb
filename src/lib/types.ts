export type DocumentType = "journal" | "initial" | "referral" | "discharge" | "custom";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  journal: "Дневник",
  initial: "Первичный осмотр",
  referral: "Направление",
  discharge: "Выписка",
  custom: "Произвольный документ",
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  journal: "bg-blue-100 text-blue-800",
  initial: "bg-green-100 text-green-800",
  referral: "bg-yellow-100 text-yellow-800",
  discharge: "bg-purple-100 text-purple-800",
  custom: "bg-gray-100 text-gray-800",
};
