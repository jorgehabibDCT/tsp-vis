import { useMemo } from 'react'
import type { TspComparisonResponse } from '../contracts/tspComparison'
import {
  buildIntegratedProviderCards,
  computeTopOpportunities,
} from '../insights/providerOpportunityModel'

type ProviderOpportunityPanelProps = {
  model: TspComparisonResponse
}

export function ProviderOpportunityPanel({ model }: ProviderOpportunityPanelProps) {
  const cards = useMemo(
    () => buildIntegratedProviderCards(model),
    [model],
  )
  const insights = useMemo(() => computeTopOpportunities(model), [model])

  return (
    <section
      className="provider-opportunity-panel"
      aria-label="Provider opportunity summary"
    >
      <div className="provider-opportunity-panel__head">
        <h2 className="provider-opportunity-panel__title">Provider opportunity</h2>
        <p className="provider-opportunity-panel__lede">
          Evidence-first snapshot for integrated providers only (excludes pending
          integration columns). Uses the same matrix inputs as the table below.
        </p>
      </div>

      <div className="provider-opportunity-panel__grid">
        {cards.map((c) => (
          <article
            key={c.tspId}
            className={`provider-opportunity-card${c.isCsvColumn ? ' provider-opportunity-card--csv' : ''}`}
          >
            <h3 className="provider-opportunity-card__name">{c.name}</h3>
            <dl className="provider-opportunity-card__stats">
              <div className="provider-opportunity-card__row">
                <dt>Entities</dt>
                <dd>
                  {c.entities !== null
                    ? new Intl.NumberFormat(undefined, {
                        maximumFractionDigits: 0,
                      }).format(c.entities)
                    : '—'}
                </dd>
              </div>
              <div className="provider-opportunity-card__row">
                <dt>Event breadth</dt>
                <dd title="Supported event labels ÷ total matrix labels">
                  {c.eventBreadthText}
                </dd>
              </div>
              <div className="provider-opportunity-card__row">
                <dt>Event depth</dt>
                <dd title="Mean of available child label coverage % (live merge only)">
                  {c.eventDepthAvgPct !== null ? `${c.eventDepthAvgPct}%` : '—'}
                </dd>
              </div>
              <div className="provider-opportunity-card__row">
                <dt>Data richness</dt>
                <dd title="Direct = 1, proxy = 0.5, unsupported field = 0 per audit">
                  {c.dataRichnessText}{' '}
                  <span className="provider-opportunity-card__sub">
                    ({c.dataRichnessPct}%)
                  </span>
                </dd>
              </div>
              <div className="provider-opportunity-card__row">
                <dt>Mapping</dt>
                <dd>
                  <span className="provider-opportunity-card__mapping">
                    {c.mappingLabel}
                  </span>
                  {c.providerSlug ? (
                    <span
                      className="provider-opportunity-card__slug"
                      title="Influx provider tag"
                    >
                      {c.providerSlug}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {insights.length > 0 && (
        <div className="provider-opportunity-panel__insights">
          <h3 className="provider-opportunity-panel__insights-title">
            Top opportunities
          </h3>
          <ul className="provider-opportunity-panel__insight-list">
            {insights.map((i) => (
              <li key={i.label}>
                <span className="provider-opportunity-panel__insight-label">
                  {i.label}
                </span>
                <span className="provider-opportunity-panel__insight-detail">
                  {i.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
