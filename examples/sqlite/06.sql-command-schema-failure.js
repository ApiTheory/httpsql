import Database from 'better-sqlite3'
const db = new Database('foobar.db' )
db.pragma('journal_mode = WAL')

import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { SqliteDataDriver } from '../../src/data-drivers/sqlite-driver.js'
const driver = new SqliteDataDriver( db )

// should fail due to param property spelled incorrectly and actual params property not being an array
const r = new Root( [
  { 
    "sql": "SELECT * FROM projects WHERE status = 1;",
    "paramsy": [ "{status}"],
    "params" : 1
  } 
])

const t = new TransactionManager( driver, r )
const results = await t.executeTransaction( )

console.log( '== 04.fetch-all results =======================================================')
console.log( results.lastOp.rows )
console.log( '===============================================================================')

