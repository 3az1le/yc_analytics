import * as d3 from 'd3'
import { ChartDimensions, ChartDataType } from '@/types/chart'
import { BatchData } from '@/lib/processData'

export function createScales(
  data: BatchData[],
  dimensions: ChartDimensions,
  dataType: ChartDataType
) {
  const { width, height, margin } = dimensions
  
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
    .range([margin.left, width - margin.right])

  const categories = Array.from(
    new Set(data.flatMap(d => Object.keys(d[dataType] || {})))
  ).sort()

  return { x, categories }
}

export function calculateYDomain(
  data: BatchData[],
  categories: string[],
  selectedCategory: string | null,
  dataType: ChartDataType
): [number, number] {
  if (selectedCategory) {
    const maxValue = d3.max(data, d => d[dataType]?.[selectedCategory] || 0) || 0
    return [0, maxValue * 1.1]
  }

  const stackedData = d3.stack()
    .keys(categories)
    .value((d: any, key) => d[dataType]?.[key] || 0)(data)

  const maxHeight = d3.max(stackedData, layer => d3.max(layer, d => d[1])) || 0
  return [0, Math.ceil(maxHeight * 1.1)]
}

export function addAxes(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  x: d3.ScaleTime<number, number>,
  y: d3.ScaleLinear<number, number>,
  dimensions: ChartDimensions
) {
  const { height, margin, width } = dimensions

  // Add X axis
  container.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call(g => g.select('.domain').remove())

  // Add Y axis
  container.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line')
      .clone()
      .attr('x2', width - margin.left - margin.right)
      .attr('stroke-opacity', 0.1))
} 