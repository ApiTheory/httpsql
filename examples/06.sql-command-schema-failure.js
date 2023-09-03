import { getPool } from './utils.js'
import  { TransactionalCommandExecutor } from '../index.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()

const t = new TransactionalCommandExecutor( client )

// should fail due to param property spelled incorrectly and actual params property not being an array
t.addCommand(
  { 
     "sql": "SELECT * FROM projects WHERE status = 1;",
     "paramsy": [ "{status}"],
     "params" : 1
 })
 
const results = await t.executeTransaction( )

console.log( '== 04.fetch-all results =======================================================')
console.log( results.lastOp.rows )
console.log( '===============================================================================')

client.release()
await pool.end()
