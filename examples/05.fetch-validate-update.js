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

t.addCommand(
  { 
     "sql": "INSERT INTO projects ( name, status ) VALUES ( $1, $2 );",
     "name": "get-project",
     "strict" : true,
     "params" : ['{newName}', '{newStatus}'],
     "expect" : "one",
     "onExpectationFailure" : "stop"
 })

// check to see if the project exists in the database (it should since it was just added, but assume the project was added at a different time)
t.addCommand(
  { 
     "sql": "SELECT id, status, name FROM projects WHERE id = $1;",
     "name": "get-project",
     "strict" : true,
     "params" : ['{id}'],
     "expect" : "one",
     "onExpectationFailure" : "stop"
 })

 // check that its status !== 'frozen'
t.addCommand(
 { 
    "name" : 'check-if-frozen',
    "purpose" : 'if frozen, the status can not be changed',
    "opEval": {"!==" : ["frozen", {"var" : "lastOp.rows.0.status"}]}
 })

 // update the record - note that it will return the new record without running another query
 // if more that one record is updated (ie: the WHERE clause is incorrect), the process will rollback with an exception
t.addCommand(
  { 
    "name" : 'update-project',
    "sql": "UPDATE projects SET name = $2, status = $3 WHERE id = $1 RETURNING *;",
    "params" : ['{results:rows.0.id}', "{updatedName}", "{updatedStatus}"],
    "expect" : "one"
})
 
const updateResults = await t.executeTransaction( { 
  newName: "moon launch", 
  newStatus: "completed", 
  updatedName: "mars launch", 
  updatedStatus: 'sometime soon' 
} )

console.log( '== 05.fetch-update-validate results ===========================================')
console.log( updateResults )
console.log( '===============================================================================')



client.release()
await pool.end()