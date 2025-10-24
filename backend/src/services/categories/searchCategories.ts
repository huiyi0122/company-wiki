import { esClient } from "../../elasticSearch";
import { Category, ElasticsearchCategory } from "../categories/interfaces";
import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";

export async function searchCategoriesES(options: {
  search?: string;
  includeInactive?: boolean;
}): Promise<Category[]> {
  const { search = "", includeInactive = false } = options;

  const must: QueryDslQueryContainer[] = [];
  const filter: QueryDslQueryContainer[] = [];

  // 搜索条件
  if (search.trim()) {
    must.push({
      multi_match: {
        query: search.trim(),
        fields: ["name^2", "slug"],
        fuzziness: "AUTO",
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  // 过滤条件
  if (!includeInactive) {
    filter.push({ term: { is_active: true } });
  }

  const query: QueryDslQueryContainer = { bool: { must, filter } };

  try {
    const res = await esClient.search({
      index: "categories",
      size: 1000,
      _source: [
        "name",
        "slug",
        "is_active",
        "created_by",
        "created_by_name",
        "updated_by",
        "updated_by_name",
        "created_at",
        "updated_at",
      ],
      query,
    });

    const hits = res.hits.hits as Array<{
      _id: string;
      _source?: Omit<ElasticsearchCategory, "id">;
    }>;

    // ✅ 转换为 Category[]，确保 is_active 是 boolean
    return hits
      .filter((hit) => !!hit._source)
      .map((hit) => ({
        id: Number(hit._id),
        name: hit._source!.name,
        slug: hit._source!.slug,
        is_active: Boolean(hit._source!.is_active), // ✅ 转为布尔值
        created_by: hit._source!.created_by,
        created_by_name: hit._source!.created_by_name,
        updated_by: hit._source!.updated_by,
        updated_by_name: hit._source!.updated_by_name,
        created_at: hit._source!.created_at,
        updated_at: hit._source!.updated_at,
      }));
  } catch (err) {
    console.error("❌ Elasticsearch search failed:", err);
    return [];
  }
}
