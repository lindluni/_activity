const debug = require("debug")("inactive:audit");
const yargs = require("yargs");
const {getAuth, getOctokit} = require("../lib/github");
const utils = require("../lib/utils");
const database = require("../../lib/database")

function hasAnyContributions({contributionsCollection: m}) {
    return m.hasAnyContributions || m.hasAnyRestrictedContributions;
}

/**
 * Iterate through all repositories where our GitHub App is installed, and
 * print out all issue comments created since a given time.
 */
async function main(auth, owner, organizationID, days) {
    const octokit = getOctokit(auth.token);
    const since = await utils.getSince(utils.TYPE_CONTRIBUTIONS, days)

    debug(`fetching contributions log for ${owner} and ${organizationID} since ${since}`);

    const CONTRIBUTIONS_QUERY = `query(
    $org: String!
    $org_id: ID
    $per_page: Int = 8
    $from: DateTime
    $to: DateTime
    $after: String
  ) {
    organization(login: $org) {
      membersWithRole(first: $per_page, after: $after) {
        nodes {
          login
          contributionsCollection(organizationID: $org_id, from: $from, to: $to) {
            hasAnyContributions
            hasAnyRestrictedContributions
            contributionCalendar {
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }`;

    const contributionsLastUpdated = new Date();

    let cursor = null;
    let hasNextPage = false;
    do {
        let i = 0;

        try {
            const response = await octokit.graphql(CONTRIBUTIONS_QUERY, {
                org: owner,
                org_id: organizationID,
                after: cursor,
                from: since,
            });

            for (const member of response.organization.membersWithRole.nodes) {
                if (hasAnyContributions(member)) {
                    let lastUpdated = new Date(-2000000)
                    for (let week of member.contributionsCollection.contributionCalendar.weeks) {
                        for (let day of week.contributionDays) {
                            if (day.contributionCount > 0) {
                                const date = new Date(day.date)
                                if (date > lastUpdated) {
                                    lastUpdated = date
                                }
                            }
                        }
                    }
                    console.log([member.login, lastUpdated.toISOString(), "contribution"].join(","));
                    await database.updateUser(member.login, lastUpdated.toISOString(), "contribution")
                }
            }

            cursor = response.organization.membersWithRole.pageInfo.endCursor;
            hasNextPage = response.organization.membersWithRole.pageInfo.hasNextPage;
        } catch (err) {
            debug(err);

            // try three times before giving up
            if (i++ >= 3) {
                throw err;
            }
        }
    } while (hasNextPage);
    await database.setLastUpdated("contributions", contributionsLastUpdated.toISOString())
}

// DEBUG=inactive:* node scripts/contributions.js --organization department-of-veterans-affairs --organizationId MDEyOk9yZ2FuaXphdGlvbjU0MjE1NjM= --days 8
if (require.main === module) {
    const auth = getAuth();

    const {argv} = yargs
        .option("days", {
            alias: "d",
            description: "Days in the past to start from",
            global: true
        })
        .option("organization", {
            alias: "o",
            description: "GitHub organization to pull audit log from",
            global: true,
            demandOption: true,
        })
        .option("organization-id", {
            alias: "i",
            description: "GitHub organization GraphQL node id",
            global: true,
            demandOption: true,
        });

    main(auth, argv.organization, argv.organizationID, argv.days);
}

module.exports = main;
