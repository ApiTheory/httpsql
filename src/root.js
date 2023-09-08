import { Command } from './command.js'
import * as assert from 'assert'
import { ulid } from 'ulidx'
import { CommandValidationError } from './errors.js'
import { SqlCommand } from './sql-command.js'
import { LogicCommand } from './logic-command.js'
import { isPlainObject } from './util.js'

export class Root {
  
  constructor( commands = [], opts = {}) {

    if ( arguments.length === 1 && isPlainObject( arguments[0] ) ) {
      opts = structuredClone( arguments[0] )
      commands = []
    }
    
    assert.ok(Array.isArray(commands), 'the commands argument must be an array')
    
    this._genId = opts.genId || (() => {
      return ulid()
    })

    this._id = opts.id || this._genId()
    this._commands = []
    this._commandNames = {}
    this._name = opts.name
    this._description = opts.description
    this._params = opts.params || {}

    commands.forEach( (command)=> {
      this.addCommand( command )
    })

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

  getCommandByName( name ) {
    if ( Object.keys(this._commandNames).includes(name) ) {
      return this._commands[this._commandNames[name]]
    } else {
      return null
    }
  }

  get commands() {
    return this._commands
  }

  get params() {
    return this._params
  }

  get name() {
    return this._name
  }

  get description() {
    return this._description
  }

  get id() {
    return this._id
  }

  

}