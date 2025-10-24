import { esClient } from "../../../elasticSearch";
import { ElasticsearchTag, Tag, User, DatabaseConnection } from "../interfaces";
import { getUsernameById } from "./dbHelper";

/**
 * Index a tag to Elasticsearch
 * @param id - Tag ID
 * @param name - Tag name
 * @param slug - Tag slug
 * @param isActive - Active status
 * @param createdBy - Creator user ID (number)
 * @param createdByName - Creator username (string)
 * @param updatedBy - Updater user ID (number)
 * @param updatedByName - Updater username (string)
 * @param createdAt - Creation timestamp
 * @param updatedAt - Update timestamp
 */
export async function indexTagToES(
  id: number,
  name: string,
  slug: string,
  isActive: boolean,
  createdBy: number,
  createdByName: string,
  updatedBy: number,
  updatedByName: string,
  createdAt?: string,
  updatedAt?: string
): Promise<void> {
  const esDoc: ElasticsearchTag = {
    id,
    name,
    slug,
    is_active: isActive,
    created_by: createdBy, // ✅ 添加
    created_by_name: createdByName,
    updated_by: updatedBy, // ✅ 添加
    updated_by_name: updatedByName,
    created_at: createdAt || new Date().toISOString(),
    updated_at: updatedAt || new Date().toISOString(),
  };

  await esClient.index({
    index: "tags",
    id: id.toString(),
    refresh: true,
    document: esDoc,
  });
}

export async function updateTagInES(
  id: number,
  doc: Partial<ElasticsearchTag>
): Promise<void> {
  await esClient.update({
    index: "tags",
    id: id.toString(),
    refresh: true,
    doc,
  });
}

export async function handleESUpdateError(
  error: any,
  connection: DatabaseConnection,
  tag: Tag,
  user: User,
  isActive: boolean
): Promise<void> {
  if (error.meta?.statusCode === 404) {
    console.warn(`⚠️ Tag ${tag.id} not found in ES, re-indexing...`);

    // ✅ 获取创建者用户名
    const createdByName = await getUsernameById(connection, tag.created_by);

    await indexTagToES(
      tag.id,
      tag.name,
      tag.slug,
      isActive,
      tag.created_by || 0, // created_by (number)
      createdByName, // created_by_name (string)
      user.id, // updated_by (number)
      user.username, // updated_by_name (string)
      tag.created_at,
      new Date().toISOString()
    );
  } else {
    console.error("❌ Elasticsearch operation failed:", error);
  }
}
