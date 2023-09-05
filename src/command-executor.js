import { DatabaseError } from 'pg-protocol';
import * as assert from 'assert';
import { LogicEngine } from 'json-logic-engine'
import { ulid } from 'ulidx'
import { Context } from './context.js'

const logicEngine = new LogicEngine()


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

    this._pgClient = pgClient
    this._context = new Context()
    this._name = opts.name
    this._description = opts.description
    this._submittedCommands = []
    this._executableCommands = []
    this._commandNames = {}
    this._transactionExecuted = false
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
      await this._pgClient.query( 'BEGIN' )
      this._transactionState = 'transact-begin-complete'

    } else {

      throw new Error(`the transaction can not be started because its state = '${this._transactionState}'`)

    }

  }

  async rollbackTransaction ( ) {

    if (["transact-begin-complete"].includes(this._transactionState) ) {

      this._transactionState = 'transact-rollback-start'
      await this._pgClient.query( 'ROLLBACK' )
      this._transactionState = 'transact-rollback-complete'

    } else {

      throw new Error(`the transaction can not be rolled back because its state = '${this._transactionState}'`)

    }

  }
  
  async commitTransaction ( ) {

    if ( this._transactionState === 'transact-begin-complete' ) {

      this._transactionState = 'transact-commit-start'
      await this._pgClient.query( 'COMMIT' )
      this._transactionState = 'transact-commit-complete'

    } else {

      throw new Error(`the transaction can not be started because its state = '${this._transactionState}'`)

    }

  }
  
  async finalizeTransaction ( )  {

    if ( this._transactionState === 'transact-rollback-complete' || this._transactionState === 'transact-commit-complete' ) {

      this._transactionState = 'transact-finalize-start'
      await this._pgClient.release()
      this._transactionState = 'transact-finalize-complete'

    } else {

      throw new Error(`the transaction can not be finalized because its state = '${this._transactionState}'`)

    }

  }
  
  async executeTransaction ( variables = {}, opts = {} ) {

    if ( this.transactionExecuted ) {
      throw new Error( 'The command executor object can only call this method one time; create a new object in order to execute a new transaction. ')
    }

    this._transactionExecuted = true

    const currentContext = this._context

    // process submitted vars
    currentContext.assignVariables( variables )
        
    let idx

    try {

      await this.beginTransaction( )

      const { transactionState, results } = await this._context.executeCommands( this._pgClient )

      if ( transactionState === 'stop' || transactionState === 'success' ) {
        await this.commitTransaction( ) 
      } else {
        await this.rollbackTransaction( )
      }

      if ( opts.output === 'allresults') {
        return { finalState: transactionState, results }
      } else if ( opts.output === 'fullcontext') {
        return { finalState: transactionState, context: this._context.finalOutput }
      } else {
        return { finalState: transactionState, results: results[results.length-1] }
      }

    } catch ( err ) {
      // unhandled exception, try to rollback and then throw the error
      await this.rollbackTransaction( )
      throw err
    } 
    

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

  get transactionExecuted() {
    return this._transactionExecuted
  }

  get id() {
    return this._id
  }

}

export default TransactionalCommandExecutor
export { TransactionalCommandExecutor }