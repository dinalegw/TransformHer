UPDATE "books"
SET "price" = CASE "slug"
  WHEN 'the-woman-youre-becoming' THEN '4500.00'
  WHEN 'rise-and-reign' THEN '6500.00'
  WHEN 'rooted-and-radiant' THEN '3800.00'
  WHEN 'soft-and-sovereign' THEN '4200.00'
  WHEN 'wealth-her-way' THEN '5500.00'
  WHEN 'the-quiet-power' THEN '3500.00'
  WHEN 'boundaries-beloved' THEN '4000.00'
  WHEN 'unshakeable' THEN '4800.00'
  ELSE "price"
END,
"updated_at" = NOW()
WHERE "source" = 'seed'
  AND "slug" IN (
    'the-woman-youre-becoming',
    'rise-and-reign',
    'rooted-and-radiant',
    'soft-and-sovereign',
    'wealth-her-way',
    'the-quiet-power',
    'boundaries-beloved',
    'unshakeable'
  );
