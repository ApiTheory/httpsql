import { SqlCommand } from '../src/sql-command.js';
import { expect } from 'chai'
import sinon from 'sinon'
import { ExpectationFailureError, ParameterMappingErrors } from '../src/errors.js'

const basicSqlCommand = {
  sql: 'SELECT * FROM table'
}

describe('SqlCommand', () => {


  it('should be a function', () => {
    expect(SqlCommand).to.be.a('function')
  })

  it('should be a SqlCommand', () => {
    const c = new SqlCommand( basicSqlCommand )
    expect(c).to.be.an.instanceOf(SqlCommand)
    expect(c._onExpectationFailure).equal('throw')
    expect(c.type).equal('sql')
    expect(c._params).deep.equal([])
    expect(c._executableParams).deep.equal([])
    expect(c._finalizedParams).deep.equal([])
    expect(c._expect).undefined
    expect(c.command).equal(basicSqlCommand.sql)
    expect(c.strict).true
    expect(c.name).undefined
    expect(c.description).undefined
    expect(c.id).to.be.ok
    expect(c.id).to.be.a('string')
    expect(c.id.length).equal(26)
  
  })

  it('should populate onExpectationFailure=stop', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ expect: 'rowCount=1', onExpectationFailure : 'stop' } } )
    expect(c._onExpectationFailure).equal('stop')
  })

  it('should populate onExpectationFailure=object', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ expect: 'rowCount=1', onExpectationFailure : { message: 'expect failure', code: 'e555', foo : 'bar' } } } )
    expect(c._onExpectationFailure).deep.equal({ message: 'expect failure', code: 'e555', foo : 'bar' })
  })

  it('should populate expect', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ expect : 'rowCount=1' } } )
    expect(c._expect).equal('rowCount=1')
  })

  it('should populate params', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [1, 'lastop.rowCount'] } } )
    expect(c._params).deep.equal([1, 'lastop.rowCount'])
  })

  it('should throw if appropriate command not passed', () => {
    expect(() => {
      new SqlCommand( {} )
    }).to.throw('the sql command object can not be validated')
  })

  it('should throw if bad param passed', () => {
    let thrown = false
    try {
      new SqlCommand( { sql: 'SELECT * FROM table', params : ['id', 'test===1']} )
    } catch ( err ) {
      thrown = true
      expect(err.message).equal('dynamic parameters were malformed so they could not be mapped correctly and the command.strict value = true')
      expect(Array.isArray(err.errors)).true
      expect(err.errors.length).equal(1)
      expect(err.errors[0].index).equal(1)
      expect(err.errors[0].message).equal('The symbol "=" cannot be used as a unary operator')
    }
    
    expect(thrown).true
  })


  describe('execute method', () => {
    
  
    it('should throw if 2nd argument not passed', async () => {
      
      const c = new SqlCommand( { sql : 'select * from test' } )
      
      let thrown = false

      try {
        await c.execute( {})
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(Error)
        expect(e.message).to.equal('a data client is required to execute the sql command')
      }

      expect(thrown).to.equal(true)

    })

    it('should throw if 2nd argument does not have client', async () => {
      
      const c = new SqlCommand( { sql : 'select * from test' } )
      
      let thrown = false

      try {
        await c.execute( {}, {})
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(Error)
        expect(e.message).to.equal('a data client is required to execute the sql command')
      }

      expect(thrown).to.equal(true)

    })

    it('should throw if client not passed as argument', async () => {
      
      const c = new SqlCommand( { sql : 'select * from test' } )
      
      let thrown = false

      try {
        await c.execute()
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(Error)
        expect(e.message).to.equal('a contextSnapshot is required to execute the command')
      }

      expect(thrown).to.equal(true)

    })

    it('should throw if client.query rejects', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.reject(new Error('Mutumbo with the rejection!')) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test' } )
      
      let thrown = false

      try {
        await c.execute( {}, { client: clientMock} )
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(Error)
        expect(e.message).to.equal('Mutumbo with the rejection!')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])

    })

    it('client.query returns rows and rowCount successfully but match for many fails', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1}]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'rowCount > 1' } )
      
      let thrown = false
    
      const response = await c.execute( {}, { client: clientMock} )

      expect( response.status).equal('expectation-failure')
      expect( response.error).instanceOf(ExpectationFailureError)      
      expect( response.error.message).equal(`the expectation: 'rowCount > 1' failed`)      
      expect( response.failureAction).equal('throw')
      expect( response.finalizedParams).deep.equal([])
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 0 rows and rowCount successfully but match for one', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 0, rows: []}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'rowCount = 1' } )
      
      let thrown = false
      const response = await c.execute( {}, { client: clientMock })

      expect( response.status).equal('expectation-failure')
      expect( response.error).instanceOf(ExpectationFailureError)      
      expect( response.error.message).equal(`the expectation: 'rowCount = 1' failed`)      
      expect( response.failureAction).equal('throw')
      expect( response.finalizedParams).deep.equal([])
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    

    it('successfully processes vars', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async ( sql, params ) => { return Promise.resolve( { rowCount : 1, rows: [ {id:1}] }) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test where id = $1', params : [ 'variables.id']} )
      
      const response = await c.execute( { variables : { id : 1 } }, { client: clientMock })

      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test where id = $1', [1] ])
      expect( response.finalizedParams[0]).equal(1)

    })


    it('var not found and strict = false', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async ( sql, params ) => { return Promise.resolve( { rowCount : 1, rows: [ {id:1}] }) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test where id = $1', params : [ 'variables.id1'], strict: false } )
      
      const response = await c.execute( { variables : { id : 1 } }, { client: clientMock })

      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test where id = $1', [null] ])
      expect( response.finalizedParams[0]).equal(null)

    })

    it('var not found and strict = true', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async ( sql, params ) => { return Promise.resolve( { rowCount : 1, rows: [ {id:1}] }) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test where id = $1', params : [ 'variables.id1'], strict: true } )
      
      const response = await c.execute( { variables : { id : 1 } }, { client: clientMock })

      expect(clientMockQuery.calledOnce).to.equal(false)
      expect( response.finalizedParams[0]).equal(undefined)
      expect( response.status).equal('parameter-mapping-error')
      expect( response.failureAction).equal('throw')
      expect( response.error).instanceOf(ParameterMappingErrors)
      expect( response.error.message).equal('dynamic parameters were malformed so they could not be mapped correctly and the command.strict value = true')

    })

    it('var not found and strict = undefined', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async ( sql, params ) => { return Promise.resolve( { rowCount : 1, rows: [ {id:1}] }) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test where id = $1', params : [ 'variables.id1'] } )
      
      const response = await c.execute( { variables : { id : 1 } }, { client: clientMock })

      expect(clientMockQuery.calledOnce).to.equal(false)
      expect( response.finalizedParams[0]).equal(undefined)
      expect( response.status).equal('parameter-mapping-error')
      expect( response.failureAction).equal('throw')
      expect( response.error).instanceOf(ParameterMappingErrors)
      expect( response.error.message).equal('dynamic parameters were malformed so they could not be mapped correctly and the command.strict value = true')

    })

    it('client.query 2 rows and rowCount successfully but match for one', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 2, rows: [{id:1} , {id: 2}]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'rowCount=1' } )
      
      const response = await c.execute( {}, { client: clientMock })
      expect( response.status).equal('expectation-failure')
      expect( response.error).instanceOf(ExpectationFailureError)      
      expect( response.error.message).equal(`the expectation: 'rowCount=1' failed`)      
      expect( response.failureAction).equal('throw')
      expect( response.finalizedParams).deep.equal([])
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })


    it('onExpectationFailure STOP', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'rowCount=2', onExpectationFailure: 'stop' } )
      
      const result = await c.execute( {}, { client:clientMock} )
      expect(result.rows).to.deep.equal([ { id: 1 } ] )
      expect(result.rowCount).to.equal( 1)
      expect(result.failureAction).to.equal('stop')
      expect(result.finalizedParams).deep.equal([])
      expect(result.status).equal('expectation-failure')
      expect(result.error.message).equal(`the expectation: 'rowCount=2' failed`)
      expect(result.error).to.be.instanceOf(ExpectationFailureError)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('onExpectationFailure = custom message', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'rowCount=5', onExpectationFailure: { message : 'just say something special', code: 't555', foo: 'bar' } } )
      
      const result = await c.execute( {}, { client:clientMock })

      expect(result.rows).to.deep.equal([ { id: 1 } ] )
      expect(result.rowCount).to.equal( 1)
      expect(result.failureAction).to.equal('throw')
      expect(result.finalizedParams).deep.equal([])
      expect(result.status).equal('expectation-failure')
      expect(result.error.message).equal('just say something special')
      expect(result.error.code).equal('t555')     
      expect(result.error.additionalData).deep.equal( { foo: 'bar' } )  
      expect(result.error).to.be.instanceOf(ExpectationFailureError)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])

    })

    it('onExpectationFailure = custom message without the message', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'rowCount=5', onExpectationFailure: { code: 't555', foo: 'bar' } } )
      
      const result = await c.execute( {}, { client:clientMock })

      expect(result.rows).to.deep.equal([ { id: 1 } ] )
      expect(result.rowCount).to.equal( 1)
      expect(result.failureAction).to.equal('throw')
      expect(result.finalizedParams).deep.equal([])
      expect(result.status).equal('expectation-failure')
      expect(result.error.message).equal(`the expectation: 'rowCount=5' failed`)
      expect(result.error.code).equal('t555')     
      expect(result.error.additionalData).deep.equal( { foo: 'bar' } )  
      expect(result.error).to.be.instanceOf(ExpectationFailureError)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])

    })

    it('client.query success', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test' } )
      const result = await c.execute( {}, { client: clientMock })
      expect(result).to.deep.equal({ rowCount: 1, rows: [ { id: 1 } ], status: 'success', finalizedParams: [] })
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])

    })

  })

 

})
