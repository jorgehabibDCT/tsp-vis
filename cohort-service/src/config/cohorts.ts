import type { CohortSlug } from '../types.js'

export type CohortDefinition = {
  id: string
  name: string
  slug: CohortSlug
  mongoFilter: Record<string, unknown>
}

export const COHORT_DEFINITIONS: CohortDefinition[] = [
  {
    id: 'cohort-internal-teltonika',
    name: 'Teltonika',
    slug: '__internal_teltonika',
    mongoFilter: { 'deviceVersion.device': 'teltonika' },
  },
  {
    id: 'cohort-internal-lynx',
    name: 'Lynx',
    slug: '__internal_lynx',
    mongoFilter: { 'deviceVersion.model': 'Syrus Lynx' },
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
    },
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
    },
  },
]

export const TELTONIKA_SLUG: CohortSlug = '__internal_teltonika'
export const TELTONIKA_PROVIDER_SLUG = 'teltonika'
