import statsData from '@/data/stats.json'

export type BatchData = {
  name: string;
  industries: { [key: string]: number };
  tags: { [key: string]: number };
  total: number;
  hiring: number;
}

export type Stats = {
  byBatch: BatchData[];
  totalCompanies: number;
  hiringCount: number;
}

// Define the type for the imported data
type StatsData = {
  batches: string[];
  stats: {
    byBatch: {
      [key: string]: {
        total: number;
        hiring: number;
        industries: { [key: string]: number };
        tags: { [key: string]: number };
      }
    };
  };
}

// Use the renamed import
const data = statsData as StatsData;

function batchSortKey(batch: string): [number, string] {
  if (!batch) return [0, 'Z']
  
  try {

    // Regular batches
    const year = parseInt(batch.slice(-2))
    const seasonOrder: { [key: string]: string } = { 'W': 'A', 'S': 'B', 'IK' : 'C','F': 'D' }
    const season = seasonOrder[batch[0].toUpperCase()] || 'Z'
    return [year, season]
  } catch {
    return [0, 'Z']
  }
}

function getBatchOrder(batches: string[]): string[] {
  const validBatches = batches.filter(b => b)
  return validBatches.sort((a, b) => {
    const [yearA, seasonA] = batchSortKey(a)
    const [yearB, seasonB] = batchSortKey(b)
    // First compare years numerically
    if (yearA !== yearB) {
      return yearA - yearB
    }
    // If years are equal, compare seasons alphabetically
    return seasonA.localeCompare(seasonB)
  })
}

export function processData(startDate: string, endDate: string, minCompanies: number = 5): Stats {
  const startBatch = convertDateToBatch(startDate)
  const endBatch = convertDateToBatch(endDate)
  
  console.log('Date range:', { startDate, endDate, startBatch, endBatch })
  
  // Sort batches chronologically
  const sortedBatches = getBatchOrder(data.batches)
  const filteredBatches = sortedBatches.filter(batch => {
    // Filter out IK12 batch
    if (batch === 'IK12') return false
    
    const [batchYear, batchSeason] = batchSortKey(batch)
    const [startYear, startSeason] = batchSortKey(startBatch)
    const [endYear, endSeason] = batchSortKey(endBatch)
    
    // Different years
    if (batchYear < startYear || batchYear > endYear) return false
    
    // Same start year
    if (batchYear === startYear && batchSeason.localeCompare(startSeason) < 0) return false
    
    // Same end year
    if (batchYear === endYear && batchSeason.localeCompare(endSeason) > 0) return false
    
    return true
  })

  console.log('Filtered batches:', filteredBatches)

  // Process batch data
  const batchStats = filteredBatches.map(batch => {
    const batchData = data.stats.byBatch[batch]
    if (!batchData) {
      return {
        name: batch,
        industries: {},
        tags: {},
        total: 0,
        hiring: 0
      }
    }
    
    // Calculate percentages for industries based on total companies in batch
    const industries = Object.entries(batchData.industries).reduce((acc, [industry, count]) => {
      acc[industry] = (count / batchData.total) * 100
      return acc
    }, {} as Record<string, number>)

    // Calculate percentages for tags based on total companies in batch
    const tags = Object.entries(batchData.tags || {}).reduce((acc, [tag, count]) => {
      acc[tag] = (count / batchData.total) * 100
      return acc
    }, {} as Record<string, number>)

    return {
      name: batch,
      industries,
      tags,
      total: batchData.total,
      hiring: batchData.hiring
    }
  })

  // Calculate totals from batch data
  const totalCompanies = batchStats.reduce((sum, batch) => sum + batch.total, 0)
  const hiringCount = batchStats.reduce((sum, batch) => sum + batch.hiring, 0)

  return {
    byBatch: batchStats,
    totalCompanies,
    hiringCount
  }
}

function convertDateToBatch(date: string): string {
  const [year, month] = date.split('-')
  const shortYear = year.slice(-2)  // Get last 2 digits of year
  const monthNum = parseInt(month)
  
  // Winter: Jan-Apr (1-4)
  // Spring: May-Aug (5-8)
  // Fall: Sep-Dec (9-12)
  let season
  if (monthNum >= 1 && monthNum <= 4) {
    season = 'W'
  } else if (monthNum >= 5 && monthNum <= 8) {
    season = 'S'
  } else {
    season = 'F'
  }
  
  return `${season}${shortYear}`
}

// Add console logging to debug
console.log('Loaded stats:', data) 