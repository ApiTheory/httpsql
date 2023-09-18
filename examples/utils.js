import pg from 'pg';
const { Pool } = pg;

export const getPool = () => {
  
  return new Pool({
    connectionString : process.env.DATABASE_URL,
    application_name: "httpsql-examples",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

}