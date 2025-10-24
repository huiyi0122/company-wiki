import { esClient } from "../../../elasticSearch";
import { ElasticsearchCategory } from "../interfaces";

/**
 * 🔹 新增或全量同步 Category 到 Elasticsearch
 */
export async function indexCategoryToES(
  categoryId: number,
  category: ElasticsearchCategory
): Promise<void> {
  // 🧠 彻底保证布尔转换
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

/**
 * 🔹 更新部分字段到 ES
 */
export async function updateCategoryInES(
  categoryId: number,
  partialDoc: Partial<ElasticsearchCategory>
): Promise<void> {
  // 对可能存在的 is_active 做安全处理
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

/**
 * 🔹 删除 Category
 */
export async function deleteCategoryFromES(categoryId: number): Promise<void> {
  await esClient.delete({
    index: "categories",
    id: categoryId.toString(),
    refresh: true,
  });
}
