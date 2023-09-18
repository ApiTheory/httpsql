import { expect } from 'chai'
import {TransactionManager} from '../src/transaction-manager.js'
import { Root } from '../src/root.js'
import sinon from 'sinon'

describe('TransactionManager', () => {
  
  const clientMock = {
    id: 'testClient',
    beginTransaction: async() => { return Promise.resolve() },    
    commitTransaction: async() => { return Promise.resolve() },    
    rollbackTransaction: async() => { return Promise.resolve() },
    query: async (sql, params) => { return Promise.resolve() }
  }

  const clientQuerySpy = sinon.spy(clientMock, 'query' )
  const clientBeginTransactionSpy = sinon.spy(clientMock, 'beginTransaction' )
  const clientCommitTransactionSpy = sinon.spy(clientMock, 'commitTransaction' )
  const clientRollbackTransactionSpy = sinon.spy(clientMock, 'rollbackTransaction' )

  afterEach(() => {
    clientQuerySpy.resetHistory()
    clientBeginTransactionSpy.resetHistory()
    clientCommitTransactionSpy.resetHistory()
    clientRollbackTransactionSpy.resetHistory()
  })

  describe('constructor', () => { 

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

  })

  it('should call beginTransaction method successfully', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.beginTransaction()  
    expect(clientBeginTransactionSpy.calledOnce).to.be.true
    expect(t.transactionState).to.equal('transact-begin-complete')
  })

  it('should call commitTransaction method successfully after beginTransaction', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.beginTransaction()  
    await t.commitTransaction()
    expect(clientBeginTransactionSpy.calledOnce).to.be.true
    expect(clientCommitTransactionSpy.calledOnce).to.be.true
    expect(t.transactionState).to.equal('transact-commit-complete')
  })

  it('should call rollbackTransaction method successfully after beginTransaction', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    await t.beginTransaction()  
    await t.rollbackTransaction()
    expect(clientBeginTransactionSpy.calledOnce).to.be.true
    expect(clientRollbackTransactionSpy.calledOnce).to.be.true
    expect(t.transactionState).to.equal('transact-rollback-complete')
  })

  it('commitTransaction method will fail if beginTransaction not called', async () => {
    const t = new TransactionManager( clientMock, new Root() )
    let thrown = false
    try {
      await t.commitTransaction()
    } catch ( err ) {
      thrown = true
      expect(clientBeginTransactionSpy.calledOnce).to.be.false
      expect(clientRollbackTransactionSpy.calledOnce).to.be.false
      expect(clientCommitTransactionSpy.calledOnce).to.be.false  // should not even be called
      expect(clientQuerySpy.calledOnce).to.be.false
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
      expect(clientBeginTransactionSpy.calledOnce).to.be.false
      expect(clientRollbackTransactionSpy.calledOnce).to.be.false
      expect(clientCommitTransactionSpy.calledOnce).to.be.false  
      expect(clientQuerySpy.calledOnce).to.be.false
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
      expect(clientBeginTransactionSpy.callCount).equal(1)
      expect(clientRollbackTransactionSpy.calledOnce).to.be.false
      expect(clientCommitTransactionSpy.calledOnce).to.be.false  
      expect(clientQuerySpy.calledOnce).to.be.false
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be started because its state = 'transact-begin-complete'`)
    
    }

    expect(thrown).to.be.true


  })

  it('should return nothing-to-do if no commands set when executeTransaction method is called', async () => {
    
    const t = new TransactionManager( clientMock, new Root() )
    expect(t._transactionStarted).false
    const results = await t.executeTransaction()
    expect(t._transactionStarted).true
    expect(results.finalState).equal('nothing-to-do')
    expect(t.transactionState).to.equal('not-started')
    expect(clientQuerySpy.callCount).equal(0)
    
  })

  it('should fail when executeTransaction method called twice', async () => {
    const r = new Root( [{ sql:'select * from table1;' }] )
    const t = new TransactionManager( clientMock, r )
    await t.executeTransaction()
    let thrown = false
    try {
      await t.executeTransaction()
    } catch ( err ) {
      thrown = true
      expect(clientBeginTransactionSpy.callCount).equal(1)
      expect(clientRollbackTransactionSpy.callCount).equal(1)
      expect(clientCommitTransactionSpy.calledOnce).to.be.false  
      expect(clientQuerySpy.callCount).equal(1)
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`a transaction can only be started once - create a new object in order to execute a new transaction`)
    
    }

    expect(thrown).to.be.true


  })

  it('executeTransaction should fail if rollback already called', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    const executeCommandsStub = sinon.stub(t._context, 'executeRequest').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    
    await t.beginTransaction()
    await t.rollbackTransaction()

    let thrown = false
    try {
      const results = await t.executeTransaction( { id: 1, name: 'test' })
    } catch ( err) {
      thrown = true
      expect(clientBeginTransactionSpy.callCount).equal(1)
      expect(clientRollbackTransactionSpy.callCount).equal(1)
      expect(clientCommitTransactionSpy.callCount).equal(0)
      expect(clientQuerySpy.callCount).equal(0)
      expect( executeCommandsStub.callCount).equal(0)
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be executed because its state = 'transact-rollback-complete'`)
    }
   
    expect(thrown).to.be.true

  })

  it('executeTransaction should fail if commit already called', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    const executeCommandsStub = sinon.stub(t._context, 'executeRequest').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    
    await t.beginTransaction()
    await t.commitTransaction()

    let thrown = false
    try {
      const results = await t.executeTransaction( { id: 1, name: 'test' })
    } catch ( err) {
      thrown = true
      expect(clientBeginTransactionSpy.callCount).equal(1)
      expect(clientRollbackTransactionSpy.callCount).equal(0)
      expect(clientCommitTransactionSpy.callCount).equal(1)
      expect(clientQuerySpy.callCount).equal(0)
      expect( executeCommandsStub.callCount).equal(0)
      expect(err).to.be.an.instanceOf(Error)
      expect(err.message).to.equal(`the transaction can not be executed because its state = 'transact-commit-complete'`)
    }
   
    expect(thrown).to.be.true

  })

  it('executeTransaction called with variables, executeCommand returns success, default output', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var executeCommandsStub = sinon.stub(t._context, 'executeRequest').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' })
    const calls = clientQuerySpy.getCalls()
    expect(clientBeginTransactionSpy.callCount).equal(1)
    expect(clientRollbackTransactionSpy.callCount).equal(0)
    expect(clientCommitTransactionSpy.callCount).equal(1)
    expect(clientQuerySpy.callCount).equal(0)
    // note that we can't test the call to the database because its been stubbed out above.  Assume testing for that
    // occurs in the command tests
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.args[0].id).to.equal(1)
    expect(executeCommandsStub.firstCall.args[1].client.id).to.equal('testClient')

  })

  it('executeTransaction called with variables, executeCommand returns success, all results output', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var executeCommandsStub = sinon.stub(t._context, 'executeRequest').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' }, { output: 'allresults'})
    const calls = clientQuerySpy.getCalls()
    expect(clientBeginTransactionSpy.callCount).equal(1)
    expect(clientRollbackTransactionSpy.callCount).equal(0)
    expect(clientCommitTransactionSpy.callCount).equal(1)
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.args[0].id).to.equal(1)
    expect(executeCommandsStub.firstCall.args[1].client.id).to.equal('testClient')
    expect ( t.transactionState).equal('transact-execute-commit')
  })

  it('executeTransaction called with variables, executeCommand returns success, full context output', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var executeCommandsStub = sinon.stub(t._context, 'executeRequest').resolves( { executionState : 'success', results: [{ status: 'success', rows:[], rowCount: 0 }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' }, { output: 'fullcontext'})
    const calls = clientQuerySpy.getCalls()
    expect(clientBeginTransactionSpy.callCount).equal(1)
    expect(clientRollbackTransactionSpy.callCount).equal(0)
    expect(clientCommitTransactionSpy.callCount).equal(1)
    // executeCommands call
    expect(executeCommandsStub.firstCall.args[0].id).to.equal(1)
    expect(executeCommandsStub.firstCall.args[1].client.id).to.equal('testClient')
    
  })

  it('executeTransaction called with variables, executeCommand returns stop, default output', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )

    var executeCommandsStub = sinon.stub(t._context, 'executeRequest').resolves( { executionState : 'stop', results: [{ status: 'stop', rows:[], rowCount: 0, expectationFailureMessage: 'expectation failed' }] } )
    const results = await t.executeTransaction( { id: 1, name: 'test' })
    expect(clientBeginTransactionSpy.callCount).equal(1)
    expect(clientRollbackTransactionSpy.callCount).equal(0)
    expect(clientCommitTransactionSpy.callCount).equal(1)
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.args[0].id).to.equal(1)
    expect(executeCommandsStub.firstCall.args[1].client.id).to.equal('testClient')

  })

  it('executeTransaction called with variables, executeCommand returns error, default output', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    var executeCommandsStub = sinon.stub(t._context, 'executeRequest').resolves( { 
      executionState : 'error' } )

    const results = await t.executeTransaction( { id: 1, name: 'test' })
    const calls = clientQuerySpy.getCalls()
    expect(clientBeginTransactionSpy.callCount).equal(1)
    expect(clientRollbackTransactionSpy.callCount).equal(1)
    expect(clientCommitTransactionSpy.callCount).equal(0)
    expect(clientQuerySpy.callCount).equal(0)
    // executeCommands call
    expect(executeCommandsStub.callCount).equal(1)
    expect(executeCommandsStub.firstCall.args[0].id).to.equal(1)
    expect(executeCommandsStub.firstCall.args[1].client.id).to.equal('testClient')
    
  })


  it('executTransaction method rejects', async () => {
    
    const t = new TransactionManager( clientMock, new Root([{ sql:'select * from table1;' }]) )
    const executeCommandsStub = sinon.stub(t._context, 'executeRequest').rejects( new Error('test error') )
    
    let thrown

    try {
      const results = await t.executeTransaction( { id: 1, name: 'test' })
    } catch ( err) {
      thrown = true
      expect(err.message).equal('test error')
      expect(err).instanceOf(Error)
      expect(executeCommandsStub.callCount).equal(1)
    }
    
    expect(thrown).equal(true)
  })

})





