# Influx Bucket Audit

## Audit Metadata

- **Org:** `DCT`
- **Bucket:** `pegasus256`
- **Audit window:** `-12h`
- **Providers measurement env:** `providers`
- **Event label fields env:** `label_type`

## Measurements Found

- **`event`**
- **`posted_speed_limits`**
- **`providers`**
- **`trips`**

## Tags/Fields by Measurement

### `event`

- **Tag keys:** `_field`, `_measurement`, `_start`, `_stop`, `label`, `vid`
- **Field keys:** `bl`, `dev_dist`, `dev_idle`, `dev_ign`, `dphoto_ptr`, `ecu_battery`, `ecu_cool_tmp`, `ecu_ddemand`, `ecu_def_tmp`, `ecu_dist`, `ecu_eidle`, `ecu_eng_oil_psi`, `ecu_eusage`, `ecu_ifuel`, `ecu_rpm`, `ecu_speed`, `ecu_tfuel`, `event_id`, `event_time`, `kph`, `lat`, `lon`, `mph`, `photo_status`, `pid`, `primary_name`, `tx`, `valid_position`, `vehicle_dev_dist`, `vinfo.description`, `vinfo.license_plate`, `vinfo.make`, `vinfo.model`, `vinfo.tank_unit`, `vinfo.tank_volume`, `vinfo.vin`, `vinfo.year`

### `posted_speed_limits`

- **Tag keys:** `_field`, `_measurement`, `_start`, `_stop`, `label`, `vid`
- **Field keys:** `address`, `aid`, `comdelay`, `dev_dist`, `dev_idle`, `dev_ign`, `driver`, `ecu_dist`, `ecu_eidle`, `ecu_eusage`, `ecu_tfuel`, `event_time`, `hdop`, `head`, `kph`, `label_gps`, `lat`, `lon`, `primary_group`, `primary_group_name`, `primary_name`, `speed_difference`, `speed_limit`, `sv`, `valid_position`

### `providers`

- **Tag keys:** `_field`, `_measurement`, `_start`, `_stop`, `label`, `nameFieldGroup`, `primary_group`, `primary_name`, `provider`, `vid`
- **Field keys:** `arrayFields`, `arrayProviders`, `arrayVehicles`, `comdelay`, `count`, `dev_dist`, `dev_idle`, `dev_ign`, `dev_orpm`, `dev_ospeed`, `device_id`, `ecu_dist`, `ecu_eidle`, `ecu_eusage`, `ecu_ifuel`, `ecu_tfuel`, `event_count`, `event_time`, `hdop`, `head`, `label_dscrptn_cs`, `label_dscrptn_en`, `label_dscrptn_es`, `label_dscrptn_fr`, `label_dscrptn_pl`, `label_dscrptn_pt`, `label_type`, `lat`, `lon`, `primary_group_name`, `speed`, `system_time`, `valid_position`, `vehCount`

### `trips`

- **Tag keys:** `_field`, `_measurement`, `_start`, `_stop`, `label`, `primary_group`, `primary_name`, `vid`
- **Field keys:** `end_time_rfc3339`, `end_time_ts`, `end_trip_lat`, `end_trip_lon`, `license_plate`, `partition`, `primary_group_name`, `start_time_rfc3339`, `start_time_ts`, `start_trip_lat`, `start_trip_lon`, `trip_dist_mileage`, `trip_fuel_wear`, `trip_score`, `uuid`, `vin`


## Important Provider Values (Top)

| provider | count |
|---|---:|
| `arrendamex` | 842 |
| `autotracking` | 875 |
| `btg` | 458 |
| `encontrack` | 22 |
| `fleetup` | 34553 |
| `ftr` | 22 |
| `geotrucks` | 444 |
| `hunter` | 517041 |
| `innovalinks` | 1196 |
| `json receiver` | 22 |
| `localizadores gts` | 672 |
| `logitrack` | 1396 |
| `lojack` | 73 |
| `mastertrack` | 22 |
| `motum` | 735 |
| `numaris` | 898 |
| `ontracking` | 92 |
| `pegasus-cloud` | 1905 |
| `pegasus-iot-cloud` | 301187 |
| `queclink` | 1318 |
| `rec` | 22 |
| `resser` | 481 |
| `retransmitters` | 9389 |
| `samsara` | 5855 |
| `santrack` | 430 |
| `sitrack` | 1275 |
| `technologistic` | 178 |
| `telematics_advance` | 958 |
| `teltonika` | 125074 |
| `totalProvidersVehicles` | 33 |
| `tracksolid` | 907 |
| `traffilog` | 22 |
| `ubicamovil` | 710 |

## Important Label Values (Top from label_count)

