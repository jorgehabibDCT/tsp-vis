import { Router } from 'express'
import { getTspComparisonDashboard } from '../services/tspComparisonService.js'

export const dashboardRouter = Router()

dashboardRouter.get('/tsp-comparison', async (_req, res, next) => {
  try {
    res.json(await getTspComparisonDashboard())
  } catch (e) {
    next(e)
  }
})
