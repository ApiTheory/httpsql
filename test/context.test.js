import { Context } from '../src/context.js'
import { expect } from 'chai'
import sinon from 'sinon'
import { CommandValidationError, ExpectationFailureError, LogicOpFailureError } from '../src/errors.js'
import { Command } from '../src/command.js'
import { Root  } from '../src/root.js'
import { SqlCommand } from '../src/sql-command.js'
import { LogicCommand } from '../src/logic-command.js'
import { DatabaseError } from 'pg-protocol'
// create unit test suite

describe('Context', () => { 

  // create unit test
  it('should create a context', () => {
    const context = new Context( new Root())
    expect(context).to.be.instanceOf(Context)
    expect(context).to.have.property('commands')
    expect(context).to.have.property('results')
    expect(context).to.have.property('executionState')
    expect(context.commands).to.deep.equal([])
    expect(context.results).to.deep.equal([])
    expect(context.executionState).equal('not-started')
    expect(context._variables).undefined
    expect(context._transactionExecuted).undefined
  })  

  it('should throw if no root passed to constructor', () => {
    expect(() => {
      new Context( )
    })
    .to.throw('rootNode argument must be an instance of Root')
  })

  it('can set executionState directly', () => {
    const context = new Context( new Root())
    context.executionState = 'started'
    expect(context.executionState).equal('started')
  })

  describe('executeRequest methods', () => {

    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve() }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
  
    afterEach(() => {
      clientMockQuery.resetHistory()
    })
  
   
    it('throws if transaction already started', async () => {
      
      const context = new Context( new Root())
      context._executionState = 'started'

      let thrown = false
      try {
        await context.executeRequest( {}, { client: clientMock } )
      } catch ( err )  {
        thrown = true
        expect(err).to.be.instanceOf(Error)
        expect(err.message).to.equal(`the context can only execute commands one time but the current executionState === 'started'`)
      }
      
      expect(thrown).true

    })

    it('exits early if no commands to execute', async () => {
      const context = new Context( new Root())
      const result = await context.executeRequest( {}, { client: clientMock } )
      expect(result).undefined
      expect(context.executionState).equals('nothing-to-do')
      expect(context.results).deep.equals([])

    })

    it('can handle undefined variables', async () => {
      const context = new Context( new Root())
      const result = await context.executeRequest( undefined, { client: clientMock } )
      expect(result).undefined
      expect(context.executionState).equals('nothing-to-do')
      expect(context.results).deep.equals([])

    })

    it('can handle null variables', async () => {
      const context = new Context( new Root())
      const result = await context.executeRequest( null, { client: clientMock } )
      expect(result).undefined
      expect(context.executionState).equals('nothing-to-do')
      expect(context.results).deep.equals([])

    })

    it('executes all commands successfully and returns result', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: 'test=1' })
      const command3 = new SqlCommand( { sql:'select * from test2' } )
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock } )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(1)

      expect( command1executeStub.firstCall.args[0].lastResult).equals(null)
      expect( command2executeStub.firstCall.args[0].lastResult.type).equals('sql')
      expect( command3executeStub.firstCall.args[0].lastResult.type).equals('logic')
      expect( command2executeStub.firstCall.args[0].lastResult.status).equals('success')
      expect( command3executeStub.firstCall.args[0].lastResult.status).equals('success')
      expect( command2executeStub.firstCall.args[0].lastResult.rowCount).equals(1)
      expect( command3executeStub.firstCall.args[0].lastResult.rowCount).undefined
      expect( command1executeStub.firstCall.args[1].client.id).deep.equals('testClient')
      expect( command3executeStub.firstCall.args[1].client.id).equals('testClient')
      expect( command2executeStub.firstCall.args[0].lastResult.command._command).equals('select * from test1')
      expect( command3executeStub.firstCall.args[0].lastResult.command._command).equals('test=1')
      
      expect( command2executeStub.firstCall.args[0].lastDataResult.type).equals('sql')
      expect( command2executeStub.firstCall.args[0].lastDataResult.status).equals('success')
      expect( command2executeStub.firstCall.args[0].lastDataResult.command._command).equals('select * from test1')
      expect( command2executeStub.firstCall.args[0].lastDataResult.rowCount).equals(1)
      expect( command2executeStub.firstCall.args[0].lastDataResult.rows).to.deep.equal([{ id: 1 }])

      expect( result.executionState).equals('success' )
      expect( result.results.length).equals(3)
      expect( result.results[0].status).equals('success')
      expect( result.results[0].rowCount).equals(1)
      expect( result.results[0].rows).to.deep.equal([{ id: 1 }])
      expect( result.results[1].status).equals('success')
      expect( result.results[2].status).equals('success')
      expect( result.results[2].rowCount).equals(2)
      expect( result.results[2].rows).to.deep.equal([{ id: 1 }, { id: 2 }])

    })

    it('executes all commands successfully and returns last-result', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: 'test=1' })
      const command3 = new SqlCommand( { sql:'select * from test2' } )
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock, output: 'last-result' } )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(1)

      expect( command1executeStub.firstCall.args[0].lastResult).equals(null)
      expect( command2executeStub.firstCall.args[0].lastResult.type).equals('sql')
      expect( command3executeStub.firstCall.args[0].lastResult.type).equals('logic')
      expect( command2executeStub.firstCall.args[0].lastResult.status).equals('success')
      expect( command3executeStub.firstCall.args[0].lastResult.status).equals('success')
      expect( command2executeStub.firstCall.args[0].lastResult.rowCount).equals(1)
      expect( command3executeStub.firstCall.args[0].lastResult.rowCount).undefined
      expect( command1executeStub.firstCall.args[1].client.id).deep.equals('testClient')
      expect( command3executeStub.firstCall.args[1].client.id).equals('testClient')
      expect( command2executeStub.firstCall.args[0].lastResult.command._command).equals('select * from test1')
      expect( command3executeStub.firstCall.args[0].lastResult.command._command).equals('test=1')
      
      expect( command2executeStub.firstCall.args[0].lastDataResult.type).equals('sql')
      expect( command2executeStub.firstCall.args[0].lastDataResult.status).equals('success')
      expect( command2executeStub.firstCall.args[0].lastDataResult.command._command).equals('select * from test1')
      expect( command2executeStub.firstCall.args[0].lastDataResult.rowCount).equals(1)
      expect( command2executeStub.firstCall.args[0].lastDataResult.rows).to.deep.equal([{ id: 1 }])

      expect( result.executionState).equals('success' )
      expect( result.results).undefined
      expect( result.lastResult.status).equals('success')
      expect( result.lastResult.type).equals('sql')      
      expect( result.lastResult.command._command).equals('select * from test2')        
      expect( result.lastResult.rowCount).equals(2)
      expect( result.lastResult.rows).to.deep.equal([{ id: 1 }, { id: 2 }])

    })

    it('executes all commands successfully and returns last-logic-result', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: 'test=1' })
      const command3 = new SqlCommand( { sql:'select * from test2' } )
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock, output: 'last-logic-result' } )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(1)

      expect( command1executeStub.firstCall.args[0].lastResult).equals(null)
      expect( command2executeStub.firstCall.args[0].lastResult.type).equals('sql')
      expect( command3executeStub.firstCall.args[0].lastResult.type).equals('logic')
      expect( command2executeStub.firstCall.args[0].lastResult.status).equals('success')
      expect( command3executeStub.firstCall.args[0].lastResult.status).equals('success')
      expect( command2executeStub.firstCall.args[0].lastResult.rowCount).equals(1)
      expect( command3executeStub.firstCall.args[0].lastResult.rowCount).undefined
      expect( command1executeStub.firstCall.args[1].client.id).deep.equals('testClient')
      expect( command3executeStub.firstCall.args[1].client.id).equals('testClient')
      expect( command2executeStub.firstCall.args[0].lastResult.command._command).equals('select * from test1')
      expect( command3executeStub.firstCall.args[0].lastResult.command._command).equals('test=1')
      
      expect( command2executeStub.firstCall.args[0].lastDataResult.type).equals('sql')
      expect( command2executeStub.firstCall.args[0].lastDataResult.status).equals('success')
      expect( command2executeStub.firstCall.args[0].lastDataResult.command._command).equals('select * from test1')
      expect( command2executeStub.firstCall.args[0].lastDataResult.rowCount).equals(1)
      expect( command2executeStub.firstCall.args[0].lastDataResult.rows).to.deep.equal([{ id: 1 }])

      expect( result.executionState).equals('success' )
      expect( result.results).undefined
      expect( result.lastLogicResult.status).equals('success')
      expect( result.lastLogicResult.type).equals('logic')      
      expect( result.lastLogicResult.command._command).equals('test=1')        

    })

    it('executes all commands successfully and returns full-context', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new SqlCommand( { sql:'select * from test2' } )
      const command3 = new LogicCommand( { logicOp: 'test=1' })
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock, output: 'full-context' } )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(1)
    
      expect( result.executionState).equals('success' )
      expect( result.results).undefined
      expect( result.fullContext.request).deep.equals({})
      expect( result.fullContext.variables).deep.equals({})
      expect( Array.isArray(result.fullContext.results)).true
      expect( Array.isArray(result.fullContext.commands)).true
      
    })

    it('executes all commands successfully and returns last-data-result', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new SqlCommand( { sql:'select * from test2' } )
      const command3 = new LogicCommand( { logicOp: 'test=1' })
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock, output: 'last-data-result' } )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(1)


      expect( result.executionState).equals('success' )
      expect( result.results).undefined
      expect( result.lastDataResult.status).equals('success')
      expect( result.lastDataResult.type).equals('sql')      
      expect( result.lastDataResult.command._command).equals('select * from test2')        
      expect( result.lastDataResult.rowCount).equals(2)
      expect( result.lastDataResult.rows).to.deep.equal([{ id: 1 }, { id: 2 }])

    })

    it('if sql command stops processing, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: `status='active'`})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'stop' })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock } )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)

      expect(result.executionState).equals('stop')
      expect(result.results[0].status).equals('stop')
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if logic command stops processing, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: `status='active'`})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'stop' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock} )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(0)

      expect(result.executionState).equals('stop')
      expect(result.results[0].status).equals('success')
      expect(result.results[1].status).equals('stop')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if logic command throws error, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: `status='active'`})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).rejects(new LogicOpFailureError('it was illogical') )

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( clientMock )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(0)
      expect(result.executionState).equals('error')
      expect(result.results[0].status).equals('success') 
      expect(result.results[1].status).equals('logic-execution-failure')
      expect(result.results[1].failureAction).equals('throw')
      expect(result.results[1].error).to.be.an.instanceOf(LogicOpFailureError)
      expect(result.results[2].status).equals('not-executed')

    })

    it('if command throws DatabaseError during execute stage, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: `status='active'`})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

  
      const command1executeStub = sinon.stub(command1, 'execute' ).rejects(new DatabaseError('a db error just happened'))
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( {}, { client: clientMock }  )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)

      expect(result.results[0].status).equals('database-execution-failure')
      expect(result.results[0].failureAction).equals('throw')
      expect(result.results[0].error).to.be.instanceOf(DatabaseError)
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if command throws ExpectationFailureError  during execute stage, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: `status='active'`} )
      const command3 = new SqlCommand( { sql:'select * from test2' } )

  
      const command1executeStub = sinon.stub(command1, 'execute' ).rejects(new ExpectationFailureError ('an expectation died'))
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root([command1, command2, command3])
      const context = new Context( r )

      const result = await context.executeRequest( {}, { client: clientMock } )

      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)

      expect(result.executionState).equals('error')
      expect(result.results[0].status).equals('expectation-failure')
      expect(result.results[0].failureAction).equals('throw')
      expect(result.results[0].error).to.be.instanceOf(ExpectationFailureError)
      expect(result.results[1].type).equals('logic')
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].type).equals('sql')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if command throws Error during execute stage, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: `status='active'`} )
      const command3 = new SqlCommand( { sql:'select * from test2' } )
  
      const command1executeStub = sinon.stub(command1, 'execute' ).rejects(new Error ('un unexpected error just happened'))
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeRequest( clientMock )
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)
      expect(result.results[0].status).equals('unhandled-exception')
      expect(result.results[0].failureAction).equals('throw')
      expect(result.results[0].error).to.be.instanceOf(Error)
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')

    })

    

  })

})
