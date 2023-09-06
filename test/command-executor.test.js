import { expect } from 'chai'
import {TransactionalCommandExecutor} from '../src/command-executor.js'
import sinon from 'sinon'
describe('TransactionalCommandExecutor', () => {
  
  const clientMock = {
    id: 'testClient',
    query: async (sql, params) => { return Promise.resolve() }
  }

  const clientMockQuery = sinon.spy(clientMock, 'query' )

  afterEach(() => {
    clientMockQuery.resetHistory()
  })

  it('should be a function', () => {
    expect(TransactionalCommandExecutor).to.be.a('function')
  })

  it('should be a TransactionalCommandExecutor', () => {
    const e = new TransactionalCommandExecutor( clientMock );
    expect(e).to.be.an.instanceOf(TransactionalCommandExecutor);
  })


  it('should be created', () => {
      const executor = new TransactionalCommandExecutor( clientMock )
      expect(executor).to.be.ok
  });

  it('should throw if client not passed to constructor', () => {
    expect(() => {
      new TransactionalCommandExecutor(null)
    }).to.throw('the client argument must be defined')
  })

  it('should throw if client does not have query method', () => {
    expect(() => {
      new TransactionalCommandExecutor({ })
    }).to.throw('the client argument must have a query method')
  
  })

  it('should throw if command argument not an array', () => {
    expect(() => {
      new TransactionalCommandExecutor( clientMock, {})
    }).to.throw('the commands argument must be an array')
    expect(() => {
      new TransactionalCommandExecutor( clientMock, '')
    }).to.throw('the commands argument must be an array')
    expect(() => {
      new TransactionalCommandExecutor( clientMock, 3)
    }).to.throw('the commands argument must be an array')
    expect(() => {
      new TransactionalCommandExecutor( clientMock, true)
    }).to.throw('the commands argument must be an array')
    expect(() => {
      new TransactionalCommandExecutor( clientMock, false)
    }).to.throw('the commands argument must be an array')
    expect(() => {
      new TransactionalCommandExecutor( clientMock, Date.now())
    }).to.throw('the commands argument must be an array')
  })

  it('id should be autogenerated if not passed to constructor', () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    expect(executor.id).to.be.ok
    expect(executor.id).to.be.a('string')
    expect(executor.id.length).equal(26)
  })
  
  it('id should be set if passed in opts', () => {
    const executor = new TransactionalCommandExecutor( clientMock, [], { id: 'test-id'} )
    expect(executor.id).to.be.ok
    expect(executor.id).to.be.a('string')
    expect(executor.id).equal('test-id')
  })

  it('id should be set with id generator', () => {
    const executor = new TransactionalCommandExecutor( clientMock, [], { genId: () => { return 'my-special-id'} } )
    expect(executor.id).to.be.ok
    expect(executor.id).to.be.a('string')
    expect(executor.id).equal('my-special-id')
  })

  it('support multiple commands being passed to constructor', () => {
    const commands = [{
      sql : 'select * from test'
    }, {
      sql : 'select * from test2'
    }]

    const executor = new TransactionalCommandExecutor( clientMock, commands )
    expect(executor.commands).to.be.ok
    expect(executor.commands).to.be.an('array')
    expect(executor.commands.length).equal(2)
    expect(executor.commands[0].command).equal('select * from test')
    expect(executor.commands[1].command).equal('select * from test2')
  })

  it('support multiple commands being passed to addCommand method', () => {

    const executor = new TransactionalCommandExecutor( clientMock )
    executor.addCommand({
      sql : 'select * from test'
    })
    executor.addCommand({
      sql : 'select * from test2'
    })
    expect(executor.commands).to.be.ok
    expect(executor.commands).to.be.an('array')
    expect(executor.commands.length).equal(2)

    expect(executor.commands[0].command).equal('select * from test')
    expect(executor.commands[1].command).equal('select * from test2')
  })

  it('constructor defaults should be correct', () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    expect(executor.name).to.be.undefined
    expect(executor.description).to.be.undefined
    expect(executor.currentState).to.equal('not-started')
  })

  it('should call beginTransaction method successfully', async () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    await executor.beginTransaction()  
    expect(clientMockQuery.calledOnce).to.be.true
    expect(clientMockQuery.firstCall.args[0]).to.equal('BEGIN')
    expect(executor.currentState).to.equal('transact-begin-complete')
  })

  it('should call commitTransaction method successfully after beginTransaction', async () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    await executor.beginTransaction()  
    await executor.commitTransaction()
    expect(clientMockQuery.calledTwice).to.be.true
    expect(clientMockQuery.secondCall.args[0]).to.equal('COMMIT')
    expect(executor.currentState).to.equal('transact-commit-complete')
  })

  it('should call rollbackTransaction method successfully after beginTransaction', async () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    await executor.beginTransaction()  
    await executor.rollbackTransaction()
    expect(clientMockQuery.calledTwice).to.be.true
    expect(clientMockQuery.secondCall.args[0]).to.equal('ROLLBACK')
    expect(executor.currentState).to.equal('transact-rollback-complete')
  })

  it('commitTransaction method will fail if beginTransaction not called', async () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    let thrown = false
    try {
      await executor.commitTransaction()
    } catch ( err ) {
      thrown = true
      expect(clientMockQuery.callCount).equal(0)
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be committed because its state = 'not-started'`)
      expect(executor.currentState).to.equal('not-started')
    }
    
    expect(thrown).to.be.true

  })

  it('rollbackTransaction method will fail if beginTransaction not called', async () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    let thrown = false
    try {
      await executor.rollbackTransaction()
    } catch ( err ) {
      thrown = true
      expect(clientMockQuery.callCount).equal(0)
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be rolled back because its state = 'not-started'`)
      expect(executor.currentState).to.equal('not-started')
    }
    
    expect(thrown).to.be.true

  })

  it('should fail when beginTransaction method called twice', async () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    await executor.beginTransaction()
    let thrown = false
    try {
      await executor.beginTransaction()
    } catch ( err ) {
      thrown = true
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be started because its state = 'transact-begin-complete'`)
    
    }

    expect(thrown).to.be.true
    expect(clientMockQuery.callCount).equal(1)

  })

  it('should return nothing-to-do if no commands set when executeTransaction method is called', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock )
    expect(executor.transactionExecutionStarted).false
    const results = await executor.executeTransaction()
    expect(executor.transactionExecutionStarted).true
    expect(results.finalState).equal('nothing-to-do')
    expect(executor.currentState).to.equal('not-started')
    expect(clientMockQuery.callCount).equal(0)
    
  })

  it('should fail when executeTransaction method called twice', async () => {
    const executor = new TransactionalCommandExecutor( clientMock )
    await executor.executeTransaction()
    let thrown = false
    try {
      await executor.executeTransaction()
    } catch ( err ) {
      thrown = true
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the command executor object can only call this method one time - create a new object in order to execute a new transaction`)
    
    }

    expect(thrown).to.be.true
    expect(clientMockQuery.callCount).equal(0)

  })

  it('executeTransaction called with variables, executeCommand returns success, default output', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock, [{ sql:'select * from table1;' }] )
    var assignVariablesStub = sinon.stub(executor._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(executor._context, 'executeCommands').resolves( { transactionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await executor.executeTransaction( { id: 1, name: 'test' })
    // assignVariables call
    expect(assignVariablesStub.callCount).equal(1)
    expect(assignVariablesStub.firstCall.args[0]).to.deep.equal({ id: 1, name: 'test' })
    const calls = clientMockQuery.getCalls()
    expect(calls[0].args).to.deep.equal(['BEGIN'])
    // note that we can't test the call to the database because its been stubbed out above.  Assume testing for that
    // occurs in the command tests
    expect(calls[1].args).to.deep.equal(['COMMIT'])
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.firstArg.id).to.equal('testClient')
    expect( results ).to.deep.equal({ finalState : 'success', results: { status: 'success', rows:[], rowCount: 0 } })
    
  })

  it('executeTransaction called with variables, executeCommand returns success, all results output', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock, [{ sql:'select * from table1;' }] )
    var assignVariablesStub = sinon.stub(executor._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(executor._context, 'executeCommands').resolves( { transactionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await executor.executeTransaction( { id: 1, name: 'test' }, { output: 'allresults'})
    // assignVariables call
    expect(assignVariablesStub.callCount).equal(1)
    expect(assignVariablesStub.firstCall.args[0]).to.deep.equal({ id: 1, name: 'test' })
    const calls = clientMockQuery.getCalls()
    expect(calls[0].args).to.deep.equal(['BEGIN'])
    // note that we can't test the call to the database because its been stubbed out above.  Assume testing for that
    // occurs in the command tests
    expect(calls[1].args).to.deep.equal(['COMMIT'])
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.firstArg.id).to.equal('testClient')
    expect( results ).to.deep.equal({ finalState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] })
    
  })

  it('executeTransaction called with variables, executeCommand returns success, full context output', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock, [{ sql:'select * from table1;' }] )
    var assignVariablesStub = sinon.stub(executor._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(executor._context, 'executeCommands').resolves( { transactionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await executor.executeTransaction( { id: 1, name: 'test' }, { output: 'fullcontext'})
    // assignVariables call
    expect(assignVariablesStub.callCount).equal(1)
    expect(assignVariablesStub.firstCall.args[0]).to.deep.equal({ id: 1, name: 'test' })
    const calls = clientMockQuery.getCalls()
    expect(calls[0].args).to.deep.equal(['BEGIN'])
    // note that we can't test the call to the database because its been stubbed out above.  Assume testing for that
    // occurs in the command tests
    expect(calls[1].args).to.deep.equal(['COMMIT'])
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.firstArg.id).to.equal('testClient')
    expect( results.finalState ).equal('success')
    expect( results.context).to.be.ok
    
  })

  it('executeTransaction called with variables, executeCommand returns stop, default output', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock, [{ sql:'select * from table1;' }] )
    var assignVariablesStub = sinon.stub(executor._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(executor._context, 'executeCommands').resolves( { transactionState : 'stop', results: [{ status: 'stop', rows:[], rowCount: 0, expectationFailureMessage: 'expectation failed' }] } )
    const results = await executor.executeTransaction( { id: 1, name: 'test' })
    // assignVariables call
    expect(assignVariablesStub.callCount).equal(1)
    expect(assignVariablesStub.firstCall.args[0]).to.deep.equal({ id: 1, name: 'test' })
    const calls = clientMockQuery.getCalls()
    expect(calls[0].args).to.deep.equal(['BEGIN'])
    // note that we can't test the call to the database because its been stubbed out above.  Assume testing for that
    // occurs in the command tests
    expect(calls[1].args).to.deep.equal(['COMMIT'])
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.firstArg.id).to.equal('testClient')
    expect( results ).to.deep.equal({ finalState : 'stop', results: { status: 'stop', rows:[], rowCount: 0, expectationFailureMessage: 'expectation failed' } })
    
  })

  it('executeTransaction called with variables, executeCommand returns error, default output', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock, [{ sql:'select * from table1;' }] )
    var assignVariablesStub = sinon.stub(executor._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(executor._context, 'executeCommands').resolves( { 
      transactionState : 'error', results: [{ 
      status: 'databaseFailure',
      failureAction : 'throw' ,
      error : {
        message : 'test error'
      }
    } ] } )

    const results = await executor.executeTransaction( { id: 1, name: 'test' })
    // assignVariables call
    expect(assignVariablesStub.callCount).equal(1)
    expect(assignVariablesStub.firstCall.args[0]).to.deep.equal({ id: 1, name: 'test' })
    const calls = clientMockQuery.getCalls()
    expect(calls[0].args).to.deep.equal(['BEGIN'])
    // note that we can't test the call to the database because its been stubbed out above.  Assume testing for that
    // occurs in the command tests
    expect(calls[1].args).to.deep.equal(['ROLLBACK'])
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.firstArg.id).to.equal('testClient')
    expect( results ).to.deep.equal({ finalState : 'error', results: { status: 'databaseFailure', failureAction : 'throw' , error : { message : 'test error' } } })
    
  })

  it('assignVariables method throws', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock, [{ sql:'select * from table1;' }] )
    const assignVariablesStub = sinon.stub(executor._context, 'assignVariables').throws( new Error('test error') )
    const executeCommandsStub = sinon.stub(executor._context, 'executeCommands')
    
    let thrown

    try {
      const results = await executor.executeTransaction( { id: 1, name: 'test' })
    } catch ( err) {
      thrown = true
      expect(err.message).equal('test error')
      expect(err).instanceOf(Error)
      expect(assignVariablesStub.callCount).equal(1)
      expect(executeCommandsStub.callCount).equal(0)
    }
    
    expect(thrown).equal(true)
  })

  it('executTransaction method rejects', async () => {
    
    const executor = new TransactionalCommandExecutor( clientMock, [{ sql:'select * from table1;' }] )
    const assignVariablesStub = sinon.stub(executor._context, 'assignVariables')
    const executeCommandsStub = sinon.stub(executor._context, 'executeCommands').rejects( new Error('test error') )
    
    let thrown

    try {
      const results = await executor.executeTransaction( { id: 1, name: 'test' })
    } catch ( err) {
      thrown = true
      expect(err.message).equal('test error')
      expect(err).instanceOf(Error)
      expect(assignVariablesStub.callCount).equal(1)
      expect(executeCommandsStub.callCount).equal(1)
    }
    
    expect(thrown).equal(true)
  })

})





