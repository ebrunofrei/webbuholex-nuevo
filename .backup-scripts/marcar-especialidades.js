db = db.getSiblingDB('buholex');

const BASE = { tipo: "juridica", $or: [ { especialidad: { $exists: false } }, { especialidad: "" }, { especialidad: "general" } ] };

// Mueve 10 a penal
const penal = db.noticias.aggregate([
  { $match: BASE }, { $sample: { size: 10 } }, { $project: { _id: 1 } }
]).toArray();
penal.forEach(d => db.noticias.updateOne({ _id: d._id }, { $set: { especialidad: "penal" } }));

// Mueve 10 a civil
const civil = db.noticias.aggregate([
  { $match: BASE }, { $sample: { size: 10 } }, { $project: { _id: 1 } }
]).toArray();
civil.forEach(d => db.noticias.updateOne({ _id: d._id }, { $set: { especialidad: "civil" } }));

// Mueve 10 a laboral
const laboral = db.noticias.aggregate([
  { $match: BASE }, { $sample: { size: 10 } }, { $project: { _id: 1 } }
]).toArray();
laboral.forEach(d => db.noticias.updateOne({ _id: d._id }, { $set: { especialidad: "laboral" } }));

printjson({
  penal: penal.length, civil: civil.length, laboral: laboral.length
});
