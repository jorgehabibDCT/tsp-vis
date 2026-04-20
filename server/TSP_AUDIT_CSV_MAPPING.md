# TSP Data Apr 20 2026 Audit.csv → dashboard mapping decisions

**Source file (repo root):** `TSP Data Apr 20 2026 Audit.csv`  
**Convention:** `properties_tag` = bucket-facing Influx `provider` candidate; `groupName` = business/human context.

## Rows used for mapping upgrades

| groupName (CSV) | properties_tag | Dashboard column | Decision |
|-----------------|------------------|------------------|----------|
| Telematics_advance Integracion | `telematics_advance` | **TECNO-GPS** | **plausible_pending** — telematics scope aligns; CSV name ≠ dashboard legal name; confirm with ops before promoting to confident. |

## Rows reinforcing existing confident mappings (no code change)

These CSV rows **support** slugs already marked **confident** in `dashboardMatrixConfig.ts`:

| groupName | properties_tag | Dashboard |
|-----------|----------------|-----------|
| Santrack Internacional | `santrack` | SANTRACK INTERNACIONAL |
| Technologistic | `technologistic` | TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX) |
| Autotracking World Connect | `autotracking` | AUTOTRACKING WORLD CONNECT |
| Hunter | `hunter` | HUNTER |
| LOCALIZADORES GTS SA DE CV | `localizadores gts` | LOCALIZADORES GTS |

**ONTRACKING:** The CSV includes `ontracking` only on a **test** row (`francisco test`); we **do not** use that row as evidence. The dashboard column **ONTRACKING GPS REMOTE METRICS** remains **confident** on prior audit/Grafana alignment, not this row.

## Rows explicitly not used for dashboard mapping

| Reason | Examples |
|--------|----------|
| Placeholder / missing group | `--` with `ftr`, `logitrack`, `rec`, `samsara` |
| Test / pruebas | `DCT Pruebas` → innovalinks; `francisco test` → ontracking |
| Personal name | `SHARON ITZEL VARGAS MARTINEZ` → queclink |
| Customer / fleet / account-style name (not TSP brand column) | `AUTOS UTILITARIOS` → fleetup; `Refinado Sur` → traffilog; `Q-Connect` → ubicamovil |
| No matching dashboard column | Arrendamex, Geotrucks Inc, LoJack, MOTUM, Numaris, RESSER, INTEGRADORA… (sitrack), etc. |

**INTEGRADORA DE SERVICIOS DE TRANSPORTACION XIHUTEC SA DE CV** (`sitrack`): not mapped to **TTC TOTAL TRACKING CENTER** — acronym/branding link to that legal name is **not** strong enough for a slug assignment.

## Summary

- **New** mapping from this CSV pass: **TECNO-GPS** → `telematics_advance` (**plausible_pending** only).
- **Confident** count unchanged (six columns). One column moved from **unmapped** to **plausible_pending**; twelve columns remain **unmapped**.
