import { getPool } from './utils.js'
import  { TransactionManager } from '../index.js'
import { Root } from '../src/root.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()


const r = new Root( )
r.addCommand(
  { 
     "sql": "INSERT INTO projects ( id, name, status ) VALUES ( $1, $2, $3 ) RETURNING *;",
     "name": "insert-project-1",
     "strict" : true,
     "params" : [ '{newId}', '{newName}', '{newStatus}'],
     "expect" : "one",
     "onExpectationFailure" : "stop"
 })

// check to see if the project exists in the database (it should since it was just added, but assume the project was added at a different time)
r.addCommand(
  { 
     "sql": "SELECT id, status, name FROM projects WHERE id = $1;",
     "name": "get-project",
     "strict" : true,
     "params" : ['{lastop.rows.0.id}'],
     "expect" : "one",
     "onExpectationFailure" : "stop"
 })

// check that its status !== 'frozen'
r.addCommand(
 { 
    "name" : 'check-if-frozen',
    "purpose" : 'if frozen, the status can not be changed',
    "logicOp": {"!==" : ["frozen", {"var" : "lastOp.rows.0.status"}]}
 })

 // update the record - note that it will return the new record without running another query
 // if more that one record is updated (ie: the WHERE clause is incorrect), the process will rollback with an exception
r.addCommand(
  { 
    "name" : 'update-project',
    "sql": "UPDATE projects SET name = $2, status = $3 WHERE id = $1 RETURNING *;",
    "params" : ['{results.0.rows.0.id}', "{updatedName}", "{updatedStatus}"],
    "expect" : "one"
})
 

const t = new TransactionManager( client, r )

const updateResults = await t.executeTransaction( { 
  newId: 5,
  newName: "moon launch", 
  newStatus: "completed", 
  updatedName: "mars launch", 
  updatedStatus: 'sometime soon' 
}, { output : "fullcontext" } )

console.log( '== 05.fetch-update-validate results ===========================================')
console.log( updateResults )
console.log( updateResults.context.results )

console.log( '===============================================================================')

client.release()
await pool.end()