'use strict';

var chai = require('chai');


var expect = chai.expect;
chai.should();

var cooldux = require('../');

describe('cooldux', function(){

  it('should make and action creator', function(done){
    var type = 'cooldux-TEST';
    var create = cooldux.makeActionCreator(type);
    create.should.be.a('function');
    create.type.should.equal(type);
    done();
  });

  it('reset should give a thunk function', function(done){
    var reset = cooldux.reset();
    reset.should.be.a('function');
    reset(function(action){
      action.should.be.a('object');
      done();
    });
  });

  it('action creator should create an action', function(done){
    var type = 'cooldux-TEST';
    var create = cooldux.makeActionCreator(type);
    var action = create({foo: 'bar'});
    action.type.should.be.a('string');
    action.payload.should.a('object');
    done();
  });

  it('reset reducer should create a resetable reducer', function(done){
    var initialState = { foo: 'bar' };
    var reducer = cooldux.resetReducer(initialState, function(state, action){
      action.should.be.a('object');
      done();
    });
    reducer.should.be.a('function');
    reducer(initialState, {type: 'cooldux-RESET', payload: {}});
    reducer(initialState, {type: 'cooldux-TEST', payload: {foo: 'buzz'}});

  });

});
