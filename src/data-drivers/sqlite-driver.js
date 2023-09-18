import { DatabaseError  } from '../errors.js'

export class SqliteDataDriver {

  constructor( db ) {
   
    if (!db ) {
      throw new Error('the db argument must be defined')
    }

    this._db = db

  }

  async beginTransaction( ) {
    return new Promise( (resolve, reject) => {
      try {
        const stmt = this._db.prepare('BEGIN');
        const results = stmt.run()  
        resolve( results )
      } catch ( err ) {
        reject( err )
      }
    })
    
    
  }

  async commitTransaction( ) {
    return new Promise( (resolve, reject) => {
      try {
        const stmt = this._db.prepare('COMMIT');
        const results = stmt.run()  
        resolve( results )
      } catch ( err ) {
        reject( err )
      }
    })
  }

  async rollbackTransaction( ) {
    return new Promise( (resolve, reject) => {
      try {
        const stmt = this._db.prepare('ROLLBACK');
        const results = stmt.run()  
        resolve( results )
      } catch ( err ) {
        reject( err )
      }
    })
  }

  async query( command, params ) {
    
    return new Promise( (resolve, reject) => {
      
      let stmt
 
      try {
        stmt = this._db.prepare( command );
        const results = params ? stmt.all( params )  : stmt.all(  )  
        resolve( { rows: results, rowCount: results.length } )
        return
      } catch ( err ) {
        if ( !err instanceof TypeError || !err.message.toLowerCase().includes('run() instead')  ) {
          reject( new DatabaseError( err.message ) )
          return
        }
      }

      // dropped here because need to use run instead
      try {
        const results = params ? stmt.run( params )  : stmt.run(  )  
        resolve( { rows: [], rowCount: results.changes } )
      } catch ( err ) {
        reject( new DatabaseError( err.message ) )
      }
 
    })

  }

}