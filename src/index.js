const request = require('request');


class SlackServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;


    if (!this.serverless.service.custom.slack) { throw new Error('No Slack options set in config'); }

    if (!this.serverless.service.custom.slack.webhook_url) { throw new Error('No Slack webhook url set in config'); }

    this.webhook_url = this.serverless.service.custom.slack.webhook_url;

    this.messageVariables = {
      user: this.serverless.service.custom.slack.user || process.env.USER,
      name: this.options.f,
      service: this.serverless.service.service,
      stage: this.options.stage,
    };

    this.hooks = {
      'after:deploy:function:deploy': this.afterDeployFunction.bind(this),
      'after:deploy:deploy': this.afterDeployService.bind(this),
    };
  }

  afterDeployFunction() {
    const message = this.serverless.service.custom.slack.function_deploy_message ||
            '`{{user}}` deployed function `{{name}}` to environment `{{stage}}` in service `{{service}}`';

    const onlyOn = this.serverless.service.custom.slack.only_on || this.messageVariables.stage; 
    if (onlyOn !== this.messageVariables.stage) {
      return;
    }

    const parsedMessage = SlackServerlessPlugin.parseMessage(message, this.messageVariables);

    const requestOptions = SlackServerlessPlugin
      .buildRequestOptions(this.webhook_url, parsedMessage);

    return SlackServerlessPlugin.sendWebhook(requestOptions);
  }

  afterDeployService() {
    const message = this.serverless.service.custom.slack.service_deploy_message ||
    '`{{user}}` deployed service `{{service}}` to environment `{{stage}}`';

    const onlyOn = this.serverless.service.custom.slack.only_on || this.messageVariables.stage;
    if (onlyOn !== this.messageVariables.stage) {
      return;
    }

    const parsedMessage = SlackServerlessPlugin.parseMessage(message, this.messageVariables);

    const requestOptions = SlackServerlessPlugin
      .buildRequestOptions(this.webhook_url, parsedMessage);

    return SlackServerlessPlugin.sendWebhook(requestOptions);
  }

  static buildRequestOptions(url, message) {
    return {
      url,
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({ text: message }),
    };
  }
  static sendWebhook(options) {
    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        console.log('Notified slack of deployment');
      } else {
        console.log('Something went wrong notifying slack');
      }
    });
  }

  static parseMessage(message, messageVariables) {
    return Object.entries(messageVariables).reduce((parsedMessage, [key, value]) => parsedMessage.replace(new RegExp(`{{${key}}}`, 'g'), value), message);
  }
}

module.exports = SlackServerlessPlugin;
