import { Context } from '../src/context.js'
import { expect } from 'chai'
import sinon from 'sinon'
import { CommandValidationError } from '../src/errors.js'
import { Command } from '../src/command.js'
import { SqlCommand } from '../src/sql-command.js'
// create unit test suite

describe('Context', () => { 

  // create unit test
  it('should create a context', () => {
    const context = new Context()
    expect(context).to.be.instanceOf(Context)
    expect(context).to.have.property('commands')
    expect(context).to.have.property('results')
    expect(context).to.have.property('transactionState')
    expect(context.commands).to.deep.equal([])
    expect(context.results).to.deep.equal([])
    expect(context.transactionState).equal('not-started')
    expect(context._variables).undefined
    expect(context._transactionExecuted).undefined
  })  


  describe('addCommand', () => {

    // create unit test for addCommand method with valid arguments
    it('should add a command with basic sql', () => {
      const context = new Context()
      context.addCommand( { sql: 'select * from test' } )
      expect(context.commands.length).equal(1)
      expect(context.commands[0].command).equal('select * from test')
    })

      // create unit test for addCommand method with valid arguments
      it('should add a command with basic logicop', () => {
        const logicOp = { '===' : ['active', { 'var' : 'status'}]}
        const context = new Context()
        context.addCommand( { logicOp } )
        expect(context.commands.length).equal(1)
        expect(context.commands[0].command).deep.equal( logicOp)
      })
    
    // create unit test for addCommand method with invalid arguments  
    it('should not add a command if not logicOp or sql', () => {

      const context = new Context()
      let thrown = false
      try {
        context.addCommand( {} )
      } catch ( err ) {
        thrown = true
        expect(err).to.be.instanceOf(CommandValidationError)
        expect(err.message).to.equal('the command object can not be validated')
        expect(err.errors).to.be.an('array')
        expect(err.errors.length).equal(1)
        expect(err.errors[0].keyword).equal('missingOneOfProperties')
        expect(err.errors[0].message).equal(`unknown command type: must have either a 'sql' or 'logicOp' parameter in the command`)
      }
      expect(thrown).to.be.true

    })

    it('should throw if addCommand is called with a method that has both logicOp and sql properties', () => {
      const context = new Context()
      let thrown = false
      try {
        context.addCommand( { sql: 'test', logicOp: { '===' : ['active', { 'var' :'status'}]} } )
      } catch ( err ) {
        thrown = true
        expect(err).to.be.instanceOf(CommandValidationError)
        expect(err.message).to.equal('the command object can not be validated')
        expect(err.errors).to.be.an('array')
        expect(err.errors.length).equal(1)
        expect(err.errors[0].keyword).equal('clashingProperties')
        expect(err.errors[0].message).equal(`unknown command type: can not have both 'sql' and 'logicOp' parameters in the command`)
      }
      expect(thrown).to.be.true
    })

    it('add command with name should work and allow the command to be retrieved', () => {
      
      const context = new Context()
      
      context.addCommand( { sql: 'select * from test1' } )
      context.addCommand( { sql: 'select * from test2', name: 'command2' } )
      context.addCommand( { sql: 'select * from test3', name: 'command3' } )
      const c = context.getCommandByName( 'command2' )
      expect(c).to.be.instanceOf(SqlCommand)
      expect(c.command).equal('select * from test2')

    })

    it('throws exception if same name is used twice', () => {
      
      const context = new Context()
      
      context.addCommand( { sql: 'select * from test1', name: 'command1' } )
      context.addCommand( { sql: 'select * from test2', name: 'command2' } )

      expect( () => {
        context.addCommand( { sql: 'select * from test3', name: 'command1' } )
      }).to.throw( `a command with the name 'command1' already exists`)

    })


  })
  
  describe('getCommandByName method', () => {

    it('can get a command by the name', () => {
      
      const context = new Context()
      context.addCommand( { sql: 'select * from test1', name: 'command1' } )
      const c = context.getCommandByName( 'command1' )
      expect(c).to.be.instanceOf(SqlCommand)
      expect(c.command).equal('select * from test1')

    })

    it('returns null if name incorrect', () => {
      
      const context = new Context()
      context.addCommand( { sql: 'select * from test1', name: 'command1' } )
      const c = context.getCommandByName( 'command2' )
      expect(c).to.be.null
      
    })


  })

  describe('context.assignVariables method', () => {
    
    it('should not assign anything if empty array is passed', () => {
      const context = new Context()
      context.assignVariables( [ ] )
      expect(context._variables).deep.equal([])
    })

    it('should not assign anything if null is passed', () => {
      const context = new Context()
      context.assignVariables( null )
      expect(context._variables).deep.equal([])
    })

    it('should not assign anything if undefined is passed', () => {
      const context = new Context()
      context.assignVariables( )
      expect(context._variables).deep.equal([])
    })

    it('should succeed if preTransactionVariableSubstitution does not error out', () => {

      const context = new Context()
      const command = new SqlCommand( { sql: 'select * from test;' } )
      const stub = sinon.stub( command, 'preTransactionVariableSubstitution' )
      context.addCommand( command )
      context.assignVariables( { id: 1})
      expect(stub.calledOnce).true
      expect(stub.firstCall.firstArg).to.deep.equal( { id: 1 } )
      
    })

    it('should throw if preTransactionVariableSubstitution throws', () => {

      const context = new Context()
      const command = new SqlCommand( { sql: 'select * from test;' } )
      const stub = sinon.stub( command, 'preTransactionVariableSubstitution' ).throws(new Error('an error occurred'))
      context.addCommand( command )
      
      expect(()=>{
        context.assignVariables( { id: 1})
      }).to.throw('variable assignment failure on command 0: an error occurred');
      
    })

  })
})
