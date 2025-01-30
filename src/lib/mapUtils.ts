import { BatchData } from '@/lib/processData'

type Location = {
  latitude: number
  longitude: number
  count: number
}

export function processLocations(data: BatchData[], dateRange: [number, number]): Location[] {
  // Filter data by date range
  const filteredData = data.filter(batch => {
    const year = parseInt(batch.slice(-2))
    return batchYear >= dateRange[0] && batchYear <= dateRange[1]
  })

  // Aggregate location data
  const locationMap = new Map<string, Location>()
  
  filteredData.forEach(batch => {
    batch.companies.forEach(company => {
      if (company.latitude && company.longitude) {
        const key = `${company.latitude},${company.longitude}`
        const existing = locationMap.get(key)
        
        if (existing) {
          existing.count++
        } else {
          locationMap.set(key, {
            latitude: company.latitude,
            longitude: company.longitude,
            count: 1
          })
        }
      }
    })
  })

  return Array.from(locationMap.values())
} 