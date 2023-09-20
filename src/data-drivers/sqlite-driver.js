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
      
      let results
 
      try {

        const stmt = this._db.prepare( command );

        if (stmt.reader) {

          results = params ? stmt.all( params )  : stmt.all(  ) 
          resolve( { rows: results, rowCount: results.length } )

        } else {

          results = params ? stmt.run( params )  : stmt.run(  )  
          resolve( { rows: [], rowCount: results.changes } )

        }

      } catch ( err ) {
       
        reject( new DatabaseError( err.message ) )

      }
     
    })

  }

}