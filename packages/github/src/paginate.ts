// カーソルページネーションの汎用化。API の知識を持たない。

/**
 * fetchPage は [ページ, 次のカーソル] を返す。次のカーソルが null なら終端。
 * ページはイテレーターが進むまで取得しない (遅延評価)。
 */
export const paginate = async function* <T>(
  fetchPage: (cursor: string | null) => Promise<[page: T, nextCursor: string | null]>,
) {
  let cursor: string | null = null;
  for (;;) {
    const [page, nextCursor] = await fetchPage(cursor);
    yield page;
    if (nextCursor === null) return;
    cursor = nextCursor;
  }
};
