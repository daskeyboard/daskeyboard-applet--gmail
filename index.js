const q = require('daskeyboard-applet');
const logger = q.logger;

const queryUrlBase = 'https://www.googleapis.com/gmail/v1/users/me/messages?q=';

class GmailAlerts extends q.DesktopApp {
  constructor() {
    super();
    this.pollingInterval = 60000;
  }

  async run() {
    const apiKey = this.authorization.apiKey;
    const monitors = this.config.monitors;
    let account = this.config.account;

    if (!account || account.length === 0) {
      account = 'Gmail account'
    }

    if (!apiKey) {
      throw new Error("No apiKey available.");
    }

    const query = `from:${monitors.join("+OR+")}+is:unread`;
    logger.info("Query: " + query);

    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: apiKey,
      uri: queryUrlBase + query
    });

    logger.info("Proxy request: " + JSON.stringify(proxyRequest));

    return this.oauth2ProxyRequest(proxyRequest).then((json) => {
      logger.info("Got body: " + JSON.stringify(json));
      if (json.messages && json.messages.length > 0) {
        logger.info("Got " + json.messages.length + " messages.");
        return new q.Signal({
          points: [
            [new q.Point("#00FF00")]
          ],
          name: `${account}`,
          message: `You have ${json.messages.length} unread messages.`,
        });
      } else {
        return null;
      }
    }).catch((error) => {
      logger.error("Error while getting mail: " + error);
      throw new Error("Error retrieving email.");
    });
  }
}

const applet = new GmailAlerts();

module.exports = {
  GmailAlerts: GmailAlerts,
}