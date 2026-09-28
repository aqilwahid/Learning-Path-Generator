/* Template gambar learning path perorangan — A4 portrait (1240 × 1754 px @150 dpi). */
import type { ReactNode } from "react";
import { COLORS } from "@/config/brand";
import { getFunction, levelName } from "@/lib/catalog";
import { formatDateId, monthLabel, type ParticipantPlan, type PeriodInfo, type PlanStep } from "@/lib/engine";
import { ArrowIcon, CheckIcon, Col, Row, SealIcon, Txt } from "./primitives";

export const INDIVIDUAL_SIZE = { width: 1240, height: 1754 };

export interface IndividualTemplateProps {
  plan: ParticipantPlan;
  generatedAt: Date;
  orgName: string;
  programName: string;
  catalogVersion: string;
  sessionTitle?: string;
}

const PAD = 64;
const BASELINE_COLOR = "#6D7F96";
/** Tinggi yang tersedia untuk jalur + catatan (px, pada skala 1). */
const BODY_BUDGET = 820;

/** "Nov 2026 – Apr 2027" dari daftar periode. */
export function spanLabel(periods: PeriodInfo[]): string {
  if (!periods.length) return "—";
  const start = periods[0].start;
  const end = periods[periods.length - 1].end;
  return start === end ? monthLabel(start) : `${monthLabel(start)} – ${monthLabel(end)}`;
}

/** Label periode untuk kolom sempit: tahun menempel ke bulannya (NBSP), pemisah diberi spasi. */
function spaced(label: string): string {
  return label.replace(/ (\d{4})/g, " $1").replace("–", " – ");
}

function clipText(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function nameSize(name: string): number {
  const n = name.length;
  if (n <= 24) return 60;
  if (n <= 32) return 50;
  if (n <= 42) return 42;
  return 36;
}

// ---------- susunan node jalur ----------

type PathNode = { type: "step"; step: PlanStep } | { type: "bnsp" };

function buildNodes(plan: ParticipantPlan): PathNode[] {
  const nodes: PathNode[] = plan.steps.map((step) => ({ type: "step", step }));
  const r = plan.bnsp.primary;
  if (!r) return nodes;
  let insertAt = nodes.length;
  if (r.readiness === "after-path" && r.afterCode) {
    const idx = plan.steps.findIndex((s) => s.kind === "role" && s.code === r.afterCode);
    if (idx >= 0) insertAt = idx + 1;
  } else if (r.readiness === "ready-now") {
    let lastDone = -1;
    plan.steps.forEach((s, i) => {
      if (s.status === "done") lastDone = i;
    });
    insertAt = lastDone + 1;
  }
  nodes.splice(insertAt, 0, { type: "bnsp" });
  return nodes;
}

function estimateHeight(nodes: PathNode[], showDoneTopics = true): number {
  let h = 0;
  for (const n of nodes) {
    if (n.type === "bnsp") {
      h += 134 + 18;
      continue;
    }
    const s = n.step;
    if (s.status === "planned") h += 128 + s.topics.length * 32 + (s.track ? 34 : 0) + 18;
    else if (s.status === "done") h += (showDoneTopics ? 76 : 56) + 18;
    else h += 52 + 18;
  }
  return h;
}

function buildNotes(plan: ParticipantPlan): string[] {
  const notes: string[] = [];
  const r = plan.bnsp.primary;
  const role = plan.role;
  if (r) {
    notes.push("Siapkan bukti kerja/portofolio untuk asesmen mandiri (APL-02) sebelum periode uji.");
    if (r.prerequisites) notes.push(`Prasyarat skema: ${clipText(r.prerequisites, 150)}`);
  }
  const auto = plan.steps.find((s) => s.status === "planned" && s.track?.auto);
  if (auto?.track) notes.push(`Track ${auto.track.label} dipilih otomatis untuk ${auto.code} — konfirmasi pilihan teknologi dengan instruktur.`);
  const later = plan.steps.find((s) => s.status === "later");
  if (later) notes.push(`Setelah target tercapai, lanjutkan ke ${later.code} (Lv.${later.level} ${later.levelName}).`);
  else if (role && plan.targetLevel === plan.maxLevel && plan.totals.plannedPackages > 0)
    notes.push(`Lv.${plan.maxLevel} adalah level tertinggi ${role.name} di katalog.`);
  const baseline = plan.steps.find((s) => s.kind === "baseline" && s.status === "planned");
  if (baseline) notes.push("Baseline Digital Skill berjalan paralel dengan paket role pada periode pertama.");
  if (plan.participant.notes) notes.push(`Catatan instruktur: ${clipText(plan.participant.notes, 160)}`);
  return notes.slice(0, 4);
}

// ---------- komponen ----------

function HeaderChip({ label, value, sub, flex = 1 }: { label: string; value: ReactNode; sub?: string; flex?: number }) {
  return (
    <Col
      style={{
        flex,
        padding: "16px 20px",
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.08)",
        border: "1.5px solid rgba(255,255,255,0.22)",
        gap: 4,
      }}
    >
      <Txt size={15} weight={800} color="#9FC0E0" style={{ letterSpacing: 1.6 }}>
        {label}
      </Txt>
      <Row style={{ alignItems: "center", gap: 8 }}>{value}</Row>
      {sub ? (
        <Txt size={16} color="#C9DAEA">
          {sub}
        </Txt>
      ) : null}
    </Col>
  );
}

