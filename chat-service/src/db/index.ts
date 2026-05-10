import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
export const sqlClient = postgres(connectionString);
export const db = drizzle(sqlClient, { schema });
