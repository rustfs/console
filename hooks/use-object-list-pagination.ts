import { useEffect, type RefObject } from "react"

interface ObjectListPaginationOptions {
  loadMoreRef: RefObject<HTMLDivElement | null>
  nextToken: string | undefined
  loading: boolean
  loadMoreError: boolean
  loadNextBatch: () => void
}

export function useObjectListPagination({
  loadMoreRef,
  nextToken,
  loading,
  loadMoreError,
  loadNextBatch,
}: ObjectListPaginationOptions) {
  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !nextToken || loading || loadMoreError || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadNextBatch()
        }
      },
      { rootMargin: "320px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [loadMoreRef, loadNextBatch, nextToken, loading, loadMoreError])
}
