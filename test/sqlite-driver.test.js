import { SqliteDataDriver } from '../src/data-drivers/sqlite-driver.js'
import { expect } from 'chai'
import sinon from 'sinon'

describe('SqliteDataDriver', () => {

  const prepareStub = sinon.stub()
  const allStub = sinon.stub()
  const runStub = sinon.stub()
  const queryStub = sinon.stub()

  queryStub.resolves( { rows: [], rowCount: 0})

  prepareStub.returns( {
    all: allStub,
    run: runStub,
  } )

  const dbMock = {
    id: 'testClient',
    prepare: prepareStub
  }


  beforeEach(() => {
    prepareStub.resetHistory()
    allStub.resetHistory()
    runStub.resetHistory()
    queryStub.resetHistory()
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
    expect(new SqliteDataDriver( dbMock )).to.have.property('rollbackTransaction')
  })

  it('should have a query method', () => {
    expect(new SqliteDataDriver({})).to.have.property('query')
  })

  describe('beginTransaction', () => {

    it('beginTransaction should call client.query with a BEGIN', async () => {
      
    
      const client = new SqliteDataDriver( dbMock )
      await client.beginTransaction()

      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('BEGIN')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)


    })

    it('beginTransaction should reject if run throws', async () => {
      
      runStub.throws( new Error('error occured'))
      const client = new SqliteDataDriver( dbMock )
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
    
      const client = new SqliteDataDriver( dbMock )
      await client.commitTransaction()
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('COMMIT')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)
  
    })

    it('commitTransaction should reject if run throws', async () => {
      
      runStub.throws( new Error('error occured'))
      const client = new SqliteDataDriver( dbMock )
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
      
      const client = new SqliteDataDriver( dbMock )
      await client.rollbackTransaction()

      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('ROLLBACK')
      expect( runStub.calledOnce).to.equal(true)
      expect( allStub.callCount).to.equal(0)

    })

    it('rollbackTransaction should reject if run throws', async () => {
      
      runStub.throws( new Error('error occured'))
      const client = new SqliteDataDriver( dbMock )
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
    
    it('query called with just a string', async () => {
    
      allStub.returns( [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }] )
      const client = new SqliteDataDriver( dbMock )
      const response = await client.query('select * from table')
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('select * from table')
      expect( response.rowCount ).equal(2)
      expect( response.rows).deep.equal([{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }])
      expect( allStub.callCount ).equal(1)
      expect( runStub.callCount ).equal(0)
      allStub.reset()
  
    })
  
    it('query called with string and parameters', async () => {
      
      allStub.returns( [{ id: 1, name: 'test1' }] )
      const client = new SqliteDataDriver( dbMock )
      const response = await client.query('select * from table where id = ?', [1])
  
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('select * from table where id = ?')
      expect( response.rowCount ).equal(1)
      expect( response.rows).deep.equal([{ id: 1, name: 'test1' }])
      expect( allStub.callCount ).equal(1)
      expect( allStub.getCall(0).args[0] ).deep.equal( [1] )
      expect( runStub.callCount ).equal(0)
      allStub.reset()
    })
  
    it('query should reject if all throws without the message including run() instead', async () => {
      
      allStub.throws( new Error('error occured'))
      const client = new SqliteDataDriver( dbMock )
      let thrown = false
      try {
        await client.query('select * from table where id = ?', [1])
      } catch ( err ) {
        thrown = true
        expect(err.message).equal('error occured')
      }
      expect(thrown).true
      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('select * from table where id = ?')
      expect( allStub.calledOnce).to.equal(true)
      expect( allStub.getCall(0).args[0] ).deep.equal( [1] )
      expect( runStub.callCount).to.equal(0)
      allStub.reset()

    })

    it(`query without parameters should return result if all throws with a message including 'run() instead' and run completes successfully`, async () => {
      
      allStub.throws( new TypeError('this statement does not return data. Use run() instead'))
      runStub.returns( { changes: 0 , lastInsertedRowId: null })
      const client = new SqliteDataDriver( dbMock )
      let thrown = false

      const result = await client.query('create table (id integer);')

      expect(result).to.deep.equal( { rows: [], rowCount: 0 } )

      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('create table (id integer);')
      expect( allStub.calledOnce).to.equal(true)
      expect( runStub.callCount).to.equal(1)
      expect( runStub.firstCall.args.length ).equal(0)
      allStub.reset()
      runStub.reset()

    })

    it(`query with parameters should return result if all throws with a message including 'run() instead' and run completes successfully`, async () => {
      
      allStub.throws( new TypeError('this statement does not return data. Use run() instead'))
      runStub.returns( { changes: 0 , lastInsertedRowId: null })
      const client = new SqliteDataDriver( dbMock )
      let thrown = false

      const result = await client.query('create table (id integer);', [1])

      expect(result).to.deep.equal( { rows: [], rowCount: 0 } )

      expect( prepareStub.calledOnce).to.equal(true)
      expect( prepareStub.getCall(0).args[0]).to.equal('create table (id integer);')
      expect( allStub.calledOnce).to.equal(true)
      expect( runStub.callCount).to.equal(1)
      expect( runStub.firstCall.args[0] ).deep.equal([1])
      allStub.reset()
      runStub.reset()

    })
  })

  it(`both all() and run() throws`, async () => {
      
    allStub.throws( new Error('this statement does not return data. Use run() instead'))
    runStub.throws( new Error('error occured2'))
    const client = new SqliteDataDriver( dbMock )

    let thrown = false
    try {
      await client.query('select * from table where id = ?', [1])
    } catch ( err ) {
      thrown = true
      expect(err.message).equal('error occured2')
    }
    expect(thrown).true

    expect( prepareStub.calledOnce).to.equal(true)
    expect( allStub.callCount).to.equal(1)
    expect( runStub.callCount).to.equal(1)
    allStub.reset()
    runStub.reset()

  })

})


