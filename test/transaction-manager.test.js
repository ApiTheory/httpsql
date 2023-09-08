import { expect } from 'chai'
import {TransactionManager} from '../src/transaction-manager.js'
import { Root } from '../src/root.js'
import sinon from 'sinon'

describe.only('TransactionManager', () => {
  
  const clientMock = {
    id: 'testClient',
    query: async (sql, params) => { return Promise.resolve() }
  }

  const clientMockQuery = sinon.spy(clientMock, 'query' )

  afterEach(() => {
    clientMockQuery.resetHistory()
  })

  it('should be a function', () => {
    expect(TransactionManager).to.be.a('function')
  })

  it('should be a TransactionManager', () => {
    const t = new TransactionManager( clientMock, new Root() );
    expect(t).to.be.an.instanceOf(TransactionManager);
  })

  it('should be created', () => {
      const t = new TransactionManager( clientMock, new Root() )
      expect(t).to.be.ok
  });

  it('should throw if client not passed to constructor', () => {
    expect(() => {
      new TransactionManager(null)
    }).to.throw('the client argument must be defined')
  })

  it('should throw if client does not have query method', () => {
    expect(() => {
      new TransactionManager({ })
    }).to.throw('the client argument must have a query method')
  
  })

 



  it('constructor defaults should be correct', () => {
    const t = new TransactionManager( clientMock, new Root() )
    expect(t.name).to.be.undefined
    expect(t.description).to.be.undefined
    expect(t.transactionState).to.equal('not-started')
  })

  it('should call beginTransaction method successfully', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.beginTransaction()  
    expect(clientMockQuery.calledOnce).to.be.true
    expect(clientMockQuery.firstCall.args[0]).to.equal('BEGIN')
    expect(t.transactionState).to.equal('transact-begin-complete')
  })

  it('should call commitTransaction method successfully after beginTransaction', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.beginTransaction()  
    await t.commitTransaction()
    expect(clientMockQuery.calledTwice).to.be.true
    expect(clientMockQuery.secondCall.args[0]).to.equal('COMMIT')
    expect(t.transactionState).to.equal('transact-commit-complete')
  })

  it('should call rollbackTransaction method successfully after beginTransaction', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.beginTransaction()  
    await t.rollbackTransaction()
    expect(clientMockQuery.calledTwice).to.be.true
    expect(clientMockQuery.secondCall.args[0]).to.equal('ROLLBACK')
    expect(t.transactionState).to.equal('transact-rollback-complete')
  })

  it('commitTransaction method will fail if beginTransaction not called', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    let thrown = false
    try {
      await t.commitTransaction()
    } catch ( err ) {
      thrown = true
      expect(clientMockQuery.callCount).equal(0)
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be committed because its state = 'not-started'`)
      expect(t.transactionState).to.equal('not-started')
    }
    
    expect(thrown).to.be.true

  })

  it('rollbackTransaction method will fail if beginTransaction not called', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    let thrown = false
    try {
      await t.rollbackTransaction()
    } catch ( err ) {
      thrown = true
      expect(clientMockQuery.callCount).equal(0)
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be rolled back because its state = 'not-started'`)
      expect(t.transactionState).to.equal('not-started')
    }
    
    expect(thrown).to.be.true

  })

  it('should fail when beginTransaction method called twice', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.beginTransaction()
    let thrown = false
    try {
      await t.beginTransaction()
    } catch ( err ) {
      thrown = true
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be started because its state = 'transact-begin-complete'`)
    
    }

    expect(thrown).to.be.true
    expect(clientMockQuery.callCount).equal(1)

  })

  it('should return nothing-to-do if no commands set when executeTransaction method is called', async () => {
    
    const t = new TransactionManager( clientMock, new Root() )
    expect(t._transactionStarted).false
    const results = await t.executeTransaction()
    expect(t._transactionStarted).true
    expect(results.finalState).equal('nothing-to-do')
    expect(t.transactionState).to.equal('not-started')
    expect(clientMockQuery.callCount).equal(0)
    
  })

  it('should fail when executeTransaction method called twice', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.executeTransaction()
    let thrown = false
    try {
      await t.executeTransaction()
    } catch ( err ) {
      thrown = true
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`a transaction can only be started once - create a new object in order to execute a new transaction`)
    
    }

    expect(thrown).to.be.true
    expect(clientMockQuery.callCount).equal(0)

  })

  it('executeTransaction called with variables, executeCommand returns success, default output', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var assignVariablesStub = sinon.stub(t._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(t._context, 'executeCommands').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' })
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
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var assignVariablesStub = sinon.stub(t._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(t._context, 'executeCommands').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' }, { output: 'allresults'})
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
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var assignVariablesStub = sinon.stub(t._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(t._context, 'executeCommands').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' }, { output: 'fullcontext'})
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
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var assignVariablesStub = sinon.stub(t._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(t._context, 'executeCommands').resolves( { executionState : 'stop', results: [{ status: 'stop', rows:[], rowCount: 0, expectationFailureMessage: 'expectation failed' }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' })
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
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var assignVariablesStub = sinon.stub(t._context, 'assignVariables')
    var executeCommandsStub = sinon.stub(t._context, 'executeCommands').resolves( { 
      executionState : 'error', results: [{ 
      status: 'databaseFailure',
      failureAction : 'throw' ,
      error : {
        message : 'test error'
      }
    } ] } )

    const results = await t.executeTransaction( { id: 1, name: 'test' })
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
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    const assignVariablesStub = sinon.stub(t._context, 'assignVariables').throws( new Error('test error') )
    const executeCommandsStub = sinon.stub(t._context, 'executeCommands')
    
    let thrown

    try {
      const results = await t.executeTransaction( { id: 1, name: 'test' })
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
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    const assignVariablesStub = sinon.stub(t._context, 'assignVariables')
    const executeCommandsStub = sinon.stub(t._context, 'executeCommands').rejects( new Error('test error') )
    
    let thrown

    try {
      const results = await t.executeTransaction( { id: 1, name: 'test' })
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





