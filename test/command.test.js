import { Command } from '../src/command.js'
import { expect } from 'chai'
import sinon from 'sinon'

const simpleCommandText = 'select * from test;'

describe('Command', () => {
    
  it('should be a function', () => {
    expect(Command).to.be.a('function')
  })

  it('should be a Command', () => {
    const c = new Command( simpleCommandText );
    expect(c).to.be.an.instanceOf(Command);
  })

  it('constructor defaults should be correct', () => {
    const c = new Command( simpleCommandText )
    expect(c.command).equal(simpleCommandText)
    expect(c.name).undefined
    expect(c.description).undefined
    expect(c.strict).false
    expect(c.id).to.be.ok
    expect(c.id).to.be.a('string')
    expect(c.id).not.equal('')
    expect(c.id.length).equal(26)
  })

  it('should throw if command not passed', () => {
    expect(() => {
      new Command()
    }).to.throw('the command argument must be defined')
  
  })

  
  it('id should be set if passed in opts', () => {
    const c = new Command( simpleCommandText, { id: 'test-id'} )
    expect(c.id).to.be.ok
    expect(c.id).to.be.a('string')
    expect(c.id).equal('test-id')
  })

  it('id should be set with id generator', () => {
    const c = new Command( simpleCommandText, { genId: () => { return 'my-special-id'} } )
    expect(c.id).to.be.ok
    expect(c.id).to.be.a('string')
    expect(c.id).equal('my-special-id')
  })

  it('should set all opts',() => {
    
    const c = new Command( simpleCommandText, { 
      name: 'mycommandname', 
      strict: true, 
      description: 'my command description', 
      id: 'my-special-id' })

    expect(c.id).equal('my-special-id')
    expect(c.name).equal('mycommandname')
    expect(c.strict).true
    expect(c.description).equal('my command description')
  
  })

  it('should set strict = null',() => {
    
    const c = new Command( simpleCommandText, { strict: null })
    expect(c.strict).false
  
  })


})


