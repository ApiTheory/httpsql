import { DatabaseError } from 'pg-protocol';
import * as assert from 'assert';
import { ulid } from 'ulidx'
import { Context } from './context.js'

class TransactionalCommandExecutor {

  constructor ( client, commands = [], opts = {} ) {
    
    assert.ok(Array.isArray(commands), 'the commands argument must be an array')
    assert.ok( client, 'the client argument must be defined')
    assert.ok( typeof client.query === 'function', 'the client argument must have a query method')

    this._client = client
    this._context = new Context()
    this._name = opts.name
    this._description = opts.description
    this._submittedCommands = []
    this._executableCommands = []
    this._commandNames = {}
    this._transactionExecutionStarted = false
    this._transactionState = 'not-started'
    this._genId = opts.genId || (() => {
      return ulid()
    })
    this._id = opts.id || this._genId()

    commands.forEach( (command)=> {
      this.addCommand( command )
    })
  }

  addCommand( command ) {
    this._context.addCommand( command )
  }

  async beginTransaction ( ) {
    
    if (this._transactionState === 'not-started') {
      this._transactionState = 'transact-begin-start'
      await this._client.query( 'BEGIN' )
      this._transactionState = 'transact-begin-complete'
    } else {
      throw new Error(`the transaction can not be started because its state = '${this._transactionState}'`)
    }

  }

  async rollbackTransaction ( ) {

    if (["transact-begin-complete"].includes(this._transactionState) ) {

      this._transactionState = 'transact-rollback-start'
      await this._client.query( 'ROLLBACK' )
      this._transactionState = 'transact-rollback-complete'

    } else {

      throw new Error(`the transaction can not be rolled back because its state = '${this._transactionState}'`)

    }

  }
  
  async commitTransaction ( ) {

    if ( this._transactionState === 'transact-begin-complete' ) {

      this._transactionState = 'transact-commit-start'
      await this._client.query( 'COMMIT' )
      this._transactionState = 'transact-commit-complete'

    } else {

      throw new Error(`the transaction can not be committed because its state = '${this._transactionState}'`)

    }

  }
  
  async executeTransaction ( variables = {}, opts = {} ) {

    if ( this._transactionExecutionStarted ) {
      throw new Error( 'the command executor object can only call this method one time - create a new object in order to execute a new transaction' )
    }

    this._transactionExecutionStarted = true

    const currentContext = this._context

    if ( currentContext.commands.length === 0 ) {
      return { finalState: 'nothing-to-do', results: [] }
    }


    // process submitted vars
    currentContext.assignVariables( variables )
        
    try {

      await this.beginTransaction( )

      const { transactionState, results } = await currentContext.executeCommands( this._client )

      if ( transactionState === 'stop' || transactionState === 'success' ) {
        await this.commitTransaction( ) 
      } else {
        await this.rollbackTransaction( )
      }

      if ( opts.output === 'allresults') {
        return { finalState: transactionState, results }
      } else if ( opts.output === 'fullcontext') {
        return { finalState: transactionState, context: currentContext.finalOutput }
      } else {
        return { finalState: transactionState, results: results[results.length-1] }
      }

    } catch ( err ) {
      // unhandled exception, try to rollback and then throw the error
      await this.rollbackTransaction( )
      throw err
    } 
    

  }  

  get commands() {
    return this._context.commands
  }

  get currentState () {
    return this._transactionState
  }

  get name() {
    return this._name
  }

  get description() {
    return this._description
  }

  /**
   * Flag that indicates the executeTransaction method has been called.  This method can only ever be 
   * called once per instance.
   */
  get transactionExecutionStarted() {
    return this._transactionExecutionStarted
  }

  get id() {
    return this._id
  }

}

export default TransactionalCommandExecutor
export { TransactionalCommandExecutor }