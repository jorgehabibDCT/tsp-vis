import { MongoClient } from 'mongodb'
import { getMongoUri } from './mongoEnv.js'

let client: MongoClient | undefined

export function getMongoClient(): MongoClient {
  if (!client) {
    client = new MongoClient(getMongoUri())
    console.log('[mongo] client init uri=provided')
  }
  return client
}
