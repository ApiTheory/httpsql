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