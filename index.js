
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

var resetAction = makeActionCreator('cooldux-RESET');

function reset() {
  return function dispatcher(dispatch) {
    dispatch(resetAction());
  };
}

function resetReducer(initialState, reducer){
  return function(state, action){
    if(resetAction.type === action.type){
      return initialState;
    }
    return reducer(state, action);
  };
}


module.exports = {
  makeActionCreator: makeActionCreator,
  reset: reset,
  resetReducer: resetReducer
};
