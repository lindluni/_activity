const yargs = require("yargs");
const github = require("../lib/github");
const database = require('../lib/database')

async function main(token, owner, repo) {
    try {
        const client = await github.getOctokit(token)
        const members = await client.paginate('GET /orgs/{org}/members', {
            org: owner,
            role: 'member',
            per_page: 100
        });
        const outsideCollaborators = await client.paginate('GET /orgs/{org}/outside_collaborators', {
            org: owner,
            per_page: 100
        })
        const expiredUsers = await database.getExpiredUsers(members)
        const issues = await listIssues(client, owner, repo)
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() - 3)
        issue :
            for (let issue of issues) {
                const username = issue.title
                const issueCreated = new Date(issue.created_at)
                if (issueCreated > expirationDate) {
                    console.log(`Issue active, waiting to remove user: ${username}`)
                    continue
                }
                const userExpired = await expiredUser(expiredUsers, username)
                if (issue.comments > 0) {
                    const comments = await client.issues.listComments({
                        owner: owner,
                        repo: repo,
                        issue_number: issue.number,
                    });
                    for (let comment of comments.data) {
                        if (comment.user.login === username) {
                            console.log(`Preserving user due to comment: ${username}`)
                            await createComment(client, owner, repo, issue.number, preserveAccountComment(username))
                            await addLabels(client, owner, repo, issue.number, ["preserved"])
                            await closeIssue(client, owner, repo, issue.number)
                            continue issue
                        }
                    }
                }
                if (userExpired) {
                    console.log(`Removing user: ${username}`)
                    const isCollaborator = await isOutsideCollaborator(outsideCollaborators, username)
                    if (isCollaborator) {
                        await removeCollaboratorFromOrg(client, owner, username);
                    } else {
                        await removeUserFromOrg(client, owner, username);
                    }
                    await createComment(client, owner, repo, issue.number, removeAccountComment(username))
                    await addLabels(client, owner, repo, issue.number, ["removed"]);
                    await closeIssue(client, owner, repo, issue.number);
                } else {
                    console.log(`Preserving user due to new activity: ${username}`)
                    await createComment(client, owner, repo, issue.number, preserveAccountComment(username))
                    await addLabels(client, owner, repo, issue.number, ["preserved"])
                    await closeIssue(client, owner, repo, issue.number)
                }
            }
    } catch (error) {
        console.log(error);
    }
}

const listIssues = async (client, owner, repo) => {
    try {
        const options = client.issues.listForRepo.endpoint.merge({
            owner: owner,
            repo: repo,
            state: "open",
            per_page: 100,
            creator: "va-devops-bot",
            sort: "created",
            direction: "asc",
        })
        return await client.paginate(options)
    } catch (error) {
        throw error
    }
}

const expiredUser = async (users, login) => {
    try {
        if (login === 'va-devops-bot') {
            return false
        }
        for (let user of users) {
            if (user.login === login) {
                return user
            }
        }
        return undefined
    } catch (error) {
        throw  error
    }
}

const preserveAccountComment = (user) => {
    return `@${user} Thank you, I will mark your account active.  Please remember this 90 day audit will be part of the continuous monitoring for GitHub, so please maintain activity of one of the following to avoid be pulled as inactive again.
1. Commits
2. Created issue(s)
3. Created PR(s)
4. Commented on issues 
5. Commented on PR’s
The reports are run bi-weekly.`;
}


const removeAccountComment = (user) => {
    return `@${user} you are being removed from the Department of Veterans Affairs organization due to inactivity.  If you still require access, please follow the steps outlined in your [GitHub Handbook](https://department-of-veterans-affairs.github.io/github-handbook/guides/onboarding/getting-access) or send an email to va-delivery@github.com`;
}

const removeUserFromOrg = async (client, owner, login) => {
    try {
        await client.orgs.removeMembershipForUser({
            org: owner,
            username: login,
        })
    } catch (error) {
        console.error(`Error removing user`, login);
        throw error
    }
}

const removeCollaboratorFromOrg = async (client, owner, login) => {
    try {
        await client.orgs.removeOutsideCollaborator({
            org: owner,
            username: login,
        });
    } catch (error) {
        console.error(`Error removing collaborator`, login)
        throw error
    }
}

const createComment = async (client, owner, repo, number, comment) => {
    try {
        await client.issues.createComment({
            owner: owner,
            repo: repo,
            issue_number: number,
            body: comment,
        });
    } catch (error) {
        throw error
    }
}

const closeIssue = async (client, owner, repo, number) => {
    try {
        await client.issues.update({
            owner: owner,
            repo: repo,
            issue_number: number,
            state: "closed",
        });
    } catch (error) {
        throw error
    }
}

const addLabels = async (client, owner, repo, number, labels) => {
    try {
        await client.issues.addLabels({
            owner: owner,
            repo: repo,
            issue_number: number,
            labels: labels,
        });
    } catch (error) {
        throw error
    }
}

const isOutsideCollaborator = async (collaborators, login) => {
    for (let collaborator of collaborators) {
        if (collaborator.login === login) {
            return true
        }
    }
    return false
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

if (require.main === module) {
    const auth = github.getAuth();
    main(auth.token, 'department-of-veterans-affairs', 'github-inactive-user-mentions');
}

module.exports = main;
