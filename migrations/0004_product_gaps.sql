ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'tags';

UPDATE categories SET icon = CASE lower(name)
  WHEN 'salary' THEN 'salary'
  WHEN 'freelance' THEN 'freelance'
  WHEN 'rent & bills' THEN 'home'
  WHEN 'food & groceries' THEN 'food'
  WHEN 'shopping' THEN 'shopping'
  WHEN 'transport' THEN 'transport'
  WHEN 'health & wellness' THEN 'health'
  ELSE 'tags'
END;

UPDATE schema_meta SET value = '0004' WHERE key = 'schema_version';
