/**
 * INSERTS a project
 */


import pkg from 'pg';
const { Pool } = pkg;
import  { TransactionalCommandExecutor } from '../index.js'
import 'dotenv/config'

const pool = new Pool({
  host: process.env.HOST,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PWD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// create a client for all queries
const client = await pool.connect()

const t = new TransactionalCommandExecutor( client )

// now do a simple command to insert a row into projects
t.addCommand(
  { sql: `INSERT INTO projects ( name, status ) VALUES ($1, $2 ) RETURNING *;`,
    name: "insert-project",
    params : [ '{name}', '{status}'],
    expect: "one"
})

const createProjectResults = await t.executeTransaction( { status: "active", name : "build new widgets" } )

console.log( '== 02.simple-insert results ===================================================')
console.log( createProjectResults )
console.log( '===============================================================================')

client.release()
await pool.end()