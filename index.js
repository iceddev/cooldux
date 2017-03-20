
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

  return creators;
}

module.exports = {
  makeActionCreator: makeActionCreator,
  reset: reset,
  resetReducer: resetReducer,
  promiseHandler: promiseHandler
};
