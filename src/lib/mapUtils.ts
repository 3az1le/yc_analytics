import { BatchData } from './processData'

interface Company {
  location: string;
}

export function processLocations(data: BatchData[], dateRange: [number, number]) {
  // Filter data by date range
  const filteredData = data.filter(batch => {
    const year = parseInt(batch.name.slice(-2))
    return year >= dateRange[0] && year <= dateRange[1]
  })

  // Count companies by location
  const locationCounts: { [key: string]: number } = {}

  filteredData.forEach(batch => {
    Object.entries(batch.locations || {}).forEach(([location, count]) => {
      locationCounts[location] = (locationCounts[location] || 0) + count
    })
  })

  return locationCounts
} 