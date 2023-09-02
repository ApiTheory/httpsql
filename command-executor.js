import { DatabaseError } from 'pg-protocol';
import * as assert from 'assert';
import { LogicEngine } from 'json-logic-engine'
import { ulid } from 'ulidx'
import dotty from 'dotty'
import * as fs from 'fs'
import Ajv from 'ajv'
import { CommandValidationError } from './errors.js';

const logicEngine = new LogicEngine()

const ajv = new Ajv({ allErrors: true })
const sqlCommandValidationShema = JSON.parse(fs.readFileSync('./json-schemas/sql-command-schema.json'))
const logicOpCommandValidationShema = JSON.parse(fs.readFileSync('./json-schemas/logicop-command-schema.json'))
const sqlCommandValidator = ajv.compile( sqlCommandValidationShema )
const logicOpCommandValidator = ajv.compile( logicOpCommandValidationShema )

function getMatches(string, regex, index) {
  index || (index = 1); // default to the first capturing group
  var matches = [];
  var match;
  while (match = regex.exec(string)) {
    matches.push(match[index]);
  }
  return matches;
}

class TransactionalCommandExecutor {

  constructor ( pgClient, commands = [], opts = {} ) {
    
    assert.ok(Array.isArray(commands), 'the commands argument must be an array')

    this.pgClient = pgClient
    this.name = opts.name
    this.purpose = opts.purpose
    this.submittedCommands = []
    this.executableCommands = []
    this.commandNames = {}
    this.transactionExecuted = false
    this.transactionState = 'not-started'
    this.genId = opts.genId || (() => {
      return ulid()
    })

  }

  addCommand( command ) {

    if (command.name) {
      
      if ( this.commandNames[command.name]) {
        throw new Error(`a command with the name '${command.name}' already exists`)
      }

      this.commandNames[command.name] = this.submittedCommands.length
    }

    if ( !command.sql && !command.logicOp ) {
      const errors = [
        { 
          keyword: 'missingOneOfProperties',
          message: `unknown command type: must have either a 'sql' or 'logicOp' parameter in the command`
        }
      ]
      throw new CommandValidationError( 'the command object can not be validated',  errors )  
    }

    if ( command.sql && command.logicOp ) {
      const errors = [
        { 
          keyword: 'clashingProperties',
          message: `unknown command type: can not have both 'sql' and 'logicOp' parameters in the command`
        }
      ]
      throw new CommandValidationError( 'the command object can not be validated',  errors )  
    }

    // make sure to set strict to true unless its false
    if ( command.strict === undefined || command.strict === null ) command.strict = true
   
    if ( command.sql ) {

      // user does not have to pass params, but we must have an array
      command.params = command.params || []

      const validCommand = sqlCommandValidator( command )
      if (!validCommand) { 
        throw new CommandValidationError( 'the command object can not be validated',  sqlCommandValidator.errors )  
      }
    } else if ( command.logicOp ) {
      const validCommand = logicOpCommandValidator( command )
      if (!validCommand) { 
        throw new CommandValidationError( 'the command object can not be validated',  logicOpCommandValidator.errors )  
      }
    }

    this.submittedCommands.push( command )
    
  }

  async beginTransaction ( ) {

    if (this.transactionState === 'not-started') {

      this.transactionState = 'transact-begin-start'
      await this.pgClient.query( 'BEGIN' )
      this.transactionState = 'transact-begin-complete'

    } else {

      throw new Error(`the transaction can not be started because its state = '${this.transactionState}'`)

    }

  }

  async rollbackTransaction ( ) {

    if (["transact-begin-complete"].includes(this.transactionState) ) {

      this.transactionState = 'transact-rollback-start'
      await this.pgClient.query( 'ROLLBACK' )
      this.transactionState = 'transact-rollback-complete'

    } else {

      throw new Error(`the transaction can not be rolled back because its state = '${this.transactionState}'`)

    }

  }
  
