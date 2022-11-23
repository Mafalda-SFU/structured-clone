import {ok} from 'assert/strict';
import { randomUUID } from 'crypto'

import errorToJSON from 'error-to-json'

import {
  EMPTY_STR, FALSE, TRUE, NULL, VOID,
  PRIMITIVE, ARRAY, OBJECT, DATE, REGEXP, MAP, SET, ERROR, BIGINT
} from './types.js';


const EMPTY = '';

const {toString} = {};
const {keys} = Object;

const typeOf = value => {
  // Primitives
  const type = typeof value;
  if (type !== 'object' || !value)
    return [PRIMITIVE, type];

  // Objects
  const asString = toString.call(value).slice(8, -1);
  switch (asString) {
    case 'Array':
      return [ARRAY, EMPTY];
    case 'Object': {
      const {name} = value.constructor || {};

      return [OBJECT, name === 'Object' ? EMPTY : name];
    }
    case 'Date':
      return [DATE, EMPTY];
    case 'RegExp':
      return [REGEXP, EMPTY];
    case 'Map':
      return [MAP, EMPTY];
    case 'Set':
      return [SET, EMPTY];
  }

  // TypedArrays
  if (asString.includes('Array'))
    return [ARRAY, asString];

  // Errors
  if (asString.includes('Error'))
    return [ERROR, asString];

  // Non basic objects
  return [OBJECT, asString];
};

const shouldSkip = ([TYPE, type]) => (
  TYPE === PRIMITIVE &&
  (type === 'function' || type === 'symbol')
);

function serializer(strict, json, memoize, objects, serializers, uuids, $, _)
{
  const as = (out, value) => {
    const index = _.push(out) - 1;
    $.set(value, index);

    if(
      (memoize || uuids)
      && Array.isArray(out)
      && out[0] !== BIGINT
      && out[0] !== PRIMITIVE
      && out.length === 2
    ) {
      let isNewUuid

      let uuid = uuids?.get(value)
      if(!uuid) {
        uuid = randomUUID()
        isNewUuid = true
      }

      out.push(uuid)

      if(uuids && isNewUuid) {
        uuids.set(value, uuid);
        objects?.set(uuid, value);
      }

      memoize?.set(value, uuid);
    }

    return index;
  };

  const serializedUuids = memoize || uuids

  const pair = value => {
    // Duplicates on current serialization
    if ($.has(value))
      return $.get(value);

    // Duplicates of previous serializations
    const uuid = serializedUuids?.get(value)
    // TODO: detect when it's used only once and set it directly in place
    if (uuid !== undefined) return as(uuid, value);

    let [TYPE, type] = typeOf(value);
    switch (TYPE) {
      // Basic types
      case PRIMITIVE: {
        let entry = value;

        switch (type) {
          case 'bigint':
            TYPE = BIGINT;
            entry = value.toString();
            break;
          case 'boolean':
            return value ? TRUE : FALSE;
          case 'function':
          case 'symbol':
            if (strict)
              throw new TypeError('unable to serialize ' + type);
            entry = null;
            break;
          case 'string':
            if(entry === '') return EMPTY_STR;
            break;
          case 'undefined':
            return VOID;
        }

        if(entry === null) return NULL;

        return as([TYPE, entry], value);
      }
      case DATE:
        return as([TYPE, value.toISOString()], value);
      case REGEXP: {
        const {source, flags} = value;
        return as([TYPE, [source, flags]], value);
      }

      // Collections
      case ARRAY: {
        // TypedArray
        if (type)
          return as([type, [...value]], value);

        // Regular Array
        const arr = [];
        const index = as([TYPE, arr], value);
        for (const entry of value)
          arr.push(pair(entry));
        return index;
      }
      case OBJECT: {
        if (type) {
          switch (type) {
            case 'BigInt':
              return as([type, value.toString()], value);
            case 'Boolean':
            case 'Number':
            case 'String':
              return as([type, value.valueOf()], value);
          }

          // Serializers
          const serialize = serializers?.[type];
          if (serialize) {
            if (typeof serialize === 'function') {
              const out = [type]
              const index = as(out, value);
              out[1] = pair(serialize(value));

              return index;
            }

            TYPE = type;
          }
        }

        // Object with `toJSON` method
        if (json && ('toJSON' in value)) {
          const result = pair(value.toJSON());

          // It could be REALLY strange and wicked that somebody returns the
          // same object twice when calling to `toJSON()` instead of creating a
          // new one on-the-fly, and more strange and disturbing that a
          // `fromJSON()` method would throw different results if the provided
          // JSON objects are not strictly equals, but who knows... Anyway, call
          // to `pair()` is already generating an UUID if needed, althought the
          // important one is the one generated for this one (the real object,
          // not the config one).
          return TYPE === OBJECT ? result : as([TYPE, result], value);
        }

        // Regular object
        const entries = [];
        const index = as([TYPE, entries], value);
        for (const key of keys(value)) {
          if (strict || !shouldSkip(typeOf(value[key])))
            entries.push([pair(key), pair(value[key])]);
        }
        return index;
      }
      case MAP: {
        const entries = [];
        const index = as([TYPE, entries], value);
        for (const [key, entry] of value) {
          if (strict || !(shouldSkip(typeOf(key)) || shouldSkip(typeOf(entry))))
            entries.push([pair(key), pair(entry)]);
        }
        return index;
      }
      case SET: {
        const entries = [];
        const index = as([TYPE, entries], value);
        for (const entry of value) {
          if (strict || !shouldSkip(typeOf(entry)))
            entries.push(pair(entry));
        }
        return index;
      }
    }

    // `ERROR` and other unknown `TYPE`s
    return as([TYPE, errorToJSON(value)], value);
  };

  return pair;
};

/**
 * @typedef {Array<string,any>} Record a type representation
 */

/**
 * Returns an array of serialized Records.
 * @param {any} value a serializable value.
 * @param {{lossy?: boolean}?} options an object with a `lossy` property that,
 *  if `true`, will not throw errors on incompatible types, and behave more
 *  like JSON stringify would behave. Symbol and Function will be discarded.
 * @returns {Record[]}
 */
export function serialize(
  value, {json, lossy, memoize, objects, serializers, uuids} = {}
) {
  ok(arguments.length, 'value argument not provided')

  const result = [];

  serializer(
    !(json || lossy), !!json, memoize, objects, serializers, uuids, new Map,
    result
  )(value)

  return result;
};
