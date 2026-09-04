import type { Attestation, ScoreMap } from "@/lib/types";

export interface Block {
  id: string;
  name: string;
  weight: number;
}

export interface Competency {
  id: string;
  block: string;
  name: string;
}

export const BLOCKS: Record<string, Block> = {
  "1": { id: "1", name: "Бизнес-результат", weight: 0.35 },
  "2": { id: "2", name: "Управление командой", weight: 0.25 },
  "3": { id: "3", name: "Операционное управление", weight: 0.2 },
  "4": { id: "4", name: "Личная эффективность и лидерство", weight: 0.2 },
};

export const BLOCK_ORDER = ["1", "2", "3", "4"];

export const COMPETENCIES: Competency[] = [
  { id: "c1", block: "1", name: "Выполнение плана продаж" },
  { id: "c2", block: "1", name: "Управление рентабельностью точки" },
  { id: "c3", block: "1", name: "Управление стоком/складом автомобилей" },
  { id: "c4", block: "2", name: "Подбор и адаптация персонала" },
  { id: "c5", block: "2", name: "Постановка задач и контроль исполнения" },
  {
    id: "c6",
    block: "2",
    name: "Развитие сотрудников, работа с низкой эффективностью",
  },
  { id: "c7", block: "2", name: "Атмосфера в команде / климат" },
  {
    id: "c8",
    block: "3",
    name: "Соблюдение стандартов бренда (dealer standards)",
  },
  { id: "c9", block: "3", name: "Работа с CRM и отчётностью" },
  {
    id: "c10",
    block: "3",
    name: "Клиентский сервис (NPS, работа с претензиями)",
  },
  { id: "c11", block: "4", name: "Принятие решений и ответственность" },
  {
    id: "c12",
    block: "4",
    name: "Коммуникация с головным офисом / импортёром",
  },
  { id: "c13", block: "4", name: "Обучаемость и работа над собой" },
];

export type Tone = "ok" | "accent" | "warn" | "crit" | "none";

export interface AttestationResult {
  score: number | null;
  category: string | null;
  label: string;
  tone: Tone;
  forced: boolean;
}

export function computeResult(
  record: Pick<Attestation, "self_scores" | "manager_scores"> | null | undefined
): AttestationResult {
  if (!record) {
    return { score: null, category: null, label: "Нет данных", tone: "none", forced: false };
  }
  const self: ScoreMap = record.self_scores || {};
  const manager: ScoreMap = record.manager_scores || {};

  let weightedSum = 0;
  let weightUsed = 0;
  let forced = false;

  for (const bid of BLOCK_ORDER) {
    const block = BLOCKS[bid];
    const comps = COMPETENCIES.filter((c) => c.block === bid);
    const scores: number[] = [];
    comps.forEach((c) => {
      const mgr = manager[c.id];
      const s = self[c.id];
      const v = mgr != null ? Number(mgr) : s != null ? Number(s) : null;
      if (v != null && !Number.isNaN(v)) {
        scores.push(v);
        if ((bid === "1" || bid === "3") && v === 1) forced = true;
      }
    });
    if (scores.length) {
      const avg = scores.reduce((a, x) => a + x, 0) / scores.length;
      weightedSum += avg * block.weight;
      weightUsed += block.weight;
    }
  }

  if (weightUsed === 0) {
    return { score: null, category: null, label: "Нет данных", tone: "none", forced: false };
  }

  const score = weightedSum / weightUsed;
  let label: string;
  let tone: Tone;
  if (score >= 4.5) {
    label = "Высокий потенциал";
    tone = "ok";
  } else if (score >= 3.5) {
    label = "Соответствует ожиданиям";
    tone = "accent";
  } else if (score >= 2.5) {
    label = "Зона риска";
    tone = "warn";
  } else {
    label = "Не соответствует позиции";
    tone = "crit";
  }
  if (forced && (label === "Высокий потенциал" || label === "Соответствует ожиданиям")) {
    label = "Зона риска (критичная компетенция = 1)";
    tone = "warn";
  }
  return { score, category: label, label, tone, forced };
}

export function currentQuarterLabel(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export function nextQuarterLabel(label: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(label || "");
  if (!m) return currentQuarterLabel();
  let y = parseInt(m[1], 10);
  let q = parseInt(m[2], 10) + 1;
  if (q > 4) {
    q = 1;
    y++;
  }
  return `${y}-Q${q}`;
}
