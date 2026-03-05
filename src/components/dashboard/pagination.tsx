import Link from "next/link";

const PAGE_SIZE = 50;

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return range(1, total);

  if (current <= 3) return [...range(1, 4), "ellipsis", total];
  if (current >= total - 2) return [1, "ellipsis", ...range(total - 3, total)];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function Pagination({
  currentPage,
  totalItems,
  basePath,
  pageSize = PAGE_SIZE,
}: {
  currentPage: number;
  totalItems: number;
  basePath: string;
  pageSize?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  function href(page: number) {
    return page === 1 ? basePath : `${basePath}?page=${page}`;
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-[12px] text-[var(--text-faint)] tabular-nums">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        {currentPage > 1 && (
          <Link
            href={href(currentPage - 1)}
            className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            Prev
          </Link>
        )}
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e-${i}`} className="px-1.5 text-[12px] text-[var(--text-ghost)]">
              ...
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                p === currentPage
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {p}
            </Link>
          )
        )}
        {currentPage < totalPages && (
          <Link
            href={href(currentPage + 1)}
            className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
