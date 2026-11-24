import { db, pool } from './client.js';
import { seedCurriculum } from './seed.js';
import { grade4Math } from '../curriculum/grade4-math.js';

try {
  await seedCurriculum(db, grade4Math);
  console.log(`Seeded "${grade4Math.subject.slug}": ${grade4Math.topics.length} topics`);
} finally {
  await pool.end();
}
