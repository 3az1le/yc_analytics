import * as d3 from 'd3';
import 'd3-transition'; // Ensure .transition() is recognized
import { interpolatePath } from 'd3-interpolate-path';
import { BatchData } from '@/lib/processData'; // Adjust to your actual import
import { createScales, updateYScale, addAxes } from './chartUtils';

type ChartState = {
  data: BatchData[]
  dataType: 'industries' | 'tags'
  selectedCategory: string | null
  previousSelectedCategory: string | null
  colorScale: d3.ScaleOrdinal<string, string>
  categories: string[]
}

type Dimensions = {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
}

/**
 * Initializes the SVG chart structure with necessary containers and clipping paths.
 * This function is called once when the chart is first created.
 * 
 * @param svg - The main SVG element
 * @param chartId - Unique identifier for the chart (used for clip paths)
 * @param dimensions - Chart dimensions including width, height, and margins
 * @param state - Current chart state including data and visual properties
 * @returns Object containing references to the created containers
 */
export function initializeChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chartId: string,
  dimensions: Dimensions,
  state: ChartState
) {
  if (!dimensions || !dimensions.margin) {
    throw new Error('Invalid dimensions provided to initializeChart')
  }

  svg.selectAll('*').remove()
  svg
    .attr('width', dimensions.width)
    .attr('height', dimensions.height)
    .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)

  const clipId = `clip-${chartId}`
  svg.append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('x', dimensions.margin.left)
    .attr('y', dimensions.margin.top)
    .attr('width', dimensions.width - dimensions.margin.left - dimensions.margin.right)
    .attr('height', dimensions.height - dimensions.margin.top - dimensions.margin.bottom)

  const chartContainer = svg.append('g').attr('class', 'chart-container')
  const areaContainer = chartContainer.append('g')
    .attr('class', 'area-container')
    .attr('clip-path', `url(#${clipId})`)

  return { chartContainer, areaContainer }
}

/**
 * Updates the chart visualization based on new data or state changes.
 * This function handles transitions between different views and data updates.
 * 
 * @param svg - The main SVG element
 * @param dimensions - Chart dimensions including width, height, and margins
 * @param state - Current chart state including data and visual properties
 */
export function updateChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  dimensions: Dimensions,
  state: ChartState
) {
  if (!dimensions || !dimensions.margin) {
    throw new Error('Invalid dimensions provided to updateChart')
  }

  const { data, dataType, selectedCategory, previousSelectedCategory, colorScale, categories } = state

  // Create scales
  const { x, y } = createScales(data, dimensions, dataType)
  // log createscale called from updatechart
  console.log('createscale called from updatechart')
  updateYScale(y, data, selectedCategory, dataType)

  // Update axes
  const chartContainer = svg.select('g.chart-container')
  chartContainer.selectAll('g')
    .filter(function() {
      return !d3.select(this).classed('area-container')
    })
    .transition()
    .duration(600)
    .style('opacity', 0)
    .remove()
  
  // Add new axes with updated scales
  addAxes(
    chartContainer as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
    dimensions,
    { x, y },
    { selectedCategory: selectedCategory || '', dataType }
  )

  // Update areas
  const areaContainer = svg.select('g.area-container')
  drawStackedArea(areaContainer, data, categories, x, y, colorScale, state)
}

type AreaGenerators = {
  stacked: d3.Area<d3.SeriesPoint<BatchData>>
  single: d3.Area<any>
}

function createAreaGenerators(
  x: d3.ScaleBand<string>,
  y: d3.ScaleLinear<number, number>,
  selectedCategory: string | null,
  dataType: 'industries' | 'tags'
): AreaGenerators {
  const stacked = d3.area<d3.SeriesPoint<BatchData>>()
    .x(d => (x(d.data.name) ?? 0) + x.bandwidth() / 2)
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5))

  const single = d3.area<any>()
    .x(d => (x(d.name) ?? 0) + x.bandwidth() / 2)
    .y0(() => y(0))
    .y1(d => {
      const value = selectedCategory ? d[dataType]?.[selectedCategory] || 0 : 0
      return y(value)
    })
    .curve(d3.curveCatmullRom.alpha(0.5))

  return { stacked, single }
}

function createTooltip() {
  let tooltip = d3.select<HTMLDivElement, unknown>('body').select<HTMLDivElement>('.area-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append<HTMLDivElement>('div')
      .attr('class', 'area-tooltip')
  }
  return tooltip
}

function setupTooltipHandlers(selection: d3.Selection<any, any, any, any>, tooltip: d3.Selection<any, any, any, any>) {
  selection
    .style('cursor', 'pointer')
    .on('mouseover', (event: MouseEvent, d: any) => {
      tooltip
        .classed('visible', true)
        .html(d.key)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
    })
    .on('mousemove', (event: MouseEvent) => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
    })
    .on('mouseout', () => {
      tooltip.classed('visible', false)
    })
}

