/**
 * If a table named "projects" exists, it is dropped.  Then a new table named "projects" is created.
 */

import Database from 'better-sqlite3'
const db = new Database('foobar.db' )
db.pragma('journal_mode = WAL')

import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { SqliteDataDriver } from '../../src/data-drivers/sqlite-driver.js'

const driver = new SqliteDataDriver( db )

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
        status text NOT NULL DEFAULT 'active'
      ) STRICT;`,
    "name": "create-table",
    "params" : []
  }
]

const r = new Root( commands )
const t = new TransactionManager( driver, r )

const response = await t.executeTransaction()

console.log( '== 01.create-projects-table results ===================================================')
console.log( response.results[1] )
console.log( '===============================================================================')
