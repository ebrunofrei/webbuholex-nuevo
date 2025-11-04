// scripts/backfill-especialidad.js
import 'dotenv/config';
import mongoose from 'mongoose';

// --- Lee variables con tolerancia a nombres distintos ---
const uri =
  process.env.MONGODB_URI ||
  process.env.MONGODB_ATLAS_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL; // último recurso

const dbName =
  process.env.MONGODB_DB ||
  process.env.DB_NAME ||
  'buholex';

if (!uri) {
  console.error('❌ No se encontró la cadena de conexión a MongoDB.');
  console.error('   Define alguna de estas vars en tu .env:');
  console.error('   - MONGODB_URI (recomendado)');
  console.error('   - MONGODB_ATLAS_URI / MONGO_URI / DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Usando Mongo URI (oculta):', uri.slice(0, 20) + '…');
console.log('🗄️  DB:', dbName);

// --- Reglas simples de clasificación (ajústalas a gusto) ---
const CATS = [
  { key: 'penal', kw: [/penal/i, /delito/i, /prisión/i, /fiscal/i, /\bPNP\b/i] },
  { key: 'civil', kw: [/civil/i, /contrato/i, /daño moral/i, /obligación/i] },
  { key: 'laboral', kw: [/laboral/i, /despido/i, /sunafil/i, /beneficios/i] },
  { key: 'constitucional', kw: [/constitucional/i, /\bTC\b/i, /amparo/i, /hábeas/i] },
  { key: 'familiar', kw: [/familiar/i, /alimentos/i, /tenencia/i, /custodia/i] },
  { key: 'administrativo', kw: [/administrativo/i, /OSCE/i, /sanción/i, /TUPA/i] },
  { key: 'procesal', kw: [/procesal/i, /casación/i, /precedente/i, /nulidad/i] },
];

function clasificar(n) {
  const texto = [n.titulo, n.resumen, n.contenido, n.fuente]
    .filter(Boolean)
    .join(' ');
  for (const cat of CATS) {
    if (cat.kw.some(rx => rx.test(texto))) return cat.key;
  }
  // heurística por fuente (opcional)
  if (/suprema|tribunal|poder judicial|constitucional/i.test(texto)) return 'constitucional';
  return null;
}

async function main() {
  await mongoose.connect(uri, { dbName });
  const col = mongoose.connection.collection('noticias');

  // Solo jurídicas sin especialidad
  const cursor = col.find({
    tipo: 'juridica',
    $or: [{ especialidad: { $exists: false } }, { especialidad: '' }],
  });

  let ok = 0, skip = 0, seen = 0;
  while (await cursor.hasNext()) {
    const n = await cursor.next();
    seen++;

    const esp = clasificar(n);
    if (!esp) { skip++; continue; }

    await col.updateOne({ _id: n._id }, { $set: { especialidad: esp } });
    ok++;
  }

  // Conteo por especialidad para verificar
  const agg = await col.aggregate([
    { $match: { tipo: 'juridica', especialidad: { $exists: true, $ne: '' } } },
    { $group: { _id: '$especialidad', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();

  console.log('✅ Backfill terminado.');
  console.log('   Vistas:', seen, ' | Actualizadas:', ok, ' | Sin match:', skip);
  console.table(agg);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error en backfill:', err?.message || err);
  process.exit(1);
});
