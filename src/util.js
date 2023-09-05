
import { fileURLToPath } from 'url'
import path from 'path'

export const isString = (x) => {
  return Object.prototype.toString.call(x) === "[object String]"
}

export const isNumeric = (val) => {
  return Number( parseFloat( val ) ) === val
}

export const getDirName = ( url ) => {
  const __filename = fileURLToPath( url );
  return path.dirname(__filename);
}