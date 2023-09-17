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
const t = new TransactionManager( driver, r )

const result = await t.executeTransaction()

console.log( '== 07.create-contacts-table results ===================================================')
console.log( result )
console.log( '===============================================================================')
