
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

var resetActionCreator = makeActionCreator('cooldux-RESET');

function reset() {
  return function dispatcher(dispatch) {
    dispatch(resetActionCreator());
  };
}

function resetReducer(initialState, reducer){
  return function(state, action){
    if(resetActionCreator.type === action.type){
      return initialState;
    }
    return reducer(state, action);
  };
}


module.exports = {
  makeActionCreator: makeActionCreator,
  reset: reset,
  resetActionCreator: resetActionCreator,
  resetReducer: resetReducer
};