  async commitTransaction ( ) {

    if ( this.transactionState === 'transact-begin-complete' ) {

      this.transactionState = 'transact-commit-start'
      await this.pgClient.query( 'COMMIT' )
      this.transactionState = 'transact-commit-complete'

    } else {

      throw new Error(`the transaction can not be started because its state = '${this.transactionState}'`)

    }

  }
  
  async finalizeTransaction ( )  {

    if ( this.transactionState === 'transact-rollback-complete' || this.transactionState === 'transact-commit-complete' ) {

      this.transactionState = 'transact-finalize-start'
      await this.pgClient.release()
      this.transactionState = 'transact-finalize-complete'

    } else {

      throw new Error(`the transaction can not be finalized because its state = '${this.transactionState}'`)

    }

  }
  
  async executeTransaction ( variables = {}, opts = {} ) {

    if ( this.transactionExecuted ) {
      throw new Error( 'The command executor object can only call this method one time; create a new object in order to execute a new transaction. ')
    }

    this.transactionExecuted = true

    // prepopulate the results
    const results = []
    this.submittedCommands.map( ( command, idx) => {

      const executableCommand = structuredClone( command )
      executableCommand.id = executableCommand.id || this.genId()
      // if sql command, walk the params and any that are dynamic need to be compared to the incomming variables and replaced
      // if command.strict = true and the variable can't be found, an error is thrown.  If the command is not strict, then a null will be put into its place
      // we want to do this before starting the transaction so we can short circuit any potential errors
      command.params?.forEach( function ( param, pidx) {

        // see if this is a variable substitution
        if ( param.startsWith('{') && param.endsWith('}')) {
          
          const regex = /{([^}]+)}/ig;
          const matchedInside = regex.exec( param )
          
          if (!matchedInside) {
            throw new Error( `dynamic parameter '${param} in command ${idx} can not be properly parsed`)
          }

          const matchedParts = matchedInside[1]?.split(':')

          // if this is a lastop or results property, evaluation gets pushed to later.  If its a variable, it gets
          // evaluated now.  
          if ( matchedParts.length === 2 && ['lastop', 'results'].includes(matchedParts[0].toLowerCase())) {
            executableCommand.params[pidx] = param
          } else if ( matchedParts.length === 1 || matchedParts[0].toLowerCase() === 'variable') {
            const varName = matchedParts[ matchedParts.length - 1 ]
            const subVal = dotty.get( variables, varName )
            if ( subVal !== undefined ) {
              executableCommand.params[pidx] = subVal
            } else {
              // if interpretation is strict, then throw error, otherwise put a null
              if ( command.strict ) {
                throw new Error( `parameter '${param} in command ${idx} can not be found in the submitted variables object`)
              } else {
                executableCommand.params[pidx] = null
              }
            }
          
          } else {
            throw new Error( `dynamic parameter '${param} in command ${idx} can not be properly parsed`)
          }
        } 
      })

      this.executableCommands.push( executableCommand )

      results.push({
        status: 'notexecuted'
      })

    })
    
    const currentContext = {
      lastOp : null,
      transactionId : opts.transactionId || this.genId(),
      submittedCommands : this.submittedCommands,
      executableCommands: this.executableCommands,
      variables,
      results
    } 

    let idx

