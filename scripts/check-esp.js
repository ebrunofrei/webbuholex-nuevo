db = db.getSiblingDB("buholex");

print("distinct especialidad (juridica):");
printjson(db.noticias.distinct("especialidad", { tipo: "juridica" }));

print("count penal:");
printjson(db.noticias.countDocuments({ tipo: "juridica", especialidad: { $regex: /^penal$/i } }));

print("sample penal (3):");
printjson(
  db.noticias.find(
    { tipo: "juridica", especialidad: { $regex: /^penal$/i } },
    { titulo: 1, proveedor: 1, especialidad: 1, fecha: 1 }
  ).limit(3).toArray()
);
