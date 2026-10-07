const roles = ["GK", "DEF", "MID", "FWD"];
// Shared with saveSchema so the app can never hand storage more than it accepts.
const matchLimit = 50;
const formations = {
  "4-3-3": [4, 3, 3],
  "4-4-2": [4, 4, 2],
  "4-2-3-1": [4, 5, 1],
  "3-5-2": [3, 5, 2],
  "5-3-2": [5, 3, 2],
};
const emptySquad = () => ({
  formation: "4-3-3",
  ids: Array(11).fill(null),
  tactics: { tempo: 50, press: 50, line: 50 },
});
const freshSave = () => ({
  version: 3,
  club: null,
  squad: emptySquad(),
  savedIds: [],
  matches: [],
  league: null,
});
function slotRoles(f) {
  const [d, m, a] = formations[f];
  return [
    "GK",
    ...Array(d).fill("DEF"),
    ...Array(m).fill("MID"),
    ...Array(a).fill("FWD"),
  ];
}
export { emptySquad, formations, freshSave, matchLimit, roles, slotRoles };
