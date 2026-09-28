/* Template poster rekap instansi — A3 landscape (2480 × 1754 px @150 dpi). */
import type { ReactNode } from "react";
import { COLORS } from "@/config/brand";
import { getFunction, getRole } from "@/lib/catalog";
import { formatDateId, type CohortClass, type InstitutionPlan, type RoleGroup } from "@/lib/engine";
import { Col, Row, SealIcon, Txt, UsersIcon } from "./primitives";
import { spanLabel } from "./individual";

export const INSTITUTION_SIZE = { width: 2480, height: 1754 };

export interface InstitutionMeta {
  title: string;
  instansi?: string;
  departemen?: string;
}

export interface InstitutionTemplateProps {
  plan: InstitutionPlan;
  meta: InstitutionMeta;
  generatedAt: Date;
  orgName: string;
  programName: string;
  catalogVersion: string;
}

const PAD = 80;
const GAP = 40;
const BASELINE_COLOR = "#6D7F96";
/** Perkiraan tinggi area utama (antara KPI dan footer). */
const MAIN_H = 1180;
const COHORT_ROW_H = 38;
const PERIOD_HEAD_H = 52; // header 40 + jarak 12
const BNSP_ROW_H = 39;
const NAME_ROW_H = 25;

export function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function chipLabel(d: RoleGroup["demand"][number]): string {
  return d.trackLabel ? `${d.code} · ${d.trackLabel}` : d.code;
}

/** Perkiraan jumlah baris chip paket di kartu role. */
function chipLines(group: RoleGroup, innerWidth: number): number {
  if (!group.demand.length) return 1;
  let lines = 1;
  let x = 0;
  for (const d of group.demand) {
    const w = (chipLabel(d).length + 4) * 9.6 + 28;
    if (x > 0 && x + w > innerWidth) {
      lines++;
      x = 0;
    }
    x += w + 8;
  }
  return lines;
}

function Kpi({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <Col style={{ flex: 1, backgroundColor: COLORS.paper, border: `1.5px solid ${COLORS.line}`, borderRadius: 18, padding: "20px 26px", gap: 2 }}>
      <Txt size={54} weight={800} color={COLORS.navy} style={{ lineHeight: 1.05 }}>
        {value}
      </Txt>
      <Txt size={19} weight={800} color={COLORS.muted} style={{ letterSpacing: 1.4 }}>
        {label}
      </Txt>
      <Txt size={17} color={COLORS.muted}>
        {sub ?? " "}
      </Txt>
    </Col>
  );
}

function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "center", height: 29, marginBottom: 16 }}>
      <Txt size={22} weight={800} color={COLORS.navy} style={{ letterSpacing: 2.6 }}>
        {children}
      </Txt>
      {right ?? null}
    </Row>
  );
}

function LevelLegend() {
  return (
    <Row style={{ alignItems: "center", gap: 8 }}>
      <Txt size={16} color={COLORS.muted} style={{ marginRight: 4 }}>
        Level paket
      </Txt>
      {[1, 2, 3, 4].map((l) => (
        <Row key={l} style={{ backgroundColor: COLORS.level[l], borderRadius: 6, padding: "2px 9px" }}>
          <Txt size={14} weight={800} color="#fff">
            {`Lv.${l}`}
          </Txt>
        </Row>
      ))}
      <Row style={{ backgroundColor: BASELINE_COLOR, borderRadius: 6, padding: "2px 9px" }}>
        <Txt size={14} weight={800} color="#fff">
          Baseline
        </Txt>
      </Row>
    </Row>
  );
}