export function drawStackedArea(
  container: d3.Selection<Element | d3.BaseType, unknown, null, undefined>,
  data: BatchData[],
  categories: string[],
  x: d3.ScaleBand<string>,
  y: d3.ScaleLinear<number, number>,
  colorScale: d3.ScaleOrdinal<string, string>,
  state: ChartState
) {
  const { dataType, selectedCategory, previousSelectedCategory } = state
  const { stacked: stackedArea, single: singleArea } = createAreaGenerators(x, y, selectedCategory, dataType)
  const tooltip = createTooltip()

  // Create stack generator
  const stackGen = d3.stack<BatchData>()
    .keys(categories)
    .value((d, key) => {
      if (selectedCategory) {
        return dataType === 'industries'
          ? d.percentage_companies_per_industries[key] || 0
          : d.percentage_companies_per_tags[key] || 0
      }
      const data = dataType === 'industries'
        ? d.percentage_industries_among_total_industries
        : d.percentage_tags_among_total_tags
      return data[key] || 0
    })

  const stackedData = selectedCategory
    ? [{ key: selectedCategory, index: 0, data }]
    : stackGen(data)

  // Bind data to paths
  const paths = container.selectAll<SVGPathElement, any>('path.area')
    .data(stackedData as d3.Series<BatchData, string>[], (d: any) => d.key || '')

  // Handle transitions based on view mode
  const containerElement = container.node()
  if (!containerElement || !(containerElement instanceof Element)) return

  if (selectedCategory) {
    handleSingleCategoryTransition(paths, containerElement, {
      previousSelectedCategory,
      selectedCategory,
      colorScale,
      singleArea,
      stackedArea,
      tooltip
    })
  } else if (previousSelectedCategory) {
    // Only use stacked transition when unselecting a category
    handleStackedViewTransition(paths, containerElement, {
      previousSelectedCategory,
      selectedCategory,
      colorScale,
      stackedArea,
      tooltip,
      dataType
    })
  } else {
    // For dataType changes or date range updates, update immediately without transition
    handleImmediateStackedUpdate(paths, containerElement, {
      colorScale,
      stackedArea,
      tooltip
    })
  }
}

function handleSingleCategoryTransition(
  paths: d3.Selection<SVGPathElement, any, any, any>,
  container: Element,
  config: {    
    previousSelectedCategory: string | null
    selectedCategory: string | null
    colorScale: d3.ScaleOrdinal<string, string>
    singleArea: d3.Area<any>
    stackedArea: d3.Area<any>
    tooltip: d3.Selection<any, any, any, any>
  }
) {
  const { selectedCategory, previousSelectedCategory, colorScale, singleArea, tooltip } = config
  const containerSelection = d3.select(container)

  // Exit non-selected categories
  paths.exit()
    .filter((d: any) => d.key !== selectedCategory)
    .transition()
    .duration(600)
    .attr('opacity', 0)
    .remove()

  // Enter new path for selected category
  const singleEnter = paths.enter()
    .append('path')
    .attr('class', 'area')
    .attr('d', d => {
      const existingPath = containerSelection.selectAll('path.area')
        .filter((p: any) => p.key === (previousSelectedCategory || selectedCategory))
      return !existingPath.empty() ? existingPath.attr('d') || '' : singleArea(d)
    })

  // Update with transition
  singleEnter.merge(paths)
    .transition()
    .duration(600)
    .attr('opacity', 1)
    .attrTween('d', function(d) {
      const previousPath = containerSelection.selectAll('path.area')
        .filter((p: any) => p.key === selectedCategory)
      const prevD = !previousPath.empty() ? previousPath.attr('d') || '' : ''
      const newD = singleArea(d.data) || ''
      return interpolatePath(prevD, newD)
    })
    .attr('fill', d => colorScale(d.key))

  setupTooltipHandlers(singleEnter.merge(paths), tooltip)
}

function handleStackedViewTransition(
  paths: d3.Selection<SVGPathElement, any, any, any>,
  container: Element,
  config: {
    previousSelectedCategory: string | null
    selectedCategory: string | null
    colorScale: d3.ScaleOrdinal<string, string>
    stackedArea: d3.Area<any>
    tooltip: d3.Selection<any, any, any, any>
    dataType: 'industries' | 'tags'
  }
) {
  const { previousSelectedCategory, colorScale, stackedArea, tooltip, dataType } = config
  const containerSelection = d3.select(container)

  // Exit old paths immediately
  paths.exit().remove()

  // Enter new paths
  const enterSelection = paths.enter()
    .append('path')
    .attr('class', 'area')
    .attr('fill', (d: any) => colorScale(d.key))
    .attr('d', (d: any) => {
      // If this is the previously selected category, start from its single area shape
      if (previousSelectedCategory && d.key === previousSelectedCategory) {
        const previousPath = containerSelection.selectAll('path.area')
          .filter((p: any) => p.key === previousSelectedCategory)
        return !previousPath.empty() ? previousPath.attr('d') || '' : stackedArea(d)
      }
      return stackedArea(d)
    })
    .attr('opacity', previousSelectedCategory ? 0 : 1)

  // Update paths
  const mergedSelection = enterSelection.merge(paths)
  
  if (previousSelectedCategory) {
    // Transition when deselecting a category
    mergedSelection
      .transition()
      .duration(600)
      .attr('d', stackedArea)
      .attr('opacity', 1)
      .attr('fill', (d: any) => colorScale(d.key))
  } else {
    // Immediate update for date range changes
    mergedSelection
      .attr('d', stackedArea)
      .attr('opacity', 1)
      .attr('fill', (d: any) => colorScale(d.key))
  }

  setupTooltipHandlers(mergedSelection, tooltip)
}

function handleImmediateStackedUpdate(
  paths: d3.Selection<SVGPathElement, any, any, any>,
  container: Element,
  config: {
    colorScale: d3.ScaleOrdinal<string, string>
    stackedArea: d3.Area<any>
    tooltip: d3.Selection<any, any, any, any>
  }
) {
  const { colorScale, stackedArea, tooltip } = config

  // Exit old paths immediately
  paths.exit().remove()

  // Enter new paths
  const enterSelection = paths.enter()
    .append('path')
    .attr('class', 'area')
    .attr('fill', (d: any) => colorScale(d.key))
    .attr('d', stackedArea)
    .attr('opacity', 1)

  // Update existing paths immediately
  paths
    .attr('d', stackedArea)
    .attr('opacity', 1)
    .attr('fill', (d: any) => colorScale(d.key))

  setupTooltipHandlers(enterSelection.merge(paths), tooltip)
}