function Circle({ size, bg, border, children }: { size: number; bg: string; border?: string; children?: ReactNode }) {
  return (
    <Row
      style={{
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: bg,
        ...(border ? { border } : {}),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Row>
  );
}

function StepNode({ step, k }: { step: PlanStep; k: number }) {
  const size = Math.round(44 * k);
  if (step.status === "done")
    return (
      <Circle size={size} bg={COLORS.done}>
        <CheckIcon size={Math.round(24 * k)} />
      </Circle>
    );
  if (step.status === "later")
    return (
      <Circle size={size} bg={COLORS.paper} border={`3px dashed ${COLORS.line}`}>
        <Txt size={Math.round(19 * k)} weight={800} color={COLORS.muted}>
          {String(step.level)}
        </Txt>
      </Circle>
    );
  const baseline = step.kind === "baseline";
  return (
    <Circle size={size} bg={baseline ? BASELINE_COLOR : COLORS.level[step.level]}>
      <Txt size={Math.round((baseline ? 15 : 20) * k)} weight={800} color="#fff">
        {baseline ? "DS" : String(step.level)}
      </Txt>
    </Circle>
  );
}

function Rail({ node, last, children, k }: { node: ReactNode; last: boolean; children: ReactNode; k: number }) {
  return (
    <Row style={{ alignItems: "stretch" }}>
      <Col style={{ width: Math.round(64 * k), alignItems: "center" }}>
        {node}
        {!last ? <div style={{ display: "flex", flexGrow: 1, width: 4, backgroundColor: COLORS.line, marginTop: 4 }} /> : null}
      </Col>
      <Col style={{ flex: 1, paddingBottom: last ? 0 : Math.round(18 * k), paddingLeft: 10 }}>{children}</Col>
    </Row>
  );
}

function CodeChip({ code, color, k }: { code: string; color: string; k: number }) {
  return (
    <Row style={{ backgroundColor: color, borderRadius: 8, padding: `${Math.round(4 * k)}px ${Math.round(12 * k)}px` }}>
      <Txt size={Math.round(18 * k)} weight={800} color="#fff" style={{ letterSpacing: 0.5 }}>
        {code}
      </Txt>
    </Row>
  );
}

function PeriodBadge({ label, k, tone = "sky" }: { label: string; k: number; tone?: "sky" | "red" }) {
  const red = tone === "red";
  return (
    <Row
      style={{
        backgroundColor: red ? "#FBEAEA" : COLORS.sky,
        borderRadius: 999,
        padding: `${Math.round(6 * k)}px ${Math.round(16 * k)}px`,
        border: red ? `1.5px solid ${COLORS.red}` : "none",
      }}
    >
      <Txt size={Math.round(17 * k)} weight={800} color={red ? COLORS.red : COLORS.navy}>
        {label}
      </Txt>
    </Row>
  );
}

function PlannedCard({ step, periodLabel, k }: { step: PlanStep; periodLabel: string; k: number }) {
  const color = step.kind === "baseline" ? BASELINE_COLOR : COLORS.level[step.level];
  return (
    <Col
      style={{
        backgroundColor: COLORS.paper,
        border: `1.5px solid ${COLORS.line}`,
        borderLeft: `8px solid ${color}`,
        borderRadius: 14,
        padding: `${Math.round(16 * k)}px ${Math.round(22 * k)}px`,
        gap: Math.round(8 * k),
      }}
    >
      <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
        <Row style={{ alignItems: "center", gap: 12 }}>
          <CodeChip code={step.code} color={color} k={k} />
          <Txt size={Math.round(18 * k)} weight={800} color={COLORS.muted} style={{ letterSpacing: 1 }}>
            {step.kind === "baseline" ? "BASELINE · DIGITAL SKILL" : `LV.${step.level} · ${step.levelName.toUpperCase()}`}
          </Txt>
        </Row>
        {periodLabel ? <PeriodBadge label={periodLabel} k={k} /> : null}
      </Row>
      <Txt size={Math.round(26 * k)} weight={800} color={COLORS.navy}>
        {step.title}
      </Txt>
      {step.track ? (
        <Row style={{ alignItems: "center", gap: 10 }}>
          <Row style={{ border: `1.5px solid ${COLORS.red}`, borderRadius: 8, padding: `${Math.round(2 * k)}px ${Math.round(10 * k)}px` }}>
            <Txt size={Math.round(16 * k)} weight={800} color={COLORS.red}>
              {`Track: ${step.track.label}`}
            </Txt>
          </Row>
          {step.track.auto ? (
            <Txt size={Math.round(15 * k)} color={COLORS.muted}>
              {`dipilih otomatis · alternatif: ${step.track.alternatives.join(", ")}`}
            </Txt>
          ) : null}
        </Row>
      ) : null}
      <Col style={{ gap: Math.round(6 * k), marginTop: Math.round(2 * k) }}>
        {step.topics.map((t) => (
          <Row key={t.id} style={{ alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                width: Math.round(10 * k),
                height: Math.round(10 * k),
                borderRadius: 3,
                backgroundColor: t.done ? COLORS.line : color,
              }}
            />
            <Txt
              size={Math.round(20 * k)}
              color={t.done ? COLORS.muted : COLORS.ink}
              style={{ flex: 1, textDecoration: t.done ? "line-through" : "none" }}
            >
              {t.title}
            </Txt>
            <Txt size={Math.round(19 * k)} weight={600} color={t.done ? COLORS.muted : COLORS.navy}>
              {t.done ? "sudah" : `${t.days} hari`}
            </Txt>
          </Row>
        ))}
      </Col>
    </Col>
  );
}

function DoneCard({ step, k, showTopics }: { step: PlanStep; k: number; showTopics: boolean }) {
  return (
    <Row
      style={{
        backgroundColor: COLORS.doneBg,
        border: `1.5px solid ${COLORS.doneLine}`,
        borderRadius: 14,
        padding: `${Math.round(12 * k)}px ${Math.round(20 * k)}px`,
        alignItems: "center",
        gap: 14,
      }}
    >
      <Col style={{ flex: 1, gap: 2 }}>
        <Txt size={Math.round(19 * k)} weight={800} color={COLORS.done}>
          {`${step.code} · Lv.${step.level} ${step.levelName}`}
        </Txt>
        {showTopics ? (
          <Txt size={Math.round(17 * k)} color={COLORS.muted}>
            {step.topics.map((t) => t.title).join(" · ")}
          </Txt>
        ) : null}
      </Col>
      <Txt size={Math.round(16 * k)} weight={800} color={COLORS.done} style={{ letterSpacing: 1.2 }}>
        SELESAI
      </Txt>
    </Row>
  );
}

function LaterCard({ step, k }: { step: PlanStep; k: number }) {
  return (
    <Row
      style={{
        border: `2px dashed ${COLORS.line}`,
        borderRadius: 14,
        padding: `${Math.round(12 * k)}px ${Math.round(20 * k)}px`,
        alignItems: "center",
        gap: 14,
      }}
    >
      <Txt size={Math.round(19 * k)} weight={800} color={COLORS.muted} style={{ flex: 1 }}>
        {`${step.code} · Lv.${step.level} ${step.levelName} · ${step.totalDays} hari`}
      </Txt>
      <Txt size={Math.round(15 * k)} weight={800} color={COLORS.muted} style={{ letterSpacing: 1.2 }}>
        LANJUTAN
      </Txt>
    </Row>
  );
}

function BnspNodeCard({ plan, k }: { plan: ParticipantPlan; k: number }) {
  const r = plan.bnsp.primary!;
  const periodLabel = r.periodIndex !== undefined ? plan.periods[r.periodIndex]?.label ?? "" : "";
  const details: string[] = [];
  if (r.readiness === "ready-now") details.push("Level saat ini sudah memenuhi");
  else if (r.afterCode) details.push(`Setelah ${r.afterCode} selesai`);
  if (r.unitsCount) details.push(`${r.unitsCount} unit kompetensi`);
  if (r.trainingDays && r.assessmentDays) details.push(`${r.trainingDays} hari pembekalan + ${r.assessmentDays} hari uji`);
  return (
    <Col
      style={{
        backgroundColor: "#FFF7F7",
        border: "1.5px solid #F0C9C9",
        borderLeft: `8px solid ${COLORS.red}`,
        borderRadius: 14,
        padding: `${Math.round(14 * k)}px ${Math.round(22 * k)}px`,
        gap: Math.round(6 * k),
      }}
    >
      <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
        <Txt size={Math.round(17 * k)} weight={800} color={COLORS.red} style={{ letterSpacing: 1.4 }}>
          UJI KOMPETENSI BNSP
        </Txt>
        {periodLabel ? <PeriodBadge label={periodLabel} k={k} tone="red" /> : null}
      </Row>
      <Txt size={Math.round(25 * k)} weight={800} color={COLORS.ink}>
        {r.shortName}
      </Txt>
      <Txt size={Math.round(17 * k)} color={COLORS.muted}>
        {details.join(" · ")}
      </Txt>
    </Col>
  );
}

function NotesBox({ notes, k }: { notes: string[]; k: number }) {
  return (
    <Col
      style={{
        marginTop: Math.round(20 * k),
        backgroundColor: COLORS.mist,
        borderRadius: 14,
        padding: `${Math.round(16 * k)}px ${Math.round(22 * k)}px`,
        gap: Math.round(8 * k),
      }}
    >
      <Txt size={Math.round(16 * k)} weight={800} color={COLORS.navy} style={{ letterSpacing: 1.8 }}>
        CATATAN &amp; LANGKAH BERIKUTNYA
      </Txt>
      {notes.map((n, i) => (
        <Row key={i} style={{ gap: 12, alignItems: "flex-start" }}>
          <div
            style={{
              display: "flex",
              width: Math.round(8 * k),
              height: Math.round(8 * k),
              borderRadius: 8,
              backgroundColor: COLORS.red,
              marginTop: Math.round(9 * k),
            }}
          />
          <Txt size={Math.round(18 * k)} color={COLORS.ink} style={{ flex: 1 }}>
            {n}
          </Txt>
        </Row>
      ))}
    </Col>
  );
}

function Timeline({ plan }: { plan: ParticipantPlan }) {
  const periods = plan.periods;
  const maxCols = 5;
  const shown = periods.slice(0, maxCols);
  const hidden = periods.length - shown.length;
  const r = plan.bnsp.primary;
  return (
    <Col style={{ flex: 1.45, gap: 14 }}>
      <Txt size={18} weight={800} color={COLORS.navy} style={{ letterSpacing: 2 }}>
        JADWAL PER PERIODE
      </Txt>
      {shown.length === 0 ? (
        <Txt size={20} color={COLORS.muted}>
          Tidak ada jadwal — target sudah tercapai.
        </Txt>
      ) : (
        <Row style={{ gap: 10 }}>
          {shown.map((p) => {
            const items = plan.steps.filter((s) => s.status === "planned" && s.periodIndex === p.index);
            const hasExam = r?.periodIndex === p.index;
            const days = items.reduce((a, s) => a + s.days, 0);
            return (
              <Col
                key={p.index}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.paper,
                  borderRadius: 12,
                  border: `1.5px solid ${COLORS.line}`,
                  padding: "12px 12px",
                  gap: 8,
                  minHeight: 150,
                }}
              >
                <Txt size={14} weight={800} color={COLORS.muted} style={{ letterSpacing: 1.2 }}>
                  {`PERIODE ${p.index + 1}`}
                </Txt>
                <Txt size={shown.length > 3 ? 15 : 17} weight={800} color={COLORS.navy}>
                  {spaced(p.label)}
                </Txt>
                <Col style={{ gap: 6, marginTop: 2 }}>
                  {items.map((s) => (
                    <Row
                      key={s.code}
                      style={{
                        backgroundColor: s.kind === "baseline" ? BASELINE_COLOR : COLORS.level[s.level],
                        borderRadius: 7,
                        padding: "4px 8px",
                        justifyContent: "space-between",
                      }}
                    >
                      <Txt size={15} weight={800} color="#fff">
                        {s.code}
                      </Txt>
                      <Txt size={15} weight={600} color="#fff">
                        {`${s.days} hr`}
                      </Txt>
                    </Row>
                  ))}
                  {hasExam ? (
                    <Row style={{ border: `1.5px solid ${COLORS.red}`, borderRadius: 7, padding: "3px 8px", gap: 6, alignItems: "center" }}>
                      <SealIcon size={15} color={COLORS.red} />
                      <Txt size={15} weight={800} color={COLORS.red}>
                        Uji BNSP
                      </Txt>
                    </Row>
                  ) : null}
                </Col>
                {days ? (
                  <Txt size={14} color={COLORS.muted} style={{ marginTop: "auto" }}>
                    {`${days} hari pelatihan`}
                  </Txt>
                ) : null}
              </Col>
            );
          })}
          {hidden > 0 ? (
            <Col style={{ width: 90, alignItems: "center", justifyContent: "center" }}>
              <Txt size={18} weight={800} color={COLORS.muted}>
                {`+${hidden}`}
              </Txt>
              <Txt size={14} color={COLORS.muted}>
                periode
              </Txt>
            </Col>
          ) : null}
        </Row>
      )}
    </Col>
  );
}

