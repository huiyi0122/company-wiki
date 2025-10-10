export async function ensureTags(
  connection: any,
  tags: string[],
  userId: number
) {
  if (!tags || tags.length === 0) return [];

  // 查已存在标签
  const [existingTags]: any = await connection.query(
    "SELECT id, name FROM tags WHERE name IN (?)",
    [tags]
  );
  const existingTagNames = existingTags.map((t: any) => t.name);

  // 找出新标签
  const newTags = tags.filter((t) => !existingTagNames.includes(t));
  let newTagObjects: any[] = [];

  if (newTags.length > 0) {
    const values = newTags.map((name) => [
      name,
      name.toLowerCase(),
      1,
      userId,
      userId,
    ]);
    const [inserted]: any = await connection.query(
      "INSERT INTO tags (name, slug, is_active, created_by, updated_by) VALUES ?",
      [values]
    );
    newTagObjects = newTags.map((name, idx) => ({
      id: inserted.insertId + idx,
      name,
    }));
  }

  return [...existingTags, ...newTagObjects];
}
