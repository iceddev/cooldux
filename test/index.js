'use strict';

var chai = require('chai');
var spies = require('chai-spies');

chai.use(spies);

var expect = chai.expect;
var should = chai.should();

var cooldux = require('../index.js');


function createMiddleware (state = {}) {
  const store = {
    getState: chai.spy(function() {
      return state;
    }),
    dispatch: chai.spy(function() {})
  };
  const next = chai.spy(function() {});

  function invoke(action) {
    return cooldux.promiseMiddleware(store)(next)(action);
  }

  return {store, next, invoke};
}

describe('cooldux', function() {

  it('should make and action creator', function(done) {
    var type = 'cooldux-TEST';
    var create = cooldux.makeActionCreator(type);
    create.should.be.a('function');
    create.type.should.equal(type);
    done();
  });

  it('should make and action creator without a specified type', function(done) {
    var create = cooldux.makeActionCreator();
    create.should.be.a('function');
    create.type.should.be.a('string');
    done();
  });


  it('action creator should create an action', function(done) {
    var type = 'cooldux-TEST';
    var create = cooldux.makeActionCreator(type);
    var action = create({foo: 'bar'});
    action.type.should.be.a('string');
    action.payload.should.be.a('object');
    done();
  });

  it('reset reducer should create a resetable reducer', function(done) {
    var initialState = { foo: 'bar' };
    var reducer = cooldux.resetReducer(initialState, function(state, action) {
      action.should.be.a('object');
      return {foo: action.payload.foo};
    });
    reducer.should.be.a('function');

    var state1 = reducer(initialState, {type: 'cooldux-TEST', payload: {foo: 'buzz'}});
    state1.foo.should.equal('buzz');

    var state2 = reducer(state1, cooldux.reset());
    state2.foo.should.equal(initialState.foo);

    var state3 = reducer(state2, {type: 'cooldux-TEST', payload: {foo: 'bazz'}});
    state3.foo.should.equal('bazz');

    done();

  });

  it('promiseHandler should return an object of functions', function(done) {
    var handler = cooldux.promiseHandler('test');

    handler.testStart.should.be.a('function');
    handler.testEnd.should.be.a('function');
    handler.testError.should.be.a('function');
    handler.testHandler.should.be.a('function');

    done();

  });

  //using native Promise for test (node >= 6)
  it('promiseHandler should handle promises', function(done) {
    var handler = cooldux.promiseHandler('test');

    function dispatch(action) {
      if(action.type == handler.testError.type) {
        done();
      }
    }

    handler.testHandler(new Promise(function(resolve, reject) {
      return resolve('ok');
    }), dispatch);

    handler.testHandler(new Promise(function(resolve, reject) {
      return reject('bad');
    }), dispatch);

  });

  it('promiseHandler should allow for action namespaces', function(done) {
    var handler = cooldux.promiseHandler('test', 'foo');

    handler.testStart.type.should.equal('foo-test_Start');

    done();

  });

  if('promiseHandler should allow for namespaces on the options object', function(done) {
    var opts = { namespace: 'foo' };
    var handler = cooldux.promiseHandler('test', opts);

    handler.testStart.type.should.equal('foo-test_Start');

    done();
  });

  it('promiseHandler should throw errors optionally', function(done) {
    var err = new Error('err');
    var opts = { throwErrors: true }
    var handler = cooldux.promiseHandler('test', opts);
    function dispatch() {};

    handler.testHandler(Promise.reject(err), dispatch)
      .then(() => {
        //Should not be called
        expect(false).to.equal(true);
        done();
      })
      .catch((returnedError) => {
        //Should be called
        expect(returnedError).to.equal(err);
        done();
      });
  });


  //using native Promise for test (node >= 6)
  it('promiseHandler should provide a reducer and initial state', function(done) {
    var handler = cooldux.promiseHandler('test');

    handler.testReducer.should.be.a('function');
    handler.testInitialState.should.be.a('object');
    expect(handler.testInitialState).to.have.property('testPending');
    expect(handler.testInitialState).to.have.property('test');
    expect(handler.testInitialState).to.have.property('testError');

    var state = handler.testReducer(null, {type: 'unknown'});
    state.should.deep.equal(handler.testInitialState);

    function dispatch(action) {
      state = handler.testReducer(null, action);
      if(state.testError) {
        done();
      }
    }

    handler.testHandler(Promise.resolve('ok'), dispatch);

    handler.testHandler(Promise.reject('bad'), dispatch);

    handler.testHandler(1, dispatch);

    handler.testHandler(null, dispatch);

  });

  //using native Promise for test (node >= 6)
  it('combinedHandler should provide a combined reducer and initial state', function(done) {
    var handlers = cooldux.combinedHandler(['testA', 'testB']);

    handlers.should.be.a('object');

    handlers.testAStart.should.be.a('function');
    handlers.testAEnd.should.be.a('function');
    handlers.testAError.should.be.a('function');
    handlers.testAReducer.should.be.a('function');
    handlers.testAInitialState.should.be.a('object');

    handlers.testBStart.should.be.a('function');
    handlers.testBEnd.should.be.a('function');
    handlers.testBError.should.be.a('function');
    handlers.testBReducer.should.be.a('function');
    handlers.testBInitialState.should.be.a('object');

    handlers.initialStateCombined.should.be.a('object');
    handlers.reducerCombined.should.be.a('function');

    var state = handlers.reducerCombined(null, {type: 'none', payload: 1});
    state.should.deep.equal(handlers.initialStateCombined);

    var state2 = {foo: 1};
    state = handlers.reducerCombined(state2, {type: 'none', payload: 1});
    state.should.deep.equal(state2);

    done();

  });

  it('passes through non-cooldux promise', (done) => {
    const { next, invoke } = createMiddleware();
    const action = {type: 'TEST'};
    invoke(action);
    next.should.have.been.called.with(action);
    done();
  });

  it('handles a successful cooldux promiseAction', (done) => {
    const { aAction } = cooldux.promiseHandler('a');
    const { next, invoke, store } = createMiddleware();
    const action = aAction(Promise.resolve('ok'));
    invoke(action)
    .then(result => {
      store.dispatch.should.have.been.called.twice;
      next.should.not.have.been.called.with(action);
      done();
    });
  });

  it('handles a rejected cooldux promiseAction', (done) => {
    const { aAction } = cooldux.promiseHandler('a');
    const { next, invoke, store } = createMiddleware();
    const action = aAction(Promise.reject('bad'));
    invoke(action)
    .then(() => {
      store.dispatch.should.have.been.called.twice;
      next.should.not.have.been.called.with(action);
      done();
    });
  });

  it('handles a rejected cooldux promiseAction and allows catching errors', (done) => {
    const { aAction } = cooldux.promiseHandler('a', {throwErrors: true});
    const { next, invoke, store } = createMiddleware();
    const action = aAction(Promise.reject('bad'));
    invoke(action)
    .catch(err => {
      store.dispatch.should.have.been.called.twice;
      next.should.not.have.been.called.with(action);
      done();
    });
  });

  it('creates a duck with a promise returning function', (done) => {
    const duck = cooldux.makeDuck({
      a : (input) => Promise.resolve(input),
      b : () => Promise.reject('bad'),
    });

    duck.should.be.a('object');
    duck.a.should.be.a('function');
    duck.b.should.be.a('function');
    should.equal(duck.c, undefined);

    const { invoke, store, next } = createMiddleware();
    const action = duck.a('hello');
    invoke(action)
    .then(res => {
      store.dispatch.should.have.been.called.twice;
      next.should.not.have.been.called.with(action);
      res.should.equal('hello');
      done();
    });

  });

  it('creates a duck with a synchronus function', (done) => {
    const duck = cooldux.makeDuck({
      a : (num1, num2) => num1 + num2
    });

    duck.a.should.be.a('function');
    
    const { invoke, store, next } = createMiddleware();
    const action = duck.a(1, 2);
    invoke(action)
    .then(res => {
      store.dispatch.should.have.been.called.once;
      next.should.not.have.been.called.with(action);
      res.should.equal(3);
      done();
    });

  });

  it('creates a duck with a cache check with cache in the store', (done) => {
    const duck = cooldux.makeDuck({
      a : (num1, num2) => num1 + num2
    }, {namespace: 'foo', cache: true});

    duck.a.should.be.a('function');
    duck.aCached.should.be.a('function');
    
    const { invoke, store, next } = createMiddleware({foo: {a: 'this isnt even a number!'}});
    const action = duck.aCached(1, 2);
    invoke(action)
    .then(res => {
      next.should.not.have.been.called.with(action);
      res.should.equal('this isnt even a number!');
      done();
    });
  });

  it('creates a duck with a cache check without cache in the store', (done) => {
    const duck = cooldux.makeDuck({
      a : (num1, num2) => num1 + num2
    }, {namespace: 'foo', cache: true});

    duck.a.should.be.a('function');
    duck.aCached.should.be.a('function');
    
    const { invoke, store, next } = createMiddleware({foo: {}});
    const action = duck.aCached(1, 2);
    invoke(action)
    .then(res => {
      next.should.not.have.been.called.with(action);
      res.should.equal(3);
      done();
    });
  });

  it('makeDuck with caching should error if namespace not supplied', (done) => {
    try {
      cooldux.makeDuck({
        a : (num1, num2) => num1 + num2
      }, {cache: true});
    } catch (error) {
      error.should.be.an('error');
      done();
    }
  });

  it('makeDuck with caching should error if supplied namespace is not same as the state property', (done) => {
    const duck = cooldux.makeDuck({
      a : (num1, num2) => num1 + num2
    }, {namespace: 'foo', cache: true, throwErrors: true});

    duck.a.should.be.a('function');
    duck.aCached.should.be.a('function');
    
    const { invoke, store, next } = createMiddleware({bar: {a: 3}});
    const action = duck.aCached(1, 2);
    invoke(action)
    .catch(error => {
      next.should.not.have.been.called.with(action);
      done();
    });
  });

  it('creates a duck with a default function', (done) => {
    const duck = cooldux.makeDuck({
      a : undefined
    });

    duck.a.should.be.a('function');
    
    const { invoke, store, next } = createMiddleware();
    const action = duck.a('hello');
    invoke(action)
    .then(res => {
      store.dispatch.should.have.been.called.once;
      next.should.not.have.been.called.with(action);
      res.should.equal('hello');
      done();
    });

  });

  it('makeDuck should error if not a function or undefined', (done) => {
    try {
      cooldux.makeDuck({
        a : 'foo'
      });
    } catch (error) {
      error.should.be.an('error');
      done();
    }

  });



});
