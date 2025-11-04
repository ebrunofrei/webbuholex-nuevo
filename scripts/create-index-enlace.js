db = db.getSiblingDB('buholex');

// Borra el índice viejo si existe (idempotente)
try { db.noticias.dropIndex('enlace_unique_nonempty'); } catch(e) {}

// Índice único PARCIAL: solo strings no vacíos
db.noticias.createIndex(
  { enlace: 1 },
  {
    name: 'enlace_unique_nonempty',
    unique: true,
    partialFilterExpression: {
      enlace: { $exists: true, $type: 'string', $gt: '' }
    }
  }
);
