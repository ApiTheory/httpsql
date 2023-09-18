import { types } from 'util'
import { isPlainObject } from '../util.js'
import { DatabaseError  } from '../errors.js'
export class PgDataDriver {

  constructor( client ) {
   
    if (!client ) {
      throw new Error('the client argument must be defined')
    }

    this._client = client

  }

  async beginTransaction( ) {
    return await this._client.query( 'BEGIN' )
  }

  async commitTransaction( ) {
    return await this._client.query( 'COMMIT' )
  }

  async rollbackTransaction( ) {
    return await this._client.query( 'ROLLBACK' )
  }

  async query( command, params ) {
    
    // allow command to be a Query Config object - up to caller to insure it is correct
    try {
      if ( isPlainObject( command ) ) {
        return await this._client.query(command)
      } else {
        return await this._client.query( command, params )
      }
    } catch ( err ) {
      throw new DatabaseError( err.message )
    }

  }

}