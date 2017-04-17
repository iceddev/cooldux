
function makeActionCreator(type) {
  function actionCreator(payload) {
    return {
      type: type,
      payload: payload,
    };
  }
  actionCreator.type = type;
  return actionCreator;
}

var reset = makeActionCreator('cooldux-RESET');

function resetReducer(initialState, reducer){
  return function(state, action){
    if(reset.type === action.type){
      return initialState;
    }
    return reducer(state, action);
  };
}

function promiseHandler(type, namespace){
  var name = (namespace ? namespace + '-' : '') + type;
  var creators = {};
  var initialState = {};
  initialState[type] = null;
  initialState[type + 'Pending'] = false;
  initialState[type + 'Error'] = null;
  creators[type + 'InitialState'] = initialState;


  creators[type + 'Start'] = makeActionCreator(name + '_Start');
  creators[type + 'End'] = makeActionCreator(name + '_End');
  creators[type + 'Error'] = makeActionCreator(name + '_Error');

  creators[type + 'Handler'] = function(promise, dispatch){
    dispatch(creators[type + 'Start']());
    return promise.then(function(result){
      dispatch(creators[type + 'End'](result));
      return result;
    })
    .catch(function(error){
      dispatch(creators[type + 'Error'](error));
      return null;
    });
  };

  creators[type + 'Reducer'] = function(state, action){
    state = state || initialState;
    var mutations = {};
    switch (action.type) {
      case creators[type + 'Start'].type:
        mutations[type + 'Pending'] = true;
        mutations[type + 'Error'] = null;
        return Object.assign({}, state, mutations);
      case creators[type + 'End'].type:
        mutations[type + 'Pending'] = false;
        mutations[type + 'Error'] = null;
        mutations[type] = action.payload;
        return Object.assign({}, state, mutations);
      case creators[type + 'Error'].type:
        mutations[type + 'Pending'] = false;
        mutations[type + 'Error'] = action.payload;
        return Object.assign({}, state, mutations);
      default:
        return state;
    }

  };

  return creators;
}

function combinedHandler(types, namespace){
  var handlers = {};
  var initialState = {};
  types.forEach(function(type){
    var handler = promiseHandler(type, namespace);
    handlers = Object.assign({}, handlers, handler);
    initialState = Object.assign({}, initialState, handler[type + 'InitialState']);
  });
  handlers.initialStateCombined = initialState;
  handlers.reducerCombined = function(state, action){
    state = state || initialState;
    types.forEach(function(type){
      state = handlers[type + 'Reducer'](state, action);
    });
    return state;
  };
  return handlers;
}


module.exports = {
  makeActionCreator: makeActionCreator,
  reset: reset,
  resetReducer: resetReducer,
  promiseHandler: promiseHandler,
  combinedHandler: combinedHandler
};
