import * as d3 from 'd3'
import { BatchData } from '@/lib/processData'

export type Dimensions = {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
}

export type ChartScales = {
  x: d3.ScaleBand<string>
  y: d3.ScaleLinear<number, number>
  xStart: number
  xEnd: number
  chartWidth: number
}

export type AxesConfig = {
  selectedCategory: string | null
  dataType: 'industries' | 'tags'
  isTransitioning?: boolean
}

export function validateDimensions(dimensions: Dimensions) {
  if (!dimensions) throw new Error('Dimensions object is undefined')
  if (!dimensions.margin) throw new Error('Dimensions margin is undefined')
  if (!dimensions.width || !dimensions.height) {
    throw new Error(`Invalid dimensions: width=${dimensions.width}, height=${dimensions.height}`)
  }
}

export function getChartBoundaries(dimensions: Dimensions) {
  const { width, margin } = dimensions
  const xStart = margin.left
  const xEnd = width - margin.right  // Remove the extra margin.left
  const chartWidth = xEnd - xStart
  return { xStart, xEnd, chartWidth }
}

function extractCategories(data: BatchData[], dataType: 'industries' | 'tags'): string[] {
  const categories = Array.from(
    new Set(
      data.flatMap(d => {
        const values = dataType === 'industries' 
          ? d.percentage_industries_among_total_industries 
          : d.percentage_tags_among_total_tags
        return Object.keys(values || {})
      })
    )
  ).sort()

  return [...categories, 'Other'] // Add "Other" category
}

export function createScales(
  data: BatchData[], 
  dimensions: Dimensions,
  dataType: 'industries' | 'tags'
): ChartScales {
  validateDimensions(dimensions)
  const { height, margin } = dimensions
  const { xStart, xEnd, chartWidth } = getChartBoundaries(dimensions)

  const x = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([xStart, xEnd])
    .align(0.5)        // Center align the bands

  const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top])

  return { x, y, xStart, xEnd, chartWidth }
}

export function updateYScale(
  y: d3.ScaleLinear<number, number>,
  data: BatchData[],
  selectedCategory: string | null,
  dataType: 'industries' | 'tags'
): d3.ScaleLinear<number, number> {
  if (selectedCategory) {
    const maxY = d3.max(data, d => {
      const percentages = dataType === 'industries' 
        ? d.percentage_companies_per_industries
        : d.percentage_companies_per_tags
      return percentages[selectedCategory] || 0
    }) || 0

    y.domain([0, Math.ceil((maxY * 1.1) / 1) * 1])
  } else {
    y.domain([0, 100])
  }

  return y
}

function createGridLines(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  scales: ChartScales,
  y: d3.ScaleLinear<number, number>
) {
  const { x, xStart } = scales
  
  // Calculate the end position based on the last tick
  const domain = x.domain()
  const lastTick = domain[domain.length - 1]
  const lastTickX = x(lastTick) || 0  // Just get the start position of the last tick
  
  const gridGroup = container.append('g')
    .attr('class', 'grid-lines')
    .lower()

  gridGroup.selectAll('.grid-line')
    .data(y.ticks())
    .join('line')
    .attr('class', 'grid-line')
    .attr('x1', xStart)
    .attr('x2', lastTickX)
    .attr('y1', d => y(d))
    .attr('y2', d => y(d))
}

function createAxes(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  dimensions: Dimensions,
  scales: ChartScales,
  tickValues: string[]
) {
  const { height, margin } = dimensions
  const { x, y, xStart } = scales

  // Calculate the end position based on the last tick
  const domain = x.domain()
  const lastTick = domain[domain.length - 1]
  const lastTickX = x(lastTick) || 0

  // Y-axis
  container.append('g')
    .attr('class', 'axis y-axis')
    .attr('transform', `translate(${xStart},0)`)
    .call(d3.axisLeft(y).tickFormat(d => `${d}%`))

  // X-axis
  const xAxis = container.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickValues(tickValues)
        .tickSize(6)
        .tickPadding(10)
        .tickFormat((d, i) => d.toString())  // Ensure we're using the raw value
    )

  // Adjust tick positions to start of band
  xAxis.selectAll('.tick')
    .attr('transform', d => `translate(${x(d as string) || 0},0)`)

  xAxis.select('.domain').remove()
  
  xAxis.append('line')
    .attr('class', 'x-axis-line')
    .attr('x1', xStart)
    .attr('x2', lastTickX)
    .attr('y1', 0)
    .attr('y2', 0)
}

function createAxisLabels(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  dimensions: Dimensions,
  scales: ChartScales,
  config: AxesConfig
) {
  const { height, width, margin } = dimensions
  const { xStart, xEnd } = scales
  const { selectedCategory, dataType, isTransitioning } = config

  // X-axis label (Batch)
  container.append('text')
    .attr('class', 'axis-label x-label')
    .attr('x', width / 2)  // Center horizontally using the full width
    .attr('y', height - margin.bottom / 3)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'middle')
    .text('Batch')

  // Y-axis label
  const yLabelText = selectedCategory
    ? `% of Companies in ${selectedCategory}`
    : `Distribution Among ${dataType === 'industries' ? 'Industries' : 'Tags'}`

  let yLabel = container.select<SVGTextElement>('.axis-label.y-label')

  if (yLabel.empty()) {
    yLabel = container.append<SVGTextElement>('text')
      .attr('class', 'axis-label y-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(height - margin.bottom + margin.top) / 2)
      .attr('y', margin.left - 40)
      .style('opacity', 0)
  }

  if (yLabel.text() !== yLabelText) {
    if (isTransitioning) {
      yLabel.transition()
        .duration(300)
        .style('opacity', 1)
        .end()
        .then(() => yLabel.text(yLabelText))
    } else {
      yLabel.style('opacity', 1).text(yLabelText)
    }
  }
}

export function addAxes(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  dimensions: Dimensions,
  scales: ChartScales,
  config: AxesConfig
) {
  validateDimensions(dimensions)
  
  // Clear existing elements
  container.selectAll('.axis, .grid-lines, .axis-label').remove()

  // Calculate tick values
  const tickValues = scales.x.domain().length > 30 
    ? scales.x.domain().filter((_, i) => i % 2 === 0)
    : scales.x.domain()

  // Create chart elements
  createGridLines(container, scales, scales.y)
  createAxes(container, dimensions, scales, tickValues)
  createAxisLabels(container, dimensions, scales, config)
} 