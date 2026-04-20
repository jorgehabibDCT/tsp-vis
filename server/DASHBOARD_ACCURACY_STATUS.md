# Dashboard Accuracy Status

Concise internal snapshot of truth status for `GET /api/dashboard/tsp-comparison`.

| Row | Source Type | Fully Computable Today | Current Status | Missing Dependencies (if any) |
|---|---|---:|---|---|
| Number of Entities | `live_influx` | Yes | **live** | — |
| Integration % | `hybrid` (proposed) | No | **placeholder / pending formula** | Capability baseline registry, verification evidence feed, check-to-capability mapping |
| Event labels / Alarms Info | `curated_matrix` | Yes (as curated matrix) | **curated** | No blocker for current matrix mode (not intended as live event frequency) |
| Event Data Fields / Data Richness | `curated_matrix` | Yes (as curated matrix) | **curated** | No blocker for current matrix mode |
| Risk Index Enablement | `hybrid` (proposed weighted score) | No | **curated / pending formula** | Computable Integration %, operational readiness evidence source, finalized weighting governance |

## Notes

- `Integration %` and `Risk Index Enablement` have explicit formula proposals in backend config, but remain non-computable until required inputs are wired.
- Frontend contract and API route behavior are unchanged by this document.
