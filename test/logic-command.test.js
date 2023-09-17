import { LogicEngine } from 'json-logic-engine'
import { LogicCommand } from '../src/logic-command.js'
import { ExpectationFailureError, LogicOpFailureError } from '../src/errors.js'
import { expect } from 'chai'
import sinon from 'sinon'

const basicLogicCommand = {
  logicOp : 'test=1'
}

describe('LogicCommand', () => {

  it('should be a function', () => {
    expect(LogicCommand).to.be.a('function')
  })

  it('should be a LogicCommand', () => {
    const c = new LogicCommand( basicLogicCommand )
    expect(c).to.be.an.instanceOf(LogicCommand)
    expect(c._onExpectationFailure).equal('throw')
    expect(c.type).equal('logic')
  
  })

  it('should throw if appropriate command not passed', () => {
    expect(() => {
      new LogicCommand( {} )
    }).to.throw('the logic command object can not be validated')
  })

  it('should throw if logicOp is not logical', () => {
    expect(() => {
      new LogicCommand( { logicOp : 'test===1'} )
    }).to.throw('the logic operation is not well formed: The symbol "=" cannot be used as a unary operator')
  })

  describe( 'execute method', () => {
   
    it('successfully processes logic against context', async () => {
    
      const c = new LogicCommand( { logicOp : 'variables.id=1'} )
      const response = await c.execute( { variables : { id : 1 } })
      expect(response).deep.equals({ status: 'success' })
      
    })

    it('returns a stop execution if logic fails against context', async () => {
    
      const c = new LogicCommand( { logicOp : 'variables.id=2', onExpectationFailure : 'stop'} )
      const response = await c.execute( { variables : { id : 1 } })

      expect(response.error).instanceOf(ExpectationFailureError)
      expect(response.error.message).equals(`the logic operation: 'variables.id=2' failed`)
      expect(response.error.code).undefined
      expect(response.error.additionalData).undefined

      expect(response.status).equals( 'expectation-failure')
      expect(response.failureAction).equals( 'stop')
      
    })

    it('returns a custom message if logic fails against context', async () => {
    
      const c = new LogicCommand( { logicOp : 'variables.id=2', onExpectationFailure : { message: 'something is up', code:'test1', foo:'bar' }} )
      const response = await c.execute( { variables : { id : 1 } })

      expect(response.error).instanceOf(ExpectationFailureError)
      expect(response.error.message).equals(`something is up`)
      expect(response.error.code).equals('test1')
      expect(response.error.additionalData).deep.equals({ foo:'bar'})

      expect(response.status).equals( 'expectation-failure')
      expect(response.failureAction).equals( 'throw')
      
    })

    it('returns a custom message without a message if logic fails against context', async () => {
    
      const c = new LogicCommand( { logicOp : 'variables.id=2', onExpectationFailure : { code:'test1', foo:'bar' }} )
      const response = await c.execute( { variables : { id : 1 } })

      expect(response.error).instanceOf(ExpectationFailureError)
      expect(response.error.message).equals(`the logic operation: 'variables.id=2' failed`)
      expect(response.error.code).equals('test1')
      expect(response.error.additionalData).deep.equals({ foo:'bar'})

      expect(response.status).equals( 'expectation-failure')
      expect(response.failureAction).equals( 'throw')
      
    })

    it('returns an exception if logic fails against context without onExpectationFailure set', async () => {
    
      const c = new LogicCommand( { logicOp : 'variables.id=2' } )
      const response = await c.execute( { variables : { id : 1 } })

      expect(response.error).instanceOf(ExpectationFailureError)
      expect(response.error.message).equals(`the logic operation: 'variables.id=2' failed`)
      expect(response.error.code).undefined
      expect(response.error.additionalData).undefined

      expect(response.status).equals( 'expectation-failure')
      expect(response.failureAction).equals( 'throw')
      
    })

  })
 
})
