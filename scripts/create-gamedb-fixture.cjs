/**
 * Tiny decrypted GameDB-shaped SQLite for extractor smoke tests.
 * Usage: node scripts/create-gamedb-fixture.cjs
 */

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const out = path.join(__dirname, "fixtures", "gamedb-sample.slt");
fs.mkdirSync(path.dirname(out), { recursive: true });
if (fs.existsSync(out)) fs.unlinkSync(out);

const db = new DatabaseSync(out);

db.exec(`
  CREATE TABLE Data_Car (
    ID INTEGER PRIMARY KEY,
    MediaName TEXT,
    Make TEXT,
    Model TEXT,
    Year INTEGER,
    Weight REAL,
    WeightDistribution REAL,
    CarBodyID INTEGER
  );

  CREATE TABLE List_UpgradeSpringsRace (
    CarID INTEGER,
    Level INTEGER,
    SpringStiffnessFrontMin REAL,
    SpringStiffnessFrontMax REAL,
    SpringStiffnessRearMin REAL,
    SpringStiffnessRearMax REAL,
    RideHeightFrontMin REAL,
    RideHeightFrontMax REAL,
    RideHeightRearMin REAL,
    RideHeightRearMax REAL
  );

  CREATE TABLE List_UpgradeAeroRace (
    CarID INTEGER,
    Level INTEGER,
    AeroDownforceFrontMin REAL,
    AeroDownforceFrontMax REAL,
    AeroDownforceRearMin REAL,
    AeroDownforceRearMax REAL
  );
`);

const insertCar = db.prepare(`
  INSERT INTO Data_Car (ID, MediaName, Make, Model, Year, Weight, WeightDistribution, CarBodyID)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSpring = db.prepare(`
  INSERT INTO List_UpgradeSpringsRace
  (CarID, Level, SpringStiffnessFrontMin, SpringStiffnessFrontMax,
   SpringStiffnessRearMin, SpringStiffnessRearMax,
   RideHeightFrontMin, RideHeightFrontMax, RideHeightRearMin, RideHeightRearMax)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertAero = db.prepare(`
  INSERT INTO List_UpgradeAeroRace
  (CarID, Level, AeroDownforceFrontMin, AeroDownforceFrontMax,
   AeroDownforceRearMin, AeroDownforceRearMax)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertCar.run(101, "TOY_Supra_20", "Toyota", "GR Supra", 2020, 3400, 53, 1);
insertCar.run(102, "HON_CivicTypeR_23", "Honda", "Civic Type R", 2023, 3180, 62, 2);

insertSpring.run(101, 1, 200, 900, 180, 850, 16, 24, 16, 24);
insertSpring.run(101, 3, 280, 1450, 260, 1380, 15, 22, 15, 22);
insertSpring.run(102, 3, 250, 1200, 230, 1150, 15, 23, 15, 23);

insertAero.run(101, 3, 0, 45, 0, 80);
insertAero.run(102, 3, 0, 30, 0, 55);

db.close();
console.log(`Wrote fixture → ${out}`);
