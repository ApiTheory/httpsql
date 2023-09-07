import { SqlCommand } from "./sql-command.js"
import { LogicCommand } from "./logic-command.js"
import { Command  } from "./command.js"
import { CommandValidationError } from "./errors.js"
export class Context {

  constructor( ) {
    this._commands = []
    this._commandNames = {}
    this._transactionState = 'not-started'
    this._results = []
    this._variables
    this._transactionExecuted
  }

  addCommand( command ) {

    if ( command.name && Object.keys(this._commandNames).includes(command.name)) {
      throw new Error(`a command with the name '${command.name}' already exists`)
    }

    if ( command instanceof Command ) {

      this._commands.push( command )

    } else {

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

      this._commands.push( command.sql ? new SqlCommand( command ) : new LogicCommand( command ) )
    }

    if ( command.name ) {
      this._commandNames[command.name] = this._commands.length-1
    }
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

    this._commands.filter((c) => c.type === 'sql').forEach(( command, idx ) => {
      try {
        command.preTransactionVariableSubstitution( this._variables )
      } catch ( err ) {
        err.message= `variable assignment failure on command ${idx}: ${err.message}`
        throw err
      }
    });

  }

  async executeCommands( pgClient ) {

    if ( this._commands.length === 0 ) {
      return { transactionState: 'nothing-to-do', results: [] }
    }

    if ( this._transactionState !== 'not-started' ) {
      throw new Error( `The context can only execute commands one time.  The current transactionState === '${this._transactionState}'`)
    }

    // walk through each of the commands
    let stopProcessing = false
    
    this._transactionState = 'started'

    for ( let idx=0; idx < this._commands.length; idx++ ) {

      if ( stopProcessing ) {
        this._results.push( {
          status: 'notExecuted'
        })
        continue
      }

      const currentCommand = this._commands[idx]
      
      if ( currentCommand.type === 'sql' ) {
        
        try {
          
          currentCommand.transactionalResultValueSubstitution( this._results )

        } catch ( err ) {
          
          err.message= `transactional result value assignment failure occurred at command index ${idx}: ${err.message}`
          
          this._results.push ( {
            status: 'dynamicParameterAssignmentFailure',
            failureAction : 'throw' ,
            error : err
          })
          
          stopProcessing = true
          this._transactionState = "error"

        }

        if ( stopProcessing ) continue;

        const startTs = process.hrtime.bigint()
        let result

        try {

          const { rowCount, rows, status } = await currentCommand.execute( pgClient )
          
          if ( status === 'stop' ) {
            this._transactionState = 'stop'
            stopProcessing = true
          } 

          result = {
            status: 'success',
            rowCount,
            rows
          }

        } catch ( err ) {

          err.message = `database error occured at command index ${idx}: ${err.message}`
          
          result = {
            status: 'databaseFailure',
            failureAction : 'throw' ,
            error : err
          }
          
          stopProcessing = true
          this._transactionState = 'error'

        } finally {

          result.ts = Date.now()
          result.executionTime = (( process.hrtime.bigint() - startTs )/ BigInt(1000000)).toString()

          this._results.push ( result )

        }

      } else {
        
        const startTs = process.hrtime.bigint()
        let result

        try {

          const { status } = await currentCommand.execute( this._results )
          
          if ( status === 'stop' ) {
            this._transactionState = 'stop'
            stopProcessing = true
          } 
          
          result = {
            status
          }

        } catch ( err ) {

          err.message = `logic error occured at command index ${idx}: ${err.message}`
          
          result = {
            status: 'logicError',
            failureAction : 'throw' ,
            error : err
          }
          
          stopProcessing = true
          this._transactionState = "error"

        } finally {
          
          result.ts = Date.now()
          result.executionTime = (( process.hrtime.bigint() - startTs )/ BigInt(1000000)).toString()
          this._results.push ( result )

        }

      }
    }

    if ( this._transactionState !== 'stop' && this._transactionState !== 'error' ) {
      this._transactionState = this._results[this._results.length-1].status
    }
    
    return { transactionState: this.transactionState, results: this._results }

  }

  getCommandByName( name ) {
    if ( Object.keys(this._commandNames).includes(name) ) {
      return this._commands[this._commandNames[name]]
    } else {
      return null
    }
  }
 

  get results() {
    return this._results
  }

  get commands() {
    return this._commands
  }

  get transactionState() {
    return this._transactionState
  }


}