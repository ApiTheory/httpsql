
import Ajv from 'ajv'
import jsonata from 'jsonata'
import { Command } from './command.js'
import { CommandValidationError, ExpectationFailureError, ParameterMappingError, ParameterMappingErrors } from './errors.js'
import { sqlCommandSchema } from './json-schemas/sql-command-schema.js';
import { isString, isPlainObject } from './util.js'

const ajv = new Ajv({ allErrors: true, strict: false })
const sqlCommandValidator = ajv.compile( sqlCommandSchema )

export class SqlCommand extends Command {

  constructor( command ) {

    const validCommand = sqlCommandValidator( command )
    if (!validCommand) { 
      throw new CommandValidationError( 'the sql command object can not be validated',  sqlCommandValidator.errors )  
    }

    const { sql, ...commandOpts } = command

    super( sql, commandOpts )

    // params is not required from an input perspective, but default it to an empty array in case not passed
    this._params = commandOpts.params || []
    this._executableParams = []
    this._finalizedParams = []
    this._expect = commandOpts.expect
    this._onExpectationFailure = commandOpts.onExpectationFailure || 'throw'

    // walk the params to make sure they are valid expressions; not checking that they match to anything, just that
    // they are valid jsonata expression; only test strings because everything else would be a static var
    const paramErrors = []
    for ( let x=0; x < this._params.length; x++ ) {
      const param = this._params[x]
      if (isString(param)) {
        try {
          jsonata( param )
        } catch ( err ) {
          paramErrors.push( { index: x, param, message: err.message })
        }
      }
    }

    if ( paramErrors.length > 0 ) {
      throw new ParameterMappingErrors( `dynamic parameters were malformed so they could not be mapped correctly and the command.strict value = true`, paramErrors )
    }

  }

  
  async execute ( contextSnapshot, opts = {} ) {
    
    if (!contextSnapshot ) {
      throw new Error( 'a contextSnapshot is required to execute the command')
    }

    if (!opts.client ) {
      throw new Error( 'a data client is required to execute the sql command')
    }

    const finalizedParams = []
    const parameterErrors = []

    // walk through current params and run them through jsonata evaluation
    for ( let x=0; x < this._params.length; x++ ) {

      const param = this._params[x]
      let paramResult
      try {

        const expression = jsonata( param )
        paramResult = await expression.evaluate( contextSnapshot )
        
        // check strict rules
        if ( paramResult === undefined && this._strict ) {
          parameterErrors.push( { index: x, param, message: 'unable to map parameter to an existing value' })
          paramResult = undefined
        } else if ( paramResult === undefined && !this._strict ) {
          paramResult = null
        }

      } catch ( err ) {

        parameterErrors.push( { index: x, param, message: `error mapping parameter: ${err.message}` })
        paramResult = undefined

      } finally {

        finalizedParams.push( paramResult)

      }

    } 

    if ( parameterErrors.length > 0 ) {
      return { 
        error: new ParameterMappingErrors( `dynamic parameters were malformed so they could not be mapped correctly and the command.strict value = true`, parameterErrors ),
        status: 'parameter-mapping-error', 
        failureAction: "throw", 
        finalizedParams 
      }
    }

    const result = await opts.client.query( this._command, finalizedParams ) 
    const { rowCount, rows } = result

    // go ahead and attempt to match the 
    if ( this._expect ) {
      
      contextSnapshot.currentResult = { rows, rowCount }

      const matchText = this._expect.replace(/rows/g, 'currentResult.rows').replace(/rowCount/g, 'currentResult.rowCount')

      try {

        const matchExpression = jsonata( matchText )
        const matchPasses = await matchExpression.evaluate( contextSnapshot )

        if ( !matchPasses ) {
          throw new ExpectationFailureError( `the expectation: '${this._expect}' failed`, this._expectationDescription)
        }
        
      } catch ( err ) {
        
        if ( isPlainObject(this.onExpectationFailure)) {

          const { message:customMessage, code, ...additionalData } = this.onExpectationFailure

          return { 
            rows,
            rowCount,
            error: new ExpectationFailureError( customMessage || `the expectation: '${this._expect}' failed`, this._expectationDescription , code, additionalData ),
            status: 'expectation-failure', 
            failureAction: 'throw', 
            finalizedParams 
          }

        } else if ( this.onExpectationFailure === 'stop') {
          // returns rows and rowCount if failure = stop since the value will be valid
          return { 
            rows,
            rowCount,
            error: err,
            status: 'expectation-failure', 
            failureAction: this.onExpectationFailure, 
            finalizedParams 
          }

        } else {
          return { 
            error: err,
            status: 'expectation-failure', 
            failureAction: this.onExpectationFailure, 
            finalizedParams 
          }
        }
      }

    }

    return { rowCount, rows, status: 'success', finalizedParams }

  }

  get type() {
    return 'sql'
  }

}