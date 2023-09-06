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

  it('executable command array should match params array if no vars submitted', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{lastop.rows.1.name}'] } } )
    //c.preTransactionVariableSubstitution( { id: 5, name: 'testname' })
    c.preTransactionVariableSubstitution()
    expect(c._executableParams).deep.equal([ 1, '{lastop.rows.1.name}'])
    expect(c._params).deep.equal([ 1, '{lastop.rows.1.name}'])
    expect(c._finalizedParams).deep.equal([])
  })

  it('executable command array should properly represent substituted variables', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'] } } )
    c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    expect(c._executableParams).deep.equal([ 1, 'testval', 'active', 'testname', '{lastop.rows.1.name}'])
    expect(c._params).deep.equal([ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'])
    expect(c._finalizedParams).deep.equal([])
  })

  it('executable command array should substitute null if not strict and variable not found', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'] } } )
    c.preTransactionVariableSubstitution( { id: 5, name: 'testname' })
    expect(c._executableParams).deep.equal([ 1, 'testval', null, 'testname', '{lastop.rows.1.name}'])
    expect(c._params).deep.equal([ 1, 'testval', '{variable.status}', '{name}', '{lastop.rows.1.name}'])
    expect(c._finalizedParams).deep.equal([])
  })

  it('should throw if a dynamic parameter variable is a number', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{7}', '{lastop.rows.1.name}'] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    }).to.throw(`the dynamic parameter '{7}' is a number`)
  })

  it('should throw if a dynamic parameter lastop is a number', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{lastop.3}'] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    }).to.throw(`the dynamic parameter '{lastop.3}' is a number`)
  })

  it('should throw if a dynamic parameter results is a number', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{results.99}'] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    }).to.throw(`the dynamic parameter '{results.99}' is a number`)
  })

  
  it('should throw if a dynamic parameter result is not properly named', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ params: [ 1, '{variable.status}', '{badvar.test}'] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname', status: 'active' })
    }).to.throw(`dynamic parameter '{badvar.test}' can not be properly parsed`)
  })

  it('should throw if strict and a dynamic parameter variable can not be aligned with something passed', () => {
    const c = new SqlCommand( { ...basicSqlCommand, ...{ strict: true, params: [ 1, '{variable.status}' ] } } )
    expect(() => {
      c.preTransactionVariableSubstitution( { id: 5, name: 'testname' })
    }).to.throw(`parameter '{variable.status}' not found`)
  })

})
