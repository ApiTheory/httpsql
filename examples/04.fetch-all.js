import { getPool } from './utils.js'
import  { TransactionalCommandExecutor } from '../index.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()

const t = new TransactionalCommandExecutor( client )

// first check to see if the project exists in the database
t.addCommand(
  { 
     "sql": "SELECT * FROM projects;"
 })
 
const results = await t.executeTransaction( )

console.log( '== 04.fetch-all results =======================================================')
console.log( results.lastOp.rows )
console.log( '===============================================================================')

client.release()
await pool.end()
