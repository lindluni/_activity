const debug = require("debug")("inactive:comments");
const yargs = require("yargs");
const {getGitHubApp, getAuth} = require("../lib/github");
const utils = require("../lib/utils");
const database = require("../lib/database")

/**
 * Iterate through all repositories where our GitHub App is installed, and
 * print out all issue comments created since a given time.
 */
async function main(auth, days) {
    const commentsLastUpdated = new Date();
    const since = await utils.getSince(utils.TYPE_COMMENTS, days)

    const app = getGitHubApp(auth, since);
    for await (const {octokit, repository} of app.eachRepository.iterator()) {
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
                console.log([comment.user.login, comment.updated_at, "comment", comment.html_url].join(","));
                await database.updateUser(comment.user.login, comment.updated_at, "comment", comment.html_url)
            }
        } catch (err) {
            debug(err);

            // try three times before giving up
            if (i++ >= 3) {
                throw err;
            }
        }
    }
    await database.setLastUpdated("comments", commentsLastUpdated.toISOString())
}

// DEBUG=inactive:* node scripts/comments.js --days 91
if (require.main === module) {
    const auth = getAuth();

    const {argv} = yargs.option("days", {
        alias: "d",
        description: "Days in the past to start from",
        global: true
    });

    main(auth, argv.days);
}

module.exports = main;
