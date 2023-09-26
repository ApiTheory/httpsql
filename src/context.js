import { DatabaseError } from "./errors.js"
import { Root } from "./root.js"
import { ExpectationFailureError, LogicOpFailureError } from './errors.js'
import { arrayToObject} from './util.js'

export class Context {

  constructor( rootNode ) {

    if ( !(rootNode instanceof Root) ) {
      throw new Error('rootNode argument must be an instance of Root')
    }

    this._rootNode = rootNode
    Object.freeze(this._rootNode)  // once rootNode is assigned to the context, its frozen to prevent further modifications
    this._executionState = 'not-started'
    this._results = []
    this._variables
    this._transactionExecuted
    this._request
    this._requestIsPrepared = false
    this._failureAction = undefined
    this._failureIndex = undefined
    this._failureCommandName = undefined
  }

  async executeRequest( vars, opts = {} ) {

    this._variables = vars || {} 
    this._request = opts?.request || {}
    const client = opts?.client

    if ( this._executionState !== 'not-started' ) {
      throw new Error( `the context can only execute commands one time but the current executionState === '${this._executionState}'`)
    }

    if ( this._rootNode.commands.length === 0 ) {
      this._executionState = 'nothing-to-do'
      this._results = []
      return
    }

    // walk through each of the commands
    let stopProcessing = false
    
    this._executionState = 'started'
    const transactionStart = Date.now()
    const overallStartTime = process.hrtime.bigint()

    for ( let idx=0; idx < this._rootNode.commands.length; idx++ ) {

      const startTs = process.hrtime.bigint()

      const currentExecution = { 
        currentResult : {
          index : idx,
          status: 'not-executed',
          ts: Date.now()
        },
        command: null
      }

      const currentCommand = this._rootNode.commands[idx]

      const currentResult = {
        type: currentCommand.type,
        status: 'not-executed',
        command: currentCommand,
        commandStart : Date.now()
      }

      // if processing should stop, capture the result as not executed and move back to top of the loop to process everything else
      if ( stopProcessing ) {
        currentResult.commandEnd = Date.now()
        currentResult.totalExecutionMS = (( process.hrtime.bigint() - startTs )/ BigInt(1000000)).toString()
        this._results.push( currentResult )
        continue
      }

      const currentContextSnapshot = new ContextSnapshot( this )

      try {

        const executionOptions = {}
        if (  client ) {
          executionOptions.client = client
        }

        const { rowCount, rows, result, status, finalizedParams, failureAction, error } = await currentCommand.execute( currentContextSnapshot.generateContext(), executionOptions )
        
        currentResult.status = status
        
        if (rowCount !== undefined ) {
          currentResult.rowCount = rowCount
        }
        
        if ( rows !== undefined) {
          currentResult.rows = rows
        }
        
        if ( result !== undefined ) {
          currentResult.result = result
        }

        if ( finalizedParams ) {
          currentResult.command.finalizedParams = finalizedParams
        }

        if ( error !== undefined ) {
          currentResult.error = error
        }

        if ( currentResult.status !== 'success' ) {
          stopProcessing = true
          this._executionState = currentResult.status
          if ( failureAction ) {
            this._failureAction = failureAction
            this._failureIndex = idx
            this._failureCommandName = currentCommand.name
            currentResult.failureAction = failureAction
          }
        }

      } catch ( err ) {
        currentResult.failureAction = 'throw'
        currentResult.error = err

        this._failureAction = 'throw'
        this._failureIndex = idx
        this._failureCommandName = currentCommand.name

        if ( err instanceof DatabaseError ) {

          currentResult.status = 'database-execution-failure'

        } else if ( err instanceof ExpectationFailureError ) {

          currentResult.status = 'expectation-failure'

        } else if ( err instanceof LogicOpFailureError ) {

          currentResult.status = 'logic-execution-failure'

        } else {

          currentResult.status = 'unhandled-exception'

        }

        stopProcessing = true
        this._executionState = 'error'

      } finally {

        currentResult.commandEnd = Date.now()
        currentResult.totalExecutionMS = (( process.hrtime.bigint() - startTs )/ BigInt(1000000)).toString()
        this._results.push( currentResult )

      }

    }

    // no more commands to process, so figure out what the execution result is if it has not already
    // been set to 'stop' or to 'error
    if ( this._executionState !== 'stop' && this._executionState !== 'error' ) {
      this._executionState = this._results[this._results.length-1].status
    }

    const response = {
      transactionId : this._rootNode.id,
      executionState: this._executionState,
      transactionStart,
      transactionEnd: Date.now(),
      totalExecutionMS: (( process.hrtime.bigint() - overallStartTime )/ BigInt(1000000)).toString()
    }

    if ( this._executionState !== 'success' ) {
      response.failureAction = this._failureAction
      response.failureIndex = this._failureIndex
      response.failureCommandName = this._failureCommandName
    }

    if ( opts.output === 'last-result') {
      response.lastResult = this._results[this._results.length - 1]
    } else if ( opts.output === 'last-data-result') {
      response.lastDataResult = this._results.toReversed().find( x => x.type === 'sql' )  
    } else if ( opts.output === 'last-logic-result') {
      response.lastLogicResult = this._results.toReversed().find( x => x.type === 'logic' )        
    } else if ( opts.output === 'full-context') {
      const finalSnapshot = new ContextFinalSnapshot(this)
      response.fullContext = finalSnapshot.generateContext()
    } else {
      response.results = this._results
    }

    if ( response.executionState !== 'success' ) {
      response.error = this._results.toReversed().find( x =>  x.error  )?.error
    }

    return response

  }

  get results() {
    return structuredClone( this._results )
  }

  get commands() {
    return structuredClone(this._rootNode.commands )
  }

  get variables() {
    return this._variables
  }

  get request() {
    return this._request
  }

  get executionState() {
    return this._executionState
  }

  set executionState ( state ) {  
    this._executionState = state
  }

  get failureAction() {
    return this._failureAction
  }

  get failureIndex() {
    return this._failureIndex
  }

}

export class ContextSnapshot {

  constructor ( context ) {
    this._id = context.id
    this._results = context.results
    this._executionState = context.executionState
    this._commands = context.commands
    this._variables = context.variables
    this._request = context.request
  }

  generateContext() {
   
    const ct = {
      id : this._id,
      executionState: this._executionState,
      resultById : arrayToObject( this._results, 'id' ),
      resultByName : arrayToObject( this._results, 'name' ),
      lastTransformationResult : this._results.toReversed().find( x => x.type === 'transform' ) ,
      lastLogicResult : this._results.toReversed().find( x => x.type === 'logic' ) ,
      lastDataResult : this._results.toReversed().find( x => x.type === 'sql' ) ,
      lastResult : this._results.length > 0 ? this._results[this._results.length-1] : null,
      request : this._request,
      results : this._results,
      variables : this._variables
    }

    return ct

  }

}

export class ContextFinalSnapshot {

  constructor ( context ) {
    this._results = context.results
    this._commands = context.commands
    this._variables = context.variables
    this._request = context.request
  }

  generateContext() {
   
    const ct = {
      request : this._request,
      variables : this._variables,
      results : this._results,
      commands : this._commands
      
    }

    return ct

  }
}