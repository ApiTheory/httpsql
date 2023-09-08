import { DatabaseError } from 'pg-protocol'
import { SqlCommand } from "./sql-command.js"
import { LogicCommand } from "./logic-command.js"
import { Command  } from "./command.js"
import { CommandValidationError, ExpectationFailureError } from "./errors.js"
import { Root } from "./root.js"
import * as assert from 'assert'

export class Context {

  constructor( rootNode ) {

    assert.ok( rootNode instanceof Root, 'root must be an instance of Root')

    this._rootNode = rootNode
    Object.freeze(this._rootNode)  // once rootNode is assigned to the context, its frozen to prevent further modifications
    this._executionState = 'not-started'
    this._results = []
    this._variables
    this._transactionExecuted

  }

 
  /**
   * Attempts to process variables and conduct substitution in
   * the commands.  Will throw errors for missing vars so the
   * transaction won't even begin if there are var errors
   * @param {*} submittedVariables 
   * @returns 
   */
  assignVariables( submittedVariables = [] ) {

    this._variables = submittedVariables || []

    if ( this._variables.length === 0 ) return

    this._rootNode.commands.filter((c) => c.type === 'sql').forEach(( command, idx ) => {
      try {
        command.preTransactionVariableSubstitution( structuredClone( this._variables ) )
      } catch ( err ) {
        err.message= `variable assignment failure on command ${idx}: ${err.message}`
        throw err
      }
    });

  }

  async executeCommands( client ) {

    if (!client ) {
      throw new Error( 'a client is required to execute commands')
    }

    if ( this._executionState !== 'not-started' ) {
      throw new Error( `The context can only execute commands one time.  The current transactionState === '${this._executionState}'`)
    }

    if ( this._rootNode.commands.length === 0 ) {
      return { executionState: 'nothing-to-do', results: [] }
    }

    // walk through each of the commands
    let stopProcessing = false
    
    this._executionState = 'started'

    for ( let idx=0; idx < this._rootNode.commands.length; idx++ ) {

      if ( stopProcessing ) {
        this._results.push( {
          status: 'not-executed'
        })
        continue
      }

      const currentCommand = this._rootNode.commands[idx]
      
      if ( currentCommand.type === 'sql' ) {
        
        try {
          
          // need to have a snapshot of the results and not the real results otherwise those will just change on every iteration
          currentCommand.transactionalResultValueSubstitution( structuredClone( this._results ) )

        } catch ( err ) {
          
          err.message= `transactional result value assignment failure occurred at command index ${idx}: ${err.message}`
          
          this._results.push ( {
            status: 'dynamicParameterAssignmentFailure',
            failureAction : 'throw' ,
            error : err
          })
          
          stopProcessing = true
          this._executionState = "error"

        }

        if ( stopProcessing ) continue;

        const startTs = process.hrtime.bigint()
        let result

        try {

          const { rowCount, rows, status } = await currentCommand.execute( client )
          
          if ( status === 'stop' ) {
            this._executionState = 'stop'
            stopProcessing = true
            result = {
              status: 'expectation-failure',
              failureAction : 'stop',
              rowCount,
              rows
            }
          } else {
            result = {
              status: 'success',
              rowCount,
              rows
            }
          }

        } catch ( err ) {

          if ( err instanceof DatabaseError ) {

            err.message = `database error occured at command index ${idx}: ${err.message}`
            
            result = {
              status: 'database-failure',
              failureAction : 'throw' ,
              error : err
            }

          } else if ( err instanceof ExpectationFailureError ) {

            err.message = `expectation failure occured at command index ${idx}: ${err.message}`
            
            result = {
              status: 'expectation-failure',
              failureAction : 'throw' ,
              error : err
            }

          } else {

            result = {
              status: 'unhandled-exception',
              failureAction : 'throw' ,
              error : err
            }

          }

          stopProcessing = true
          this._executionState = 'error'

        } finally {

          result.ts = Date.now()
          result.executionTime = (( process.hrtime.bigint() - startTs )/ BigInt(1000000)).toString()

          this._results.push ( result )

        }

      } else {
        
        const startTs = process.hrtime.bigint()
        let result

        try {

          const { status } = await currentCommand.execute( structuredClone(this._results) )
          
          if ( status === 'stop' ) {
            
            result = {
              status: 'logic-failure',
              failureAction : 'stop'
            }

            this._executionState = 'stop'
            stopProcessing = true

          } else {

            result = {
              status: 'success'
            }

          }
          
          

        } catch ( err ) {

          err.message = `logic failure occured at command index ${idx}: ${err.message}`
          
          result = {
            status: 'logic-failure',
            failureAction : 'throw' ,
            error : err
          }
          
          stopProcessing = true
          this._executionState = "error"

        } finally {
          
          result.ts = Date.now()
          result.executionTime = (( process.hrtime.bigint() - startTs )/ BigInt(1000000)).toString()
          this._results.push ( result )

        }

      }
    }

    if ( this._executionState !== 'stop' && this._executionState !== 'error' ) {
      this._executionState = this._results[this._results.length-1].status
    }
    
    return { executionState: this._executionState, results: this._results }

  }

  get results() {
    return this._results
  }

  get commands() {
    return this._rootNode.commands
  }

  get executionState() {
    return this._executionState
  }

  set executionState ( state ) {  
    this._executionState = state
  }

}