/**
 * INSERTS a project and then inserts a second one by adding 1 to the original ID to make sure they don't clash.
 * Demonstrates the use of dynamic variables and how they can be manipulated.
 * Also note the 3d param in the second operation.  It's a static variable - ie: it's value is intrinsic.  For strings,
 * the value should be single quoted.  Number values should be included without the single quotes.
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
    sql: `INSERT INTO projects ( id, name, status ) VALUES ( ?, ?, ? ) RETURNING *;`,
    name: "insert-project1",
    params : [ 'variables.id', 'variables.name1', 'variables.status'],
    expect: "rowCount = 1",
  },
  { 
    sql: `INSERT INTO projects ( id, name, status ) VALUES ( ?, ?, ? ) RETURNING *;`,
    name: "insert-project2",
    params : [ 'lastDataResult.rows[0].id + 1', 'variables.name2', `'active'`],
    expect: "rowCount = 1",
    strict: true
  }

]

const r = new Root( commands )
const t = new TransactionManager( driver, r )
const response = await t.executeTransaction( { id: 1, status: "active", name1 : "build new widgets", name2 : "build more sprokets"  } )

console.log( '== 02.simple-insert results ===================================================')
console.log( response )
console.log( '===============================================================================')
