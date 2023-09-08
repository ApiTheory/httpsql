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


  

  describe('executeCommands methods', () => {

    const clientMock = {
      id: 'testClient',
      query: async (sql, params) => { return Promise.resolve() }
    }
  
    const clientMockQuery = sinon.spy(clientMock, 'query' )
  
    afterEach(() => {
      clientMockQuery.resetHistory()
    })
  
    // create unit test for executeCommands method with valid arguments
    it('throws if missing client argument', async () => {
      const context = new Context( new Root())
      let thrown = false
      try {
        await context.executeCommands()
      } catch ( err )  {
        thrown = true
        expect(err).to.be.instanceOf(Error)
        expect(err.message).to.equal('a client is required to execute commands')
      }
      
      expect(thrown).true

    })

    it('throws if transaction already started', async () => {
      
      const context = new Context( new Root())
      context._executionState = 'started'

      let thrown = false
      try {
        await context.executeCommands(clientMock)
      } catch ( err )  {
        thrown = true
        expect(err).to.be.instanceOf(Error)
        expect(err.message).to.equal(`The context can only execute commands one time.  The current transactionState === 'started'`)
      }
      
      expect(thrown).true

    })

    it('exits early if no commands to execute', async () => {
      const context = new Context( new Root())
      const result = await context.executeCommands( clientMock )
      expect(result).deep.equals({ executionState: 'nothing-to-do', results: [] })
    })

    it('executes all commands successfully and returns result', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).returns()
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(1)

      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])

      expect(command3transactionalResultValueSubstitutionStub.firstCall.args[0]).to.be.instanceOf(Array)
      expect(command3transactionalResultValueSubstitutionStub.firstCall.args[0].length).equal(2)
      expect(command3transactionalResultValueSubstitutionStub.firstCall.args[0][0].status).equal('success')
      expect(command3transactionalResultValueSubstitutionStub.firstCall.args[0][0].rowCount).equal(1)
      expect(command3transactionalResultValueSubstitutionStub.firstCall.args[0][0].rows).to.deep.equal([{ id: 1 }])
      expect(command3transactionalResultValueSubstitutionStub.firstCall.args[0][1].status).equal('success')
      expect( command1executeStub.firstCall.args[0].id).equals('testClient')
      expect( command3executeStub.firstCall.args[0].id).equals('testClient')
      
      expect( command2executeStub.firstCall.args[0][0].status).equals('success')
      expect( command2executeStub.firstCall.args[0][0].rowCount).equals(1)
      expect( command2executeStub.firstCall.args[0][0].rows).to.deep.equal([{ id: 1 }])

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

    it('if sql command stops processing, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).returns()
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'stop' })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(0)
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)

      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])
      expect(result.results[0].status).equals('expectation-failure')
      expect(result.results[0].failureAction).equals('stop')
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if logic command stops processing, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).returns()
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'stop' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(0)
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(0)

      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])
      expect(result.results[1].status).equals('logic-failure')
      expect(result.results[1].failureAction).equals('stop')
      expect(result.results[0].status).equals('success')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if logic command throws error, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).returns()
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'success', rowCount: 1, rows: [ { id: 1 } ] })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).rejects(new LogicOpFailureError('it was illogical') )

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(0)
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(1)
      expect(command3executeStub.callCount).equals(0)

      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])
      expect(result.results[1].status).equals('logic-failure')
      expect(result.results[1].failureAction).equals('throw')
      expect(result.results[1].error).to.be.an.instanceOf(LogicOpFailureError)
      expect(result.results[0].status).equals('success')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if command throws DatabaseError during execute stage, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).returns()
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).rejects(new DatabaseError('a db error just happened'))
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(0)
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)

      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])
      expect(result.results[0].status).equals('database-failure')
      expect(result.results[0].failureAction).equals('throw')
      expect(result.results[0].error).to.be.instanceOf(DatabaseError)
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if command throws ExpectationFailureError  during execute stage, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).returns()
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).rejects(new ExpectationFailureError ('an expectation died'))
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root([command1, command2, command3])
      const context = new Context( r )

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(0)
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)

      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])
      expect(result.results[0].status).equals('expectation-failure')
      expect(result.results[0].failureAction).equals('throw')
      expect(result.results[0].error).to.be.instanceOf(ExpectationFailureError)
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if command throws Error during execute stage, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).returns()
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).rejects(new Error ('un unexpected error just happened'))
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root( [command1, command2, command3] )
      const context = new Context(r)

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(0)
      expect(command1executeStub.callCount).equals(1)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)

      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])
      expect(result.results[0].status).equals('unhandled-exception')
      expect(result.results[0].failureAction).equals('throw')
      expect(result.results[0].error).to.be.instanceOf(Error)
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')

    })

    it('if command fails transactionalResultValueSubstitution, all additional commands do not get processed', async () => {

      const command1 = new SqlCommand( { sql:'select * from test1' } )
      const command2 = new LogicCommand( { logicOp: { '===' : ['active', { 'var' :'status'}]}})
      const command3 = new SqlCommand( { sql:'select * from test2' } )

      const command1transactionalResultValueSubstitutionStub = sinon.stub(command1, 'transactionalResultValueSubstitution' ).throws(new Error('an error occurred'))
      const command3transactionalResultValueSubstitutionStub = sinon.stub(command3, 'transactionalResultValueSubstitution' ).returns()
  
      const command1executeStub = sinon.stub(command1, 'execute' ).resolves({ status: 'stop' })
      const command3executeStub = sinon.stub(command3, 'execute' ).resolves({ status: 'success', rowCount: 2, rows: [ { id: 1 }, { id: 2 } ] })
      const command2executeStub = sinon.stub(command2, 'execute' ).resolves({ status: 'success' })

      const r = new Root([command1, command2, command3])
      const context = new Context(r)

      const result = await context.executeCommands( clientMock )

      expect(command1transactionalResultValueSubstitutionStub.callCount).equals(1)
      expect(command3transactionalResultValueSubstitutionStub.callCount).equals(0)
      expect(command1executeStub.callCount).equals(0)
      expect(command2executeStub.callCount).equals(0)
      expect(command3executeStub.callCount).equals(0)
      expect(command1transactionalResultValueSubstitutionStub.firstCall.args[0]).to.deep.equal([])
      expect(result.executionState).equals('error')
      expect(result.results[0].status).equals('dynamicParameterAssignmentFailure')
      expect(result.results[0].failureAction).equals('throw')
      expect(result.results[0].error).to.be.instanceOf(Error)
      expect(result.results[1].status).equals('not-executed')
      expect(result.results[2].status).equals('not-executed')            

    })

  })
   
  describe('context.assignVariables method', () => {
    
    it('should not assign anything if empty array is passed', () => {
      const context = new Context( new Root())
      context.assignVariables( [ ] )
      expect(context._variables).deep.equal([])
    })

    it('should not assign anything if null is passed', () => {
      const context = new Context( new Root())
      context.assignVariables( null )
      expect(context._variables).deep.equal([])
    })

    it('should not assign anything if undefined is passed', () => {
      const context = new Context( new Root())
      context.assignVariables( )
      expect(context._variables).deep.equal([])
    })

    it('should succeed if preTransactionVariableSubstitution does not error out', () => {

      const r = new Root()
      const command = new SqlCommand( { sql: 'select * from test;' } )
      r.addCommand( command )
      const context = new Context(r)
      
      const stub = sinon.stub( command, 'preTransactionVariableSubstitution' )
      
      context.assignVariables( { id: 1})
      expect(stub.calledOnce).true
      expect(stub.firstCall.firstArg).to.deep.equal( { id: 1 } )
      
    })

    it('should throw if preTransactionVariableSubstitution throws', () => {

      const command = new SqlCommand( { sql: 'select * from test;' } )
      const r = new Root()
      r.addCommand( command )
      const context = new Context( r )
      
      const stub = sinon.stub( command, 'preTransactionVariableSubstitution' ).throws(new Error('an error occurred'))
      
      
      expect(()=>{
        context.assignVariables( { id: 1})
      }).to.throw('variable assignment failure on command 0: an error occurred');
      
    })

  })
})
