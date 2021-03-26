const debug = require("debug")("inactive:template");
const yargs = require("yargs");
const { getGitHubApp, getAuth } = require("../lib/github");
const { getDateFromDaysAgo } = require("../lib/utils");

async function main(auth, owner, since) {
  const app = getGitHubApp(auth, owner, since);
  debug("Prepped and ready to DEBUG!");
  app.log.info("Prepped and ready!");
}

// node scripts/template.js --owner department-of-veterans-affairs --days 91
if (require.main === module) {
  const auth = getAuth();

  const { argv } = yargs.option("days", {
    alias: "d",
    description: "Days in the past to start from",
    global: true,
    demandOption: true,
  });

  const { owner, days } = argv;
  const since = getDateFromDaysAgo(days);

  main(auth, owner, since);
}

module.exports = main;
