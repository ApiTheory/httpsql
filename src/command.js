import { ulid } from 'ulidx'

export class Command  {

  constructor( command, opts = {} ) {

    if (!command) {
      throw new Error('the command argument must be defined')
    }

    this._genId = opts.genId || (() => {
      return ulid()
    })
    
    this._command = command
    this._id = opts.id || this._genId()
    this._name = opts.name
    this._description = opts.description
    this._strict = ( opts.strict !== undefined && opts.strict !== null ) 

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
}