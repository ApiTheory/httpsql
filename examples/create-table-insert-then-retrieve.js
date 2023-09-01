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

// first create a table (the user you login with must have that privilege)
t.addCommand(
  { "sql": `DROP TABLE IF EXISTS testschema.projects;`,
    "name": "drop-table",
    "params" : []
})
t.addCommand(
  { "sql": `CREATE TABLE IF NOT EXISTS testschema.projects
      (
        id ulid COLLATE pg_catalog."default" PRIMARY KEY NOT NULL DEFAULT generate_ulid(),
        name citext COLLATE pg_catalog."default" NOT NULL,
        description citext COLLATE pg_catalog."default",
        status citext COLLATE pg_catalog."default" NOT NULL DEFAULT 'active'::citext
      );`,
    "name": "create-table",
    "params" : []
})

await t.executeTransaction( { status: "active", name : "apitheory" } )

const t2 = new TransactionalCommandExecutor( client )
// now do a simple command to insert a row into projects
t2.addCommand(
  { sql: `INSERT INTO testschema.projects ( name, status ) VALUES ($1, $2 ) RETURNING *;`,
    name: "insert-project",
    params : [ '{name}', '{status}'],
    expect: "one"
})

const createProjectResults = await t2.executeTransaction( { status: "active", name : "apitheory" } )
console.log( createProjectResults )



// we're going to test trying to create another record with the same ID - this should fail because the ID is the unique primary key
const t3 = new TransactionalCommandExecutor( client )
t3.addCommand(
  { sql: `INSERT INTO testschema.projects ( id, name, status ) VALUES ($1, $2, $3 ) RETURNING *;`,
    name: "insert-fail-project",
    params : [ '{id}','{name}', '{status}'],
    expect: "one"
})

const createProjectShouldFailResults = await t3.executeTransaction( { id: createProjectResults.lastOp.rows[0].id, status: "active", name : "apitheory" } )
console.log( createProjectShouldFailResults )
console.log( createProjectShouldFailResults.results[0].error )
// create another transaction executor with the same client
// although the client is the same, the entire environment the queries are processing in will be new
const t4 = new TransactionalCommandExecutor( client )

// first check to see if the project exists in the database
t4.addCommand(
  { 
     "sql": "SELECT id, status, name FROM testschema.projects WHERE id = $1;",
     "name": "get-project",
     "strict" : true,
     "params" : ['{id}'],
     "expect" : "one",
     "onExpectationFailure" : "stop"
 })

 // check that its status !== 'frozen'
 t4.addCommand(
 { 
    "name" : 'check-if-frozen',
    "purpose" : 'if frozen, the status can not be changed',
    "opEval": {"!==" : ["frozen", {"var" : "lastOp.rows.0.status"}]}
 })

 // update the record - note that it will return the new record without running another query
 // if more that one record is updated (ie: the WHERE clause is incorrect), the process will rollback with an exception
 t4.addCommand(
  { 
    "name" : 'update-project',
    "sql": "UPDATE testschema.projects SET name = $2 WHERE id = $1 RETURNING *;",
    "params" : ['{id}', "{name}"],
    "expect" : "one"
})
 
const updateResults = await t4.executeTransaction( { id: createProjectResults.lastOp.rows[0].id, name: 'updated project name' } )

console.log( updateResults )

client.release()
await pool.end()