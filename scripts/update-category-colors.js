import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:P93QBHIywFOImydjBtGspqyn7kYoGBQXwQKbZfgMNME=@192.168.1.63:5432/postgres";

async function updateColors() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    // Update colors for default categories
    const updates = [
      { name: 'Voorgerecht', color: '#f97316' }, // orange
      { name: 'Hoofdgerecht', color: '#ef4444' }, // red
      { name: 'Dessert', color: '#ec4899' }, // pink
      { name: 'Bijgerecht', color: '#22c55e' }, // green
    ];

    for (const { name, color } of updates) {
      await client.query(
        'UPDATE categories SET color = $1 WHERE name = $2',
        [color, name]
      );
      console.log(`Updated ${name} to ${color}`);
    }

    console.log('All category colors updated successfully!');

  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateColors();
