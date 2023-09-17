/**
 * INSERTS a project and then inserts a second one by adding 1 to the original ID to make sure they don't clash.
 * Demonstrates the use of dynamic variables and how they can be manipulated.
 * Also note the 3d param in the second operation.  It's a static variable - ie: it's value is intrinsic.  For strings,
 * the value should be single quoted.  Number values should be included without the single quotes.
 */

import { getPool } from './utils.js'
import  { TransactionManager } from '../index.js'
import { Root } from '../src/root.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()

const commands = [
  { 
    sql: `INSERT INTO projects ( id, name, status ) VALUES ( $1, $2, $3 ) RETURNING *;`,
    name: "insert-project1",
    params : [ 'variables.id', 'variables.name1', 'variables.status'],
    expect: "rowCount = 1",
  },
  { 
    sql: `INSERT INTO projects ( id, name, status ) VALUES ( $1, $2, $3 ) RETURNING *;`,
    name: "insert-project2",
    params : [ 'lastDataResult.rows[0].id + 1', 'variables.name2', `'active'`],
    expect: "rowCount = 1",
    strict: true
  }

]

const r = new Root( commands )
const t = new TransactionManager( client, r )
const response = await t.executeTransaction( { id: 1, status: "active", name1 : "build new widgets", name2 : "build more sprokets"  } )

console.log( '== 02.simple-insert results ===================================================')
console.log( response )
console.log( '===============================================================================')

client.release()
await pool.end()