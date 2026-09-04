import type { Attestation, Competency, ScoreMap } from "@/lib/types";

export type { Competency };

export interface Block {
  id: string;
  name: string;
  weight: number;
}

// The 4 weighted scoring blocks behind the итог/computeResult below — kept
// exactly as before. Separate from the 7 department blocks (Продажи, ППО,
// HR, Маркетинг, КЦ, CQ, FinDep) further down, which organize competencies
// and staff edit access by function and don't carry a weight of their own;
// a competency's scoring block and department are independent (a new one
// added by staff starts with block = null — excluded from the weighted
// total until owner/CEO assign it a block in the "Компетенции" panel).
export const BLOCKS: Record<string, Block> = {
  "1": { id: "1", name: "Бизнес-результат", weight: 0.35 },
  "2": { id: "2", name: "Управление командой", weight: 0.25 },
  "3": { id: "3", name: "Операционное управление", weight: 0.2 },
  "4": { id: "4", name: "Личная эффективность и лидерство", weight: 0.2 },
};

export const BLOCK_ORDER = ["1", "2", "3", "4"];

export interface Department {
  id: string;
  name: string;
}

export const DEPARTMENTS: Record<string, Department> = {
  sales: { id: "sales", name: "Продажи" },
  ppo: { id: "ppo", name: "ППО" },
  hr: { id: "hr", name: "HR" },
  marketing: { id: "marketing", name: "Маркетинг" },
  kc: { id: "kc", name: "КЦ" },
  cq: { id: "cq", name: "CQ" },
  findep: { id: "findep", name: "FinDep" },
};

export const DEPARTMENT_ORDER = ["sales", "ppo", "hr", "marketing", "kc", "cq", "findep"];

export type Tone = "ok" | "accent" | "warn" | "crit" | "none";

export interface AttestationResult {
  score: number | null;
  category: string | null;
  label: string;
  tone: Tone;
  forced: boolean;
}

export function computeResult(
  record: Pick<Attestation, "self_scores" | "manager_scores"> | null | undefined,
  competencies: Competency[]
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
    const comps = competencies.filter((c) => c.block === bid);
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
