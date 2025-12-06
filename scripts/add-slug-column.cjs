const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addSlugColumn() {
  try {
    console.log('Подключение к базе данных...');

    // Проверяем текущую схему
    console.log('\nТекущая схема таблицы products:');
    const schema = await turso.execute('PRAGMA table_info(products)');
    schema.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.type}${row.notnull ? ' NOT NULL' : ''}${row.pk ? ' PRIMARY KEY' : ''}`);
    });

    const hasSlug = schema.rows.some(row => row.name === 'slug');

    if (hasSlug) {
      console.log('\n✓ Поле slug уже существует в таблице');
    } else {
      console.log('\n⚠ Поле slug отсутствует, добавляем...');

      // Добавляем поле slug
      await turso.execute('ALTER TABLE products ADD COLUMN slug TEXT');
      console.log('✓ Поле slug добавлено');
    }

    // Создаём индекс если его нет
    console.log('\nСоздаём индекс для поля slug...');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_slug ON products(slug)');
    console.log('✓ Индекс создан/проверен');

    // Проверяем финальную схему
    console.log('\nФинальная схема таблицы products:');
    const finalSchema = await turso.execute('PRAGMA table_info(products)');
    finalSchema.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.type}${row.notnull ? ' NOT NULL' : ''}${row.pk ? ' PRIMARY KEY' : ''}`);
    });

    // Статистика
    const stats = await turso.execute('SELECT COUNT(*) as total, COUNT(slug) as with_slug FROM products');
    console.log('\nСтатистика:');
    console.log(`  Всего товаров: ${stats.rows[0].total}`);
    console.log(`  С заполненным slug: ${stats.rows[0].with_slug}`);
    console.log(`  Без slug: ${stats.rows[0].total - stats.rows[0].with_slug}`);

    console.log('\n✅ Готово! Поле slug успешно добавлено.');
    console.log('Теперь можно запустить миграцию: curl https://creativestuff.vercel.app/api/migrate-slugs');

  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

addSlugColumn();
