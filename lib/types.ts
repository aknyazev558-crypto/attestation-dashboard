export type Role = "owner" | "director" | "ceo" | "staff";

export function isOwnerLevel(role: Role | null | undefined): boolean {
  return role === "owner" || role === "ceo";
}

export type ScoreMap = Record<string, number | null>;

export type Branch = {
  id: string;
  name: string;
  brands: string[];
};

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  branch_id: string | null;
  position: string | null;
};

export type Cycle = {
  id: string;
  label: string;
  is_current: boolean;
};

export type Attestation = {
  id: string;
  branch_id: string;
  cycle: string;
  self_scores: ScoreMap;
  staff_scores: ScoreMap;
  manager_scores: ScoreMap;
  self_submitted: boolean;
  achievement_1: string | null;
  achievement_2: string | null;
  achievement_3: string | null;
  growth_areas: string | null;
  discussion: string | null;
  decision: string | null;
  ceo_comment: string | null;
  next_date: string | null;
  updated_at: string;
};

export const IPR_STATUSES = [
  "Не начат",
  "В процессе",
  "Выполнено",
  "Просрочено",
] as const;

export type IprStatus = (typeof IPR_STATUSES)[number];

export const IPR_SOURCES = ["owner", "ceo"] as const;
export type IprSource = (typeof IPR_SOURCES)[number];

export type IprItem = {
  id: string;
  branch_id: string;
  zone: string | null;
  action: string | null;
  deadline: string | null;
  metric: string | null;
  curator: string | null;
  status: IprStatus;
  note: string | null;
  source: IprSource;
  created_at: string;
};

export type LoginEvent = {
  id: string;
  user_id: string;
  created_at: string;
};

export type StaffBlockAccess = {
  user_id: string;
  block_id: string;
};

export type Competency = {
  id: string;
  block: string | null;
  name: string;
  weight: number;
  is_custom: boolean;
  created_by: string | null;
  sort_order: number;
  created_at: string;
};

// The 4 weighted scoring blocks behind the итог/computeResult — id/name/
// weight are now owner/CEO-editable (moved out of a hardcoded constant).
export type ScoringBlock = {
  id: string;
  name: string;
  weight: number;
  sort_order: number;
};

// A competency can belong to more than one block of competencies —
// many-to-many join, separate from the (single) scoring block above.
export type CompetencyDepartment = {
  competency_id: string;
  department_id: string;
};

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: Branch;
        Insert: Partial<Branch> & { name: string };
        Update: Partial<Branch>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; role: Role };
        Update: Partial<Profile>;
        Relationships: [];
      };
      cycles: {
        Row: Cycle;
        Insert: Partial<Cycle> & { label: string };
        Update: Partial<Cycle>;
        Relationships: [];
      };
      attestations: {
        Row: Attestation;
        Insert: Partial<Attestation> & { branch_id: string; cycle: string };
        Update: Partial<Attestation>;
        Relationships: [];
      };
      ipr_items: {
        Row: IprItem;
        Insert: Partial<IprItem> & { branch_id: string };
        Update: Partial<IprItem>;
        Relationships: [];
      };
      login_events: {
        Row: LoginEvent;
        Insert: Partial<LoginEvent> & { user_id: string };
        Update: Partial<LoginEvent>;
        Relationships: [];
      };
      staff_block_access: {
        Row: StaffBlockAccess;
        Insert: StaffBlockAccess;
        Update: Partial<StaffBlockAccess>;
        Relationships: [];
      };
      competencies: {
        Row: Competency;
        Insert: Partial<Competency> & { name: string };
        Update: Partial<Competency>;
        Relationships: [];
      };
      competency_departments: {
        Row: CompetencyDepartment;
        Insert: CompetencyDepartment;
        Update: Partial<CompetencyDepartment>;
        Relationships: [];
      };
      scoring_blocks: {
        Row: ScoringBlock;
        Insert: Partial<ScoringBlock> & { id: string; name: string };
        Update: Partial<ScoringBlock>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
