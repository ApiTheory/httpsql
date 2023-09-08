/**
 * INSERTS a project
 */

import { getPool } from './utils.js'
import  { TransactionManager } from '../index.js'
import { Root } from '../src/root.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()

const commands = [
  { sql: `INSERT INTO projects ( id, name, status ) VALUES ( $1, $2, $3 ) RETURNING *;`,
    name: "insert-project",
    params : [ '{id}', '{name}', '{status}'],
    expect: "one"
  }
]

const r = new Root( commands )
const t = new TransactionManager( client, r )
const { finalState, results } = await t.executeTransaction( { id: 1, status: "active", name : "build new widgets" } )

console.log( '== 02.simple-insert results ===================================================')
console.log( finalState )
console.log( results )
console.log( '===============================================================================')

client.release()
await pool.end()