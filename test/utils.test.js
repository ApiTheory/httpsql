import { expect } from 'chai'
import { isString, isNumeric, getDirName, isPlainObject, arrayToObject } from '../src/util.js'
import { Root } from '../src/root.js'

describe('utils', () => {

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

  describe('arrayToObject()', () => { 
   
    it('should convert an array of objects into an object, using a specified key field as the object keys.', () => {
      expect(arrayToObject([ 
        { id: 1, name: 'test1', status: 'active' }, 
        { id: 2, name: 'test2', status: 'complete' },
        { id: 3, name: 'test3', status: 'complete' } 
      ], 'name')).deep.equals({ 
        test1: { id: 1, name: 'test1', status: 'active' }, 
        test2: { id: 2, name: 'test2', status: 'complete' }, 
        test3: { id: 3, name: 'test3', status: 'complete' } 
      })
    })
    
  })

  describe('isPlainObject()', () => {
    it('should return true if the value is a plain object', () => {
      expect(isPlainObject({})).true
      expect(isPlainObject({ id: 1, name: 'test'})).true
    })
    it('should return false if the value is not a plain object', () => {
      expect(isPlainObject([])).false
      expect(isPlainObject(1)).false
      expect(isPlainObject(true)).false
      expect(isPlainObject(false)).false
      expect(isPlainObject(null)).false
      expect(isPlainObject(undefined)).false
      expect(isPlainObject('sting')).false
      expect(isPlainObject(new Date())).false
      expect(isPlainObject(new Root())).false
    })
  })

})



