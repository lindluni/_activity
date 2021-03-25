const { throttling } = require("@octokit/plugin-throttling");
const { retry } = require("@octokit/plugin-retry");
const { Octokit } = require("@octokit/rest");
const { App } = require("@octokit/app");
const { paginateRest, composePaginateRest } = require("@octokit/plugin-paginate-rest");
const fs = require("fs");
const { demandOption } = require("yargs");
const csv = require("csvtojson");
const jsonexport = require("jsonexport");

const MyOctokit = Octokit.plugin(throttling).plugin(retry).plugin(paginateRest);
const membersFile = "activity.csv";

async function main() {
    const argv = require("yargs")
        .option("client-secret", {
            alias: "c",
            description: "Client Secret",
            global: true,
            demandOption: true,
        })
        .option("app-id", {
            alias: "a",
            description: "App Id",
            global: true,
            demandOption: true,
        })
        .option("client-id", {
            alias: "i",
            description: "Client Id",
            global: true,
            demandOption: true,
        })
        .option("since", {
            alias: "s",
            description: "Period of time with which to look for comments",
            global: true,
            demandOption: true,
        })
        .options("owner", {
            alias: "o",
            description: "Owner or Organization with the repos",
            global: true,
            demandOption: true,
        }).argv;

    const app = new App({
        appId: argv.appId,
        privateKey: process.env.INACTIVE_PRIVATE_KEY,
        oauth: {
            clientId: argv.clientId,
            clientSecret: argv.clientSecret,
        },
        Octokit: MyOctokit.defaults({
            throttle: {
                onRateLimit: (retryAfter, options) => {
                    console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
                    console.warn(`Retrying after ${retryAfter} seconds! Retry Count: ${options.request.retryCount}`);
                    return true;
                },
                onAbuseLimit: (retryAfter, options) => {
                    console.warn(`Abuse detected for request ${options.method} ${options.url}`);
                },
            },
        }),
    });

    // const client = await app.getInstallationOctokit(284832519);

    // read members from file
    let members;

    if (fs.existsSync(membersFile)) {
        members = await csv().fromFile(membersFile);
    } else {
        members = [];
    }
    console.log(`Members Length: ${members.length}`);

    const membersDict = {};
    for (let member of members) {
        membersDict[member.login] = member;
    }
    let i = 0;
    for await (const { octokit, repository } of app.eachRepository.iterator()) {
        if (i++ > 100) {
            break;
        }
        const repo = repository;
        const client = octokit;

        let logCommit;
        try {
            // Find commit contributions
            const branches = await getBranches({
                client,
                owner: argv.owner,
                repo: repo.name,
            });
            for (let branch of branches) {
                const commits = await getCommitsForBranch({
                    client,
                    owner: argv.owner,
                    repo: repo.name,
                    branch: branch.name,
                    since: argv.since,
                });
                for (let commit of commits) {
                    if (commit.author && commit.commit.author.date) {
                        let login = commit.author.login;
                        logCommit = commit;
                        if (login in membersDict) {
                            membersDict[login].date = commit.commit.author.date;
                        } else {
                            member = {
                                login: login,
                                date: commit.commit.author.date,
                                url: commit.html_url,
                            };
                            membersDict[login] = member;
                            members.push(member);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
            console.error(JSON.stringify(logCommit));
        }
    }

    const csvFile = await jsonexport(members, { fillGaps: true });
    fs.writeFileSync(membersFile, csvFile);
}

const getBranches = async ({ client, owner, repo }) => {
    return await client.paginate("GET /repos/{owner}/{repo}/branches", {
        owner,
        repo,
    });
};

const getCommitsForBranch = async ({ client, owner, repo, branch, since }) => {
    return await client.paginate("GET /repos/{owner}/{repo}/commits", {
        owner,
        repo,
        sha: branch,
        since,
    });
};

if (require.main == module) {
    main();
}

module.exports = main;
