
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

    // this is what the expectation is ALWAYS for logic ops, basically, whatever command goes through MUST be true
    opts.expect = 'value = true'
    opts.onExpectationFailure = opts.onExpectationFailure || 'throw'
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

    const evalResult = {}

    try {

      const expression = jsonata( this._command )
      evalResult.value = await expression.evaluate( contextSnapshot )
      
    } catch ( err ) {

      throw new LogicOpFailureError( err.message )
      
    } 

    if ( evalResult.value ) {
      return { status : 'success' }
    }

    if ( isPlainObject(this.onExpectationFailure)) {

      const { message:customMessage, code, ...additionalData } = this.onExpectationFailure

      return { 
        error: new ExpectationFailureError( customMessage || `the logic operation: '${this._command}' failed`, this._expectationDescription , code, additionalData ),
        status: 'expectation-failure', 
        failureAction: 'throw'
      }

    } else if ( this.onExpectationFailure === 'stop') {
      
      return { 
        error: new ExpectationFailureError( `the logic operation: '${this._command}' failed`, this._expectationDescription  ),
        status: 'expectation-failure', 
        failureAction: this.onExpectationFailure
      
      }

    } else {

      return { 
        error: new ExpectationFailureError( `the logic operation: '${this._command}' failed`, this._expectationDescription  ),
        status: 'expectation-failure', 
        failureAction: this.onExpectationFailure 
      }
    }


   

  } 



  
  get type() {
    return 'logic'
  }

}