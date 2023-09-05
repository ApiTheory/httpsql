
import Ajv from 'ajv'
import * as fs from 'fs'
import path from 'path'
import { getDirName } from './util.js'
import { Command } from './command.js'
import { CommandValidationError, LogicOpFailureError } from './errors.js'
import { LogicEngine } from 'json-logic-engine'

const logicEngine = new LogicEngine()
const ajv = new Ajv({ allErrors: true, strict: false })
const logicOpCommandValidationShema = JSON.parse(fs.readFileSync(path.resolve( getDirName( import.meta.url ), '../json-schemas/logicop-command-schema.json'))) 
const logicOpCommandValidator = ajv.compile( logicOpCommandValidationShema )

export class LogicCommand extends Command {

  constructor( command ) {

    const validCommand = logicOpCommandValidator( command )
    if (!validCommand) { 
      throw new CommandValidationError( 'the command object can not be validated',  logicOpCommandValidator.errors )  
    }

    const { logicOp, ...opts } = command

    super( logicOp, opts )

    this._onFailure = opts.onFailure

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
        const { message, code, ...additionalData } = this._onExpectationFailure
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