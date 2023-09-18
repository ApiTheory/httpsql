/**
 * INSERTS a project and then attempts to insert the same project that was created previously which should generate an exception result.
 * 
 * This example demonstrates the ability to use the lastop command to retrieve results from a previous command execution for use in
 * the current command execution.
 * 
 * It also shows how to retrieve the full context (not just the last operation) of the request through the output option. 
 */

import { getPool } from '../utils.js'
import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { PgDataDriver } from '../../src/data-drivers/pg-driver.js'

const pool = getPool()
const client = await pool.connect()

const driver = new PgDataDriver( client )

const r = new Root()

// now do a simple command to insert a row into projects
r.addCommand(
  { sql: `INSERT INTO projects ( id, name, status ) VALUES ( $1, $2, $3 ) RETURNING *;`,
    name: "insert-project-1",
    params : [ 'variables.id', 'variables.name1', 'variables.status'],
    expect: "rowCount=1"
})

// attempt to insert a new project with the same ID as the previous one
r.addCommand(
  { sql: `INSERT INTO projects ( id, name, status ) VALUES ($1, $2, $3 ) RETURNING *;`,
    name: "insert-project-2",
    strict: false,
    params : [ 'lastDataResult.rows[0].id', 'variables.name2', 'variables.status'],
    expect: "rowCount=1"
})

const t = new TransactionManager( driver, r )

// requesting the full context - usually only necessary for debugging
const createProjectFailureResults = await t.executeTransaction( { id: 3, status: "stalled", name1 : "my private project", name2 : "my 2nd private project" }, { output: 'full-context'} )

console.log( '== 03.simple-insert-failure full context ===========================================')
console.log( createProjectFailureResults )
console.log( '===============================================================================')

client.release()
await pool.end()