import { getPool } from '../utils.js'
import  { TransactionManager } from '../../index.js'
import { Root } from '../../src/root.js'
import 'dotenv/config'
import { PgDataDriver } from '../../src/data-drivers/pg-driver.js'

const pool = getPool()
const client = await pool.connect()

const driver = new PgDataDriver( client )

const r = new Root( )
r.addCommand({ name: 'fetch-all', sql: 'SELECT * FROM projects;' })

const t = new TransactionManager( driver, r )

const response = await t.executeTransaction( )

console.log( '== 04.fetch-all results =======================================================')
console.log( response.results[0].rows )
console.log( '===============================================================================')

client.release()
await pool.end()
