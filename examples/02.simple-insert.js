/**
 * INSERTS a project
 */


import { getPool } from './utils.js'
import  { TransactionalCommandExecutor } from '../index.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()

const t = new TransactionalCommandExecutor( client )

// now do a simple command to insert a row into projects
t.addCommand(
  { sql: `INSERT INTO projects ( id, name, status ) VALUES ( $1, $2, $3 ) RETURNING *;`,
    name: "insert-project",
    params : [ '{id}', '{name}', '{status}'],
    expect: "one"
})

const createProjectResults = await t.executeTransaction( { id: 1, status: "active", name : "build new widgets" } )

console.log( '== 02.simple-insert results ===================================================')
console.log( createProjectResults )
console.log( '===============================================================================')

client.release()
await pool.end()