const assert = require('assert');
const t = require('../index');
const apiKey = require('./auth.json').apiKey;

describe('GmailAlerts', function () {
  describe('#constructor()', function () {
    it('should return a valid instance', function () {
      let test = new t.GmailAlerts();
      assert.ok(test);
    })
  });

  describe('#checkMessages()', function () {
    it('should get messages since an old timestamp', async function () {
      return buildApp().then(async (app) => {
        app.timestamp = getOldTimestamp();

        return app.checkMessages().then(json => {
          assert.ok(json.resultSizeEstimate);
        });
      })
    });

    it('should ignore older messages', async function () {
      return buildApp().then(async (app) => {
        app.timestamp = getOldTimestamp();

        return app.checkMessages().then(async (json) => {
          assert.ok(json.resultSizeEstimate);
          return app.checkMessages().then(json => {
            assert.equal(0, json.resultSizeEstimate);
          });
        });
      })
    });
  });

  describe('#generateMessage(messages)', function () {
    const json = require('./test-response.json');
    return buildApp().then(async app => {
      const test = await app.generateSignalMessage(json);
      assert.ok(test);
      assert(test.includes('New message from Cory Kim'));
    })
  });

  describe('#retrieveMessage(id)', function () {
    it('should retrieve a message', async function () {
      return buildApp().then(async (app) => {
        return app;
      }).then(app => {
        return app.retrieveMessage('1677f507c6e5f39a')
      }).then(message => {
        assert.ok(message);
      });
    })
  })

  describe('#run()', function () {
    it('should fail without an API key', async function () {
      let test = new t.GmailAlerts();
      return test.run().then((result) => {
        return assert.fail("Should have failed.");
      }).catch((error) => {
        return assert.ok(error);
      })
    });

    it('should get a signal', async function () {
      return buildApp().then(async (app) => {
        app.timestamp = getOldTimestamp();
        return app.run().then((signal) => {
          console.log("Got signal: " + JSON.stringify(signal));
          return assert.ok(signal);
        }).catch(error => {
          return assert.fail("Got error: " + error);
        });
      })
    });

    it('should not get signal on first run', async function () {
      return buildApp().then(async (app) => {
        return app.run().then((signal) => {
          console.log("Got signal: " + JSON.stringify(signal));
          return assert.equal(null, signal);
        }).catch(error => {
          return assert.fail("Got error: " + error);
        });
      })
    });

    it('should ignore old emails', async function () {
      return buildApp().then(async (app) => {
        app.timestamp = getOldTimestamp();
        return app.run().then((signal) => {
          console.log("Got signal: " + JSON.stringify(signal));
          assert.ok(signal);
        }).then(async () => {
          return app.run().then((signal) => {
            console.log("Got signal: " + JSON.stringify(signal));
            return assert.equal(null, signal);
          });
        });
      }).catch(error => {
        return assert.fail("Got error: " + error);
      });
    })
  })
});

// returns a 1-year-old timestamp
function getOldTimestamp() {
  return t.getTimestamp() - 28800 * 365
}

async function buildApp() {
  let test = new t.GmailAlerts();
  return test.processConfig({
    authorization: {
      apiKey: apiKey
    },
    applet: {
      user: {
        monitors: ['guillaume@metadot.com', 'daniel@metadot.com',
          'cory@metadot.com', 'gmail@cory.kim'
        ]
      }
    }
  }).then(() => {
    return test
  });
}