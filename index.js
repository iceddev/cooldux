'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var typeIndex = 0;

function createRandomType() {
  typeIndex++;
  return 'RAND_' + typeIndex + '_' + Math.random();
}

function makeActionCreator(type) {
  if (type === void 0) {
    type = createRandomType();
  }
  var actionCreator = function(payload) {
    return {
      type: type,
      payload: payload
    };
  };
  actionCreator.type = type;
  return actionCreator;
}

var reset = makeActionCreator('cooldux-RESET');

function resetReducer(initialState, reducer) {
  return function(state, action) {
    return reset.type === action.type ? initialState : reducer(state, action);
  };
}

function promiseHandler(type, options) {
  if (options === void 0) {
    options = {};
  }
  if (typeof options === 'string') {
    options = {
      namespace: options
    };
  }
  var name = (options.namespace ? options.namespace + '-' : '') + type;
  var initialState = {};
  initialState[type] = null;
  initialState[type + 'Pending'] = false;
  initialState[type + 'Error'] = null;
  var creators = {};
  creators[type + 'InitialState'] = initialState;
  creators[type + 'Start'] = makeActionCreator(name + '_Start');
  creators[type + 'End'] = makeActionCreator(name + '_End');
  creators[type + 'Error'] = makeActionCreator(name + '_Error');
  creators[type + 'Handler'] = function(promise, dispatch) {
    if (!promise || !promise.then) {
      dispatch(creators[type + 'End'](promise));
      return Promise.resolve(promise);
    }
    dispatch(creators[type + 'Start']());
    return Promise.resolve(promise).then(function(result) {
      dispatch(creators[type + 'End'](result));
      return result;
    }).catch(function(error) {
      dispatch(creators[type + 'Error'](error));
      if (options.throwErrors) {
        throw error;
      }
      return null;
    });
  };
  creators[type + 'Action'] = function(promise) {
    if (!promise || !promise.then) {
      promise = Promise.resolve(promise);
      promise._cooldux = {
        name: name,
        options: options,
        sync: true
      };
      return promise;
    }
    promise._cooldux = {
      name: name,
      options: options
    };
    return promise;
  };
  creators[type + 'Reducer'] = function(state, action) {
    var obj, obj$1, obj$2, obj$3, obj$4, obj$5;
    state = state || initialState;
    switch (action.type) {
     case creators[type + 'Start'].type:
      return Object.assign({}, state, (obj = {}, obj[type + 'Pending'] = true, obj), (obj$1 = {}, 
      obj$1[type + 'Error'] = null, obj$1));

     case creators[type + 'End'].type:
      return Object.assign({}, state, (obj$2 = {}, obj$2[type + 'Pending'] = false, obj$2), (obj$3 = {}, 
      obj$3[type] = action.payload, obj$3));

     case creators[type + 'Error'].type:
      return Object.assign({}, state, (obj$4 = {}, obj$4[type + 'Pending'] = false, obj$4), (obj$5 = {}, 
      obj$5[type + 'Error'] = action.payload, obj$5));

     default:
      return state;
    }
  };
  if (options.cache) {
    if (!options.namespace) {
      throw new Error('Must specify a namespace option when using cached actions');
    }
    creators[type + 'ActionCached'] = function(actionFunc, actionArgs) {
      var promise = Promise.resolve(type + 'ActionCached');
      promise._cooldux = {
        namespace: options.namespace,
        name: name,
        options: options,
        cache: true,
        actionFunc: actionFunc,
        actionArgs: actionArgs,
        type: type
      };
      return promise;
    };
  }
  return creators;
}

function combinedHandler(types, options) {
  var handlers = {};
  var initialState = types.reduce(function(state, type) {
    var handler = promiseHandler(type, options);
    Object.assign(handlers, handler);
    Object.assign(state, handler[type + 'InitialState']);
    return state;
  }, {});
  Object.assign(handlers, {
    initialStateCombined: Object.assign({}, initialState),
    reducerCombined: function(state, action) {
      return types.reduce(function(state, type) {
        return handlers[type + 'Reducer'](state, action);
      }, Object.assign({}, state || initialState));
    }
  });
  return handlers;
}

function actionResolver(promise, _cooldux, dispatch) {
  return promise.then(function(payload) {
    dispatch({
      type: _cooldux.name + '_End',
      payload: payload
    });
    return payload;
  }).catch(function(err) {
    dispatch({
      type: _cooldux.name + '_Error',
      payload: err
    });
    if (_cooldux.options.throwErrors) {
      throw err;
    }
    return null;
  });
}

var promiseMiddleware = function(ref) {
  var dispatch = ref.dispatch;
  var getState = ref.getState;
  return function(next) {
    return function(action) {
      if (action.then && action._cooldux) {
        var _cooldux = action._cooldux;
        if (_cooldux.sync) {
          return action.then(function(payload) {
            dispatch({
              type: _cooldux.name + '_End',
              payload: payload
            });
            return payload;
          });
        } else if (_cooldux.cache) {
          var state = getState();
          if (state[_cooldux.namespace]) {
            var cachedValue = state[_cooldux.namespace][_cooldux.type];
            if (cachedValue) {
              dispatch({
                type: _cooldux.name + '_End',
                payload: cachedValue
              });
              return Promise.resolve(cachedValue);
            }
            dispatch({
              type: _cooldux.name + '_Start'
            });
            var promise = Promise.resolve(_cooldux.actionFunc.apply(null, _cooldux.actionArgs));
            return actionResolver(promise, _cooldux, dispatch);
          }
          return actionResolver(Promise.reject(_cooldux.namespace + ' namespace not in state'), _cooldux, dispatch);
        }
        dispatch({
          type: _cooldux.name + '_Start'
        });
        return actionResolver(action, _cooldux, dispatch);
      }
      next(action);
      return action;
    };
  };
};

function makeDuck(actions, options) {
  if (options === void 0) {
    options = {};
  }
  var actionProps = Object.keys(actions).filter(function(key) {
    return typeof actions[key] !== 'object';
  });
  var duck = combinedHandler(actionProps, options);
  actionProps.forEach(function(key) {
    if (typeof actions[key] === 'function') {
      duck[key] = function() {
        return duck[key + 'Action'](actions[key].apply(null, arguments));
      };
      if (options.cache) {
        duck[key + 'Cached'] = function() {
          return duck[key + 'ActionCached'](actions[key], arguments);
        };
      }
      return;
    }
    if (typeof actions[key] === 'undefined') {
      duck[key] = function() {
        return duck[key + 'Action'](arguments[0]);
      };
      return;
    }
    throw new Error('actions must be functions or undefined');
  });
  duck.reducer = duck.reducerCombined;
  return duck;
}

exports.makeActionCreator = makeActionCreator;

exports.reset = reset;

exports.resetReducer = resetReducer;

exports.promiseHandler = promiseHandler;

exports.combinedHandler = combinedHandler;

exports.promiseMiddleware = promiseMiddleware;

exports.makeDuck = makeDuck;
