import type { APIRoute } from 'astro';
import { turso } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    console.log('Проверка схемы базы данных...');

    // Проверяем текущую схему
    const schema = await turso.execute('PRAGMA table_info(products)');
    const hasSlug = schema.rows.some(row => row.name === 'slug');

    const results = {
      before: schema.rows.map(row => ({
        name: row.name,
        type: row.type,
        notnull: row.notnull ? 1 : 0,
        pk: row.pk
      })),
      actions: [] as string[],
      after: [] as any[]
    };

    if (hasSlug) {
      results.actions.push('✓ Поле slug уже существует');
    } else {
      // Добавляем поле slug
      await turso.execute('ALTER TABLE products ADD COLUMN slug TEXT');
      results.actions.push('✓ Поле slug успешно добавлено');
    }

    // Создаём индекс если его нет
    try {
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_slug ON products(slug)');
      results.actions.push('✓ Индекс idx_slug создан/проверен');
    } catch (e) {
      results.actions.push('⚠ Ошибка создания индекса (возможно уже существует)');
    }

    // Проверяем финальную схему
    const finalSchema = await turso.execute('PRAGMA table_info(products)');
    results.after = finalSchema.rows.map(row => ({
      name: row.name,
      type: row.type,
      notnull: row.notnull ? 1 : 0,
      pk: row.pk
    }));

    // Статистика
    const stats = await turso.execute('SELECT COUNT(*) as total, COUNT(slug) as with_slug FROM products');

    return new Response(JSON.stringify({
      success: true,
      message: 'Поле slug успешно добавлено в базу данных',
      results,
      stats: {
        total: stats.rows[0].total,
        withSlug: stats.rows[0].with_slug,
        withoutSlug: Number(stats.rows[0].total) - Number(stats.rows[0].with_slug)
      },
      nextStep: 'Теперь запустите /api/migrate-slugs для заполнения slug у существующих товаров'
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Ошибка при добавлении поля slug:', error);
    return new Response(JSON.stringify({
      error: 'Не удалось добавить поле slug',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
