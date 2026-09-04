"use client";

import { useState, useTransition } from "react";
import { updateScoringBlock } from "./actions";
import type { ScoringBlock } from "@/lib/types";

export default function ScoringBlockPanel({ scoringBlocks }: { scoringBlocks: ScoringBlock[] }) {
  const totalWeight = scoringBlocks.reduce((sum, b) => sum + b.weight, 0) || 1;

  return (
    <div className="sheet" style={{ marginBottom: 18 }}>
      <div className="section-title" style={{ margin: "12px 16px 8px" }}>
        <h2>Блоки итоговой оценки</h2>
      </div>
      <div className="field-note" style={{ margin: "0 16px 8px" }}>
        Вес каждого из 4 блоков итоговой оценки (был фиксирован — 35% / 25% / 20% / 20%). Значения не
        обязаны суммироваться ровно в 100 — итог всегда считается как доля от суммы весов заполненных
        блоков.
      </div>
      <div className="sheet-scroll">
        <table>
          <thead>
            <tr>
              <th>Блок</th>
              <th>Вес</th>
              <th>Доля в итоге</th>
            </tr>
          </thead>
          <tbody>
            {scoringBlocks.map((b) => (
              <BlockRow key={b.id} block={b} share={(b.weight / totalWeight) * 100} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlockRow({ block, share }: { block: ScoringBlock; share: number }) {
  const [name, setName] = useState(block.name);
  const [weight, setWeight] = useState(String(block.weight));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextName: string, nextWeight: string) {
    setError(null);
    const fd = new FormData();
    fd.set("id", block.id);
    fd.set("name", nextName);
    fd.set("weight", nextWeight);
    startTransition(async () => {
      const result = await updateScoringBlock(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <tr>
      <td className="compname">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => e.target.value !== block.name && save(e.target.value, weight)}
          style={{ minWidth: 220 }}
        />
      </td>
      <td>
        <input
          type="number"
          step="any"
          min="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={(e) => e.target.value !== String(block.weight) && save(name, e.target.value)}
          disabled={isPending}
          style={{ width: 90 }}
        />
        {error && <div className="error-note">{error}</div>}
      </td>
      <td>{share.toFixed(1)}%</td>
    </tr>
  );
}
