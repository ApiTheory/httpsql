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
