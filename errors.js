export class CommandValidationError extends Error {  
  constructor ( message, errors ) {

    super( message )

    this.name = this.constructor.name

    Error.captureStackTrace(this, this.constructor);

    this.errors = errors
  }
}
