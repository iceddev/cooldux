let typeIndex = 0;

/**
 * creates a randomly generated type with a tracked type index
 *
 * @returns {String}
 */
function createRandomType() {
  typeIndex++;
  return `RAND_${typeIndex}_${Math.random()}`;
}

/**
 * makes action creator
 *
 * @param {String} [type]
 * @returns {Function} actionCreator
 */
export function makeActionCreator(type = createRandomType()) {
  const actionCreator = (payload) => ({type, payload});
  actionCreator.type = type;
  return actionCreator;
}

/**
 * default reset action
 *
 * @param {Object} payload
 * @returns {Object} state
 */
export const reset = makeActionCreator('cooldux-RESET');

/**
 * general reducer handler for reset
 *
 * @param {Object} initialState
 * @param {Function} reducer
 * @returns {Function}
 */
export function resetReducer(initialState, reducer) {
  return (state, action) =>
    reset.type === action.type ? initialState : reducer(state, action);
}

/**
 * generates action creators specified for promises with error handling
 *
 * @param {String} type
 * @param {String|Object} options
 * @param {String} [options.namespace] if no namespace, then type is the name?
 * @param {Boolean} [options.throwErrors] false
 * @returns {Object}
 */
export function promiseHandler(type, options = {}) {
  if (typeof options === 'string') {
    options = {namespace: options};
  }
  const name = (options.namespace ? options.namespace + '-' : '') + type;
  const initialState = {
    [type]: null,
    [type + 'Pending']: false,
    [type + 'Error']: null
  };
  const creators = {
    [type + 'InitialState']: initialState,
    [type + 'Start']: makeActionCreator(name + '_Start'),
    [type + 'End']: makeActionCreator(name + '_End'),
    [type + 'Error']: makeActionCreator(name + '_Error'),
    [type + 'Handler']: (promise, dispatch) => {
      dispatch(creators[type + 'Start']());
      return promise
        .then((result) => {
          dispatch(creators[type + 'End'](result));
          return result;
        })
        .catch((error) => {
          dispatch(creators[type + 'Error'](error));
          if(options.throwErrors) {
            throw error;
          }
          return null;
        });
    },
    [type + 'Reducer']: (state = initialState, action) => {
      switch (action.type) {
        case creators[type + 'Start'].type:
          return {...state, [type + 'Pending']: true, [type + 'Error']: null};
        case creators[type + 'End'].type:
          return {...state, [type + 'Pending']: false, [type + 'Error']: null, [type]: action.payload};
        case creators[type + 'Error'].type:
          return {...state, [type + 'Pending']: false, [type + 'Error']: action.payload};
        default:
          return state;
      }
    }
  };
  return creators;
}

/**
 * something rather big that returns all sorts of craziness.
 *
 * @param {String[]} types
 * @param {String|Object} options
 * @param {String} [options.namespace] if no namespace, then type is the name?
 * @param {Boolean} [options.throwErrors] false
 * @returns {Object}
 */
export function combinedHandler(types, options) {
  const handlers = {};
  const initialState = types.reduce((state, type) => {
    const handler = promiseHandler(type, options);
    Object.assign(handlers, handler);
    Object.assign(state, handler[type + 'InitialState']);
    return state;
  }, {});
  Object.assign(handlers, {
    initialStateCombined: {...initialState},
    reducerCombined: (state = {...initialState}, action) =>
      types.reduce(
        (state, type) => handlers[type + 'Reducer'](state, action),
        state
      )
  });
  return handlers;
}
