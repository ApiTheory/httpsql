import { expect } from 'chai'
import { CommandValidationError, ExpectationFailureError, LogicOpFailureError } from '../src/errors.js'

// create unit tests for LogicOpFailureError

describe('LogicOpFailureError', () => {

  it('should be a subclass of Error', () => {
    const error = new LogicOpFailureError()
    expect(error).to.be.an.instanceOf(Error)
  })

  it('should have a message', () => {
    const error = new LogicOpFailureError('error occurred')
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
  })

  it('should include all arguments', () => {
    const error = new LogicOpFailureError('error occurred', '500', { d: 'e', t: false })
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.code).equal('500')
    expect(error.additionalData).deep.equal({ d: 'e', t: false })
  })
  
})

describe('ExpectationFailureError', () => {

  it('should be a subclass of Error', () => {
    const error = new ExpectationFailureError()
    expect(error).to.be.an.instanceOf(Error)
  })

  it('should have a message', () => {
    const error = new ExpectationFailureError('error occurred')
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.additionalData).undefined
    expect(error.expected).undefined
    expect(error.received).undefined
    expect(error.code).undefined
  })

  it('should include all arguments', () => {
    const error = new ExpectationFailureError('error occurred', 1, 2, '500', { d: 'e', t: false })
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.expected).equal(1)
    expect(error.received).equal(2)
    expect(error.code).equal('500')
    expect(error.additionalData).deep.equal({ d: 'e', t: false })
  })
  
  
})

describe('CommandValidationError', () => {

  it('should be a subclass of Error', () => {
    const error = new CommandValidationError()
    expect(error).to.be.an.instanceOf(Error)
  })

  it('should have a message', () => {
    const error = new CommandValidationError('error occurred')
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
  })

  it('should handled errors passed as an argument', () => {
    
    const error = new CommandValidationError('error occurred')
    expect(error.errors).to.be.a('array')
    expect(error.errors.length).equal(0)
    expect(error.message).equal('error occurred')

    const error2 = new CommandValidationError('multiple errors', [{ message: 'error1' }, { message: 'error2' }])
    expect(error2.errors).to.be.a('array')
    expect(error2.errors.length).equal(2)
    expect(error2.errors).deep.equal([{ message: 'error1' }, { message: 'error2' }])
    expect(error2.message).equal('multiple errors')

  })
})