| label value | count |
|---|---:|
| `45thon` | 1 |
| `aggdrvcrv` | 71 |
| `aggr` | 396 |
| `battchg` | 2 |
| `coldet` | 40 |
| `cooltmpexc` | 5 |
| `diagmsg` | 3 |
| `dvon` | 331 |
| `ftgalarm` | 1 |
| `ftgcamblck` | 8 |
| `ftgcamphon` | 17 |
| `ftgcamphow` | 10 |
| `ftgcamsmok` | 3 |
| `ftgcamsmow` | 4 |
| `ftgdistrct` | 12 |
| `ftgdistrcw` | 19 |
| `ftgfoodrnk` | 3 |
| `ftgfoodrnw` | 5 |
| `ftgnosblt` | 5 |
| `ftgnosbltw` | 3 |
| `ftgphonend` | 2 |
| `ftgwarning` | 8 |
| `gpson` | 17 |
| `gtvgf` | 10 |
| `gtvgn` | 15 |
| `idl` | 575 |
| `idlend` | 512 |
| `ignoff` | 2205 |
| `ignon` | 2781 |
| `in1off` | 2 |
| `in1on` | 2 |
| `in2off` | 1 |
| `in2on` | 1 |
| `jamdet` | 10 |
| `lwbatt` | 38 |
| `mblyhdwrn` | 1 |
| `mov` | 691 |
| `negac` | 1204 |
| `nogps` | 1 |
| `overrpm` | 328 |
| `panic` | 3 |
| `posac` | 643 |
| `position` | 843 |
| `prdcscls` | 2 |
| `prdcsopn` | 7 |
| `prdtst` | 1297 |
| `pwrloss` | 66 |
| `pwroff` | 2 |
| `pwrrstd` | 246 |
| `recovery` | 8 |
| `rlrdxing` | 1 |
| `rstnoact` | 9 |
| `rstnonet` | 1 |
| `slpon` | 9 |
| `spd` | 866 |
| `spdend` | 5 |
| `stp` | 1651 |
| `stpchrg` | 36 |
| `tow` | 289 |
| `towend` | 91 |
| `trckpnt` | 35775 |
| `tripend` | 651 |
| `tripstrt` | 711 |
| `vbr` | 3 |
| `ver` | 13 |
| `wkpign` | 1 |
| `wkptmr` | 5 |

## Candidate Data-Richness Fields

### GPS Satellites

| candidate field | observed in window | top measurements |
|---|---|---|
| `satellites` | no | _not observed_ |
| `gps_satellites` | no | _not observed_ |
| `sats` | no | _not observed_ |
| `nsat` | no | _not observed_ |

### DOP

| candidate field | observed in window | top measurements |
|---|---|---|
| `dop` | no | _not observed_ |
| `pdop` | no | _not observed_ |
| `hdop` | yes | `posted_speed_limits` (83533), `providers` (27765) |
| `vdop` | no | _not observed_ |

### Instant acceleration

| candidate field | observed in window | top measurements |
|---|---|---|
| `instant_acceleration` | no | _not observed_ |
| `acceleration` | no | _not observed_ |
| `accel` | no | _not observed_ |
| `imu_accel_x` | no | _not observed_ |
| `imu_accel_y` | no | _not observed_ |
| `imu_accel_z` | no | _not observed_ |

### Engine odometer

| candidate field | observed in window | top measurements |
|---|---|---|
| `engine_odometer` | no | _not observed_ |
| `odometer` | no | _not observed_ |
| `ecu_odometer` | no | _not observed_ |
| `dev_dist` | yes | `event` (235967), `posted_speed_limits` (226686), `providers` (69410) |
| `dev_dist__km` | no | _not observed_ |

### Engine hourmeter

| candidate field | observed in window | top measurements |
|---|---|---|
| `engine_hourmeter` | no | _not observed_ |
| `hourmeter` | no | _not observed_ |
| `engine_hours` | no | _not observed_ |
| `dev_idle` | yes | `event` (235103), `posted_speed_limits` (200505), `providers` (66670) |


## Reliability / Ambiguity Notes

- The providers measurement appears to contain mixed telemetry and metadata fields; field semantics are not uniform across all providers.
- Label values can be multilingual / code-based depending on field key; label_type is the safest canonical key for grouping.
- Presence of a field does not imply reliable coverage across all providers/vehicles; this audit shows availability, not quality SLA.

## Dashboard Supportability from Bucket

| Dashboard Row | Supportable from bucket today? | Notes |
|---|---|---|
| Number of Entities | Yes (live) | Distinct `vid` by `provider` is directly queryable. |
| Integration % | Not yet | Requires external capability baseline + verification evidence (not in bucket alone). |
| Event labels / Alarms Info | Partial | Label signals are present (`label_count` + label fields), but matrix support semantics still require business mapping. |
| Event Data Fields / Data Richness | Partial | Candidate telemetry fields exist, but canonical field mapping and data quality policy still needed. |
| Risk Index Enablement | Not yet | Needs hybrid formula inputs (including computable Integration % + operational readiness evidence). |
