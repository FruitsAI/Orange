import { ref, computed } from 'vue'

export function usePagination(pageSize = 5) {
  const currentPage = ref(1)
  const totalItems = ref(0)

  const totalPages = computed(() => Math.ceil(totalItems.value / pageSize))

  const visiblePages = computed(() => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages.value, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  })

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const nextPage = () => goToPage(currentPage.value + 1)
  const prevPage = () => goToPage(currentPage.value - 1)

  const paginationInfo = computed(() => {
    const start = (currentPage.value - 1) * pageSize + 1
    const end = Math.min(currentPage.value * pageSize, totalItems.value)
    return { start, end, total: totalItems.value }
  })

  return {
    currentPage,
    totalItems,
    totalPages,
    visiblePages,
    goToPage,
    nextPage,
    prevPage,
    paginationInfo
  }
}
