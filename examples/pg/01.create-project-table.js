/**
 * If a table named "projects" exists, it is dropped.  Then a new table named "projects" is created.
 */

import { getPool } from '../utils.js'
import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { PgDataDriver } from '../../src/data-drivers/pg-driver.js'

const pool = getPool()
const client = await pool.connect()

const driver = new PgDataDriver( client )

const commands = [
  { 
    "sql": `DROP TABLE IF EXISTS projects;`,
    "name": "drop-table",
    "params" : []
  },
  { 
    "sql": `CREATE TABLE IF NOT EXISTS projects
      (
        id int PRIMARY KEY NOT NULL,
        name text NOT NULL,
        description text ,
        status text NOT NULL DEFAULT 'active'::text
      );`,
    "name": "create-table",
    "params" : []
  }
]

const r = new Root( commands )
const t = new TransactionManager( driver, r )

const result = await t.executeTransaction()

console.log( '== 01.create-projects-table results ===================================================')
console.log( result )
console.log( '===============================================================================')

client.release()
await pool.end()