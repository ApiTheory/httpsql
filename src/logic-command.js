
import Ajv from 'ajv'
import jsonata from 'jsonata'

import { Command } from './command.js'
import { CommandValidationError, LogicOpFailureError, ExpectationFailureError } from './errors.js'
import { logicOpSchema } from './json-schemas/logicop-command-schema.js'
import { isPlainObject  } from './util.js'

const ajv = new Ajv({ allErrors: true, strict: false })
const logicOpCommandValidator = ajv.compile( logicOpSchema )

/**
 * Executes a logic operation and returns true and false as the 'value'.  There is nothing else to evaluate.  If the value=true,
 * the context can move on to the next command.  If the value=false, its onExpectationFailure time.  The expectation will always
 * be that the value is true.
 */
export class LogicCommand extends Command {

  constructor( command ) {

    const validCommand = logicOpCommandValidator( command )
    if (!validCommand) { 
      throw new CommandValidationError( 'the logic command object can not be validated',  logicOpCommandValidator.errors )  
    }

    const { logicOp, ...opts } = command

    super( logicOp, opts )

    // test the operation to make sure it's well formed.  This will NOT check the validity of parameters, just that
    // the operation itself is well formed jsonata
    try {
      jsonata( logicOp )
    } catch ( err ) {
      throw new CommandValidationError( `the logic operation is not well formed: ${err.message}`)
    }

  }

  async execute( contextSnapshot ) {

    try {

      const expression = jsonata( this._command )
      contextSnapshot.currentResult = await expression.evaluate( contextSnapshot )
      
    } catch ( err ) {

      throw new LogicOpFailureError( err.message )
      
    } 

    if ( this._expect ) {
      
      try {

        const matchExpression = jsonata( this._expect )
        const matchPasses = await matchExpression.evaluate( contextSnapshot )

        if ( !matchPasses ) {
          throw new ExpectationFailureError( `the logic operation '${this.command}' expectation '${this._expect}' failed`, this._expectationDescription)
        }
        
      } catch ( err ) {
        
        if ( isPlainObject(this.onExpectationFailure)) {

          const { message:customMessage, code, ...additionalData } = this.onExpectationFailure

          return { 
            error: new ExpectationFailureError( customMessage || `the logic operation '${this.command}' expectation '${this._expect}' failed`, this._expectationDescription , code, additionalData ),
            result : contextSnapshot.currentResult,
            status: 'expectation-failure', 
            failureAction: 'throw'
          }

        } else if ( this.onExpectationFailure === 'stop') {
          // returns rows and rowCount if failure = stop since the value will be valid
          return { 
            error: err,
            result : contextSnapshot.currentResult,
            status: 'expectation-failure', 
            failureAction: this.onExpectationFailure
          }

        } else {
          return { 
            error: err,
            result : contextSnapshot.currentResult,
            status: 'expectation-failure', 
            failureAction: this.onExpectationFailure
          }
        }
      }

    }

    return { result : contextSnapshot.currentResult, status: 'success' }


   

  } 



  
  get type() {
    return 'logic'
  }

}