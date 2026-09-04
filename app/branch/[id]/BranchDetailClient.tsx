"use client";

import { useState } from "react";
import Link from "next/link";
import type { Branch, Cycle, ScoringBlock } from "@/lib/types";
import type { CompetencyWithDepartments } from "@/lib/competencies";
import AttestationTab from "./AttestationTab";
import IprTab from "./IprTab";

export default function BranchDetailClient({
  branch,
  cycles,
  currentCycle,
  competencies,
  scoringBlocks,
  isOwner,
  isCeo,
  isStaff,
  staffBlockIds,
  isOwnDirector,
  directorFullName,
}: {
  branch: Branch;
  cycles: Cycle[];
  currentCycle: string | null;
  competencies: CompetencyWithDepartments[];
  scoringBlocks: ScoringBlock[];
  isOwner: boolean;
  isCeo: boolean;
  isStaff: boolean;
  staffBlockIds: string[];
  isOwnDirector: boolean;
  directorFullName: string | null;
}) {
  const [tab, setTab] = useState<"att" | "ipr">("att");

  return (
    <div>
      {(isOwner || isStaff) && (
        <Link
          href="/dashboard"
          className="btn ghost small"
          style={{ marginBottom: 10, display: "inline-block" }}
        >
          ← Ко всем филиалам
        </Link>
      )}

      <div className="detail-hdr">
        <div>
          <h1>{branch.name}</h1>
          <div className="sub">
            {directorFullName
              ? `Директор: ${directorFullName}`
              : isOwner
              ? "Директор не назначен"
              : ""}
          </div>
          <div className="chips">
            {(branch.brands || []).map((b) => (
              <span className="chip" key={b}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs2">
        <button
          className={"tab2" + (tab === "att" ? " active" : "")}
          onClick={() => setTab("att")}
        >
          Аттестация
        </button>
        <button
          className={"tab2" + (tab === "ipr" ? " active" : "")}
          onClick={() => setTab("ipr")}
        >
          ИПР
        </button>
      </div>

      {tab === "att" ? (
        <AttestationTab
          branchId={branch.id}
          cycles={cycles}
          currentCycle={currentCycle}
          competencies={competencies}
          scoringBlocks={scoringBlocks}
          isOwner={isOwner}
          isCeo={isCeo}
          staffBlockIds={staffBlockIds}
          isOwnDirector={isOwnDirector}
        />
      ) : (
        <IprTab
          branchId={branch.id}
          isOwner={isOwner}
          isCeo={isCeo}
          isOwnDirector={isOwnDirector}
        />
      )}
    </div>
  );
}
