# Grafana ↔ Dashboard provider alignment

**User-facing positioning (summary):** The dashboard is a **branded comparison matrix**; **live** bucket/Grafana-aligned behavior exists **only** where a column has a validated `provider` mapping. It is **not** a complete operational provider leaderboard. The app header states this briefly; this document is the deeper alignment reference.

**Purpose:** Record how the bucket/Grafana “provider universe” relates to the current TSP comparison dashboard columns, using **Grafana screenshot evidence** as the practical reference for which `provider` values matter in operations—not only the original branded column list.

**Scope:** Interpretation and product/strategy alignment. See `INFLUX_BUCKET_AUDIT.md` and `audit-output/providers.json` for automated bucket scans; Grafana panels (`Tipo de Evento por TSP`, ranked provider tables) reflect the same bucket in day-to-day use. Per-TSP CSV sample evidence: `TSP_AUDIT_CSV_MAPPING.md` (from `TSP Data Apr 20 2026 Audit.csv`).

---

## 1. Provider names observed from Grafana screenshots

The following `provider`-style values were called out from Grafana (same bucket as the app; used in bar charts and ranked provider/value tables). List is **as provided**; Grafana may show additional series depending on panel filters and time range.

| Provider (as observed) |
|---|
| hunter |
| fleetup |
| ftr |
| queclink |
| samsara |
| rec |
| logitrack |
| innovalinks |
| sitrack |
| ontracking |
| telematics_advance |
| autotracking |
| localizadores gts |
| motum |
| numaris |
| technologistic |
| arrendamex |
| resser |
| santrack |
| ubicamovil |
| geotrucks |
| traffilog |
| lojack |

**Note:** Bucket audits also list other high-volume providers (e.g. `pegasus-iot-cloud`, `teltonika`, `retransmitters`) that may appear in Grafana under different panels or filters. This document prioritizes the **screenshot-backed set** for alignment with “what Grafana is actually surfacing” in the cited views.

---

## 2. Current dashboard columns vs Grafana set

### Dashboard columns (19)

Fixed branded columns in `DASHBOARD_TSPS` (`server/src/config/dashboardMatrixConfig.ts`), each with a `providerSlug` (live) or explicit `null` (unmapped).

### Overlap: Grafana provider ∈ dashboard live mapping

These Grafana names **coincide** with a **confident** `providerSlug` on a dashboard column (exact bucket tag, including space for Localizadores):

| Grafana / bucket `provider` | Dashboard column (display name) |
|-------------------------------|----------------------------------|
| `santrack` | SANTRACK INTERNACIONAL |
| `technologistic` | TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX) |
| `ontracking` | ONTRACKING GPS REMOTE METRICS |
| `autotracking` | AUTOTRACKING WORLD CONNECT |
| `hunter` | HUNTER |
| `localizadores gts` | LOCALIZADORES GTS |

**Count:** **6** dashboard columns with **direct, confident** alignment to both Grafana and bucket usage.

### Grafana providers with **no** dashboard column (in this screenshot set)

Present in Grafana list **but not** represented as any of the 19 branded columns (no home for live join in the current matrix):

| Provider |
|----------|
| fleetup |
| ftr |
| queclink |
| samsara |
| rec |
| logitrack |
| innovalinks |
| sitrack |
| telematics_advance |
| motum |
| numaris |
| arrendamex |
| resser |
| ubicamovil |
| geotrucks |
| traffilog |
| lojack |

**Count:** **16** Grafana-highlighted providers lack a dashboard column.

### Dashboard columns with **no** Grafana overlap (screenshot set)

Branded columns that **do not** appear under the screenshot provider list—**live-backed rows stay unmapped** (`providerSlug: null`) unless overridden via `TSP_PROVIDER_SLUGS`:

- SKYMEDUZA  
- SKYGUARDIAN  
- PHOENIX TELEMATICS  
- TECNO-GPS  
- ITRACK  
- TTC TOTAL TRACKING CENTER  
- GRUPO COMERCIAL ADS LOGIC DE MÉXICO  
- TECNOLOGÍA SERVICIOS Y VISION  
- NAVMAN WIRELESS DE MÉXICO  
- GORILAMX  
- ATLANTIDA  
- BLAC  
- MOTORLINK  

**Count:** **13** columns behave as **brand placeholders** for live Influx (entities + event-label threshold) until a validated `provider` mapping exists.

---

## 3. Confident real-bucket / Grafana alignment (current code)

