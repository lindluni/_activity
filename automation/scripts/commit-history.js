const yargs = require("yargs");
const {getGitHubApp, getAuth} = require("../lib/github");
const utils = require("../lib/utils");
const database = require("../../lib/database")

async function main(auth, owner, days) {
    const commitsLastUpdated = new Date();
    const since = await utils.getSince(utils.TYPE_COMMITS, days)

    const app = getGitHubApp(auth, since);
    let processed = 0;
    for await (const {octokit, repository} of app.eachRepository.iterator()) {
        const client = octokit;
        console.log(`\n${processed++} repos processed`)
        try {
            console.log(`Retrieving branches for /repos/${owner}/${repository.name}/branches`)
            const branches = await client.paginate("GET /repos/{owner}/{repo}/branches", {
                owner: owner,
                repo: repository.name
            });
            console.log(`Retrieved ${branches.length} branches`)

            for (let branch of branches) {
                console.log(`Retrieving commits for /repos/${owner}/${repository.name}/${branch.name}/commits/`)
                const commits = await client.paginate("GET /repos/{owner}/{repo}/commits", {
                    owner: owner,
                    repo: repository.name,
                    sha: branch.name,
                    since: since,
                });

                console.log(`Retrieved ${commits.length} commmits`)
                for (let commit of commits) {
                    if (commit.author && commit.commit.author.date) {
                        console.log(`${commit.author.login},${commit.commit.author.date},commit,${commit.html_url}`);
                        await database.updateUser(commit.author.login, commit.commit.author.date, "commit", commit.html_url)
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
    await database.setLastUpdated("commits", commitsLastUpdated.toISOString())
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
