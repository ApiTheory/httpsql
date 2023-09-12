
import Ajv from 'ajv'
import * as fs from 'fs'
import path from 'path'
import { getDirName } from './util.js'
import { Command } from './command.js'
import { CommandValidationError, LogicOpFailureError } from './errors.js'
import { LogicEngine } from 'json-logic-engine'
import { logicOpSchema } from './json-schemas/logicop-command-schema.js'

const logicEngine = new LogicEngine()
const ajv = new Ajv({ allErrors: true, strict: false })
const logicOpCommandValidator = ajv.compile( logicOpSchema )

export class LogicCommand extends Command {

  constructor( command ) {

    const validCommand = logicOpCommandValidator( command )
    if (!validCommand) { 
      throw new CommandValidationError( 'the logic command object can not be validated',  logicOpCommandValidator.errors )  
    }

    const { logicOp, ...opts } = command

    super( logicOp, opts )

    this._onFailure = opts.onFailure || 'throw'

  }

  async execute( results ) {

    if( logicEngine.run( this._command , { 
      lastop: structuredClone(results[ results.length -1 ]), 
      results : structuredClone( results ) 
    } ) ) {
      
      return { status : 'success' }

    } else {

      if ( this._onFailure === 'stop' ) {

        return { status : 'stop' }

      } else if ( this._onFailure.message ) {
        const { message, code, ...additionalData } = this._onFailure
        throw new LogicOpFailureError( message, code, additionalData )
      } else {

        throw new LogicOpFailureError( )

      }

    }
  
  }
  
  get type () {
    return 'logic' 
  }

}