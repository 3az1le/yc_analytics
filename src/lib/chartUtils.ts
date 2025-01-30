import * as d3 from 'd3'
import { BatchData } from '@/lib/processData'

type Dimensions = {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
}

export function createScales(
  data: BatchData[], 
  dimensions: Dimensions,
  dataType: 'industries' | 'tags'
) {
  // More detailed validation
  if (!dimensions) {
    throw new Error('Dimensions object is undefined')
  }
  if (!dimensions.margin) {
    throw new Error('Dimensions margin is undefined')
  }
  if (!dimensions.width || !dimensions.height) {
    throw new Error(`Invalid dimensions: width=${dimensions.width}, height=${dimensions.height}`)
  }

  const { width, height, margin } = dimensions

  const x = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([margin.left, width - margin.right])
    .padding(0.1)

  const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top])

  const categories = Array.from(
    new Set(
      data.flatMap(d => {
        const values = dataType === 'industries' 
          ? d.percentage_industries_among_total_industries 
          : d.percentage_tags_among_total_tags;
        return Object.keys(values || {});
      })
    )
  ).sort()

  // Add "Other" category
  categories.push('Other')

  return { x, y, categories }
}

export function updateYScale(
  y: d3.ScaleLinear<number, number>,
  data: BatchData[],
  selectedCategory: string | null,
  dataType: 'industries' | 'tags'
) {
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
  dimensions: Dimensions,
  scales: { x: d3.ScaleBand<string>; y: d3.ScaleLinear<number, number> },
  config: { selectedCategory: string | null; dataType: 'industries' | 'tags' }
) {
  const { width, height, margin } = dimensions
  const { x, y } = scales
  const { selectedCategory, dataType } = config

  // Clear existing axes and grid lines, but preserve labels
  container.selectAll('.axis').remove()
  container.selectAll('.grid-lines').remove()

  // Add grid lines
  const gridGroup = container.append('g')
    .attr('class', 'grid-lines')
    .lower()

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

  // Add x-axis
  const xAxis = container.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x)
      .tickSize(6)
      .tickPadding(10))
    .style('font-family', 'Avenir, system-ui, -apple-system, sans-serif')
    .style('font-size', '10px')

  // Add y-axis
  container.append('g')
    .attr('class', 'axis y-axis')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d => `${d}%`))

  // Add x-axis label
  container.append('text')
    .attr('class', 'axis-label x-label')
    .attr('text-anchor', 'middle')
    .attr('x', (width - margin.left - margin.right) / 2 + margin.left)
    .attr('y', height - 10)
    .text('Batch')

  // Update or create y-axis label
  let yLabel = container.select<SVGTextElement>('.axis-label.y-label')
  const yLabelText = selectedCategory ? 
    `% of Companies in ${selectedCategory}` : 
    `Distribution Among ${dataType === 'industries' ? 'Industries' : 'Tags'}`

  if (yLabel.empty()) {
    // Create new y-axis label if it doesn't exist
    yLabel = container.append<SVGTextElement>('text')
      .attr('class', 'axis-label y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(height - margin.bottom + margin.top) / 2)
      .attr('y', margin.left - 40)
      .style('opacity', 0)
  }

  // Update the label text with transition only if it's changing
  if (yLabel.text() !== yLabelText) {
    yLabel.transition()
      .duration(300)
      .style('opacity', 0)
      .end()
      .then(() => {
        yLabel
          .text(yLabelText)
          .transition()
          .duration(300)
          .style('opacity', 1)
      })
  }
} 