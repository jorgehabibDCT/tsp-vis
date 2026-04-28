import { MongoClient } from 'mongodb'

let mongoClient: MongoClient | null = null

export function getMongoClient(uri: string): MongoClient {
  if (!mongoClient) {
    mongoClient = new MongoClient(uri)
  }
  return mongoClient
}
