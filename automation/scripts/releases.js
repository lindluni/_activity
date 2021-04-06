const debug = require("debug")("inactive:releases");
const yargs = require("yargs");
const {getGitHubApp, getAuth} = require("../lib/github");
const {getDateFromDaysAgo} = require("../lib/utils");
const database = require("../lib/database")

async function main(auth, owner, since) {
    const releasesLastUpdate = new Date();
    const app = getGitHubApp(auth, since);
    for await (const {octokit, repository} of app.eachRepository.iterator()) {
        const repo = repository;
        const client = octokit;

        try {
            const releases = await getReleases({
                client,
                owner: owner,
                repo: repo.name,
            });

            for (let release of releases) {
                if (new Date(release.published_at) < new Date(since)) {
                    break;
                }
                console.log(`${login},${release.published_at},release,N/A`);
                await database.updateUser(login, release.published_at, "release", release.html_url)
            }
        } catch (error) {
            debug(error);
        }
    }
    await database.setLastUpdated("releases", releasesLastUpdate.toISOString())
}

const getReleases = async ({client, owner, repo}) => {
    return await client.paginate("GET /repos/{owner}/{repo}/releases", {
        owner,
        repo,
    });
};

if (require.main === module) {
    const auth = getAuth();

    const {argv} = yargs
        .option("days", {
            alias: "d",
            description: "Days in the past to start from",
            global: true,
            demandOption: true,
        })
        .options("owner", {
            alias: "o",
            description: "Owner or Organization with the repos",
            global: true,
            demandOption: true,
        });

    const {days, owner} = argv;
    const since = getDateFromDaysAgo(days);

    main(auth, owner, since);
}

module.exports = main;
