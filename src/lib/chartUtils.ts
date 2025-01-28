import * as d3 from 'd3'
import { BatchData } from '@/lib/processData'

export function createScales(data: BatchData[], width: number, height: number, margin: any, dataType: 'industries' | 'tags') {
  const x = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([margin.left, width - margin.right])
    .padding(0.1)

  const categories = Array.from(
    new Set(
      data.flatMap(d => Object.keys(d[dataType] || {}))
    )
  ).sort()

  return { x, categories }
}

export function calculateYDomain(
  data: BatchData[], 
  categories: string[], 
  selectedCategory: string | null,
  dataType: 'industries' | 'tags'
): [number, number] {
  // Always calculate the max value from all categories
  const maxY = d3.max(data, d => {
    if (selectedCategory) {
      return d[dataType]?.[selectedCategory] || 0
    }
    // Sum all categories for stacked view
    return Object.values(d[dataType] || {}).reduce((sum, val) => sum + (val || 0), 0)
  }) || 0

  // Add some padding to the max value
  return [0, Math.ceil(maxY / 10) * 10]
}

export function createLegend(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  categories: string[],
  color: d3.ScaleOrdinal<string, string>,
  width: number,
  height: number,
  margin: any,
  selectedCategory: string | null,
  setSelectedCategory: (category: string | null) => void,
  scrollOffset: number,
  setScrollOffset: (offset: number) => void,
  chartId: string
) {
  const legendContainer = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width - margin.right + 20}, ${margin.top + 20})`)

  const legendItemHeight = 20
  const maxVisibleItems = Math.floor((height - margin.top - margin.bottom) / legendItemHeight)
  const totalItems = categories.length
  const maxScroll = Math.max(0, (totalItems - maxVisibleItems) * legendItemHeight)

  const clipPathId = `legend-clip-${chartId}`

  svg.append('defs')
    .append('clipPath')
    .attr('id', clipPathId)
    .append('rect')
    .attr('width', margin.right - 30)
    .attr('height', height - margin.top - margin.bottom)

  const legendGroup = legendContainer.append('g')
    .attr('clip-path', `url(#${clipPathId})`)

  const itemsGroup = legendGroup.append('g')
    .attr('transform', `translate(0, ${-scrollOffset})`)

  categories.forEach((category, i) => {
    const legendItem = itemsGroup.append('g')
      .attr('transform', `translate(0, ${i * 20})`)
      .attr('class', 'legend-item')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')

    // Create a transparent hit area for better click handling
    legendItem.append('rect')
      .attr('width', margin.right - 30)
      .attr('height', legendItemHeight)
      .attr('fill', 'transparent')
      .style('pointer-events', 'all')

    legendItem.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', color(category))
      .attr('opacity', selectedCategory === null || category === selectedCategory ? 1 : 0.2)

    legendItem.append('text')
      .attr('x', 20)
      .attr('y', 10)
      .text(category)
      .style('font-size', '12px')
      .style('fill', selectedCategory === null || category === selectedCategory ? '#000' : '#999')

    // Add click handler to the entire legend item
    legendItem.on('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      setSelectedCategory(category === selectedCategory ? null : category)
    })
  })

  // Add wheel event handler for scrolling
  legendContainer.on('wheel', function(event) {
    event.preventDefault()
    event.stopPropagation()
    const newOffset = Math.min(
      maxScroll,
      Math.max(0, scrollOffset + (event.deltaY * 0.5))
    )
    setScrollOffset(newOffset)
  })

  return legendContainer
}

export function addAxes(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  x: d3.ScaleBand<string>,
  y: d3.ScaleLinear<number, number>,
  height: number,
  margin: { top: number; right: number; bottom: number; left: number },
  width: number
) {
  // Validate width parameter
  if (!width || isNaN(width)) {
    console.error('Invalid width:', width);
    width = container.node()?.getBoundingClientRect().width || 600; // fallback width
  }

  console.log('Using width:', width);
  console.log('Margin:', margin);
  console.log('Actual drawing width:', width - margin.right - margin.left);

  // Create a separate group for grid lines to control z-index
  const gridGroup = container.append('g')
    .attr('class', 'grid-lines')
    .lower()

  // Add horizontal background lines
  gridGroup.selectAll('.grid-line')
    .data(y.ticks())
    .join('line')
    .attr('class', 'grid-line')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', d => y(d))
    .attr('y2', d => y(d))
    .attr('stroke', '#e5e7eb')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '2,2')

  // Add x-axis with filtered ticks (keeping tick lines)
  const xAxis = container.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .attr('color', 'black')
  
  // Add x-axis label
  container.append('text')
    .attr('class', 'x-axis-label')
    .attr('text-anchor', 'middle')
    .attr('x', (x.range()[1] - x.range()[0]) / 2 + margin.left)
    .attr('y', height - 10)
    .attr('fill', 'black')
    .text('Batch')

  // Filter out every other tick if they're too close
  const ticks = xAxis.selectAll('.tick')
  const tickCount = ticks.size()
  
  if (tickCount > 30) {
    ticks.each(function(d, i) {
      if (i % 2 !== 0) {
        d3.select(this).remove()
      }
    })
  }

  // Add y-axis with percentage label (without tick lines)
  const yAxis = container.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(y)
        .tickFormat(d => `${d}%`)
        .tickSize(0) // Remove tick lines only for y-axis
    )
    .attr('color', 'black')

  // Remove the domain lines
  yAxis.select('.domain').remove()
} 