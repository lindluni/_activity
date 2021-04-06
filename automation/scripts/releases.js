const debug = require("debug")("inactive:releases");
const yargs = require("yargs");
const {getGitHubApp, getAuth} = require("../lib/github");
const utils = require("../lib/utils");
const database = require("../lib/database")

async function main(auth, owner, days) {
    const releasesLastUpdate = new Date();
    const since = await utils.getSince(utils.TYPE_RELEASES, days)

    const app = getGitHubApp(auth, since);
    for await (const {octokit, repository} of app.eachRepository.iterator()) {
        try {
            const releases = await octokit.paginate("GET /repos/{owner}/{repo}/releases", {
                owner: owner,
                repo: repository.name,
            });

            for (let release of releases) {
                if (new Date(release.published_at) < new Date(since)) {
                    break;
                }
                console.log(`${release.author.login},${release.published_at},release,${release.html_url}`);
                await database.updateUser(release.author.login, release.published_at, "release", release.html_url)
            }
        } catch (error) {
            debug(error);
        }
    }
    await database.setLastUpdated("releases", releasesLastUpdate.toISOString())
}

if (require.main === module) {
    const auth = getAuth();
    const {argv} = yargs
        .option("days", {
            alias: "d",
            description: "Days in the past to start from",
            global: true
        })
        .options("owner", {
            alias: "o",
            description: "Owner or Organization with the repos",
            global: true,
            demandOption: true,
        });

    main(auth, argv.owner, argv.days);
}

module.exports = main;
