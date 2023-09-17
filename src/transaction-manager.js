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
        
    try {

      if ( this._transactionState === 'not-started' ) {
        await this.beginTransaction( )
      }

      this._transactionState = 'transact-execute-start'

      const response = await this._context.executeRequest( variables, { client: this._client, output: opts.output } )
     
      // if the process was stopped or successful, commit the transaction, otherwise roll it back.
      if ( response.executionState === 'stop' || response.executionState === 'success' ) {
        await this.commitTransaction( ) 
        this._transactionState = 'transact-execute-commit'
      } else {
        await this.rollbackTransaction( )
        this._transactionState = 'transact-execute-rollback'
      }

      return response 
      
    } catch ( err ) {

      // unhandled exception, try to rollback and then throw the error
      await this.rollbackTransaction( )
      this._transactionState = 'transact-execute-rollback'
      throw err

    }     

  }  

  get transactionState() {
    return this._transactionState
  }

}

export default TransactionManager
export { TransactionManager  }