function RoleCard({ group, names, namesMax, twoCols, width }: { group: RoleGroup; names: Map<string, string>; namesMax: number; twoCols: boolean; width: number }) {
  const role = group.roleId ? getRole(group.roleId) : undefined;
  const list = group.participantIds.map((id) => names.get(id) ?? "—");
  const shown = list.slice(0, namesMax);
  const more = list.length - shown.length;
  const half = Math.ceil(shown.length / 2);
  const nameMax = twoCols ? Math.floor((width - 60) / 2 / 9.2) : Math.floor((width - 40) / 9.2);
  return (
    <Col style={{ width, border: `1.5px solid ${COLORS.line}`, borderRadius: 16, backgroundColor: COLORS.paper }}>
      <Row
        style={{
          backgroundColor: group.roleId ? COLORS.navy : BASELINE_COLOR,
          padding: "14px 18px",
          alignItems: "center",
          gap: 12,
          borderTopLeftRadius: 15,
          borderTopRightRadius: 15,
        }}
      >
        <Row style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: COLORS.red, alignItems: "center", justifyContent: "center" }}>
          <Txt size={20} weight={800} color="#fff">
            {role?.functionId ?? "?"}
          </Txt>
        </Row>
        <Col style={{ flex: 1 }}>
          <Txt size={23} weight={800} color="#fff">
            {clip(group.roleName, Math.floor((width - 150) / 11.5))}
          </Txt>
          <Txt size={15} color="#C9DAEA">
            {role ? getFunction(role.functionId).name : "Tentukan role di daftar peserta"}
          </Txt>
        </Col>
        <Row style={{ alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, padding: "4px 12px" }}>
          <UsersIcon size={18} />
          <Txt size={18} weight={800} color="#fff">
            {String(group.participantIds.length)}
          </Txt>
        </Row>
      </Row>
      <Col style={{ padding: "14px 18px 16px", gap: 10 }}>
        {group.demand.length ? (
          <Row style={{ flexWrap: "wrap", gap: 8 }}>
            {group.demand.map((d) => (
              <Row key={chipLabel(d)} style={{ backgroundColor: COLORS.level[d.level], borderRadius: 8, padding: "4px 10px", gap: 6, alignItems: "center" }}>
                <Txt size={16} weight={800} color="#fff">
                  {chipLabel(d)}
                </Txt>
                <Txt size={16} weight={600} color="#E4EEF8">
                  {`×${d.count}`}
                </Txt>
              </Row>
            ))}
          </Row>
        ) : (
          <Txt size={16} color={COLORS.muted}>
            {group.roleId ? "Target level sudah tercapai" : "Belum ada rencana"}
          </Txt>
        )}
        {shown.length ? (
          twoCols ? (
            <Row style={{ gap: 14 }}>
              {[shown.slice(0, half), shown.slice(half)].map((col, ci) => (
                <Col key={ci} style={{ flex: 1, gap: 3 }}>
                  {col.map((n, i) => (
                    <Txt key={i} size={17} color={COLORS.ink}>
                      {clip(n, nameMax)}
                    </Txt>
                  ))}
                </Col>
              ))}
            </Row>
          ) : (
            <Col style={{ gap: 3 }}>
              {shown.map((n, i) => (
                <Txt key={i} size={17} color={COLORS.ink}>
                  {clip(n, nameMax)}
                </Txt>
              ))}
            </Col>
          )
        ) : null}
        {more > 0 ? (
          <Txt size={16} weight={600} color={COLORS.muted}>
            {`+${more} peserta lainnya`}
          </Txt>
        ) : null}
      </Col>
    </Col>
  );
}

function CohortRow({ c, titleMax }: { c: CohortClass; titleMax: number }) {
  const color = c.kind === "baseline" ? BASELINE_COLOR : COLORS.level[c.level];
  const inHouse = c.mode === "in-house";
  return (
    <Row style={{ alignItems: "center", gap: 12, height: COHORT_ROW_H, borderBottom: `1px solid ${COLORS.line}` }}>
      <Row style={{ width: 118, backgroundColor: color, borderRadius: 7, padding: "3px 8px", justifyContent: "center" }}>
        <Txt size={16} weight={800} color="#fff">
          {c.code}
        </Txt>
      </Row>
      <Txt size={17} weight={600} color={COLORS.ink} style={{ flex: 1 }}>
        {clip(c.trackLabel ? `${c.title} · ${c.trackLabel}` : c.title, titleMax)}
      </Txt>
      <Txt size={16} color={COLORS.muted}>
        {`${c.days} hr`}
      </Txt>
      <Txt size={17} weight={800} color={COLORS.navy} style={{ width: 74, justifyContent: "flex-end" }}>
        {`${c.participantIds.length} org`}
      </Txt>
      <Row
        style={{
          width: 124,
          justifyContent: "center",
          borderRadius: 999,
          padding: "3px 0",
          backgroundColor: inHouse ? COLORS.navy : COLORS.paper,
          border: `1.5px solid ${COLORS.navy}`,
        }}
      >
        <Txt size={14} weight={800} color={inHouse ? "#fff" : COLORS.navy}>
          {inHouse ? (c.classCount > 1 ? `IN-HOUSE ×${c.classCount}` : "IN-HOUSE") : c.classCount > 1 ? `REGULER ×${c.classCount}` : "REGULER"}
        </Txt>
      </Row>
    </Row>
  );
}

