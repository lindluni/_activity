const debug = require("debug")("inactive:audit");
const yargs = require("yargs");
const { getAuth, getOctokit } = require("../lib/github");
const { getDateFromDaysAgo } = require("../lib/utils");

/**
 * Iterate through all repositories where our GitHub App is installed, and
 * print out all issue comments created since a given time.
 */
async function main(auth, owner, since) {
  const octokit = getOctokit(auth.token);

  debug(`fetching audit log for ${owner} since ${since}`);

  const AUDIT_QUERY = `query($owner: String!, $per_page: Int = 100, $auditQuery: String!, $after: String) {
    organization(login: $owner) {
      auditLog(
        first: $per_page
        after: $after
        query: $auditQuery
      ) {
        nodes {
          ... on OrgAddMemberAuditEntry {
            __typename
            createdAt
            userLogin
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  }`;

  const query = `created:>=${since} action:org.add_member`;

  let cursor = null;
  let hasNextPage = false;

  do {
    let i = 0;

    try {
      debug(`running graphql query`, AUDIT_QUERY, owner, `Query: ${query}`, `Cursor: ${cursor}`);
      const response = await octokit.graphql(AUDIT_QUERY, {
        owner,
        auditQuery: query,
        after: cursor,
      });

      debug(response);

      for (const audit of response.organization.auditLog.nodes) {
        const { __typename, createdAt, userLogin } = audit;
        console.log([userLogin, createdAt, "audit", __typename].join(","));
      }

      cursor = response.organization.auditLog.pageInfo.endCursor;
      hasNextPage = response.organization.auditLog.pageInfo.hasNextPage;
    } catch (err) {
      debug(err);

      // try three times before giving up
      if (i++ >= 3) {
        throw err;
      }
    }
  } while (hasNextPage);
}

// DEBUG=inactive:* node scripts/audit.js --organization department-of-veterans-affairs --installation 15125914 --days 8
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
    });

  const { days, organization } = argv;
  const since = getDateFromDaysAgo(days);

  main(auth, organization, since);
}

module.exports = main;
