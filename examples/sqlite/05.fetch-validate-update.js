import Database from 'better-sqlite3'
const db = new Database('foobar.db' )
db.pragma('journal_mode = WAL')

import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { SqliteDataDriver } from '../../src/data-drivers/sqlite-driver.js'
const driver = new SqliteDataDriver( db )

const r = new Root( )
r.addCommand(
  { 
     "sql": "INSERT INTO projects ( id, name, status ) VALUES ( ?, ?, ? ) RETURNING *;",
     "name": "insert-project-1",
     "strict" : true,
     "params" : [ 'variables.newId', 'variables.newName', 'variables.newStatus'],
     "expect" : "rowCount=1",
     "onExpectationFailure" : "stop"
 })

// check to see if the project exists in the database (it should since it was just added, but assume the project was added at a different time)
r.addCommand(
  { 
     "sql": "SELECT id, status, name FROM projects WHERE id = ?;",
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
    "sql": "UPDATE projects SET name = ?, status = ? WHERE id = ? RETURNING *;",
    "params" : ["variables.updatedName", "variables.updatedStatus", 'results[1].rows[0].id' ],
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
