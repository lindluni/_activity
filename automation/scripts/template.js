const yargs = require("yargs");
const { getGitHubApp } = require("../lib/github");
const { getDateFromDaysAgo } = require("../lib/utils");

async function main(auth, owner, since) {
  const app = getGitHubApp(auth, owner, since);
  app.log.info("Prepped and ready!");
}

// node scripts/template.js --owner department-of-veterans-affairs --days 91
if (require.main === module) {
  const requiredEnvs = ["INACTIVE_APP_ID", "INACTIVE_CLIENT_ID", "INACTIVE_CLIENT_SECRET", "INACTIVE_PRIVATE_KEY"];

  for (const requiredEnv of requiredEnvs) {
    if (!Object.prototype.hasOwnProperty.call(process.env, requiredEnv)) {
      console.error(`${requiredEnv} is missing from environment.`);
      process.exit(1);
    }
  }

  const { argv } = yargs.option("days", {
    alias: "d",
    description: "Days in the past to start from",
    global: true,
    demandOption: true,
  });

  // configure GitHub App auth details as object
  const app = {
    appId: process.env.INACTIVE_APP_ID,
    clientId: process.env.INACTIVE_CLIENT_ID,
    clientSecret: process.env.INACTIVE_CLIENT_SECRET,
    privateKey: process.env.INACTIVE_PRIVATE_KEY,
  };

  const { owner, days } = argv;
  const since = getDateFromDaysAgo(days);

  main(app, owner, since);
}

module.exports = main;
