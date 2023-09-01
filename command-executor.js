import { DatabaseError } from 'pg-protocol';
import * as assert from 'assert';
import { LogicEngine } from 'json-logic-engine'
import { ulid } from 'ulidx'
import dotty from 'dotty'
const logicEngine = new LogicEngine()
const varMatchRegex = /^{([a-zA-Z0-9:\.]*)}$/gm;
const lastOpMatchRegex = /^{(lastop|results+):([a-zA-Z0-9\.]*)}$/gmi;

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

    if ( !command.sql && !command.opEval ) {
      throw new Error(`unknown command type: must have either a 'sql' or 'opEval' parameter in the command`)
    }

    if ( command.sql && command.opEval ) {
      throw new Error(`unknown command type: can not have both 'sql' and 'opEval' parameters in the command`)
    }

    // make sure to set strict to true unless its false
    if ( command.strict === undefined || command.strict === null ) command.strict = true

    command.params = command.params || []

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
          
          const dynamicField = getMatches( param, varMatchRegex ) 

          if ( dynamicField ) {

            // see if its being defined by a prefix or variable or lastop
            const prefixSplit = dynamicField[0].split(':')
 
            if ( prefixSplit.length === 2 && prefixSplit[0].toLowerCase()==='lastop') {

              // if its a lastop, the value has to be determined at the time of execution, 
              // so don't do anything here other than assign back and it will be retried
              executableCommand.params[pidx] = param

            } else {
              const varName = prefixSplit[prefixSplit.length-1]
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

            }
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
    
        // walk the params one more time for potential lastop replacements
        currentContext.executableCommands[idx].params.forEach( function ( param, pidx) {
          
          if ( param.startsWith('{') && param.endsWith('}')) {
          
            const dynamicLastOpField = lastOpMatchRegex.exec( param ) 
  
            if ( dynamicLastOpField ) {

              const [ _, type, varname ] = dynamicLastOpField
            
              const subVal = dotty.get( type === 'lastop' ? currentContext.lastOp : currentContext.results, varname )
              if ( subVal !== undefined ) {
                currentContext.executableCommands[idx].params[pidx] = subVal
              } else {
                // if interpretation is strict, then throw error, otherwise put a null
                if ( currentContext.executableCommands[idx].strict ) {
                  throw new Error( `parameter '${param} in command ${idx} can not be found in the submitted variables object`)
                } else {
                  currentContext.executableCommands[idx].params[pidx] = null
                }
              }

            }

          }

        })

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

        } else if ( command.opEval ) {

          if( logicEngine.run( command.opEval , { lastOp: currentContext.lastOp, results : currentContext.results } ) ) {

            currentContext.results[idx].status = 'success'

          } else {

            currentContext.results[idx].status = 'opEvalFailure'

            if ( command.onOpEvalFailure === 'throw') {
              currentContext.results[idx].failureAction = 'throw'
            } else if ( command.onOpEvalFailure === 'stop' ) {
              currentContext.results[idx].failureAction = 'stop'
            } else {
              currentContext.results[idx].failureAction = 'throw'
            }

            if (currentContext.results[idx].failureAction === 'throw') {
              throw new Error(`op eval failure at command index ${idx}: ${errorStr}`)
            } 

          }

        } else {
          throw new Error(`Unknown command type at index ${idx}: must have either a 'sql' or 'opEval' parameter in the command`)
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