    try {

      await this.beginTransaction( )

      for ( idx=0; idx < currentContext.executableCommands.length; idx++ ) {

        if ( currentContext.executableCommands[idx].sql ) {
          // walk the params one more time for potential lastop replacements

          currentContext.executableCommands[idx].params.forEach( function ( param, pidx) {
            
            if ( param.startsWith('{') && param.endsWith('}')) {

              const regex = /{([^}]+)}/ig;
              const matchedInside = regex.exec( param )
              const [ type, varName ] = matchedInside[1]?.split(':')

              const subVal = dotty.get( type.toLowerCase() === 'lastop' ? currentContext.lastOp : currentContext.results, varName )

              if ( subVal !== undefined ) {
                currentContext.executableCommands[idx].params[pidx] = subVal
              } else {
                // if interpretation is strict, then throw error, otherwise put a null
                if ( currentContext.executableCommands[idx].strict ) {
                  throw new Error( `parameter '${param} in command ${idx} can not be found in the ${ type === 'lastop' ? 'lastOp' : 'results' } object`)
                } else {
                  currentContext.executableCommands[idx].params[pidx] = null
                }
              }

            }

          })
        }
        const command = currentContext.executableCommands[idx]
        
        if ( command.sql ) {

          try {

            const result = await this.pgClient.query( command.sql, currentContext.executableCommands[idx].params ) 
            currentContext.results[idx].rowCount = result.rowCount
            currentContext.results[idx].rows = result.rows

          } catch ( err ) {

            err.message = `database error occured at command index ${idx}: ${err.message}`
            currentContext.results[idx].status = 'databaseFailure'
            currentContext.results[idx].failureAction = 'throw'
            currentContext.results[idx].error = err
            throw err
          }

          
          // check if the expectation failed and if it did, need to figure out whether we throw or stop
          if ( command.expect === 'one' &&  currentContext.results[idx].rowCount !== 1 || command.expect === 'zero' &&  currentContext.results[idx].rowCount !== 0 ) {

            currentContext.results[idx].status = 'expectationFailure'

            // if there is no onExpectationFailure its considered the same as requesting a throw.
            // 'stop' can also be provided.  The difference is that a throw will cause an automatic rollback
            // whereas a stop will stop processing and commit the current transaction.
            if ( command.onExpectationFailure === 'throw') {
              currentContext.results[idx].failureAction = 'throw'
            } else if ( command.onExpectationFailure === 'stop' ) {
              currentContext.results[idx].failureAction = 'stop'
            } else {
              currentContext.results[idx].failureAction = 'throw'
            }

            if ( currentContext.results[idx].failureAction === 'throw' ) {

              let errorStr = ''
              if ( command.expect === 'one' ) errorStr = `expected one result but received ${ currentContext.results[idx].rowCount }`
              if ( command.expect === 'zero' ) errorStr = `expected zero results but received ${ currentContext.results[idx].rowCount }`
  
              throw new Error(`expectation failure at command index ${idx}: ${errorStr}`)

            }
            
          } else {

            currentContext.results[idx].status = 'success'

          }

        } else if ( command.logicOp ) {

          if( logicEngine.run( command.logicOp , { lastOp: currentContext.lastOp, results : currentContext.results } ) ) {

            currentContext.results[idx].status = 'success'

          } else {

            currentContext.results[idx].status = 'logicOpFailure'

            if ( command.onLogicOpFailure === 'throw') {
              currentContext.results[idx].failureAction = 'throw'
            } else if ( command.onLogicOpFailure === 'stop' ) {
              currentContext.results[idx].failureAction = 'stop'
            } else {
              currentContext.results[idx].failureAction = 'throw'
            }

            if (currentContext.results[idx].failureAction === 'throw') {
              throw new Error(`op eval failure at command index ${idx}: ${errorStr}`)
            } 

          }

        } else {
          throw new Error(`Unknown command type at index ${idx}: must have either a 'sql' or 'logicOp' parameter in the command`)
        }

        currentContext.lastOp = currentContext.results[idx]

        // if we got here without success, it means we need to stop so get out
        if (currentContext.results[idx].status !== 'success') {
          break;
        }

      }

      await this.commitTransaction( ) 

    } catch ( err ) {
    
      currentContext.results[idx] = {
        status : 'exception',
        error : err
      }
      currentContext.lastOp = currentContext.results[idx]
      await this.rollbackTransaction( )

    } 

    if ( opts.output === 'fullcontext' ) {
      return currentContext
    }
    else if ( opts.output === 'allresults' ) {
      return { transactionId: currentContext.transactionId, results : currentContext.results }
    } 

    return { transactionId: currentContext.transactionId, lastOp : currentContext.lastOp }
    

  }

}

export default TransactionalCommandExecutor
export { TransactionalCommandExecutor }