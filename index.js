const q = require('daskeyboard-applet');
const logger = q.logger;

const queryUrlBase = 'https://www.googleapis.com/gmail/v1/users/me/messages';

function getTimestamp() {
  return Math.round(new Date().getTime() / 1000);
}

class GmailAlerts extends q.DesktopApp {
  constructor() {
    super();
    this.pollingInterval = 60000;
    this.timestamp = getTimestamp();
  }

  async checkMessages() {
    const timestamp = this.timestamp;
    this.timestamp = getTimestamp();
    logger.info(`Checking for monitored messages since ${timestamp}`);

    const apiKey = this.authorization.apiKey;
    const monitors = this.config.monitors;

    if (!apiKey) {
      throw new Error("No apiKey available.");
    }

    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: apiKey,
      uri: queryUrlBase,
      qs: {
        q: `from:${monitors.join(" OR ")} is:unread after: ${timestamp}`,
      }
    });

    logger.info("Proxy request: " + JSON.stringify(proxyRequest));

    return this.oauth2ProxyRequest(proxyRequest);
  }

  async run() {
    return this.checkMessages().then((json) => {
      logger.info("Got body: " + JSON.stringify(json));
      if (json.messages && json.messages.length > 0) {
        logger.info("Got " + json.messages.length + " messages.");

        let account = this.config.account;
        if (!account || account.length === 0) {
          account = 'Gmail account'
        }

        return new q.Signal({
          points: [
            [new q.Point("#00FF00")]
          ],
          name: `${account}`,
          message: `You have ${json.messages.length} unread messages.`,
          link: {
            url: 'https://mail.google.com',
            label: 'Check in Gmail',
          }
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
  getTimestamp: getTimestamp,
  GmailAlerts: GmailAlerts,
}