/**
 * Demonstrates how a logicOperation can transform data for final output.  The records in the database, have 4 different types of phone numbers.
 * The output needs to have the phones in one property instead of 4 separate properties.  The last logic step transforms the output into the necessary shape.
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
    sql: `INSERT INTO contacts ( id, name, homephone, mobilephone ) VALUES ( $1, $2, $3, $4 ) RETURNING *;`,
    name: "insert-contact1",
    params : [ "1", '"Alex"', '"555-555-5555"', '"555-555-5555"' ],
    expect: "rowCount = 1",
  },
  { 
    sql: `INSERT INTO contacts ( id, name, homephone, mobilephone, workphone, emergencyphone ) VALUES ( $1, $2, $3, $4, $5, $6 ) RETURNING *;`,
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

client.release()
await pool.end()