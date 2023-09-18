import Database from 'better-sqlite3'
const db = new Database('foobar.db' )
db.pragma('journal_mode = WAL')

import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { SqliteDataDriver } from '../../src/data-drivers/sqlite-driver.js'
const driver = new SqliteDataDriver( db )

const r = new Root( )
r.addCommand({ name: 'fetch-all', sql: 'SELECT * FROM projects;' })

const t = new TransactionManager( driver, r )

const response = await t.executeTransaction( )

console.log( '== 04.fetch-all results =======================================================')
console.log( response.results[0].rows )
console.log( '===============================================================================')

