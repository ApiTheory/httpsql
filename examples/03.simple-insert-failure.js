/**
 * INSERTS a project and then attempts to insert the same project that was created previously which should generate an exception result.
 * 
 * This example demonstrates the ability to use the lastop command to retrieve results from a previous command execution for use in
 * the current command execution.
 * 
 * It also shows how to retrieve the full context (not just the last operation) of the request through the output option. 
 */

import  { TransactionalCommandExecutor } from '../index.js'
import 'dotenv/config'
import { getPool } from './utils.js'

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

// attempt to insert a new project with the same ID as the previous one
t.addCommand(
  { sql: `INSERT INTO projects ( id, name, status ) VALUES ($1, $2, $3 ) RETURNING *;`,
    name: "insert-project",
    strict: false,
    params : [ '{lastop:rows.0.id}', '{variable:name}', '{status}'],
    expect: "one"
})

const createProjectFailureResults = await t.executeTransaction( { id: 3, status: "stalled", name : "my private project" }, {output: 'fullcontext' } )

console.log( '== 03.simple-insert-failure full context ===========================================')
console.log( createProjectFailureResults )
console.log( createProjectFailureResults.results[1] )
console.log( '===============================================================================')

client.release()
await pool.end()