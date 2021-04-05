const debug = require("debug")("inactive:commits");
const yargs = require("yargs");
const {getGitHubApp, getAuth} = require("../lib/github");
const {getDateFromDaysAgo} = require("../lib/utils");

async function main(auth, owner, since) {
    const app = getGitHubApp(auth, since);
    for await (const {octokit, repository} of app.eachRepository.iterator()) {
        const repo = repository;
        const client = octokit;

        try {
            // Find commit contributions
            const branches = await getBranches({
                client,
                owner: owner,
                repo: repo.name,
            });

            for (let branch of branches) {
                const commits = await getCommitsForBranch({
                    client,
                    owner: owner,
                    repo: repo.name,
                    branch: branch.name,
                    since: since,
                });

                for (let commit of commits) {
                    if (commit.author && commit.commit.author.date) {
                        console.log(`${commit.author.login},${commit.commit.author.date},${commit.html_url},N/A`);
                    }
                }
            }
        } catch (error) {
            debug(error);
        }
    }
}

const getBranches = async ({client, owner, repo}) => {
    return await client.paginate("GET /repos/{owner}/{repo}/branches", {
        owner,
        repo,
    });
};

const getCommitsForBranch = async ({client, owner, repo, branch, since}) => {
    return await client.paginate("GET /repos/{owner}/{repo}/commits", {
        owner,
        repo,
        sha: branch,
        since,
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
