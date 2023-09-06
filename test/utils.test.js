import { expect } from 'chai'
import { isString, isNumeric, getDirName } from '../src/util.js'

describe('getDirName()', () => {

  it('should return the directory name of the current file', () => {
    expect(getDirName(import.meta.url ).endsWith('test')).true
  })

})

describe('isNumeric()', () => {

  it('should return true if the value is a number', () => {
    expect(isNumeric(1)).true
    expect(isNumeric('1')).true
  })

  it('should return false if the value is not a number', () => {
    expect(isNumeric('foo')).false
    expect(isNumeric(true)).false
    expect(isNumeric(null)).false
    expect(isNumeric(undefined)).false
    expect(isNumeric({})).false
    expect(isNumeric([])).false
  })

})

describe('isString()', () => {

  it('should return true if the value is a string', () => {
    expect(isString('foo')).true
  })

  it('should return false if the value is not a string', () => {
    expect(isString(1)).false
    expect(isString(true)).false
    expect(isString(null)).false
    expect(isString(undefined)).false
    expect(isString({})).false
    expect(isString([])).false
  })

})



