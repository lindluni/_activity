const { App } = require("@octokit/app");
const { Octokit } = require("@octokit/rest");
const { paginateRest } = require("@octokit/plugin-paginate-rest");
const { retry } = require("@octokit/plugin-retry");
const { throttling } = require("@octokit/plugin-throttling");

// Customied Octokit that meets our needs for many requests per second
const ActivtyOctokit = Octokit.plugin(throttling).plugin(retry).plugin(paginateRest);

exports.getGitHubApp = function getOctokit(auth) {
  return new App({
    appId: auth.appId,
    privateKey: auth.privateKey,
    oauth: {
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
    },
    Octokit: ActivtyOctokit.defaults({
      throttle: {
        onRateLimit: (retryAfter, options) => {
          console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
          console.warn(`Retrying after ${retryAfter} seconds! Retry Count: ${options.request.retryCount}`);
          return true;
        },
        onAbuseLimit: (retryAfter, options) => {
          console.warn(`Abuse detected for request ${options.method} ${options.url}`);
        },
      },
    }),
  });
};
