import { LogicEngine } from 'json-logic-engine'
import { LogicCommand } from '../src/logic-command.js'
import { LogicOpFailureError } from '../src/errors.js'
import { expect } from 'chai'
import sinon from 'sinon'

const basicLogicCommand = {
  logicOp : {}
}

describe('LogicCommand', () => {

  it('should be a function', () => {
    expect(LogicCommand).to.be.a('function')
  })

  it('should be a LogicCommand', () => {
    const c = new LogicCommand( basicLogicCommand )
    expect(c).to.be.an.instanceOf(LogicCommand)
    expect(c._onFailure).equal('throw')
    expect(c.type).equal('logic')
  
  })

  it('should throw if appropriate command not passed', () => {
    expect(() => {
      new LogicCommand( {} )
    }).to.throw('the logic command object can not be validated')
  })

  it('execute succeeds because logicEngine returns true', async () => {

    const results = [
      { rowCount: 0, rows: [] },
      { rowCount: 1, rows: [ { status : 'active' }] }
    ]

    const logicOp = { '===' : ['active', { 'var' : 'status'}]}
    const logicEngineRunStub = sinon.stub(LogicEngine.prototype, 'run').returns( true )
    const c = new LogicCommand( { logicOp  } )
    const r = await c.execute( results )
    expect(logicEngineRunStub.calledOnce).to.be.true
    expect(logicEngineRunStub.firstCall.args.length).equal(2)
    expect(logicEngineRunStub.firstCall.args[0]).to.deep.equal(logicOp)
    expect(logicEngineRunStub.firstCall.args[1].results).to.deep.equal(results)
    expect(logicEngineRunStub.firstCall.args[1].lastop).to.deep.equal(results[1])
    expect(r.status).to.equal('success')
    logicEngineRunStub.restore()

  })

  it('execute fails and stops because logicEngine returns false', async () => {

    const results = [
      { rowCount: 0, rows: [] },
      { rowCount: 1, rows: [ { status : 'active' }] }
    ]

    const logicOp = { '===' : ['active', { 'var' : 'status'}]}
    const logicEngineRunStub = sinon.stub(LogicEngine.prototype, 'run').returns( false )
    const c = new LogicCommand( { logicOp, onFailure : 'stop' } )
    const r = await c.execute( results )
    expect(logicEngineRunStub.calledOnce).to.be.true
    expect(logicEngineRunStub.firstCall.args.length).equal(2)
    expect(logicEngineRunStub.firstCall.args[0]).to.deep.equal(logicOp)
    expect(logicEngineRunStub.firstCall.args[1].results).to.deep.equal(results)
    expect(logicEngineRunStub.firstCall.args[1].lastop).to.deep.equal(results[1])
    expect(r.status).to.equal('stop')
    logicEngineRunStub.restore()

  })

  it('execute fails and returns exceptionbecause logicEngine returns false', async () => {

    const results = [
      { rowCount: 0, rows: [] },
      { rowCount: 1, rows: [ { status : 'active' }] }
    ]

    const logicOp = { '===' : ['active', { 'var' : 'status'}]}
    const logicEngineRunStub = sinon.stub(LogicEngine.prototype, 'run').returns( false )
    const c = new LogicCommand( { logicOp, onFailure : { message: 'logicfailure happened', code: 'e304', foo : 'bar' } } )
    let thrown = false
    try {
      await c.execute( results )
    } catch ( err ) {
      thrown = true
      expect(err.message).equal('logicfailure happened')
      expect(err.code).equal('e304')
      expect(err.additionalData).deep.equal({ foo : 'bar' })
      expect(err).to.be.instanceOf(LogicOpFailureError)
    }
    expect(thrown).to.be.true
    expect(logicEngineRunStub.calledOnce).to.be.true
    expect(logicEngineRunStub.firstCall.args.length).equal(2)
    expect(logicEngineRunStub.firstCall.args[0]).to.deep.equal(logicOp)
    expect(logicEngineRunStub.firstCall.args[1].results).to.deep.equal(results)
    expect(logicEngineRunStub.firstCall.args[1].lastop).to.deep.equal(results[1])
    logicEngineRunStub.restore()

  })

  it('execute fails and returns exceptionbecause logicEngine returns false', async () => {

    const results = [
      { rowCount: 0, rows: [] },
      { rowCount: 1, rows: [ { status : 'active' }] }
    ]

    const logicOp = { '===' : ['active', { 'var' : 'status'}]}
    const logicEngineRunStub = sinon.stub(LogicEngine.prototype, 'run').returns( false )
    const c = new LogicCommand( { logicOp } )
    let thrown = false
    try {
      await c.execute( results )
    } catch ( err ) {
      thrown = true
      expect(err.message).equal('')
      expect(err.code).undefined
      expect(err.additionalData).undefined
      expect(err).to.be.instanceOf(LogicOpFailureError)
    }
    expect(thrown).to.be.true
    expect(logicEngineRunStub.calledOnce).to.be.true
    expect(logicEngineRunStub.firstCall.args.length).equal(2)
    expect(logicEngineRunStub.firstCall.args[0]).to.deep.equal(logicOp)
    expect(logicEngineRunStub.firstCall.args[1].results).to.deep.equal(results)
    expect(logicEngineRunStub.firstCall.args[1].lastop).to.deep.equal(results[1])
    logicEngineRunStub.restore()

  })

})
