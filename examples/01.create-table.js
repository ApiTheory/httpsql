/**
 * If a table named "projects" exists, it is dropped.  Then a new table named "projects" is created.
 */

import pkg from 'pg';
const { Pool } = pkg;
import  { TransactionalCommandExecutor } from '../index.js'
import 'dotenv/config'

const pool = new Pool({
  host: process.env.HOST,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PWD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// create a client for all queries
const client = await pool.connect()

const t = new TransactionalCommandExecutor( client )

t.addCommand(
  { "sql": `DROP TABLE IF EXISTS projects;`,
    "name": "drop-table",
    "params" : []
})
t.addCommand(
  { "sql": `CREATE TABLE IF NOT EXISTS projects
      (
        id ulid COLLATE pg_catalog."default" PRIMARY KEY NOT NULL DEFAULT generate_ulid(),
        name citext COLLATE pg_catalog."default" NOT NULL,
        description citext COLLATE pg_catalog."default",
        status citext COLLATE pg_catalog."default" NOT NULL DEFAULT 'active'::citext
      );`,
    "name": "create-table",
    "params" : []
})

const result = await t.executeTransaction( { status: "active", name : "apitheory" } )

console.log( '== 01.create-table results ===================================================')
console.log( result )
console.log( '===============================================================================')

client.release()
await pool.end()