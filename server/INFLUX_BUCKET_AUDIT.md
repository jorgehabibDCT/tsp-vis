# Influx Bucket Audit

## Audit Status

- **Execution status:** Not executed in this workspace yet
- **Reason:** `INFLUX_HOST`, `INFLUX_TOKEN`, `INFLUX_ORG`, and `INFLUX_BUCKET` are not configured locally
- **Audit script:** `npm run audit:influx` (from `server/`)
- **Configurable window:** `INFLUX_AUDIT_RANGE` (defaults to `-30d`)

## What the Audit Script Collects

The script at `server/src/scripts/auditInfluxBucket.ts` inspects:

1. measurement names
2. field keys per measurement
3. tag keys per measurement
4. top providers in the configured providers measurement
5. top label values from `label_count` records (using configured label fields)
6. candidate field availability for:
   - GPS Satellites
   - DOP
   - Instant acceleration
   - Engine odometer
   - Engine hourmeter
7. supportability notes for current/future dashboard rows

## Expected Generated Artifacts (after running audit)

- `server/INFLUX_BUCKET_AUDIT.md` (this file, overwritten with live audit results)
- `server/audit-output/measurements.json`
- `server/audit-output/providers.json`
- `server/audit-output/labels.json`
- `server/audit-output/field-availability.json`

## Pre-Audit Observations (from existing project evidence)

- The dashboard already successfully queries entity counts from Influx (`provider` + distinct `vid` flow).
- Existing logs indicate meaningful provider and label signals in the bucket (e.g., providers like `autotracking`, `hunter`, `pegasus-iot-cloud`; labels like `aggr`, `aggdrvcrv`).
- Data-richness fields likely need explicit canonical mapping due mixed telemetry/metadata schema patterns.

## Dashboard Metric Supportability Expectations

- **Number of Entities:** expected supportable from bucket now
- **Integration %:** requires external capability baseline + verification evidence (not bucket-only)
- **Event labels / Alarms Info:** bucket has label signals, but support-matrix semantics still require business mapping
- **Event Data Fields / Data Richness:** bucket likely has candidate fields, but canonical field and quality policy needed
- **Risk Index Enablement:** depends on hybrid inputs (including computable Integration %), not bucket-only

## How to Execute

From repo root:

```bash
cd server
INFLUX_HOST=... \
INFLUX_TOKEN=... \
INFLUX_ORG=... \
INFLUX_BUCKET=... \
INFLUX_AUDIT_RANGE=-30d \
npm run audit:influx
```