function BnspPanel({ plan }: { plan: ParticipantPlan }) {
  const b = plan.bnsp;
  const lines: string[] = [];
  let heading: string;
  if (b.primary) {
    heading = b.primary.shortName;
    const meta = [b.primary.type ? `Skema ${b.primary.type}` : null, b.primary.unitsCount ? `${b.primary.unitsCount} unit kompetensi` : null]
      .filter(Boolean)
      .join(" · ");
    if (meta) lines.push(meta);
    if (b.alternatives.length) lines.push(`Alternatif: ${b.alternatives.slice(0, 2).map((a) => a.shortName).join(", ")}`);
    if (b.next) lines.push(`Berikutnya: ${b.next.shortName} (setelah Lv.${b.next.readyAfterLevel})`);
  } else if (b.next) {
    heading = b.next.shortName;
    lines.push(`Target berikutnya — siap uji setelah Lv.${b.next.readyAfterLevel}${b.next.afterCode ? ` (${b.next.afterCode})` : ""}.`);
  } else {
    heading = "Belum ada skema sepadan";
    lines.push("Belum ada skema BNSP yang sepadan untuk role ini di daftar penyelenggara.");
  }
  if (b.match === "partial") lines.push("Padanan parsial — cakupan skema tidak identik dengan role.");
  const showDraft = !b.verified && (b.primary || b.next);
  return (
    <Col
      style={{
        flex: 1,
        backgroundColor: COLORS.paper,
        borderRadius: 14,
        border: `1.5px solid ${COLORS.line}`,
        borderTop: `8px solid ${COLORS.red}`,
        padding: "18px 22px",
        gap: 8,
      }}
    >
      <Row style={{ alignItems: "center", gap: 10 }}>
        <Circle size={34} bg={COLORS.red}>
          <SealIcon size={20} />
        </Circle>
        <Txt size={18} weight={800} color={COLORS.red} style={{ letterSpacing: 2 }}>
          SERTIFIKASI BNSP
        </Txt>
      </Row>
      <Txt size={24} weight={800} color={COLORS.ink}>
        {heading}
      </Txt>
      {lines.map((l, i) => (
        <Txt key={i} size={16} color={COLORS.muted}>
          {l}
        </Txt>
      ))}
      {showDraft ? (
        <Row style={{ marginTop: "auto", backgroundColor: "#FFF4E0", borderRadius: 8, padding: "6px 10px" }}>
          <Txt size={14} weight={600} color={COLORS.warn}>
            Pemetaan skema masih draf — konfirmasi ke penyelenggara sebelum mendaftar uji.
          </Txt>
        </Row>
      ) : null}
    </Col>
  );
}

