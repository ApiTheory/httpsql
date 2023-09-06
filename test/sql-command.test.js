import { SqlCommand } from '../src/sql-command.js';
import { expect } from 'chai'
import sinon from 'sinon'

const basicSqlCommand = {
  sql: 'SELECT * FROM table'
}

describe('SqlCommand', () => {


  it('should be a function', () => {
    expect(SqlCommand).to.be.a('function')
  })

  it('should be a SqlCommand', () => {
    const c = new SqlCommand( basicSqlCommand )
    expect(c).to.be.an.instanceOf(SqlCommand)
    expect(c._onExpectationFailure).equal('throw')
    expect(c.type).equal('sql')
    expect(c._params).deep.equal([])
    expect(c._executableParams).deep.equal([])
    expect(c._finalizedParams).deep.equal([])
    expect(c._expect).undefined
    expect(c.command).equal(basicSqlCommand.sql)
    expect(c.strict).false
    expect(c.name).undefined
    expect(c.description).undefined
    expect(c.id).to.be.ok
    expect(c.id).to.be.a('string')
    expect(c.id.length).equal(26)
  
  })

  it('should populate onExpectationFailure=stop', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ onExpectationFailure : 'stop' } } )
    expect(c._onExpectationFailure).equal('stop')
  })

  it('should populate onExpectationFailure=object', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ onExpectationFailure : { message: 'expect failure', code: 'e555', foo : 'bar' } } } )
    expect(c._onExpectationFailure).deep.equal({ message: 'expect failure', code: 'e555', foo : 'bar' })
  })

  it('should populate expect', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ expect : 'one' } } )
    expect(c._expect).equal('one')
  })

  it('should populate params', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [1, '{lastop.rowCount}'] } } )
    expect(c._params).deep.equal([1, '{lastop.rowCount}'])
  })

  it('should throw if appropriate command not passed', () => {
    expect(() => {
      new SqlCommand( {} )
    }).to.throw('the sql command object can not be validated')
  })

})
