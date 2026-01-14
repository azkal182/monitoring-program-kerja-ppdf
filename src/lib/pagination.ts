export const MAX_PAGE_SIZE = 200;

export function parsePagination(searchParams: URLSearchParams) {
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limitValue = limitParam ? parseInt(limitParam, 10) : NaN;
  const offsetValue = offsetParam ? parseInt(offsetParam, 10) : NaN;

  const take = Number.isFinite(limitValue)
    ? Math.min(Math.max(limitValue, 0), MAX_PAGE_SIZE)
    : undefined;
  const skip = Number.isFinite(offsetValue) ? Math.max(offsetValue, 0) : undefined;

  return { take, skip };
}
