import { type Document, type Filter, MongoClient, type UpdateFilter } from "mongodb";
import type { DocumentRepository } from "../../application/ports/DocumentRepository.js";

export class MongoDocumentRepository implements DocumentRepository {
  private readonly client: MongoClient;

  constructor(uri: string, private readonly databaseName: string) {
    this.client = new MongoClient(uri);
  }

  async connect() {
    await this.client.connect();
    await this.ensureIndexes();
  }

  async close() {
    await this.client.close();
  }

  private collection(name: string) {
    return this.client.db(this.databaseName).collection<Document>(name);
  }

  async findOne(collection: string, filter: Filter<Document>) {
    return this.collection(collection).findOne(filter);
  }

  async find(collection: string, filter: Filter<Document>, options: { sort?: Document; limit?: number } = {}) {
    let cursor = this.collection(collection).find(filter);
    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.limit !== undefined) cursor = cursor.limit(options.limit);
    return cursor.toArray();
  }

  exists(collection: string, filter: Filter<Document>) {
    return this.collection(collection).findOne(filter, { projection: { _id: 1 } }).then(Boolean);
  }

  async insertOne(collection: string, document: Document) {
    await this.collection(collection).insertOne(document);
  }

  async insertMany(collection: string, documents: Document[]) {
    if (documents.length) await this.collection(collection).insertMany(documents);
  }

  async updateOne(collection: string, filter: Filter<Document>, update: UpdateFilter<Document> | Document, upsert = false) {
    const result = await this.collection(collection).updateOne(filter, update as UpdateFilter<Document>, { upsert });
    return { modifiedCount: result.modifiedCount, upsertedId: result.upsertedId };
  }

  async replaceOne(collection: string, filter: Filter<Document>, document: Document, upsert = false) {
    await this.collection(collection).replaceOne(filter, document, { upsert });
  }

  async deleteOne(collection: string, filter: Filter<Document>) {
    await this.collection(collection).deleteOne(filter);
  }

  private async ensureIndexes() {
    const db = this.client.db(this.databaseName);
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    await db.collection("club_memberships").createIndex({ club_id: 1, user_id: 1 }, { unique: true });
    await db.collection("membership_fees").createIndex({ club_id: 1, player_id: 1, competence: 1 }, { unique: true });
    await Promise.all(["players", "staff_members", "events", "attendance", "measurement_types", "player_measurements", "financial_transactions", "audit_logs"].map(name => db.collection(name).createIndex({ club_id: 1 })));
  }
}
