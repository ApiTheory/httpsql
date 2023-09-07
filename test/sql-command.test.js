import { SqlCommand } from '../src/sql-command.js';
import { expect } from 'chai'
import sinon from 'sinon'
import { ExpectationFailureError } from '../src/errors.js'

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
    expect(c.strict).false
    expect(c.name).undefined
    expect(c.description).undefined
    expect(c.id).to.be.ok
    expect(c.id).to.be.a('string')
    expect(c.id.length).equal(26)
  
  })

  it('should populate onExpectationFailure=stop', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ onExpectationFailure : 'stop' } } )
    expect(c._onExpectationFailure).equal('stop')
  })

  it('should populate onExpectationFailure=object', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ onExpectationFailure : { message: 'expect failure', code: 'e555', foo : 'bar' } } } )
    expect(c._onExpectationFailure).deep.equal({ message: 'expect failure', code: 'e555', foo : 'bar' })
  })

  it('should populate expect', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ expect : 'one' } } )
    expect(c._expect).equal('one')
  })

  it('should populate params', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [1, '{lastop.rowCount}'] } } )
    expect(c._params).deep.equal([1, '{lastop.rowCount}'])
  })

  it('should throw if appropriate command not passed', () => {
    expect(() => {
      new SqlCommand( {} )
    }).to.throw('the sql command object can not be validated')
  })

  it('executable command array should match params array if no vars submitted', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{lastop.rows.1.name}'] } } )
    //c.preTransactionVariableSubstitution( { id: 5, name: 'testname' })
    c.preTransactionVariableSubstitution()
    expect(c._executableParams).deep.equal([ 1, '{lastop.rows.1.name}'])
    expect(c._params).deep.equal([ 1, '{lastop.rows.1.name}'])
    expect(c._finalizedParams).deep.equal([])
  })

  it('executable command array should properly represent substituted variables', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'] } } )
    c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    expect(c._executableParams).deep.equal([ 1, 'testval', 'active', 'testname', '{lastop.rows.1.name}'])
    expect(c._params).deep.equal([ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'])
    expect(c._finalizedParams).deep.equal([])
  })

  it('executable command array should substitute null if not strict and variable not found', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'] } } )
    c.preTransactionVariableSubstitution( { id: 5, name: 'testname' })
    expect(c._executableParams).deep.equal([ 1, 'testval', null, 'testname', '{lastop.rows.1.name}'])
    expect(c._params).deep.equal([ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'])
    expect(c._finalizedParams).deep.equal([])
  })

  it('should throw if a dynamic parameter variable is a number', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{7}', '{lastop.rows.1.name}'] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    }).to.throw(`the dynamic parameter '{7}' is a number`)
  })

  it('should throw if a dynamic parameter lastop is a number', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{lastop.3}'] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    }).to.throw(`the dynamic parameter '{lastop.3}' is a number`)
  })

  it('should not throw if the 2nd element of dynamic parameter results is a number', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{results.99}'] } } )
    c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
  })

  
  it('should throw if a dynamic parameter result is not properly named', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{badvar.test}'] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    }).to.throw(`dynamic parameter '{badvar.test}' can not be properly parsed`)
  })

  it('should throw if strict and a dynamic parameter variable can not be aligned with something passed', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ strict: true, params: [ 1, '{variable.status}' ] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname' })
    }).to.throw(`parameter '{variable.status}' not found`)
  })

  describe('execute method', () => {
    
  
  
    it('should throw if client not passed as argument', async () => {
      
      const c = new SqlCommand( { sql : 'select * from test' } )
      
      let thrown = false

      try {
        await c.execute()
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(Error)
        expect(e.message).to.equal('a client is required to execute commands')
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
        await c.execute( clientMock)
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
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'many' } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('expected rowCount > 1 but received 1')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 0 rows and rowCount successfully but match for one', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 0, rows: []}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'one' } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('expected rowCount = 1 but received 0')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 2 rows and rowCount successfully but match for one', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 2, rows: [{id:1} , {id: 2}]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'one' } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('expected rowCount = 1 but received 2')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 2 rows and rowCount successfully but match for zero', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 2, rows: [{id:1} , {id: 2}]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'zero' } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('expected rowCount = 0 but received 2')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 1 rows and rowCount successfully but match for zero', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 'zero' } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('expected rowCount = 0 but received 1')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 1 rows and rowCount successfully but match for NUMERIC zero', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 0 } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('expected rowCount = 0 but received 1')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 1 rows and rowCount successfully but match for 1000', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 1000 } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('expected rowCount = 1000 but received 1')
      }

      expect(thrown).to.equal(true)
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 1 rows and rowCount successfully but match for 1000 and onExpectationFailure STOP', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 1000, onExpectationFailure: 'stop' } )
      
      const result = await c.execute( clientMock)
      expect(result).to.deep.equal({
        rows: [ { id: 1 } ],
        rowCount: 1,
        status: 'stop',
        expectationFailureMessage: 'expected rowCount = 1000 but received 1'
      })
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])


    })

    it('client.query 1 rows and rowCount successfully but match for 1000 and onExpectationFailure = custom message', async () => {
      
      const clientMock = {
        id: 'testClient',
        query: async (sql, params) => { return Promise.resolve( {rowCount : 1, rows: [{id:1} ]}) }
      }
    
      const clientMockQuery = sinon.spy(clientMock, 'query' )
    
      const c = new SqlCommand( { sql : 'SELECT * FROM test', expect: 1000, onExpectationFailure: { message : 'just say something special', code: 't555' } } )
      
      let thrown = false
      try {
        await c.execute( clientMock)
      } catch(e) {
        thrown = true
        expect(e).to.be.an.instanceOf(ExpectationFailureError)
        expect(e.message).to.equal('just say something special')
      }

      expect(thrown).to.equal(true)
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
      const result = await c.execute( clientMock)
      expect(result).to.deep.equal({ rowCount: 1, rows: [ { id: 1 } ], status: 'success' })
      expect(clientMockQuery.calledOnce).to.equal(true)
      expect(clientMockQuery.getCall(0).args).to.deep.equal([ 'SELECT * FROM test', [] ])

    })

  })

  describe('transactionalResultValueSubstitution', () => {

    const results = [
      {
        status: 'success',
        rowCount : 1,
        rows: [ { id: 1, name: 'test1' } ]
      },
      { status: 'success' },
      {
        status: 'success',
        rowCount : 2,
        rows: [ { id: 1, name: 'test1' }, { id: 2, name: 'test2' } ]
      }
    ]

    it( 'will complete with correct substitutions', () => {
      
      const c = new SqlCommand( { sql : 'SELECT * FROM test', params : [1, '{status}', '{lastop.rows.0.id}', '{results.0.rows.0.name}'] } )
      // status willl have been filled in during variable substitution - shouldnt really be part of test, but using it as an example
      c._executableParams = [ 1, 'active', '{lastop.rows.0.id}', '{results.2.rows.1.name}']
      c.transactionalResultValueSubstitution( results )
      expect(c._finalizedParams).to.deep.equal([ 1, 'active', 1, 'test2' ])

    })

    it( 'will replace null if dynamic param not correct if strict=false', () => {
      
      const c = new SqlCommand( { sql : 'SELECT * FROM test', params : [1, '{status}', '{lastop.rows.1.id}', '{results.0.rows.5.name}'] } )
      c._executableParams = [ 1, 'active', '{lastop.rows.1.id}', '{results.2.rows.5.name}']
      c.transactionalResultValueSubstitution( results )
      expect(c._finalizedParams).to.deep.equal([ 1, 'active', 2, null ])

    })

    it( 'will throw if dynamic param not correct and strict=true', () => {
      
      const c = new SqlCommand( { strict: true, sql : 'SELECT * FROM test', params : [1, '{status}', '{lastop.rows.1.id}', '{results.0.rows.5.name}'] } )
      c._executableParams = [ 1, 'active', '{lastop.rows.1.id}', '{results.2.rows.5.name}']

      expect(() => c.transactionalResultValueSubstitution( results )).to.throw(`parameter '{results.2.rows.5.name}' not found`)

    })

  })

})
