db = db.getSiblingDB('buholex');
printjson(
  db.noticias.aggregate([
    { $match: { tipo: "juridica" } },
    { $group: { _id: "$especialidad", n: { $sum: 1 } } },
    { $sort: { n: -1 } }
  ]).toArray()
);
