const github = require("../lib/github");
const database = require('../lib/database')


async function main() {
    const owner = 'department-of-veterans-affairs'
    const token = github.getAuth().token

    try {
        const client = await github.getOctokit(token)
        const members = await client.paginate('GET /orgs/{org}/members', {
            org: owner,
            role: 'member'
        });
        const expiredUsers = await database.getExpiredUsers(members)
        console.log(`${expiredUsers.length} users found with no activity in the last 90 days`)
        for (let expiredUser of expiredUsers) {
            console.log(`Sending notification for ${expiredUser.login}`)
            await client.rest.issues.create({
                owner: "department-of-veterans-affairs",
                repo: "github-inactive-user-mentions",
                title: `${expiredUser.login}`,
                body: formBody(expiredUser.login),
            });
            await sleep(500)
        }
    } catch (error) {
        console.log(error);
    }
}

function formBody(user) {
    return `
@${user}

VA policy states any account inactive over 90 days must be disabled – specifically AC-2(3).

Replying to this message will count as activity and maintain your access. **If you are replying via email, please reply-all and do not remove any email addresses.**

You will need to make sure you make a commit, create an issue or PR, or comment on something every 90 days to maintain access.

If there is no response to this issue/comment in 3 business days, acknowledging that you still require access to the VA org instance of GitHub – it will be removed.

If you still require access after you have been removed, [follow this guide to request access again](https://department-of-veterans-affairs.github.io/github-handbook/guides/onboarding/getting-access#step-3-access-to-the-department-of-veterans-affairs-organization).

For questions please respond here or email us at va-delivery@github.com`
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

main()
