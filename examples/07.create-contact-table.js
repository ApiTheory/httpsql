/**
 * If a table named "projects" exists, it is dropped.  Then a new table named "projects" is created.
 */

import { getPool } from './utils.js'
import  { TransactionManager } from '../index.js'
import { Root } from '../src/root.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()

const commands = [
  { 
    "sql": `DROP TABLE IF EXISTS contacts;`,
    "name": "drop-table",
    "params" : []
  },
  { 
    "sql": `CREATE TABLE IF NOT EXISTS contacts
      (
        id int PRIMARY KEY NOT NULL,
        name text NOT NULL,
        homephone text ,
        mobilephone text,
        workphone text,
        emergencyphone text
      );`,
    "name": "create-table",
    "params" : []
  }
]

const r = new Root( commands )
const t = new TransactionManager( client, r )

const result = await t.executeTransaction()

console.log( '== 07.create-contacts-table results ===================================================')
console.log( result )
console.log( '===============================================================================')

client.release()
await pool.end()