// ---------- template ----------

export function IndividualTemplate({ plan, generatedAt, orgName, programName, catalogVersion, sessionTitle }: IndividualTemplateProps) {
  const p = plan.participant;
  const role = plan.role;
  const fn = role ? getFunction(role.functionId) : null;
  const nodes = buildNodes(plan);

  const est = estimateHeight(nodes, true);
  let k = Math.min(1.35, Math.max(0.62, BODY_BUDGET / Math.max(est, 1)));
  let showDoneTopics = true;
  if (est > BODY_BUDGET) {
    showDoneTopics = false;
    k = Math.min(1, Math.max(0.62, BODY_BUDGET / Math.max(estimateHeight(nodes, false), 1)));
  }
  const notes = buildNotes(plan);
  const notesHeight = notes.length ? (72 + notes.length * 34) * k : 0;
  const showNotes = notes.length > 0 && k >= 0.95 && est * k + notesHeight <= BODY_BUDGET + 20;

  const meta1 = [p.jabatan, p.departemen].filter(Boolean).join(" · ");
  const bnspMode = plan.bnsp.match !== "disabled";
  const statuses = new Set(plan.steps.map((s) => s.status));
  const legend = [
    statuses.has("done") ? { c: COLORS.done, t: "Selesai" } : null,
    statuses.has("planned") ? { c: COLORS.level[2], t: "Rencana" } : null,
    statuses.has("later") ? { c: COLORS.line, t: "Lanjutan" } : null,
    plan.bnsp.primary ? { c: COLORS.red, t: "Uji BNSP" } : null,
  ].filter((x): x is { c: string; t: string } => Boolean(x));

  return (
    <Col style={{ width: INDIVIDUAL_SIZE.width, height: INDIVIDUAL_SIZE.height, backgroundColor: COLORS.paper, fontFamily: "Plus Jakarta Sans" }}>
      <div style={{ display: "flex", height: 14, backgroundColor: COLORS.red }} />
      {/* HEADER */}
      <Col style={{ backgroundColor: COLORS.navy, padding: `44px ${PAD}px 40px`, gap: 6 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Txt size={18} weight={800} color="#9FC0E0" style={{ letterSpacing: 3 }}>
            {`LEARNING PATH · ${programName.toUpperCase()}`}
          </Txt>
          <Txt size={16} weight={600} color="#9FC0E0">
            {sessionTitle ? clipText(sessionTitle, 40) : `Katalog v${catalogVersion}`}
          </Txt>
        </Row>
        <Txt size={nameSize(p.name)} weight={800} color="#FFFFFF" style={{ marginTop: 14, lineHeight: 1.1 }}>
          {p.name || "Tanpa Nama"}
        </Txt>
        {meta1 ? (
          <Txt size={25} color="#D6E4F2" style={{ marginTop: 6 }}>
            {clipText(meta1, 80)}
          </Txt>
        ) : null}
        {p.instansi ? (
          <Txt size={25} weight={600} color="#D6E4F2">
            {clipText(p.instansi, 80)}
          </Txt>
        ) : null}
        <Row style={{ gap: 14, marginTop: 26 }}>
          <HeaderChip
            flex={1.35}
            label="ROLE TARGET"
            value={
              <Txt size={24} weight={800} color="#fff">
                {role ? role.name : "Belum dipilih"}
              </Txt>
            }
            sub={fn ? `${fn.id} · ${fn.name}` : undefined}
          />
          <HeaderChip
            label="LEVEL"
            value={
              <Row style={{ alignItems: "center", gap: 8 }}>
                <Txt size={24} weight={800} color="#fff">
                  {`Lv.${plan.currentLevel}`}
                </Txt>
                <ArrowIcon size={22} color="#9FC0E0" />
                <Txt size={24} weight={800} color="#fff">
                  {`Lv.${plan.targetLevel}`}
                </Txt>
              </Row>
            }
            sub={plan.targetLevel ? levelName(plan.targetLevel) : undefined}
          />
          <HeaderChip
            flex={1.25}
            label="PERIODE"
            value={
              <Txt size={22} weight={800} color="#fff">
                {spanLabel(plan.periods)}
              </Txt>
            }
            sub={plan.periods.length ? `${plan.periods.length} periode` : undefined}
          />
          <HeaderChip
            flex={0.85}
            label="DURASI"
            value={
              <Txt size={24} weight={800} color="#fff">
                {`${plan.totals.remainingDays} hari`}
              </Txt>
            }
            sub={`${plan.totals.plannedPackages} paket · ${plan.totals.plannedTopics} topik`}
          />
        </Row>
      </Col>

      {/* BODY */}
      <Col style={{ flexGrow: 1, padding: `${Math.round(40 * Math.min(1, Math.max(k, 0.8)))}px ${PAD}px 24px`, gap: Math.round(22 * Math.min(k, 1)) }}>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Txt size={20} weight={800} color={COLORS.navy} style={{ letterSpacing: 2.4 }}>
            JALUR PEMBELAJARAN
          </Txt>
          <Row style={{ gap: 20, alignItems: "center" }}>
            {legend.map((x) => (
              <Row key={x.t} style={{ alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", width: 14, height: 14, borderRadius: 14, backgroundColor: x.c }} />
                <Txt size={16} color={COLORS.muted}>
                  {x.t}
                </Txt>
              </Row>
            ))}
          </Row>
        </Row>
        <Col>
          {nodes.length === 0 ? (
            <Txt size={22} color={COLORS.muted}>
              Pilih role target untuk menampilkan jalur pembelajaran.
            </Txt>
          ) : null}
          {nodes.map((n, i) => {
            const last = i === nodes.length - 1;
            if (n.type === "bnsp") {
              return (
                <Rail
                  key="bnsp"
                  k={k}
                  last={last}
                  node={
                    <Circle size={Math.round(44 * k)} bg={COLORS.red}>
                      <SealIcon size={Math.round(24 * k)} />
                    </Circle>
                  }
                >
                  <BnspNodeCard plan={plan} k={k} />
                </Rail>
              );
            }
            const s = n.step;
            const periodLabel = s.periodIndex !== undefined ? plan.periods[s.periodIndex]?.label ?? "" : "";
            return (
              <Rail key={s.code + s.kind} node={<StepNode step={s} k={k} />} last={last} k={k}>
                {s.status === "done" ? (
                  <DoneCard step={s} k={k} showTopics={showDoneTopics} />
                ) : s.status === "later" ? (
                  <LaterCard step={s} k={k} />
                ) : (
                  <PlannedCard step={s} periodLabel={periodLabel} k={k} />
                )}
              </Rail>
            );
          })}
          {showNotes ? <NotesBox notes={notes} k={Math.min(k, 1.1)} /> : null}
        </Col>
      </Col>

      {/* BOTTOM */}
      <Row style={{ backgroundColor: COLORS.mist, padding: `30px ${PAD}px 30px`, gap: 24, borderTop: `1.5px solid ${COLORS.line}` }}>
        <Timeline plan={plan} />
        {bnspMode ? <BnspPanel plan={plan} /> : null}
      </Row>

      {/* FOOTER */}
      <Row style={{ backgroundColor: COLORS.navy, padding: `16px ${PAD}px`, justifyContent: "space-between", alignItems: "center" }}>
        <Txt size={15} color="#C9DAEA">
          {`Dibuat ${formatDateId(generatedAt)} · ${orgName}`}
        </Txt>
        <Txt size={15} color="#C9DAEA">
          {`Katalog ${programName} v${catalogVersion} · rekomendasi otomatis, jadwal indikatif`}
        </Txt>
      </Row>
    </Col>
  );
}
