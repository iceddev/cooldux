# cooldux

![cooldux](cooldux.png)


Just a few very simple helpers for the [redux](http://redux.js.org/) [ducks pattern](https://github.com/erikras/ducks-modular-redux)


## makeActionCreator

Since we're throwing actions and reducers into a single file, let's not bother with explicit constants:

```javascript

const somethingStart = cooldux.makeActionCreator('example-SOMETHING_START');

// later something dispatches our action..
dispatch(somethingStart({foo: 'bar'}));

// and after that, our reducer can deal with action types as such:
export default function reducer(state = initialState, action) {
  switch (action.type) {
    case somethingStart.type:
      return { ...state, foo: payload.foo };
    default:
      return state;
  }
}

```

## resetReducer

A reducer factory function that can handle a reset action and set the created reducer back to its initial state.

```javascript

const reducer = cooldux.resetReducer(initialState, function(state = initialState, action) {
  //cooldux resets are already handled!
  switch (action.type) {
    // the rest of your action types..
  }
});

//something dispatches a reset:
dispatch(cooldux.resetAction());

//OR from a connected react component with thunk:
this.props.reset();

```
