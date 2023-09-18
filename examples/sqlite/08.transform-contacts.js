/**
 * Demonstrates how a logicOperation can transform data for final output.  The records in the database, have 4 different types of phone numbers.
 * The output needs to have the phones in one property instead of 4 separate properties.  The last logic step transforms the output into the necessary shape.
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
    sql: `INSERT INTO contacts ( id, name, homephone, mobilephone ) VALUES ( ?, ?, ?, ? ) RETURNING *;`,
    name: "insert-contact1",
    params : [ "1", '"Alex"', '"555-555-5555"', '"555-555-5555"' ],
    expect: "rowCount = 1",
  },
  { 
    sql: `INSERT INTO contacts ( id, name, homephone, mobilephone, workphone, emergencyphone ) VALUES ( ?, ?, ?, ?, ?, ? ) RETURNING *;`,
    name: "insert-contact2",
    params : [ "2", '"Betty"', '"555-555-4555"', '"555-555-4555"', '"555-555-4556"', '"555-555-4558"' ],
    expect: "rowCount = 1",
  },
  { 
    sql: `SELECT * FROM contacts;`,
  },
  {
    logicOp: `lastDataResult.rows.{ 
      "id": id,
      "name" : name,
      "phones" : $sift(function($v, $k) {$k ~> /phone/})
    }`,
  }

]

const r = new Root( commands )
const t = new TransactionManager( driver, r )
const response = await t.executeTransaction( )

console.log( '== 02.simple-insert results ===================================================')
console.log( response.results[3].result )
console.log( '===============================================================================')
