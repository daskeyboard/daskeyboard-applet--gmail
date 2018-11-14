const assert = require('assert');
const t = require('../index.js');
const apiKey = require('./auth.json').apiKey;

describe('GmailAlerts', function () {
  describe('#constructor()', function () {
    it('should return a valid instance', function () {
      let test = new t.GmailAlerts();
      assert.ok(test);
    })
  });

  describe('#run()', function () {
    it('should fail without an API key', function () {
      let test = new t.GmailAlerts();
      return test.run().then((result) => {
        return assert.fail("Should have failed.");
      }).catch((error) => {
        return assert.ok(error);
      })
    });

    it('should get a message if it has an API key', function () {
      console.log("My API key is: " + apiKey);
      let test = new t.GmailAlerts();
      return test.processConfig({
        authorization: {
          apiKey: apiKey
        },
        applet: {
          user: {
            monitors: ['guillaume@metadot.com', 'daniel@metadot.com']
          }
        }
      }).then(() => {
        return test.run().then((signal) => {
          console.log("Got signal: " + signal);
          return assert(signal === null || signal);
        }).catch(error => {
          return assert.fail("Got error: " + error);
        });
      })
    });

  })
});