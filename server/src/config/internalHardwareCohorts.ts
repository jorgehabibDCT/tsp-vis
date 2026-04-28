export const INTERNAL_HARDWARE_COHORTS = [
  {
    id: 'cohort-internal-teltonika',
    name: 'Teltonika',
    slug: '__internal_teltonika',
    mongoFilter: { 'deviceVersion.device': 'teltonika' } as const,
  },
  {
    id: 'cohort-internal-lynx',
    name: 'Lynx',
    slug: '__internal_lynx',
    mongoFilter: { 'deviceVersion.model': 'Syrus Lynx' } as const,
  },
  {
    id: 'cohort-internal-antares',
    name: 'Antares',
    slug: '__internal_antares',
    mongoFilter: {
      $and: [
        { 'deviceVersion.device': 'syrus' },
        { 'deviceVersion.extras': 'EG912U' },
      ],
    } as const,
  },
  {
    id: 'cohort-internal-syrus',
    name: 'Syrus',
    slug: '__internal_syrus',
    mongoFilter: {
      $and: [
        { 'deviceVersion.device': 'syrus' },
        {
          $nor: [
            { 'deviceVersion.model': 'Syrus Lynx' },
            { 'deviceVersion.extras': 'EG912U' },
          ],
        },
      ],
    } as const,
  },
] as const

export const INTERNAL_HARDWARE_COLUMN_ORDER = INTERNAL_HARDWARE_COHORTS.map(
  (c) => c.id,
)

export const TELTONIKA_INTERNAL_COHORT_SLUG = '__internal_teltonika' as const
export const TELTONIKA_PROVIDER_SLUG = 'teltonika' as const

export type InternalHardwareCohort = (typeof INTERNAL_HARDWARE_COHORTS)[number]
