import { PgDataDriver } from '../src/data-drivers/pg-driver.js'
import { expect } from 'chai'
import sinon from 'sinon'
import { DatabaseError } from '../src/errors.js'

describe('PgDataDriver', () => {

  it('should return an instance of PgDataDriver', () => {
    expect(new PgDataDriver({})).to.be.an.instanceof(PgDataDriver)
  })

  it('constructor should accept a client', () => {
    expect(new PgDataDriver({})).to.have.property('constructor')
    expect(() => {
      new PgDataDriver()
    })
    .to.throw('the client argument must be defined')
  })

  it('should have a beginTransaction method', () => {
    expect(new PgDataDriver({})).to.have.property('beginTransaction')
  })

  it('should have a commitTransaction method', () => {
    expect(new PgDataDriver({})).to.have.property('commitTransaction')
  })

  it('should have a rollbackTransaction method', () => {
    expect(new PgDataDriver({})).to.have.property('rollbackTransaction')
  })

  it('should have a query method', () => {
    expect(new PgDataDriver({})).to.have.property('query')
  })

  it('beginTransaction should call client.query with a BEGIN', async () => {
    
    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve( ) }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
    const client = new PgDataDriver( clientMock )
    await client.beginTransaction()

    expect(clientMockQuery.calledOnce).to.equal(true)
    expect(clientMockQuery.getCall(0).args[0]).equal( 'BEGIN' )

  })

  it('commitTransaction should call client.query with a COMMIT', async () => {
    
    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve( ) }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
    const client = new PgDataDriver( clientMock )
    await client.commitTransaction()

    expect(clientMockQuery.calledOnce).to.equal(true)
    expect(clientMockQuery.getCall(0).args[0]).equal( 'COMMIT' )

  })

  
  it('rollbackTransaction should call client.query with a ROLLBACK', async () => {
    
    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve( ) }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
    const client = new PgDataDriver( clientMock )
    await client.rollbackTransaction()

    expect(clientMockQuery.calledOnce).to.equal(true)
    expect(clientMockQuery.getCall(0).args[0]).equal( 'ROLLBACK' )

  })

  it('query called with just a string', async () => {
    
    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve( ) }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
    const client = new PgDataDriver( clientMock )
    await client.query('select * from table')

    expect(clientMockQuery.calledOnce).to.equal(true)
    expect(clientMockQuery.getCall(0).args[0]).equal( 'select * from table' )

  })

  it('query called with string and parameters', async () => {
    
    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve( ) }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
    const client = new PgDataDriver( clientMock )
    await client.query('select * from table where id = $1', [ 1])

    expect(clientMockQuery.calledOnce).to.equal(true)
    expect(clientMockQuery.getCall(0).args[0]).equal( 'select * from table where id = $1' )
    expect(clientMockQuery.getCall(0).args[1]).deep.equal( [ 1 ] )
  })

  it('query called with query config', async () => {
    
    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve( ) }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
    const client = new PgDataDriver( clientMock )
    
    const queryConfig = {
      name: 'get-name',
      text: 'SELECT $1::text',
      values: ['al'],
      rowMode: 'array',
    }

    await client.query( queryConfig )

    expect(clientMockQuery.calledOnce).to.equal(true)
    expect(clientMockQuery.getCall(0).args.length).equal( 1 )
    expect(clientMockQuery.getCall(0).args[0]).deep.equal( queryConfig )

  })

  it('query generates error', async () => {
    
    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.reject( new Error('error occured')) }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
    const client = new PgDataDriver( clientMock )
    
    let thrown = false
    try {
      await client.query( 'select 1=1' )
    } catch ( err ) {
      thrown = true
      expect(err).instanceOf( DatabaseError )
      expect(err.message).equal('error occured')
    }
    expect(thrown).to.equal(true)
    expect(clientMockQuery.calledOnce).to.equal(true)

  })
  
})


