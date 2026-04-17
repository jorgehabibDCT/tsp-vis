import { Router } from 'express'
import { getTspComparisonDashboard } from '../services/tspComparisonService.js'

export const dashboardRouter = Router()

dashboardRouter.get('/tsp-comparison', (_req, res) => {
  res.json(getTspComparisonDashboard())
})
