export function getMongoUri(): string {
  const raw =
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGO_URI?.trim() ||
    process.env.MONGO_URL?.trim()
  if (!raw) {
    throw new Error('MONGODB_URI (or MONGO_URI / MONGO_URL) is not set')
  }
  return raw
}

export function isMongoConfigured(): boolean {
  return Boolean(
    process.env.MONGODB_URI?.trim() ||
      process.env.MONGO_URI?.trim() ||
      process.env.MONGO_URL?.trim(),
  )
}

export function getMongoDbName(): string {
  return process.env.MONGO_DB?.trim() || 'data_org'
}

export function getMongoVehiclesCollectionName(): string {
  return (
    process.env.MONGO_VEHICLES_COLLECTION?.trim() || 'pegasus256_vehicles'
  )
}
