import { esClient } from "./elasticSearch"; // 路径改对

async function debug() {
  try {
    console.log("1️⃣ 查看前 5 条文章");
    let res = await esClient.search({
      index: "articles",
      size: 5,
      _source: ["id", "title", "category_id", "tags", "is_active"],
      query: { match_all: {} },
    });
    console.log(res.hits.hits.map((hit: any) => hit._source));

    console.log("2️⃣ 查 category_id = 22 的文章");
    res = await esClient.search({
      index: "articles",
      size: 10,
      _source: ["id", "title", "category_id", "tags", "is_active"],
      query: { term: { category_id: 22 } },
    });
    console.log(res.hits.hits.map((hit: any) => hit._source));

    console.log("3️⃣ 测试 keyword 搜索 + category_id = 22");
    res = await esClient.search({
      index: "articles",
      size: 10,
      _source: ["id", "title", "category_id", "tags", "is_active"],
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: "test",
                fields: ["title", "content", "tags"],
                fuzziness: "AUTO",
              },
            },
          ],
          filter: [
            { term: { is_active: true } },
            { term: { category_id: 22 } },
          ],
        },
      },
    });
    console.log(res.hits.hits.map((hit: any) => hit._source));
  } catch (err) {
    console.error("❌ Elasticsearch debug error:", err);
  }
}
// 查看 ES 里所有 category_id
async function checkCategoryIdType() {
  const res = await esClient.search({
    index: "articles",
    size: 50,
    _source: ["id", "title", "category_id"],
    query: { match_all: {} },
  });

  console.log(
    "所有 category_id：",
    res.hits.hits.map((hit: any) => hit._source.category_id)
  );
}

checkCategoryIdType();

debug();
