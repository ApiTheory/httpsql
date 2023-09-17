import { getPool } from '../utils.js'
import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { PgDataDriver } from '../../src/data-drivers/pg-driver.js'

const pool = getPool()
const client = await pool.connect()

const driver = new PgDataDriver( client )

// should fail due to param property spelled incorrectly and actual params property not being an array
const r = new Root( [
  { 
    "sql": "SELECT * FROM projects WHERE status = 1;",
    "paramsy": [ "{status}"],
    "params" : 1
  } 
])

const t = new TransactionManager( driver, r )
const results = await t.executeTransaction( )

console.log( '== 04.fetch-all results =======================================================')
console.log( results.lastOp.rows )
console.log( '===============================================================================')

client.release()
await pool.end()
