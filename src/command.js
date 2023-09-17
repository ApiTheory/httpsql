import { ulid } from 'ulidx'
import jsonata from 'jsonata'
import { ExpectationEvaluationError } from './errors.js'

export class Command  {

  constructor( command, opts = {} ) {

    if (!command) {
      throw new Error('the command argument must be defined')
    }

    this._command = command
    this._id = opts.id || ( opts?.genId instanceof Function ? opts.genId() : ulid() )
    this._name = opts.name
    this._description = opts.description
    this._strict = ( opts.strict !== undefined && opts.strict !== null ) ? opts.strict : true

    // evaluate expect
    if ( opts.expect !== undefined && opts.expect !== null ) {

      try { 
        jsonata(opts.expect)
      } catch ( err ) {
        throw new ExpectationEvaluationError( `expectation could not be evaluated: ${err.message}` )
      }

      this._expect = opts.expect
      this._expectationDescription = opts.expectationDescription
      this._onExpectationFailure = opts.onExpectationFailure

    }
    
  }

  get id() {
    return this._id
  }

  get name() {
    return this._name
  }

  get description() {
    return this._description
  }

  get strict() {
    return this._strict
  }

  get command() {
    return this._command
  }

  get expect() {
    return this._expect
  }

  get onExpectationFailure() {
    return this._onExpectationFailure
  }

  execute( results ) {
    throw new Error('abstract method execute( results ) not implemented in base command class');
  }


}