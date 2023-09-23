export class CommandValidationError extends Error {  
  constructor ( message, errors ) {

    super( message )

    this.name = this.constructor.name

    Error.captureStackTrace(this, this.constructor);

    this.errors = errors || []
  }
}

export class ParameterMappingError extends Error {
  constructor ( message, index ) {

    super( message )
    this.name = this.constructor.name
    this.index = index 
    Error.captureStackTrace(this, this.constructor);

  }
}

export class ParameterMappingErrors extends Error {
  constructor ( message, errors =[] ) {

    super( message )
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
    this.errors = []

    for( let e of errors) {
      this.errors.push( {
        message: e.message,
        index: e.index
      })
    }

  }
}

export class DatabaseError extends Error {

  constructor ( message, cause ) {

    super( message  )
    this.name = this.constructor.name
    this.cause = cause
    
  }

}

export class ExpectationEvaluationError extends Error {

  constructor ( message, expectation ) {

    super( message || 'the expectation could not be evaluated' )
    this.expectation = expectation

  }
}

export class ExpectationFailureError extends Error {  
  
  constructor ( message, expected, code, additionalData ) {

    super( message )

    this.name = this.constructor.name

    this.expected = expected
    this.code = code
    this.additionalData = additionalData

  }
}

export class LogicOpFailureError extends Error {  
  
  constructor ( message, code, additionalData ) {

    super( message )

    this.name = this.constructor.name

    this.code = code
    this.additionalData = additionalData

  }
}

