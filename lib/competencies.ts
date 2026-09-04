import type { Attestation, Competency, CompetencyDepartment, ScoreMap, ScoringBlock } from "@/lib/types";

export type { Competency, ScoringBlock };

// A competency can belong to several blocks of competencies at once (a
// many-to-many join in the DB) — this is the shape components actually
// work with, built by attachDepartments() below from the raw competencies
// + competency_departments rows fetched server-side.
export type CompetencyWithDepartments = Competency & { department_ids: string[] };

export function attachDepartments(
  competencies: Competency[],
  links: CompetencyDepartment[]
): CompetencyWithDepartments[] {
  const byCompetency = new Map<string, string[]>();
  links.forEach((link) => {
    const list = byCompetency.get(link.competency_id) || [];
    list.push(link.department_id);
    byCompetency.set(link.competency_id, list);
  });
  return competencies.map((c) => ({ ...c, department_ids: byCompetency.get(c.id) || [] }));
}

// The 4 scoring blocks behind the итог/computeResult below. Their name and
// weight are owner/CEO-editable (scoring_blocks table) — BLOCK_ORDER is
// only the fixed set of ids (this app doesn't support adding/removing
// scoring blocks, just reweighting/renaming the existing 4); actual
// name/weight always comes from the fetched ScoringBlock[] passed around
// as a prop, never from a hardcoded constant. Separate from the 7
// department blocks (Продажи, ППО, HR, Маркетинг, КЦ, CQ, FinDep) further
// down, which organize competencies and staff edit access by function and
// don't carry a weight of their own; a competency's scoring block and
// department are independent (a new one added by staff starts with
// block = null — excluded from the weighted total until owner/CEO assign
// it a block in the "Компетенции" panel).
export const BLOCK_ORDER = ["1", "2", "3", "4"];

export function blockMap(blocks: ScoringBlock[]): Record<string, ScoringBlock> {
  const map: Record<string, ScoringBlock> = {};
  blocks.forEach((b) => {
    map[b.id] = b;
  });
  return map;
}

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
  record: Pick<Attestation, "self_scores" | "staff_scores" | "manager_scores"> | null | undefined,
  competencies: Competency[],
  blocks: ScoringBlock[]
): AttestationResult {
  if (!record) {
    return { score: null, category: null, label: "Нет данных", tone: "none", forced: false };
  }
  const self: ScoreMap = record.self_scores || {};
  const staff: ScoreMap = record.staff_scores || {};
  const manager: ScoreMap = record.manager_scores || {};

  let weightedSum = 0;
  let weightUsed = 0;
  let forced = false;

  for (const block of blocks) {
    const bid = block.id;
    const comps = competencies.filter((c) => c.block === bid);
    // Weighted average within the block — a competency's own `weight`
    // (owner/CEO-editable, default 1) scales how much it counts relative
    // to the others in the same block, before the block-level weight
    // below is applied.
    let compScoreWeighted = 0;
    let compWeightUsed = 0;
    comps.forEach((c) => {
      // Final manager score wins; until owner/CEO enter it, fall back to
      // the staff member's own column, then the director's self-score —
      // so a score already shows up as soon as anyone has entered one,
      // and gets replaced once the next stage (сотрудники → руководитель
      // сети → CEO) weighs in.
      const mgr = manager[c.id];
      const st = staff[c.id];
      const s = self[c.id];
      const v = mgr != null ? Number(mgr) : st != null ? Number(st) : s != null ? Number(s) : null;
      if (v != null && !Number.isNaN(v)) {
        const w = c.weight || 1;
        compScoreWeighted += v * w;
        compWeightUsed += w;
        if ((bid === "1" || bid === "3") && v === 1) forced = true;
      }
    });
    if (compWeightUsed > 0) {
      const avg = compScoreWeighted / compWeightUsed;
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
