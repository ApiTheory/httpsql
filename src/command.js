import { ulid } from 'ulidx'

export class Command  {

  constructor( command, opts = {} ) {

    this._genId = opts.genId || (() => {
      return ulid()
    })
    
    this._command = command

    this._id = opts.id || this._genId()
    this._name = opts.name
    this._description = opts.description
    this._strict = ( opts.strict !== undefined && opts.strict !== null ) 

  }

  generateExecutableParams ( submittedVariables) {
    // noop
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

}