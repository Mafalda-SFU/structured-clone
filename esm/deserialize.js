import {ok} from 'assert/strict'

import { parse } from 'error-to-json'

import {
  EMPTY_STR, FALSE, TRUE, NULL, VOID,
  PRIMITIVE, ARRAY, OBJECT, DATE, REGEXP, MAP, SET, ERROR, BIGINT
} from './types.js';

const env = typeof self === 'object' ? self : globalThis;

function deserializer(
  json, classes, deserializers, objects, update, uuids, $, _
) {
  const as = (out, index, uuid) => {
    $.set(index, out);

    if(uuid && objects) {
      ok(
        !objects.has(uuid),
        'received appData that conflicts with previously stored one'
      )

      objects.set(uuid, out);
      uuids?.set(out, uuid);
    }

    return out;
  };

  const unpair = index => {
    if(!update) {
      // Duplicates on current serialization
      if ($.has(index))
        return $.get(index);

      // Direct duplicates of previous serializations
      if(typeof index === 'string') {  // `index` is an UUID string
        const object = objects?.get(index)
        ok(object !== undefined, `Unknown object for UUID '${index}'`)

        return object;
      }
    }

    // Direct primitives shortcuts
    switch(index) {
      case VOID: return undefined;  // TODO: don't serialize
      case NULL: return null;
      case TRUE: return true;
      case FALSE: return false;
      case EMPTY_STR: return '';
    }

    const entry = _[index]

    // Indexed duplicates of previous serializations (can be shorter than direct
    // ones when there are several ones)
    if(typeof entry === 'string') {  // `entry` is an UUID string
      const object = objects?.get(entry)
      ok(object !== undefined, `Unknown object for UUID '${entry}'`)

      return object;
    }

    // Regular structured clone objects
    const [type, value, uuid] = entry;
    switch (type) {
      // Basic types
      case PRIMITIVE:
        return as(value, index);
      case DATE:
        return as(new Date(value), index, uuid);
      case REGEXP:
        return as(new RegExp(...value), index, uuid);
      case ERROR:
        return as(parse(value), index, uuid);

      // BigInt, it can be defined both as a primitive or an object, see
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#comparisons
      case BIGINT:
        return as(BigInt(value), index);
      case 'BigInt':
        // Instance, needs UUID for equality
        return as(Object(BigInt(value)), index, uuid);

      // Collections, if `update` is defined and they exists use it, if not
      // create then a new one
      case ARRAY: {
        const arr = (objects && update && objects.get(uuid)) || as([], index, uuid);
        for (const index of value)
          arr.push(unpair(index));
        return arr;
      }
      case OBJECT: {
        const object = (objects && update && objects.get(uuid)) || as({}, index, uuid);
        for (const [key, index] of value)
          object[unpair(key)] = unpair(index);
        return object;
      }
      case MAP: {
        const map = (objects && update && objects.get(uuid)) || as(new Map, index, uuid);
        for (const [key, index] of value)
          map.set(unpair(key), unpair(index));
        return map;
      }
      case SET: {
        const set = (objects && update && objects.get(uuid)) || as(new Set, index, uuid);
        for (const index of value)
          set.add(unpair(index));
        return set;
      }
    }

    // Deserializers
    const deserialize = deserializers?.[type];
    if (typeof deserialize === 'function')
      return as(deserialize(unpair(value)), index, uuid);

    // Class instances
    const Class = classes?.[type];
    if (Class) {
      // Class with `fromJSON` static method
      if (json && ('fromJSON' in Class))
        return as(Class.fromJSON(unpair(value)), index, uuid);

      // For both class constructors and `fromJSON()` function, deserialize all
      // child elements before the parent one ("post-tree"). This is because we
      // are not sure of create the tree by setting child objects as attributes
      // of the parent one ("pre-tree")
      // TODO: check for cycles by using a stack. Should it throw, or just
      //       assign them as regular `Object`s? Maybe store them and delay
      //       assignement on not class based objects?
      const seed = {}
      for (const [key, index] of value) seed[unpair(key)] = unpair(index);

      return as(new Class(seed), index, uuid)
    }

    return as(new env[type](value), index, uuid);
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
export function deserialize(
  serialized, {classes, deserializers, json, objects, update, uuids} = {}
) {
  return deserializer(
    !!json, classes, deserializers, objects, update, uuids, new Map, serialized
  )(0);
}
