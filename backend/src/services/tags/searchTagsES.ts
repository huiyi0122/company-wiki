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

  const data = hits.map((hit) => ({
    ...hit._source,
    created_by: (hit._source as any).created_by || null,
    updated_by: (hit._source as any).updated_by || null,
  }));

  return {
    meta: { total, page, limit },
    data,
  };
}
