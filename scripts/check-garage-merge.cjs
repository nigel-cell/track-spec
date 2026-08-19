/**
 * Garage scrape --merge keeps local photos, tuneSpecs, and mastery.
 * Usage: node scripts/check-garage-merge.cjs
 */
const { mergeCar, mergeGarage, needsDetails } = require("./scrape-forzagarage.cjs");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const prev = {
  slug: "toyota-gr86-2022",
  cost: 100,
  pi: 500,
  image: "/garage/heros/TOY_GR86_22.webp",
  logoCode: "TOY",
  tuneSpecs: { redlineRpm: 7500, tireFront: "215/45R17" },
  mastery: { cells: ["1", "2"], perks: {} },
  stats: { SPD: 5 },
  topSpeedMph: 140,
};
const scraped = {
  slug: "toyota-gr86-2022",
  cost: 42000,
  pi: 612,
  image: "https://cdn.example/heros/TOY_GR86_22.webp",
  stats: { SPD: 5.5, HND: 6.1 },
  topSpeedMph: 0,
  powerHp: 228,
};

const merged = mergeCar(prev, scraped);
if (merged.cost !== 42000) fail(`cost ${merged.cost}`);
if (merged.pi !== 612) fail(`pi ${merged.pi}`);
if (merged.image !== "/garage/heros/TOY_GR86_22.webp") fail(`image overwritten: ${merged.image}`);
if (merged.tuneSpecs?.redlineRpm !== 7500) fail("lost tuneSpecs");
if (merged.mastery?.cells?.length !== 2) fail("lost mastery");
if (merged.logoCode !== "TOY") fail("lost logoCode");
if (merged.stats.HND !== 6.1) fail("stats not updated");
if (merged.topSpeedMph !== 140) fail(`zero speed wiped real value: ${merged.topSpeedMph}`);
if (needsDetails(prev)) fail("complete car should not need details");
if (!needsDetails(null)) fail("new car needs details");
if (!needsDetails({ slug: "new" })) fail("bare car needs details");

const garage = mergeGarage({ cars: [prev] }, [
  scraped,
  { slug: "honda-civic-2026", make: "Honda", model: "Civic", cost: 1 },
]);
if (garage.added !== 1 || garage.kept !== 1) fail(`added/kept ${garage.added}/${garage.kept}`);
if (garage.dropped !== 0) fail(`dropped ${garage.dropped}`);

console.log("check-garage-merge: ok");
