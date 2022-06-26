import { parse } from 'error-to-json'

import {
  EMPTY_STR, FALSE, TRUE, NULL, VOID,
  PRIMITIVE, ARRAY, OBJECT, DATE, REGEXP, MAP, SET, ERROR, BIGINT
} from './types.js';

const env = typeof self === 'object' ? self : globalThis;

const deserializer = (json, classes, deserializers, $, _) => {
  const as = (out, index) => {
    $.set(index, out);
    return out;
  };

  const unpair = index => {
    // Duplicates on current serialization
    if ($.has(index))
      return $.get(index);

    // Direct primitives shortcuts
    switch(index) {
      case VOID: return undefined;  // TODO: don't serialize
      case NULL: return null;
      case TRUE: return true;
      case FALSE: return false;
      case EMPTY_STR: return '';
    }

    const [type, value] = _[index];
    // Regular structured clone objects
    switch (type) {
      // Basic types
      case PRIMITIVE:
        return as(value, index);
      case DATE:
        return as(new Date(value), index);
      case REGEXP:
        return as(new RegExp(...value), index);
      case ERROR: {
        return as(parse(value), index);
      }
      case BIGINT:
        return as(BigInt(value), index);
      case 'BigInt':
        return as(Object(BigInt(value)), index);

      // Collections
      case ARRAY: {
        const arr = as([], index);
        for (const index of value)
          arr.push(unpair(index));
        return arr;
      }
      case OBJECT: {
        const object = as({}, index);
        for (const [key, index] of value)
          object[unpair(key)] = unpair(index);
        return object;
      }
      case MAP: {
        const map = as(new Map, index);
        for (const [key, index] of value)
          map.set(unpair(key), unpair(index));
        return map;
      }
      case SET: {
        const set = as(new Set, index);
        for (const index of value)
          set.add(unpair(index));
        return set;
      }
    }

    // Deserializers
    const deserialize = deserializers?.[type];
    if (typeof deserialize === 'function')
      return as(deserialize(unpair(value)), index);

    // Class instances
    const Class = classes?.[type];
    if (Class) {
      // Class with `fromJSON` static method
      if (json && ('fromJSON' in Class))
        return as(Class.fromJSON(unpair(value)), index);

      // For both class constructors and `fromJSON()` function, deserialize all
      // child elements before the parent one ("post-tree"). This is because we
      // are not sure of create the tree by setting child objects as attributes
      // of the parent one ("pre-tree")
      // TODO: check for cycles by using a stack. Should it throw, or just
      //       assign them as regular `Object`s? Maybe store them and delay
      //       assignement on not class based objects?
      const seed = {}
      for (const [key, index] of value) seed[unpair(key)] = unpair(index);

      return as(new Class(seed), index)
    }

    return as(new env[type](value), index);
  };

  return unpair;
};

/**
 * @typedef {Array<string,any>} Record a type representation
 */

/**
 * Returns a deserialized value from a serialized array of Records.
 * @param {Record[]} serialized a previously serialized value.
 * @returns {any}
 */
export const deserialize = (serialized, {classes, deserializers, json} = {}) =>
  deserializer(!!json, classes, deserializers, new Map, serialized)(0);
