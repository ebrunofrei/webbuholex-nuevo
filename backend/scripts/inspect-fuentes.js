// backend/scripts/inspect-fuentes.js
// 🦉 Inspección rápida de fuentes (distinct y ranking)

import 'dotenv/config';
import mongoose from 'mongoose';
import Noticia from '../models/Noticia.js';

function withIPv4(uri = '') {
  if (!uri) return uri;
  return uri.includes('family=4') ? uri : (uri + (uri.includes('?') ? '&' : '?') + 'family=4');
}

async function main() {
  const uri = withIPv4(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const dbName = process.env.MONGODB_DBNAME || process.env.MONGO_DBNAME || process.env.DB_NAME || undefined;

  if (!uri) {
    console.error('❌ Falta MONGODB_URI en .env');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName });
  console.log('✅ Conectado a MongoDB');

  const fuentes = await Noticia.distinct('fuente');
  console.log(`\n🧾 Fuentes distintas (${fuentes.length}):`);
  console.log(fuentes.sort((a,b)=>String(a).localeCompare(String(b),'es')));

  const top = await Noticia.aggregate([
    { $group: { _id: { $toLower: { $ifNull: ['$fuente','(vacío)'] } }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  console.log('\n🏆 Top 50 fuentes por cantidad:');
  top.forEach((t, i) => console.log(`${String(i+1).padStart(2,' ')}. ${t._id} → ${t.count}`));

  // Guardar a archivo
  const fs = await import('node:fs');
  fs.default.mkdirSync(new URL('../tmp/', import.meta.url), { recursive: true });
  fs.default.writeFileSync(
    new URL('../tmp/fuentes.json', import.meta.url),
    JSON.stringify({ fuentes, top }, null, 2),
    'utf8'
  );
  console.log('\n💾 Guardado en backend/tmp/fuentes.json');

  await mongoose.disconnect();
  console.log('\n✅ Listo.');
}

main().catch(async (err) => {
  console.error('❌ Error:', err?.message || err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
