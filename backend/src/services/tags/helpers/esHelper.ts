import { esClient } from "../../../elasticSearch";
import { ElasticsearchTag, Tag, User, DatabaseConnection } from "../interfaces";
import { getUsernameById } from "./dbHelper";

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
    created_by: createdBy,
    created_by_name: createdByName,
    updated_by: updatedBy,
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

    const createdByName = await getUsernameById(connection, tag.created_by);

    await indexTagToES(
      tag.id,
      tag.name,
      tag.slug,
      isActive,
      tag.created_by || 0,
      createdByName,
      user.id,
      user.username,
      tag.created_at,
      new Date().toISOString()
    );
  } else {
    console.error("❌ Elasticsearch operation failed:", error);
  }
}
