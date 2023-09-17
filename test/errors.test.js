import { expect } from 'chai'
import { 
  CommandValidationError, 
  ExpectationFailureError, 
  ExpectationEvaluationError, 
  ParameterMappingError,
  ParameterMappingErrors,
  LogicOpFailureError } from '../src/errors.js'

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
    const error = new ExpectationFailureError('error occurred', 'test=1', '500', { d: 'e', t: false })
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.expected).equal('test=1')
    expect(error.code).equal('500')
    expect(error.additionalData).deep.equal({ d: 'e', t: false })
  })
  
  
})
describe('ExpectationEvaluationError', () => {
  
  it('should be a subclass of Error', () => {
    const error = new ExpectationEvaluationError()
    expect(error).to.be.an.instanceOf(Error)
  })

  it('should handle no message', () => {
    const error = new ExpectationEvaluationError()
    expect(error.message).to.be.a('string')
    expect(error.message).equal('the expectation could not be evaluated')
    expect(error.expectation).undefined
  })

  it('should have a message', () => {
    const error = new ExpectationEvaluationError('error occurred')
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.expectation).undefined
  })

  it('should have a expectation', () => {
    const error = new ExpectationEvaluationError('error occurred', 'test===1')
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.expectation).to.be.a('string')
    expect(error.expectation).equal('test===1')
  })

})

describe('ParameterMappingError', () => {
 
  it('should be a subclass of Error', () => {
    const error = new ParameterMappingError()
    expect(error).to.be.an.instanceOf(Error)
    expect(error.name).equal('ParameterMappingError')
  })
  
  it('should have a message', () => {
    const error = new ParameterMappingError('error occurred')
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
  })

  it('should include all arguments', () => {
    const error = new ParameterMappingError('error occurred', 1)
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.index).equal(1)
  })
})

describe('ParameterMappingErrors', () => {
  
  it('should be a subclass of Error', () => {
    const error = new ParameterMappingErrors()
    expect(error).to.be.an.instanceOf(Error)
    expect(error.name).equal('ParameterMappingErrors')
  })

  it('should have a message', () => {
    const error = new ParameterMappingErrors('error occurred')
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
  })

  it('should include all arguments', () => {
    const error = new ParameterMappingErrors('error occurred', [ new ParameterMappingError('error1'), new ParameterMappingError('error2')])
    expect(error.message).to.be.a('string')
    expect(error.message).equal('error occurred')
    expect(error.errors.length).equal(2)
    expect(error.errors[0].message).equal('error1')
    expect(error.errors[1].message).equal('error2')
    expect(error.errors[0].index).undefined
    expect(error.errors[1].index).undefined
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