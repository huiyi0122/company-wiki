import { esClient } from "../../elasticSearch";
import {
  GetTagsOptions,
  PaginatedResponse,
  ElasticsearchTag,
} from "./interfaces";

export async function searchTagsES(
  options: GetTagsOptions
): Promise<PaginatedResponse<ElasticsearchTag>> {
  const {
    search = "",
    includeInactive = false,
    page = 1,
    limit = 10,
  } = options;
  const from = (page - 1) * limit;

  const must: Record<string, any>[] = [];
  const filter: Record<string, any>[] = [];

  if (search) {
    must.push({
      multi_match: {
        query: search,
        fields: ["name", "slug"],
        fuzziness: "AUTO",
      },
    });
  }

  if (!includeInactive) {
    filter.push({ term: { is_active: true } });
  }

  const res = await esClient.search({
    index: "tags",
    from,
    size: limit,
    query:
      search || !includeInactive
        ? { bool: { must, filter } }
        : { match_all: {} },
  });

  const hits = res.hits.hits as Array<{
    _id: string;
    _source: ElasticsearchTag;
  }>;
  const total =
    typeof res.hits.total === "number"
      ? res.hits.total
      : res.hits.total?.value || 0;

  // ✅ 添加 created_by 和 updated_by (虽然 ES 没存，但保持一致性)
  const data = hits.map((hit) => ({
    ...hit._source,
    // ✅ 如果 ES 没有这些字段，设为 null
    created_by: (hit._source as any).created_by || null,
    updated_by: (hit._source as any).updated_by || null,
  }));

  return {
    meta: { total, page, limit },
    data,
  };
}
