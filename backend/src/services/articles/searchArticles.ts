import { esClient } from "../../elasticSearch";
import { SearchParams } from "./interfaces";
import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";

export async function searchArticles({
  queryString = "",
  categoryId,
  tags,
  authorId,
  pageNumber,
  pageSize,
}: SearchParams) {
  const from = (pageNumber - 1) * pageSize;

  const must: QueryDslQueryContainer[] = [];
  const filter: QueryDslQueryContainer[] = [{ term: { is_active: true } }];

  if (queryString) {
    const trimmedQuery = queryString.trim();

    must.push({
      bool: {
        should: [
          {
            multi_match: {
              query: trimmedQuery,
              fields: ["title^3", "content", "tags^2"],
              fuzziness: "AUTO",
            },
          },
          {
            wildcard: {
              title: {
                value: `*${trimmedQuery}*`,
                boost: 2.0,
              },
            },
          },
          {
            wildcard: {
              content: {
                value: `*${trimmedQuery}*`,
                boost: 1.0,
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (categoryId && categoryId > 0) {
    filter.push({ term: { category_id: categoryId } });
  }

  if (tags && tags.length > 0) {
    filter.push({
      terms: {
        tags: tags,
      },
    });
  }

  if (authorId && authorId > 0) {
    filter.push({ term: { author_id: authorId } });
  }

  const query: QueryDslQueryContainer = {
    bool: {
      must: must.length > 0 ? must : [{ match_all: {} }],
      filter,
    },
  };

  try {
    const searchResponse = await esClient.search({
      index: "articles",
      from,
      size: pageSize,
      query,
    });

    const hits = searchResponse.hits.hits;
    const totalHits =
      typeof searchResponse.hits.total === "number"
        ? searchResponse.hits.total
        : (searchResponse.hits.total as { value: number })?.value || 0;

    const data = hits.map((hit) => {
      const source = hit._source as Record<string, unknown>;
      return {
        id: parseInt(hit._id as string, 10),
        title: (source?.title as string) || "",
        content: (source?.content as string) || "",
        category_id: (source?.category_id as number) || null,
        tags: Array.isArray(source?.tags) ? (source.tags as string[]) : [],
        author_id: (source?.author_id as number) || 0,
        author_name: (source?.author_name as string) || "",
        is_active: !!source?.is_active,
        created_at: (source?.created_at as string) || "",
        updated_at: (source?.updated_at as string) || "",
      };
    });

    const totalPages = Math.ceil(totalHits / pageSize);

    return {
      meta: {
        total: totalHits,
        page: pageNumber,
        totalPages,
        limit: pageSize,
      },
      data,
    };
  } catch (err) {
    console.error("Elasticsearch search error:", err);
    throw err;
  }
}
