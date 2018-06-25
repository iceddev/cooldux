(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define([ 'exports' ], factory) : factory(global.cooldux = {});
})(this, function(exports) {
  'use strict';
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
      dispatch(creators[type + 'Start']());
      return promise.then(function(result) {
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
    creators[type + 'Reducer'] = function(state, action) {
      var obj, obj$1, obj$2;
      if (state === void 0) {
        state = initialState;
      }
      switch (action.type) {
       case creators[type + 'Start'].type:
        return Object.assign({}, state, (obj = {}, obj[type + 'Pending'] = true, obj[type + 'Error'] = null, 
        obj));

       case creators[type + 'End'].type:
        return Object.assign({}, state, (obj$1 = {}, obj$1[type + 'Pending'] = false, obj$1[type + 'Error'] = null, 
        obj$1[type] = action.payload, obj$1));

       case creators[type + 'Error'].type:
        return Object.assign({}, state, (obj$2 = {}, obj$2[type + 'Pending'] = false, obj$2[type + 'Error'] = action.payload, 
        obj$2));

       default:
        return state;
      }
    };
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
        if (state === void 0) {
          state = Object.assign({}, initialState);
        }
        return types.reduce(function(state, type) {
          return handlers[type + 'Reducer'](state, action);
        }, state);
      }
    });
    return handlers;
  }
  exports.makeActionCreator = makeActionCreator;
  exports.reset = reset;
  exports.resetReducer = resetReducer;
  exports.promiseHandler = promiseHandler;
  exports.combinedHandler = combinedHandler;
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
});
