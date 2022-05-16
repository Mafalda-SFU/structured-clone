'use strict';
const {ok} = require('assert/strict');

const { parse } = require('error-to-json')

const {
  VOID, PRIMITIVE, ARRAY, OBJECT, DATE, REGEXP, MAP, SET, ERROR, BIGINT
} = require('./types.js');

const env = typeof self === 'object' ? self : globalThis;

const deserializer = (json, classes, $, _) => {
  const as = (out, index) => {
    $.set(index, out);
    return out;
  };

  function getClass(name)
  {
    const Class = classes?.[name] || env[name]

    ok(Class instanceof Function, `Class ${name} is not a function`);

    return Class;
  }

  const unpair = index => {
    if ($.has(index))
      return $.get(index);

    const [type, value] = _[index];
    switch (type) {
      case PRIMITIVE:
      case VOID:
        return as(value, index);
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
      case DATE:
        return as(new Date(value), index);
      case REGEXP: {
        const {source, flags} = value;
        return as(new RegExp(source, flags), index);
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
      case ERROR: {
        return as(parse(value), index);
      }
      case BIGINT:
        return as(BigInt(value), index);
      case 'BigInt':
        return as(Object(BigInt(value)), index);
    }

    // Class instances
    const Class = getClass(type);

    let instance
    if(!(type in classes))
      instance = new Class(value)
    else {
      // For both class constructors and `fromJSON()` function, deserialize all
      // child elements before the parent one ("post-tree"). This is because we
      // are not sure of create the tree by setting child objects as attributes
      // of the parent one ("pre-tree")
      // TODO: check for cycles by using a stack. Should it throw, or just
      //       assign them as regular `Object`s? Maybe store them and delay
      //       assignement on not class based objects?
      const seed = {}
      for (const [key, index] of value) seed[unpair(key)] = unpair(index);

      instance = (json && Class.fromJSON)
        ? Class.fromJSON(seed)
        : new Class(seed)
    }

    return as(instance, index);
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
const deserialize = (serialized, {classes, json} = {}) =>
  deserializer(!!json, classes, new Map, serialized)(0);
exports.deserialize = deserialize;
