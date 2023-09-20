import Database from 'better-sqlite3'
const db = new Database(':memory:' )

import { SqliteDataDriver } from '../src/data-drivers/sqlite-driver.js'
import { expect } from 'chai'
import sinon from 'sinon'

describe('SqliteDataDriver', () => {

  let prepareStub, allStub, runStub

  beforeEach(() => {
    prepareStub = sinon.stub( db, 'prepare')
    allStub = sinon.stub()
    runStub = sinon.stub()
  })

  afterEach(() => {
    prepareStub.restore()
    allStub.resetBehavior()
    runStub.resetBehavior()
  })

  it('should return an instance of PgDataDriver', () => {
    expect(new SqliteDataDriver({})).to.be.an.instanceof(SqliteDataDriver)
  })

  it('constructor should accept a client', () => {
    expect(new SqliteDataDriver({})).to.have.property('constructor')
    expect(() => {
      new SqliteDataDriver()
    })
    .to.throw('the db argument must be defined')
  })

  it('should have a beginTransaction method', () => {
    expect(new SqliteDataDriver({})).to.have.property('beginTransaction')
  })

  it('should have a commitTransaction method', () => {
    expect(new SqliteDataDriver({})).to.have.property('commitTransaction')
  })

  it('should have a rollbackTransaction method', () => {
    expect(new SqliteDataDriver( db )).to.have.property('rollbackTransaction')
  })

  it('should have a query method', () => {
    expect(new SqliteDataDriver({})).to.have.property('query')
  })

  describe('beginTransaction', () => {

    it('beginTransaction should call client.query with a BEGIN', async () => {
      
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      const client = new SqliteDataDriver( db )
      await client.beginTransaction()

      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('BEGIN')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)


    })

    it('beginTransaction should reject if run throws', async () => {
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      runStub.throws( new Error('error occured'))
      const client = new SqliteDataDriver( db )
      let thrown = false
      try {
        await client.beginTransaction()
      } catch ( err ) {
        thrown = true
        expect(err.message).equal('error occured')
      }
      expect(thrown).true
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('BEGIN')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)
      runStub.reset()
    })

  })

  describe('commitTransaction', () => {
    
    it('commitTransaction should call client.query with a COMMIT', async () => {
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      const client = new SqliteDataDriver( db )
      await client.commitTransaction()
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('COMMIT')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)
  
    })

    it('commitTransaction should reject if run throws', async () => {
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      runStub.throws( new Error('error occured'))
      const client = new SqliteDataDriver( db )
      let thrown = false
      try {
        await client.commitTransaction()
      } catch ( err ) {
        thrown = true
        expect(err.message).equal('error occured')
      }
      expect(thrown).true
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('COMMIT')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)
      runStub.reset()
    })
  })
  

  describe('rollbackTransaction', () => {
    
    it('rollbackTransaction should call client.query with a ROLLBACK', async () => {
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      const client = new SqliteDataDriver( db )
      await client.rollbackTransaction()

      
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('ROLLBACK')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)

    })

    it('rollbackTransaction should reject if run throws', async () => {
      
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      runStub.throws( new Error('error occured'))
      const client = new SqliteDataDriver( db )
      let thrown = false
      try {
        await client.rollbackTransaction()
      } catch ( err ) {
        thrown = true
        expect(err.message).equal('error occured')
      }
      expect(thrown).true
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('ROLLBACK')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)
      runStub.reset()

    })

  })

  describe('query', () => {
    
    it('query called with just a string query and all() is triggered', async () => {
    
      prepareStub.returns( { all: allStub, run: runStub, reader : true })
      allStub.returns( [{ id: 1, name: 'Alex' }, { id: 2, name: 'Bob' }] )
      const client = new SqliteDataDriver( db )
      const response = await client.query('select * from table')
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('select * from table')
      expect( response.rowCount ).equal(2)
      expect( response.rows).deep.equal([{ id: 1, name: 'Alex' }, { id: 2, name: 'Bob' }])
      expect( allStub.callCount ).equal(1)
      expect( runStub.callCount ).equal(0)
      
  
    })
  
    it('query called with string and parameters and all() is triggered', async () => {
      
      prepareStub.returns( { all: allStub, run: runStub, reader : true })
      allStub.returns( [{ id: 1, name: 'test1' }] )
      const client = new SqliteDataDriver( db )
      const response = await client.query('select * from table where id = ?', [1])
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('select * from table where id = ?')
      expect( response.rowCount ).equal(1)
      expect( response.rows).deep.equal([{ id: 1, name: 'test1' }])
      expect( allStub.callCount ).equal(1)
      expect( allStub.getCall(0).args[0] ).deep.equal( [1] )
      expect( runStub.callCount ).equal(0)
      
    })
  
    it('query called with string and parameters and run() is triggered', async () => {
      
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      runStub.returns( { changes: 1, lastInsertRowid: 10 } )
      const client = new SqliteDataDriver( db )
      const response = await client.query('INSERT INTO table (id) VALUES (?)', [1])
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('INSERT INTO table (id) VALUES (?)')
      expect( response.rowCount ).equal(1)
      expect( response.rows).deep.equal([])
      expect( runStub.callCount ).equal(1)
      expect( runStub.getCall(0).args[0] ).deep.equal( [1] )
      expect( allStub.callCount ).equal(0)
      
    })
  
    it('query called with just a query string and run() is triggered', async () => {
      
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      runStub.returns( { changes: 1, lastInsertRowid: 10 } )
      const client = new SqliteDataDriver( db )
      const response = await client.query('INSERT INTO table (id) VALUES (1)')
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('INSERT INTO table (id) VALUES (1)')
      expect( response.rowCount ).equal(1)
      expect( response.rows).deep.equal([])
      expect( runStub.callCount ).equal(1)
      expect( runStub.getCall(0).args[0] ).undefined
      expect( allStub.callCount ).equal(0)
      
    })

    it('prepare() throws an error', async () => {
      
      prepareStub.throws(new Error('prepare error'))
      const client = new SqliteDataDriver( db )
      let thrown = false
      try {
        await client.query('INSERT INTO table (id) VALUES (1)')
      } catch ( err ) {
        thrown = true
        expect(err.message).equal('prepare error')
      }

      expect ( thrown ).true
      expect( runStub.callCount ).equal(0)
      expect( allStub.callCount ).equal(0)
      

    })

    it('all() throws an error', async () => {
      
      prepareStub.returns( { all: allStub, run: runStub, reader : true })
      allStub.throws(new Error('all error'))
      const client = new SqliteDataDriver( db )
      let thrown = false
      try {
        await client.query('INSERT INTO table (id) VALUES (1)')
      } catch ( err ) {
        thrown = true
        expect(err.message).equal('all error')
      }

      expect ( thrown ).true
      expect( prepareStub.callCount ).equal(1)
      expect( runStub.callCount ).equal(0)
      expect( allStub.callCount ).equal(1)
      

    })

   
    it('run() throws an error', async () => {
      
      prepareStub.returns( { all: allStub, run: runStub, reader : false })
      runStub.throws(new Error('run error'))
      const client = new SqliteDataDriver( db )
      let thrown = false
      try {
        await client.query('select * from table')
      } catch ( err ) {
        thrown = true
        expect(err.message).equal('run error')
      }

      expect ( thrown ).true
      expect( prepareStub.callCount ).equal(1)
      expect( runStub.callCount ).equal(1)
      expect( allStub.callCount ).equal(0)
      

    })

    
  })

  

})


