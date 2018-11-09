const assert = require('assert');
const t = require('../index.js');

describe('GmailAlerts', function() {
  describe('#constructor()', function() {
    it('should return a valid instance', function() {
      let test = new t.GmailAlerts();
      assert.ok(test);
    })
  });
  
  describe('#run()', function() {
    it('should fail without auth tokens', function() {
      let test = new t.GmailAlerts();
      test.run().then((result) => {        
      }).catch((error) => {
        assert.ok(error);
      })      
    })
  })
})
