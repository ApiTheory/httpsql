export class CommandValidationError extends Error {  
  constructor ( message, errors ) {

    super( message )

    this.name = this.constructor.name

    Error.captureStackTrace(this, this.constructor);

    this.errors = errors
  }
}

export class ExpectationFailureError extends Error {  
  
  constructor ( message, expected, received, code, additionalData ) {

    super( message )

    this.name = this.constructor.name

    this.expected = expected
    this.received = received
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

