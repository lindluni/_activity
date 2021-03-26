exports.getDateFromDaysAgo = function getDateFromDaysAgo(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);

  return d.toISOString();
};
