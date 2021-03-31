const csv = require("csvtojson");
const { getDateFromDaysAgo } = require("../lib/utils");
const MILLISECONDS_IN_DAY = 1000 * 60 * 24;

const main = async () => {
    let activeMembers = await csv().fromFile(process.env.ACTIVITY_FILE);

    activeMembers = activeMembers.filter((member) => {
        let diff = new Date() - new Date(member.timestamp);
        if (Math.floor(diff / MILLISECONDS_IN_DAY) > 90) {
            return false;
        }

        return true;
    });

    for (let member of activeMembers) {
        console.log(`${member.login}, ${member.timestamp}, ${member.event}, ${member.detail}`);
    }
};

main();
