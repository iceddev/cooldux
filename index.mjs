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
      if(!promise || !promise.then) {
        dispatch(creators[type + 'End'](promise));
        return Promise.resolve(promise);
      }
      dispatch(creators[type + 'Start']());
      return Promise.resolve(promise)
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
    [type + 'Action']: (promise) => {
      if(!promise || !promise.then) {
        promise = Promise.resolve(promise);
        promise._cooldux = { name, options, sync: true };
        return promise;
      }
      promise._cooldux = { name, options };
      return promise;
    },
    [type + 'Reducer']: (state, action) => {
      state = state || initialState;
      switch (action.type) {
        case creators[type + 'Start'].type:
          return Object.assign({}, state, {[type + 'Pending']: true}, {[type + 'Error']: null });
        case creators[type + 'End'].type:
          return Object.assign({}, state, {[type + 'Pending']: false}, {[type ]: action.payload });
        case creators[type + 'Error'].type:
          return Object.assign({}, state, {[type + 'Pending']: false}, {[type + 'Error']: action.payload  });
        default:
          return state;
      }
    }
  };
  if(options.cache) {
    if(!options.namespace) {
      throw new Error('Must specify a namespace option when using cached actions');
    }
    creators[type + 'ActionCached'] = (actionFunc, actionArgs) => {
      const promise = Promise.resolve(type + 'ActionCached');
      promise._cooldux = { namespace: options.namespace, name, options, cache: true, actionFunc, actionArgs, type };
      return promise;
    }
  }
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
    initialStateCombined: Object.assign({}, initialState),
    reducerCombined: (state, action) =>
      types.reduce(
        (state, type) => handlers[type + 'Reducer'](state, action),
        Object.assign({}, (state || initialState))
      )
  });
  return handlers;
}


function actionResolver(promise, _cooldux, dispatch) {
  return promise.then(payload => {
    dispatch({type: _cooldux.name + '_End', payload});
    return payload;
  })
  .catch(err => {
    dispatch({type: _cooldux.name + '_Error', payload: err});
    if(_cooldux.options.throwErrors) {
      throw err;
    }
    return null;
  });
}

/**
 * A middleware for redux that auto-dispatches cooldux actions from a cooldux promiseHandler.
 *
 * @param {Function} dispatch
 */
export const promiseMiddleware = ({ dispatch, getState }) => {
  return next => {
    return action => {
      if(action.then && action._cooldux) {
        const { _cooldux } = action;
        if(_cooldux.sync) {
          return action.then(payload => {
            dispatch({type: _cooldux.name + '_End', payload});
            return payload;
          });
        }
        else if(_cooldux.cache) {
          const state = getState();
          if(state[_cooldux.namespace]) {
            const cachedValue = state[_cooldux.namespace][_cooldux.type];
            if(cachedValue) {
              dispatch({type: _cooldux.name + '_End', payload: cachedValue});
              return Promise.resolve(cachedValue);
            }
            dispatch({type: _cooldux.name + '_Start'});
            const promise = Promise.resolve(_cooldux.actionFunc.apply(null, _cooldux.actionArgs))
            return actionResolver(promise, _cooldux, dispatch);
          }

          return actionResolver(Promise.reject(_cooldux.namespace + ' namespace not in state'), _cooldux, dispatch); 
        }
        dispatch({type: _cooldux.name + '_Start'});
        return actionResolver(action, _cooldux, dispatch);
      }
      next(action);
      return action;
    }
  }
}

/**
 * A function that returns action creators and a combined reducer from a map of promise-returning functions.
 *
 * @param {Object} actions An object of functions
 */
export function makeDuck(actions, options = {}) {
  const actionProps = Object.keys(actions).filter(key => typeof actions[key] !== 'object');
  const duck = combinedHandler(actionProps, options);
  actionProps.forEach(key => {
    if(typeof actions[key] === 'function') {
      duck[key] = function() {
        return duck[key + 'Action'](actions[key].apply(null, arguments));
      }
      if(options.cache) {
        duck[key + 'Cached'] = function() {
          return duck[key + 'ActionCached'](actions[key], arguments);
        }
      }
      return;
    }
    if(typeof actions[key] === 'undefined') {
      duck[key] = function() {
        return duck[key + 'Action'](arguments[0]);
      }
      return;
    }
    throw new Error('actions must be functions or undefined');
  });
  duck.reducer = duck.reducerCombined;
  return duck;
}
