import type { Document, Filter, UpdateFilter } from "mongodb";

export type PlainDocument = Document;

export interface DocumentRepository {
  findOne(
    collection: string,
    filter: Filter<Document>,
  ): Promise<Document | null>;
  find(
    collection: string,
    filter: Filter<Document>,
    options?: { sort?: Document; limit?: number },
  ): Promise<Document[]>;
  exists(collection: string, filter: Filter<Document>): Promise<boolean>;
  insertOne(collection: string, document: Document): Promise<void>;
  insertMany(collection: string, documents: Document[]): Promise<void>;
  updateOne(
    collection: string,
    filter: Filter<Document>,
    update: UpdateFilter<Document> | Document,
    upsert?: boolean,
  ): Promise<{ modifiedCount: number; upsertedId: unknown }>;
  replaceOne(
    collection: string,
    filter: Filter<Document>,
    document: Document,
    upsert?: boolean,
  ): Promise<void>;
  deleteOne(collection: string, filter: Filter<Document>): Promise<void>;
}