export function InstitutionTemplate({ plan, meta, generatedAt, orgName, programName, catalogVersion }: InstitutionTemplateProps) {
  const names = new Map(plan.plans.map((p) => [p.participant.id, p.participant.name]));
  const k = plan.kpi;
  const innerW = INSTITUTION_SIZE.width - PAD * 2 - GAP;
  const leftWidth = Math.round(innerW * (1.85 / 2.85));
  const rightWidth = innerW - leftWidth;

  // ---------- kartu role: batasi jumlah & nama agar muat di satu halaman
  const MAX_CARDS = 12;
  let cards = plan.roleGroups;
  let hiddenRoles = 0;
  if (cards.length > MAX_CARDS) {
    const keep = new Set([...cards].sort((a, b) => b.participantIds.length - a.participantIds.length).slice(0, MAX_CARDS - 1));
    cards = cards.filter((g) => keep.has(g));
    hiddenRoles = plan.roleGroups.length - cards.length;
  }
  const slots = cards.length + (hiddenRoles ? 1 : 0);
  const cols = Math.min(3, Math.max(1, slots));
  const cardWidth = Math.floor((leftWidth - (cols - 1) * 20) / cols);
  const cardRows = Math.max(1, Math.ceil(slots / cols));
  const cardBudget = (MAIN_H - 45 - (cardRows - 1) * 20) / cardRows;
  const cardLayout = new Map<RoleGroup, { namesMax: number; twoCols: boolean }>();
  for (const grp of cards) {
    const chipsH = chipLines(grp, cardWidth - 36) * 37;
    const fixed = 78 + 30 + chipsH + 10 + 31; // header + padding + chip + jarak + baris "+N"
    const rows = Math.max(0, Math.floor((cardBudget - fixed) / NAME_ROW_H));
    const n = grp.participantIds.length;
    const twoCols = cardWidth >= 440 && n > rows;
    cardLayout.set(grp, { namesMax: Math.min(n, twoCols ? rows * 2 : rows), twoCols });
  }

  // ---------- kolom kanan: kartu BNSP dulu, sisa tinggi untuk daftar kelas
  const bnspEnabled = plan.settings.includeBnsp;
  const bnspDraft = plan.plans.some((p) => p.bnsp.primary && !p.bnsp.verified);
  const MAX_BNSP_ROWS = 5;
  const bnspRows = plan.bnspRecap.slice(0, MAX_BNSP_ROWS);
  const bnspHidden = plan.bnspRecap.length - bnspRows.length;
  const bnspH = bnspEnabled
    ? 48 + 42 + Math.max(1, bnspRows.length) * BNSP_ROW_H + (bnspHidden ? 29 : 0) + (bnspDraft ? 44 : 0)
    : 0;
  // judul seksi 45 + cadangan baris "+N kelas lainnya" 26 + margin aman 10
  let remaining = MAIN_H - 45 - bnspH - 26 - 10;
  const periodBlocks: { p: InstitutionPlan["periods"][number]; all: CohortClass[]; shown: CohortClass[] }[] = [];
  for (const p of plan.periods) {
    const all = plan.cohorts.filter((c) => c.periodIndex === p.index);
    if (!all.length) continue;
    if (remaining < PERIOD_HEAD_H + COHORT_ROW_H) break;
    const fit = Math.floor((remaining - PERIOD_HEAD_H) / COHORT_ROW_H);
    const shown = all.slice(0, fit);
    remaining -= PERIOD_HEAD_H + shown.length * COHORT_ROW_H;
    periodBlocks.push({ p, all, shown });
  }
  const hiddenClasses = plan.cohorts.length - periodBlocks.reduce((a, b) => a + b.shown.length, 0);
  const titleMax = Math.floor((rightWidth - 118 - 60 - 74 - 124 - 48) / 9.4);

  const subtitle = [meta.instansi, meta.departemen].filter(Boolean).join(" · ");

  return (
    <Col style={{ width: INSTITUTION_SIZE.width, height: INSTITUTION_SIZE.height, backgroundColor: COLORS.paper, fontFamily: "Plus Jakarta Sans" }}>
      <div style={{ display: "flex", height: 16, backgroundColor: COLORS.red }} />
      {/* HEADER */}
      <Row style={{ backgroundColor: COLORS.navy, padding: `40px ${PAD}px 38px`, justifyContent: "space-between", alignItems: "flex-end" }}>
        <Col style={{ flex: 1, gap: 8 }}>
          <Txt size={21} weight={800} color="#9FC0E0" style={{ letterSpacing: 3.4 }}>
            {`LEARNING PATH INSTANSI · ${programName.toUpperCase()}`}
          </Txt>
          <Txt size={meta.title.length > 48 ? 50 : 62} weight={800} color="#fff" style={{ lineHeight: 1.1 }}>
            {clip(meta.title, 70)}
          </Txt>
          <Txt size={29} color="#D6E4F2">
            {subtitle ? clip(subtitle, 110) : " "}
          </Txt>
        </Col>
        <Col style={{ alignItems: "flex-end", gap: 4, marginLeft: 40 }}>
          <Txt size={17} weight={800} color="#9FC0E0" style={{ letterSpacing: 2 }}>
            PERIODE RENCANA
          </Txt>
          <Txt size={34} weight={800} color="#fff">
            {spanLabel(plan.periods)}
          </Txt>
          <Txt size={19} color="#C9DAEA">
            {plan.periods.length ? `${plan.periods.length} periode · tiap ${plan.settings.periodMonths} bulan` : "Belum ada jadwal"}
          </Txt>
        </Col>
      </Row>

      {/* KPI */}
      <Row style={{ backgroundColor: COLORS.mist, padding: `26px ${PAD}px`, gap: 20, borderBottom: `1.5px solid ${COLORS.line}` }}>
        <Kpi value={String(k.participants)} label="PESERTA" />
        <Kpi value={String(k.roles)} label="ROLE TARGET" />
        <Kpi value={String(k.packages)} label="PAKET KELAS" />
        <Kpi value={String(k.personDays)} label="HARI-ORANG" sub="total durasi pelatihan" />
        <Kpi value={String(k.classes)} label="KELAS" sub={`${k.inHouseClasses} in-house · ${k.regulerClasses} reguler`} />
        {bnspEnabled ? <Kpi value={String(k.bnspCandidates)} label="CALON UJI BNSP" /> : null}
      </Row>

      {/* MAIN */}
      <Row style={{ flexGrow: 1, padding: `30px ${PAD}px 24px`, gap: GAP }}>
        <Col style={{ width: leftWidth }}>
          <SectionTitle right={<LevelLegend />}>PETA ROLE &amp; PESERTA</SectionTitle>
          <Row style={{ flexWrap: "wrap", gap: 20, alignContent: "flex-start" }}>
            {cards.map((grp) => {
              const layout = cardLayout.get(grp)!;
              return <RoleCard key={grp.roleId ?? "none"} group={grp} names={names} namesMax={layout.namesMax} twoCols={layout.twoCols} width={cardWidth} />;
            })}
            {hiddenRoles ? (
              <Col style={{ width: cardWidth, border: `2px dashed ${COLORS.line}`, borderRadius: 16, padding: 24, justifyContent: "center", alignItems: "center" }}>
                <Txt size={30} weight={800} color={COLORS.muted}>
                  {`+${hiddenRoles} role`}
                </Txt>
                <Txt size={17} color={COLORS.muted}>
                  lihat rekap Excel
                </Txt>
              </Col>
            ) : null}
          </Row>
        </Col>

        <Col style={{ width: rightWidth }}>
          <SectionTitle
            right={
              <Txt size={17} color={COLORS.muted}>
                {`${k.classes} kelas`}
              </Txt>
            }
          >
            RENCANA KELAS PER PERIODE
          </SectionTitle>
          {periodBlocks.length === 0 ? (
            <Txt size={19} color={COLORS.muted}>
              Belum ada kelas yang perlu dijadwalkan.
            </Txt>
          ) : null}
          {periodBlocks.map(({ p, all, shown }) => (
            <Col key={p.index} style={{ marginBottom: 12 }}>
              <Row style={{ alignItems: "center", gap: 10, height: 40 }}>
                <Row style={{ backgroundColor: COLORS.sky, borderRadius: 999, padding: "4px 14px" }}>
                  <Txt size={16} weight={800} color={COLORS.navy}>
                    {`PERIODE ${p.index + 1}`}
                  </Txt>
                </Row>
                <Txt size={19} weight={800} color={COLORS.navy}>
                  {p.label}
                </Txt>
                <Txt size={16} color={COLORS.muted}>
                  {`${all.length} paket`}
                </Txt>
              </Row>
              {shown.map((c) => (
                <CohortRow key={c.key} c={c} titleMax={titleMax} />
              ))}
            </Col>
          ))}
          {hiddenClasses > 0 ? (
            <Txt size={17} weight={600} color={COLORS.muted}>
              {`+${hiddenClasses} kelas lainnya — lihat rekap Excel`}
            </Txt>
          ) : null}

          {bnspEnabled ? (
            <Col
              style={{
                marginTop: "auto",
                border: `1.5px solid ${COLORS.line}`,
                borderTop: `8px solid ${COLORS.red}`,
                borderRadius: 16,
                padding: "18px 22px",
                gap: 8,
              }}
            >
              <Row style={{ alignItems: "center", gap: 10, height: 34 }}>
                <Row style={{ width: 34, height: 34, borderRadius: 34, backgroundColor: COLORS.red, alignItems: "center", justifyContent: "center" }}>
                  <SealIcon size={20} />
                </Row>
                <Txt size={21} weight={800} color={COLORS.red} style={{ letterSpacing: 2.2 }}>
                  REKAP SERTIFIKASI BNSP
                </Txt>
              </Row>
              {bnspRows.length === 0 ? (
                <Txt size={18} color={COLORS.muted}>
                  Belum ada skema yang bisa dijadwalkan pada target ini.
                </Txt>
              ) : null}
              {bnspRows.map((r) => (
                <Row key={`${r.schemeId}-${r.periodIndex}`} style={{ alignItems: "center", gap: 12, height: 31 }}>
                  <Txt size={18} weight={600} color={COLORS.ink} style={{ flex: 1 }}>
                    {clip(r.name, 42)}
                  </Txt>
                  <Txt size={16} color={COLORS.muted}>
                    {r.periodIndex !== undefined ? plan.periods[r.periodIndex]?.label ?? "" : ""}
                  </Txt>
                  <Txt size={18} weight={800} color={COLORS.red} style={{ width: 70, justifyContent: "flex-end" }}>
                    {`${r.participantIds.length} org`}
                  </Txt>
                </Row>
              ))}
              {bnspHidden > 0 ? (
                <Txt size={16} color={COLORS.muted}>
                  {`+${bnspHidden} skema lainnya`}
                </Txt>
              ) : null}
              {bnspDraft ? (
                <Row style={{ backgroundColor: "#FFF4E0", borderRadius: 8, padding: "6px 10px", marginTop: 4 }}>
                  <Txt size={15} weight={600} color={COLORS.warn}>
                    Pemetaan skema masih draf — konfirmasi ke penyelenggara sebelum pendaftaran uji.
                  </Txt>
                </Row>
              ) : null}
            </Col>
          ) : null}
        </Col>
      </Row>

      {/* FOOTER */}
      <Row style={{ backgroundColor: COLORS.navy, padding: `18px ${PAD}px`, justifyContent: "space-between", alignItems: "center" }}>
        <Txt size={17} color="#C9DAEA">
          {`Dibuat ${formatDateId(generatedAt)} · ${orgName}`}
        </Txt>
        <Txt size={17} color="#C9DAEA">
          {`Katalog ${programName} v${catalogVersion} · kelas in-house bila min. ${plan.settings.inHouseMin} peserta · jadwal indikatif`}
        </Txt>
      </Row>
    </Col>
  );
}
