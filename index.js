const q = require('daskeyboard-applet');
const request = require('request-promise');
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

  /**
   * For a given message, find the sender
   * @param {*} message 
   */
  inspectSender(message) {
    for (let header of message.payload.headers) {
      if (header.name == 'From') {
        return header.value;
      }
    }
  }

  async checkMessages() {
    return this.getGmailAccessToken().then(accessToken => {
      // save token
      this.gmailAccessToken = accessToken;
      return this.getMessagesWithToken(accessToken);
    }).catch(err => {
      logger.info(`Gmail: error when checking messages. Will try to refresh token ${err}`);

      return this.refreshGmailAccessToken().then(accessToken => {
        this.gmailAccessToken = accessToken;
        return this.getMessagesWithToken(accessToken);
      });
    });
  }

  async getMessagesWithToken(token) {
    logger.info(`getMessagesWithToken`);
    if (!this.config.monitors) {
      return [];
    }
    const monitors = this.config.monitors;
    const timestamp = this.timestamp;
    this.timestamp = getTimestamp();
    logger.info(`Checking for monitored messages since ${timestamp}`);
    let options = {
      uri: queryUrlBase,
      qs: {
        q: `from:${monitors.join(" OR ")} is:unread after: ${timestamp}`
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      json: true
    }
    return request(options);
  }

  /**
   * Use daskeyboard Oauth Proxy to make the request
   */
  async getGmailAccessToken() {
    if (!this.authorization.apiKey) {
      throw new Error("No apiKey available.");
    }

    if (this.gmailAccessToken) {
      return this.gmailAccessToken;
    }

    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: this.authorization.apiKey
    });


    return proxyRequest.getOauth2ProxyToken().then(proxyResponse => {
      return proxyResponse.access_token;
    });
  }

  /**
   * Uses daskeyboard Oauth proxy to refresh access token
   */
  async refreshGmailAccessToken() {
    if (!this.authorization.apiKey) {
      throw new Error("No apiKey available.");
    }

    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: this.authorization.apiKey
    });

    return proxyRequest.refreshOauth2AccessToken().then(proxyResponse => {
      return proxyResponse.access_token;
    });
  }

  async retrieveMessage(id) {
    let options = {
      uri: `${queryUrlBase}/${id}`,
      qs: {
        fields: `payload/headers`
      },
      json: true
    }
    return this.getGmailAccessToken().then(accessToken => {
      this.gmailAccessToken = accessToken;
      options = { ...options, headers: { 'Authorization': `Bearer ${accessToken}` } }
      return request(options);
    }).catch(err => {
      logger.info(`Gmail: error when checking messages.Will try to refresh token ${err} `);
      return this.refreshGmailAccessToken().then(accessToken => {
        this.gmailAccessToken = accessToken;
        options = { ...options, headers: { 'Authorization': `Bearer ${accessToken}` } }
        return request(options);
      });
    });;
  }

  async generateSignalMessage(json) {
    const senders = [];
    for (let message of json.messages) {
      const detail = await this.retrieveMessage(message.id);
      const sender = this.inspectSender(detail).replace(/\s*?<.*/, '');
      if (!senders.includes(sender)) {
        senders.push(sender);
      };
    }

    const lines = [];
    for (let sender of senders.sort()) {
      lines.push(`<div> New message from ${sender}</div > `);
    }
    return lines.join('\n');
  }

  async run() {
    logger.info("Gmail running.");
    return this.checkMessages().then((json) => {
      if (json.messages && json.messages.length > 0) {
        logger.info("Got " + json.messages.length + " messages.");

        let account = this.config.account;
        if (!account || account.length === 0) {
          account = 'Gmail account'
        }

        return this.generateSignalMessage(json).then(message => {
          return new q.Signal({
            points: [
              [new q.Point("#00BFFF", q.Effects.BLINK)]
            ],
            name: `${account} `,
            message: message,
            link: {
              url: 'https://mail.google.com',
              label: 'Open in Gmail',
            }
          });
        });
      } else {
        return null;
      }
    }).catch((error) => {
      logger.error(`Error while getting mail: ${error} `);
      if(`${error.message}`.includes("getaddrinfo")){
        // Do not send error signal when getting internet connection error
        // return q.Signal.error(
        //   'The Gmail service returned an error. <b>Please check your internet connection</b>.'
        // );
      }else{
        return q.Signal.error([
          'The Gmail service returned an error. <b>Please check your account</b>.',
          `Detail: ${error.message}`
        ]);
      }
    });
  }
}

const applet = new GmailAlerts();

module.exports = {
  getTimestamp: getTimestamp,
  GmailAlerts: GmailAlerts,
}