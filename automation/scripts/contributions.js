const debug = require("debug")("inactive:audit");
const yargs = require("yargs");
const { getAuth, getOctokit } = require("../lib/github");
const { getDateFromDaysAgo } = require("../lib/utils");

function hasAnyContributions({ contributionsCollection: m }) {
  return m.hasAnyContributions || m.hasAnyRestrictedContributions;
}

/**
 * Iterate through all repositories where our GitHub App is installed, and
 * print out all issue comments created since a given time.
 */
async function main(auth, owner, organizationID, since) {
  const octokit = getOctokit(auth.token);

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
          }
        }
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }`;

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
          console.log([member.login, new Date().toISOString(), "contribution", "N/A"].join(","));
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
}

// DEBUG=inactive:* node scripts/contributions.js --organization department-of-veterans-affairs --organizationId MDEyOk9yZ2FuaXphdGlvbjU0MjE1NjM= --days 8
if (require.main === module) {
  const auth = getAuth();

  const { argv } = yargs
    .option("days", {
      alias: "d",
      description: "Days in the past to start from",
      global: true,
      demandOption: true,
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

  const { days, organization, organizationID } = argv;
  const since = getDateFromDaysAgo(days);

  main(auth, organization, organizationID, since);
}

module.exports = main;
