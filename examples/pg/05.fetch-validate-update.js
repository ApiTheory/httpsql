import { getPool } from '../utils.js'
import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { PgDataDriver } from '../../src/data-drivers/pg-driver.js'

const pool = getPool()
const client = await pool.connect()

const driver = new PgDataDriver( client )

const r = new Root( )
r.addCommand(
  { 
     "sql": "INSERT INTO projects ( id, name, status ) VALUES ( $1, $2, $3 ) RETURNING *;",
     "name": "insert-project-1",
     "strict" : true,
     "params" : [ 'variables.newId', 'variables.newName', 'variables.newStatus'],
     "expect" : "rowCount=1",
     "onExpectationFailure" : "stop"
 })

// check to see if the project exists in the database (it should since it was just added, but assume the project was added at a different time)
r.addCommand(
  { 
     "sql": "SELECT id, status, name FROM projects WHERE id = $1;",
     "name": "get-project",
     "strict" : true,
     "params" : ['lastDataResult.rows[0].id'],
     "expect" : "rowCount=1",
     "onExpectationFailure" : "stop"
 })

// check that its status !== 'frozen'
r.addCommand(
 { 
    "name" : 'check-if-frozen',
    "purpose" : 'if frozen, the status can not be changed',
    "logicOp": "lastDataResult.rows[0].status != 'frozen'",
    "expect" : "currentResult=true"
 })

 // update the record - note that it will return the new record without running another query
 // if more that one record is updated (ie: the WHERE clause is incorrect), the process will rollback with an exception
r.addCommand(
  { 
    "name" : 'update-project',
    "sql": "UPDATE projects SET name = $2, status = $3 WHERE id = $1 RETURNING *;",
    "params" : ['results[1].rows[0].id', "variables.updatedName", "variables.updatedStatus"],
    "expect" : "rowCount=1"
})
 

const t = new TransactionManager( driver, r )

const updateResults = await t.executeTransaction( { 
  newId: 5,
  newName: "moon launch", 
  newStatus: "completed", 
  updatedName: "mars launch", 
  updatedStatus: 'sometime soon' 
}, { output : "full-context" } )

console.log( '== 05.fetch-update-validate results ===========================================')
console.log( updateResults.fullContext.results )
console.log( '===============================================================================')

client.release()
await pool.end()