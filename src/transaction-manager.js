import * as assert from 'assert';
import { ulid } from 'ulidx'
import { Context } from './context.js'
import { Root } from './root.js'

class TransactionManager {

  constructor ( client, rootNode ) {
       
    assert.ok( client, 'the client argument must be defined')
    assert.ok( typeof client.query === 'function', 'the client argument must have a query method')
    assert.ok( rootNode instanceof Root, 'the root node is required and must be an instance of the Root class')  

    this._client = client
    this._context = new Context( rootNode )
    this._transactionStarted = false
    this._transactionState = 'not-started'

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

    if (["transact-begin-complete", "transact-execute-start"].includes(this._transactionState) ) {

      this._transactionState = 'transact-rollback-start'
      await this._client.query( 'ROLLBACK' )
      this._transactionState = 'transact-rollback-complete'

    } else {

      throw new Error(`the transaction can not be rolled back because its state = '${this._transactionState}'`)

    }
 
  }
  
  async commitTransaction ( ) {

    if ( this._transactionState === 'transact-begin-complete' || this._transactionState === 'transact-execute-start' ) {

      this._transactionState = 'transact-commit-start'
      await this._client.query( 'COMMIT' )
      this._transactionState = 'transact-commit-complete'

    } else {

      throw new Error(`the transaction can not be committed because its state = '${this._transactionState}'`)

    }

  }
  
  async executeTransaction ( variables = {}, opts = {} ) {
    
    if ( this._transactionStarted ) {
      throw new Error( 'a transaction can only be started once - create a new object in order to execute a new transaction' )
    }

    this._transactionStarted=true

    if ( this._context.commands.length === 0 ) {
      return { finalState: 'nothing-to-do', results: [] }
    }

    // the beginTransaction method must be called but can be called before the executeTransaction method
    if ( this._transactionState !== 'transact-begin-complete' && this._transactionState !== 'not-started' ) {
      throw new Error(`the transaction can not be executed because its state = '${this._transactionState}'`)
    }

    // process submitted vars and do it before transaction is started in case there are errors
    this._context.assignVariables( variables )
        
    try {

      if ( this._transactionState === 'not-started' ) {
        await this.beginTransaction( )
      }

      this._transactionState = 'transact-execute-start'

      const { executionState, results } = await this._context.executeCommands( this._client )
     
      if ( executionState === 'stop' || executionState === 'success' ) {
        await this.commitTransaction( ) 
      } else {
        await this.rollbackTransaction( )
      }

      if ( opts.output === 'allresults') {
        return { finalState: executionState, results }
      } else if ( opts.output === 'fullcontext') {
        return { finalState: executionState, context: this._context }
      } else {
        return { finalState: executionState, results: results[results.length-1] }
      }

    } catch ( err ) {

      // unhandled exception, try to rollback and then throw the error
      await this.rollbackTransaction( )
      throw err

    } finally {

      this._transactionState = 'transact-execute-complete'
      
    }
    

  }  

  get transactionState() {
    return this._transactionState
  }

}

export default TransactionManager
export { TransactionManager  }