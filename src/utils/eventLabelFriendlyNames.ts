/**
 * Human-friendly titles for Event labels / Alarms Info rows (machine `label_type` codes in parentheses).
 * Keys mirror `EVENT_ALARM_GROUPS` in `server/src/config/dashboardMatrixConfig.ts`.
 */
const EVENT_LABEL_FRIENDLY: Record<string, string> = {
  // Tracking / Telematics
  trckpnt: 'Periodic report with Ignition ON',
  prdtst: 'Periodic test / heartbeat',
  ignon: 'Ignition turned ON',
  ignoff: 'Ignition turned OFF',
  panic: 'Panic / SOS',
  pwrloss: 'Power loss',
  pwrrstd: 'Power restored',
  lwbatt: 'Low battery',
  stp: 'Stop / trip end',
  // Driving Behavior
  spd: 'Speeding',
  spdend: 'Speeding ended',
  idl: 'Idling',
  idlend: 'Idling ended',
  posac: 'Harsh acceleration',
  negac: 'Harsh braking',
  aggr: 'Aggressive driving',
  aggdrvcrv: 'Aggressive curve',
  crnrleft: 'Hard corner (left)',
  crnrright: 'Hard corner (right)',
  coldet: 'Collision detection',
  crash: 'Crash',
  agglnchng: 'Aggressive lane change',
  // ADAS & DMS (Mobileye / MDAS-style codes)
  mblypdfcw: 'Pedestrian forward collision warning',
  mblyhdwrn: 'Headway distance warning',
  mblyrldw: 'Road departure warning',
  mblylldw: 'Lane departure warning',
  mblypddng: 'Pedestrian detection',
  mblyfcw: 'Forward collision warning',
  adastlgt: 'ADAS traffic light',
  mblyspd: 'Speed assist',
  mdasfvsa: 'Forward vehicle start alert',
  mdasfpw: 'Forward pedestrian warning',
  mblybrkon: 'Automatic braking',
  mblywprs: 'Wiper state',
  ftgwarning: 'Fatigue warning',
  ftgalarm: 'Fatigue alarm',
  ftgdrvmis: 'Driver missing',
  ftgdistrct: 'Distraction',
  ftgcamphon: 'Phone use (in-cabin)',
  ftgnosblt: 'No seatbelt',
  ftgcamsmok: 'Smoking (in-cabin)',
  ftgcamblck: 'Camera blocked',
  ftgfoodrnk: 'Eating / drinking',
}

export function friendlyEventLabelTitle(labelId: string): string {
  const k = labelId.trim().toLowerCase()
  return EVENT_LABEL_FRIENDLY[k] ?? titleCaseFromCode(labelId)
}

function titleCaseFromCode(id: string): string {
  const t = id.replace(/[-_]/g, ' ').trim()
  if (!t) return id
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
