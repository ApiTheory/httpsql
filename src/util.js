
import { fileURLToPath } from 'url'
import path from 'path'

export const isString = (x) => {
  return Object.prototype.toString.call(x) === "[object String]"
}

export const isNumeric = (val) => {
  return /^-?\d+$/.test(val);
}

export const getDirName = ( url ) => {
  const __filename = fileURLToPath( url );
  return path.dirname(__filename);
}

export const isPlainObject =  val  => {
	if (typeof val !== 'object' || val === null || val === undefined ) {
		return false;
	}

	const prototype = Object.getPrototypeOf( val );
	return ( prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val ) && !(Symbol.iterator in val );
}


/**
 * Converts an array of objects into an object, using a specified key field as the object keys.
 *
 * @param {Array} array - The array of objects to convert.
 * @param {string} keyField - The name of the key field in each object.
 * @return {Object} - The resulting object with the specified key field as the key for the extracted object.
 */
export const arrayToObject = (array, keyField) =>
   array.reduce((obj, item) => {
     obj[item[keyField]] = item
     return obj
   }, {})

  