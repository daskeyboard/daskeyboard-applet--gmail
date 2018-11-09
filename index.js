const q = require('daskeyboard-applet');
const logger = q.logger;

const request = require('request-promise');

const queryUrlBase = 'https://www.googleapis.com/gmail/v1/users/me/messages?q=';
const proxyUrl = "http://localhost:8094/thirdparty/proxy/oauth2/proxy";

class GmailAlerts extends q.DesktopApp {
  constructor() {
    super();
    this.pollingInterval = 60000;
  }

  async run() {    
    const apiKey = this.authorization.apiKey;
    const monitors = this.config.monitors;

    if (!apiKey) {
      throw new Error("No apiKey available.");
    }

    const query = `from:${monitors.join(" OR ")}+is:unread`;
    logger.info("Query: " + query);

    const proxyRequest = {
      apiKey: apiKey,
      url: queryUrlBase + query
    }

    logger.info("Proxy request: " + JSON.stringify(proxyRequest));

    return request({
      method: 'POST',
      uri: proxyUrl,
      body: proxyRequest,
      json: true
    }).then((json) => {
      logger.info("Got body: " + JSON.stringify(json));
      if (json.messages && json.messages.length > 0) {
        logger.info("Got " + json.messages.length + " messages.");
        return new q.Signal([
          [new q.Point("#00FF00")]
        ]);
      } else {
        return null;
      }
    }).catch((error) => {
      logger.error("Error while getting mail", error);
      throw new Error("Error retrieving email.");
    });
  }
}

const applet = new GmailAlerts();

module.exports = {
  GmailAlerts: GmailAlerts,
}