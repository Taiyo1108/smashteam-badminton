"use client";

export type CustomQuestionType = "text" | "textarea" | "select" | "radio" | "checkbox";

export interface CustomQuestion {
  id: string;
  label: string;
  type: CustomQuestionType;
  options: string[];
  required: boolean;
}

export interface CustomAnswer {
  questionId: string;
  question: string;
  answer: string | string[];
}

export const QUESTION_TYPE_LABELS: Record<CustomQuestionType, string> = {
  text: "Trả lời ngắn",
  textarea: "Trả lời dài",
  select: "Chọn 1 (dropdown)",
  radio: "Chọn 1 (nút tròn)",
  checkbox: "Chọn nhiều",
};

export const NEEDS_OPTIONS: CustomQuestionType[] = ["select", "radio", "checkbox"];

export function newQuestionId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function blankQuestion(): CustomQuestion {
  return { id: newQuestionId(), label: "", type: "text", options: [], required: false };
}

// Parse an toàn từ JSONB của Postgres (có thể là mảng object hoặc chuỗi JSON)
export function parseQuestions(value: unknown): CustomQuestion[] {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((q) => q && typeof (q as CustomQuestion).label === "string" && String((q as CustomQuestion).label).trim())
      .map((q) => {
        const item = q as Partial<CustomQuestion>;
        const type: CustomQuestionType =
          item.type === "textarea" || item.type === "select" || item.type === "radio" || item.type === "checkbox"
            ? item.type
            : "text";
        const options = Array.isArray(item.options)
          ? item.options.map((o) => String(o).trim()).filter(Boolean)
          : [];
        return {
          id: String(item.id || newQuestionId()),
          label: String(item.label).trim(),
          type,
          options: NEEDS_OPTIONS.includes(type) ? options : [],
          required: item.required === true,
        };
      });
  } catch {
    return [];
  }
}

export function parseAnswers(value: unknown): CustomAnswer[] {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (a) => a && typeof (a as CustomAnswer).question === "string"
    ) as CustomAnswer[];
  } catch {
    return [];
  }
}

export function isAnswerEmpty(answer: string | string[] | undefined): boolean {
  if (answer === undefined || answer === null) return true;
  if (Array.isArray(answer)) return answer.filter((v) => String(v).trim()).length === 0;
  return String(answer).trim() === "";
}

export function formatAnswer(answer: string | string[] | undefined): string {
  if (answer === undefined || answer === null) return "—";
  if (Array.isArray(answer)) {
    const items = answer.map((v) => String(v).trim()).filter(Boolean);
    return items.length > 0 ? items.join(", ") : "—";
  }
  const s = String(answer).trim();
  return s || "—";
}
