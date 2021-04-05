const debug = require("debug")("inactive:releases");
const yargs = require("yargs");
const {getGitHubApp, getAuth} = require("../lib/github");
const {getDateFromDaysAgo} = require("../lib/utils");

async function main(auth, owner, since) {
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
                let login = release.author.login;

                console.log(`${login},${release.published_at},release,N/A`);
            }
        } catch (error) {
            debug(error);
        }
    }
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
