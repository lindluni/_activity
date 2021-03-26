const debug = require("debug")("inactive:issues");
const yargs = require("yargs");
const { getGitHubApp, getAuth } = require("../lib/github");
const { getDateFromDaysAgo } = require("../lib/utils");

/**
 * Iterate through all repositories where our GitHub App is installed, and
 * print out all issue comments created since a given time.
 */
async function main(auth, owner, since) {
  const app = getGitHubApp(auth, owner, since);

  for await (const { octokit, repository } of app.eachRepository.iterator()) {
    debug(`fetching issue comments for repository ${repository.full_name}`);
    let i = 0;

    try {
      const options = octokit.issues.listCommentsForRepo.endpoint.merge({
        owner: repository.owner.login,
        repo: repository.name,
        since,
      });

      // fetch all comments from `since` forward
      const comments = await octokit.paginate(options);
      debug(`repository ${repository.full_name} found ${comments.length} issue comments`);

      for (const comment of comments) {
        console.log([comment.user.login, comment.updated_at, "comment"].join(","));
      }
    } catch (err) {
      // try three times before giving up
      if (i++ >= 3) {
        throw err;
      }
    }
  }
}

// DEBUG=inactive:* node scripts/template.js --owner department-of-veterans-affairs --days 91
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
