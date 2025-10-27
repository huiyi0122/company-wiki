import { esClient } from "../../../elasticSearch";
import { ElasticsearchCategory } from "../interfaces";

export async function indexCategoryToES(
  categoryId: number,
  category: ElasticsearchCategory
): Promise<void> {
  const isActive =
    (category.is_active as any) === 1 ||
    (category.is_active as any) === "1" ||
    category.is_active === true;

  const esDoc = {
    ...category,
    is_active: isActive,
  };

  console.log("🧩 Final ES doc to index:", JSON.stringify(esDoc, null, 2));

  try {
    await esClient.index({
      index: "categories",
      id: categoryId.toString(),
      refresh: true,
      document: esDoc,
    });
    console.log(`✅ Indexed category ${categoryId} successfully.`);
  } catch (error) {
    console.error("❌ Failed to index category:", error);
  }
}

export async function updateCategoryInES(
  categoryId: number,
  partialDoc: Partial<ElasticsearchCategory>
): Promise<void> {
  if (partialDoc.is_active !== undefined) {
    partialDoc.is_active = Boolean(Number(partialDoc.is_active));
  }

  await esClient.update({
    index: "categories",
    id: categoryId.toString(),
    doc: partialDoc,
    doc_as_upsert: true,
    refresh: true,
  });
}

export async function deleteCategoryFromES(categoryId: number): Promise<void> {
  await esClient.delete({
    index: "categories",
    id: categoryId.toString(),
    refresh: true,
  });
}
