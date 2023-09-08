import { Root } from '../src/root.js'
import { expect } from 'chai'
import { SqlCommand } from '../src/sql-command.js'
import { CommandValidationError } from '../src/errors.js'
// create unit test suite

describe.only('Root', () => {
  
  describe('constructor', () => {

    it('should return an instance of Root', () => {
      expect(new Root()).to.be.an.instanceof(Root)
    })

    it('should have an id property', () => {
      expect(new Root()).to.have.property('id')
    })

    it('should have an name property', () => {
      expect(new Root()).to.have.property('name')
    })

    it('should have description property', () => {
      expect(new Root()).to.have.property('description')
    })

    it('should have params property', () => {
      expect(new Root()).to.have.property('params')
    })

    it('should have commands property', () => {
      expect(new Root()).to.have.property('commands')
    })
    
    it('should throw if command argument not an array', () => {
      expect(() => {
        new Root(  '')
      }).to.throw('the commands argument must be an array')
      expect(() => {
        new Root(  3)
      }).to.throw('the commands argument must be an array')
      expect(() => {
        new Root(  true)
      }).to.throw('the commands argument must be an array')
      expect(() => {
        new Root(  false)
      }).to.throw('the commands argument must be an array')
      expect(() => {
        new Root( Date.now())
      }).to.throw('the commands argument must be an array')
    })

    it( 'should have an addCommand method', () => {
      const r = new Root()
      expect(r.addCommand).to.be.a('function')
    })

    it( 'should have a getCommandByName method', () => {
      const r = new Root()
      expect(r.getCommandByName).to.be.a('function')
    })

    it( 'should have correct default values', () => {
      const r = new Root()
      expect(r.name).undefined
      expect(r.description).undefined
      expect(r.params).deep.equal({})
      expect(r.commands).deep.equal([])
      expect(r.id).to.be.ok
      expect(r.id).to.be.a('string')
      expect(r.id.length).to.equal(26)
    })

    it('id should be set if passed in opts', () => {
      const r = new Root( [], { id: 'test-id'} )
      expect(r.id).to.be.ok
      expect(r.id).to.be.a('string')
      expect(r.id).equal('test-id')
    })

    it('id should be set with id generator', () => {
      const r = new Root( [], { genId: () => { return 'my-special-id'} } )
      expect(r.id).to.be.ok
      expect(r.id).to.be.a('string')
      expect(r.id).equal('my-special-id')
    })

    it('support multiple commands being passed to constructor', () => {
      const commands = [{
        sql : 'select * from test'
      }, {
        sql : 'select * from test2'
      }]

      const r = new Root( commands )
      expect(r.commands).to.be.ok
      expect(r.commands).to.be.an('array')
      expect(r.commands.length).equal(2)
      expect(r.commands[0].command).equal('select * from test')
      expect(r.commands[1].command).equal('select * from test2')
    })

    it('should accept opts argument without commands', () => {
      const r = new Root( { id: 'test-id'} )
      expect(r.id).to.be.ok
      expect(r.id).to.be.a('string')
      expect(r.id).equal('test-id')
      expect(r.commands).deep.equal([])
    })

  })

  describe('addCommand', () => {

    it('adds command if already a SqlCommand object', () => {
      const r = new Root()
      r.addCommand(new SqlCommand({ sql :'select * from test' }))
      expect(r.commands).to.be.ok
      expect(r.commands).to.be.an('array')
      expect(r.commands.length).equal(1)
      expect(r.commands[0].command).equal('select * from test')
      expect(r.commands[0]).to.be.an.instanceof(SqlCommand)
    })

    it('support multiple commands being passed to addCommand method', () => {

      const r = new Root(  )
      r.addCommand({
        sql : 'select * from test'
      })
      r.addCommand({
        sql : 'select * from test2'
      })
      expect(r.commands).to.be.ok
      expect(r.commands).to.be.an('array')
      expect(r.commands.length).equal(2)
  
      expect(r.commands[0].command).equal('select * from test')
      expect(r.commands[1].command).equal('select * from test2')
    })

    it('should add a command with basic sql', () => {
      const r = new Root()
      r.addCommand( { sql: 'select * from test' } )
      expect(r.commands.length).equal(1)
      expect(r.commands[0].command).equal('select * from test')
    })

    it('should add a command with basic logicop', () => {
      const logicOp = { '===' : ['active', { 'var' : 'status'}]}
      const r = new Root()
      r.addCommand( { logicOp } )
      expect(r.commands.length).equal(1)
      expect(r.commands[0].command).deep.equal( logicOp)
    })
    
    it('should not add a command if not logicOp or sql', () => {

      const r = new Root()
      let thrown = false
      try {
        r.addCommand( {} )
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
      const r = new Root()
      let thrown = false
      try {
        r.addCommand( { sql: 'test', logicOp: { '===' : ['active', { 'var' :'status'}]} } )
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
      
      const r = new Root()
      
      r.addCommand( { sql: 'select * from test1' } )
      r.addCommand( { sql: 'select * from test2', name: 'command2' } )
      r.addCommand( { sql: 'select * from test3', name: 'command3' } )
      const c = r.getCommandByName( 'command2' )
      expect(c).to.be.instanceOf(SqlCommand)
      expect(c.command).equal('select * from test2')

    })

    it('throws exception if same name is used twice', () => {
      
      const r = new Root()
      
      r.addCommand( { sql: 'select * from test1', name: 'command1' } )
      r.addCommand( { sql: 'select * from test2', name: 'command2' } )

      expect( () => {
        r.addCommand( { sql: 'select * from test3', name: 'command1' } )
      }).to.throw( `a command with the name 'command1' already exists`)

    })


  })

  describe('getCommandByName', () => {

    it('should return null if no command with the name is found', () => {
      const r = new Root()
      r.addCommand( { sql: 'test', name:'test1' } )
      const c = r.getCommandByName( 'test' )
      expect(c).to.be.null
    })

    it('should return the SqlCommand if name is found', () => {
      const r = new Root( [{ sql: 'test', name:'test1' }, { sql: 'test2', name:'test2' }, { sql: 'test', name:'test3' }] )
      const c = r.getCommandByName( 'test2' )
      expect(c).to.be.ok
      expect(c).to.be.an.instanceof(SqlCommand)
      expect(c.command).equal('test2')
      expect(c.name).equal('test2')
    })

  })
})