Columns where **`providerMappingConfidence === 'confident'`** and slug matches operational Grafana/bucket usage for the names above:

1. SANTRACK INTERNACIONAL → `santrack`  
2. TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX) → `technologistic`  
3. ONTRACKING GPS REMOTE METRICS → `ontracking`  
4. AUTOTRACKING WORLD CONNECT → `autotracking`  
5. HUNTER → `hunter`  
6. LOCALIZADORES GTS → `localizadores gts` (space-sensitive tag)

All other columns: **`providerSlug: null`**, **`unmapped`** — curated mock for expandable metrics; entities row shows `null` when unmapped (no fabricated live counts).

---

## 4. Mismatch analysis (explicit)

### Represented well

- **Six** brands line up **1:1** with high-signal Grafana/bucket providers: live **Number of Entities** and **Event labels (50% vehicle coverage)** apply when Influx is configured.
- Alignment is **tag-exact** (including `localizadores gts` with a space).

### Represented weakly

- **Thirteen** columns are still **brand-only** for live data: no Grafana-listed `provider` assigned—dashboard reads as a **comparison of marketing labels**, not of those operational streams.
- Any future mapping from brand → `provider` must stay **evidence-based**; several brands may map to the **same** bucket provider or to none, depending on tenant reality.

### Grafana-important providers with no dashboard home

- **Sixteen** providers from the screenshot set have **no column**—operators seeing `Tipo de Evento por TSP` for **fleetup**, **samsara**, **queclink**, etc. **cannot** land that slice of reality on the current 19-column matrix without structural or mapping work.

### Brand placeholders without bucket/Grafana evidence (in this set)

- The **13** unmapped columns above: **no** screenshot-listed `provider` maps to them; they remain **honest placeholders** (no fake live numbers by default).

---

## 5. Brand comparison vs real active-provider comparison

| Lens | Current dashboard behavior |
|------|----------------------------|
| **Intent (UX)** | Side-by-side **branded TSPs** (logos, fixed column order)—a **brand comparison** matrix. |
| **Live data** | Only columns with a validated `providerSlug` participate in **real bucket/Grafana-style** entity and label coverage joins. |
| **Practical read** | The product is **still primarily brand-oriented**; **live** behavior matches **Grafana’s provider dimension** only for the **six** aligned columns. Grafana’s ranked table is closer to a **real active-provider comparison** across the screenshot list. |

**Conclusion:** Today the dashboard behaves as a **hybrid**: **brand matrix shell** + **partial live overlay** aligned with a subset of Grafana’s important providers. It is **not** yet a full **live-provider matrix** for the Grafana universe.

---

## 6. Recommended next steps (options)

### Option A — Keep branded columns; accept partial live mapping (status quo direction)

- Preserve the **19 brand columns** for product/comms consistency.
- Gradually add **`providerSlug`** only where evidence ties a brand to one bucket `provider` (Grafana + ops validation).
- **Pros:** Stable UI story; **Cons:** High-volume Grafana providers (e.g. fleetup, samsara) stay **invisible** as columns until explicitly added or linked.

### Option B — Pivot columns toward Grafana-observed providers

- Redefine column identity around **`provider` tags** that Grafana ranking shows as material (optionally top-N by volume/events).
- Brands become **metadata** (labels/tooltips) where known, not primary column keys.
- **Pros:** Aligns default view with **operational reality**; **Cons:** Major product/UX change; logo/brand matrix story shifts.

### Option C — Two modes (future)

- **Branded matrix** — current layout; best for executive “who we compare” narrative.
- **Live-provider matrix** — dynamic or configurable slice over `provider` from bucket/Grafana (with caps, search, or env-driven list).
- **Pros:** Serves both audiences; **Cons:** Design, API, and caching work.

**Recommendation (for strategy discussion):** If Grafana is the **source of truth for “what matters in the bucket,”** **Option B or C** eventually reduces mismatch pain; **Option A** is viable short-term if the dashboard must remain a **fixed brand scorecard** with **explicit** partial live truth (documented here). The screenshot list supports prioritizing which **missing** providers (fleetup, samsara, queclink, sitrack, …) to add or map first **when** the team is ready to change scope—not in this documentation-only slice.

---

## 7. Changelog

| Date | Change |
|------|--------|
| (this document) | Initial alignment pass from Grafana screenshot provider list vs `DASHBOARD_TSPS` / confident slugs. |
