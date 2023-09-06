
import Ajv from 'ajv'
import dotty from 'dotty'
import * as fs from 'fs'
import path from 'path';
import { Command } from './command.js'
import { CommandValidationError, ExpectationFailureError } from './errors.js'
import { isString, isNumeric, getDirName } from './util.js'

const ajv = new Ajv({ allErrors: true, strict: false })
const sqlCommandValidationShema = JSON.parse(fs.readFileSync(path.resolve( getDirName( import.meta.url ), '../json-schemas/sql-command-schema.json')))
const sqlCommandValidator = ajv.compile( sqlCommandValidationShema )

const regex = new RegExp('{([^}]+)}');

export class SqlCommand extends Command {

  constructor( command ) {

    const validCommand = sqlCommandValidator( command )
    if (!validCommand) { 
      throw new CommandValidationError( 'the sql command object can not be validated',  sqlCommandValidator.errors )  
    }

    const { sql, ...opts } = command

    super( sql, opts )

    // params is not required from an input perspective, but default it to an empty array in case not passed
    this._params = opts.params || []
    this._executableParams = []
    this._finalizedParams = []
    this._expect = opts.expect
    this._onExpectationFailure = opts.onExpectationFailure || 'throw'
    
  }

  /**
   * Takes the initially submitted variables for a transaction
   * and attempts to substitute any in the existing command's params property and
   * will return an entirely new command property
   * @param {Object} submittedVariables 
   */
  preTransactionVariableSubstitution ( submittedVariables = {} ) {
    
    // walks the params for the command and any that are dynamic are compared to the incomming variables and replaced
    // if command.strict = true and the variable can't be found, an error is thrown.  If the command is not strict, then a null will be put into its place
    // we want to do this before starting the transaction so we can short circuit any potential errors
    for( let x = 0; x < this._params.length; x++ ) {
      
      const param = this._params[x]

      if (  isString(param) ) {

        // see if this is a variable substitution
        const matchedInside = param.match(regex)

        if ( matchedInside ) {
          
          const parts = matchedInside[1]?.split('.')

          if ( parts.length > 1 && ['lastop', 'results'].includes(parts[0].toLowerCase())) {
            
            // make sure its not a number before accepting it
            if ( isNumeric(parts[1]) ) {
              throw new Error(`the dynamic parameter '{${matchedInside[1]}}' is a number` )
            }

            this._executableParams.push( param )

          } else if ( parts.length === 1 || parts[0].toLowerCase() === 'variable') {
            
            const varName = parts[ parts.length - 1 ]

            if ( isNumeric(varName) ) {
              throw new Error(`the dynamic parameter '{${varName}}' is a number` )
            }

            const subVal = dotty.get( submittedVariables, varName )
            
            if ( subVal !== undefined ) {

              this._executableParams.push( subVal )

            } else {

              // if interpretation is strict, then throw error, otherwise put a null
              if ( this._strict ) {
                throw new Error( `parameter '${param}' not found`)
              } else {
                this._executableParams.push( null ) 
              }
              
            }
          
          } else {

            throw new Error( `dynamic parameter '${param}' can not be properly parsed`)

          }
        } else {
          // a static value
          this._executableParams.push( param )

        }

      } else {

        // a static non-string value
        this._executableParams.push( param )
      }

    }

  }

  transactionalResultValueSubstitution( results ) {

    for ( let x=0; x < this._executableParams.length; x++ ) {
      
      const param = this._executableParams[x]

      if (  isString(param) ) {
        
        // see if this is a variable substitution
        const matchedInside = regex.exec( param )
  
        if ( matchedInside ) {
          
          const varName = matchedInside[1]
          const subVal = dotty.get( { lastop: structuredClone( results[ results.length -1 ] ), results: structuredClone( results ) } , varName )
              
          if ( subVal !== undefined ) {
  
            this._finalizedParams.push( subVal )
  
          } else {
  
            // if interpretation is strict, then throw error, otherwise put a null
            if ( this._strict ) {
              throw new Error( `parameter '${param}' not found`)
            } else {
              this._finalizedParams.push( null )
            }
                
          }
  
        } else {
          // either static or already substituted as a variable
          this._finalizedParams.push( param )
        }
      
      } else {
        // non string param
        this._finalizedParams.push( param )
      }

    }

  }

  async execute ( client ) {
    
    const result = await client.query( this._command, this._finalizedParams ) 

    const { rowCount, rows } = result

    if ( this._expect !== undefined && this._expect !== null ) {

      let expectedRowCount, errorMessage

      if ( this._expect === 'one' ) expectedRowCount = 1
      else if ( this._expect === 'zero' ) expectedRowCount = 0
      else if ( isNumeric(this._expect) ) expectedRowCount = this._expect

      if ( this._expect === 'many' && result.rowCount < 2 ) {
        errorMessage = `expected rowCount > 1 but received ${result.rowCount}`
      } else if ( expectedRowCount !== result.rowCount ) {
        errorMessage = `expected rowCount = ${expectedRowCount} but received ${result.rowCount}`
      }

      if ( errorMessage && this._onExpectationFailure === 'stop' ) {

        return {
          rows,
          rowCount,
          status: 'stop',
          expectationFailureMessage : errorMessage 
        }

      } else if ( errorMessage && this._onExpectationFailure.message ) {

        const { message, code, ...additionalData } = this._onExpectationFailure
        throw new ExpectationFailureError( message, this._expect, result.rowCount, code, additionalData )

      } else if ( errorMessage ) {

        throw new ExpectationFailureError( errorMessage, this._expect, result.rowCount )

      }
    }

    return { rowCount, rows, status: 'success' }

  }

  get type () {
    return 'sql' 
  }

}