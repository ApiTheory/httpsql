import { getPool } from './utils.js'
import  { TransactionManager } from '../index.js'
import { Root } from '../src/root.js'
import 'dotenv/config'

const pool = getPool()
const client = await pool.connect()

const r = new Root( )
r.addCommand({ name: 'fetch-all', sql: 'SELECT * FROM projects;' })

const t = new TransactionManager( client, r )

const queryResults = await t.executeTransaction( )

console.log( '== 04.fetch-all results =======================================================')
console.log( queryResults.results.rows )
console.log( '===============================================================================')

client.release()
await pool.end()
