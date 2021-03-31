const csv = require("csvtojson");

const debug = require("debug")("inactive:report");
const yargs = require("yargs");
const { getGitHubApp, getAuth } = require("../lib/github");
const { getDateFromDaysAgo } = require("../lib/utils");

async function main(auth, owner) {
    const app = getGitHubApp(auth);
    try {
        for await (const { octokit, installation } of app.eachInstallation.iterator()) {
            if (installation.target_type === "Organization" && installation.account.login === owner) {
                const orgMembers = await getMembers({ client: octokit, org: installation.account.login });
                let members = orgMembers.map((member) => member.login.toLowerCase());
                let activeMembers = (await csv().fromFile(process.env.ACTIVITY_FILE)).map((member) =>
                    member.login.toLowerCase()
                );
                let inactiveMembers = members.filter((member) => activeMembers.indexOf(member) <= -1);
                for (const user of inactiveMembers) {
                    await app.octokit.issues.create({
                        owner: "department-of-veterans-affairs",
                        repo: "github-inactive-user-mentions",
                        title: user.node.login,
                        body: `@${user.node.login}
    --
    VA policy states any account inactive over 90 days must be disabled – specifically AC-2(3).
    Replying to this message will count as activity and maintain your access. **If you are replying via email, please reply-all and do not remove any email addresses.**
    You will need to make sure you make a commit, create an issue or PR, or comment on something every 90 days to maintain access.
    If there is no response to this issue/comment in 3 business days, acknowledging that you still require access to the VA org instance of GitHub – it will be removed.
    If you still require access after you have been removed, [follow this guide to request access again](https://department-of-veterans-affairs.github.io/github-handbook/guides/onboarding/getting-access#step-3-access-to-the-department-of-veterans-affairs-organization).
    For questions please respond here or email us at va-delivery@github.com
    `,
                    });
                }
            }
        }
    } catch (error) {
        console.log(error);
        debug(error);
    }
}

const getMembers = async ({ client, org }) => {
    return await client.paginate("GET /orgs/{org}/members", {
        org,
    });
};

if (require.main === module) {
    const auth = getAuth();

    const { argv } = yargs.options("owner", {
        alias: "o",
        description: "Owner or Organization with the repos",
        global: true,
        demandOption: true,
    });

    const { owner } = argv;

    main(auth, owner);
}

module.exports = main;
