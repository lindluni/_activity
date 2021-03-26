const debug = require("debug")("inactive:template");
const yargs = require("yargs");
const { getGitHubApp, getAuth } = require("../lib/github");
const { getDateFromDaysAgo } = require("../lib/utils");

async function main(auth, since) {
  const app = getGitHubApp(auth);
  debug("Prepped and ready to DEBUG!", `Since ${since}`, since);
  app.log.info("Prepped and ready!");
}

// node scripts/template.js --days 91
if (require.main === module) {
  const auth = getAuth();

  const { argv } = yargs.option("days", {
    alias: "d",
    description: "Days in the past to start from",
    global: true,
    demandOption: true,
  });

  const { days } = argv;
  const since = getDateFromDaysAgo(days);

  main(auth, since);
}

module.exports = main;
