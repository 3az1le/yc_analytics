import * as d3 from 'd3';
import 'd3-transition'; // Ensure .transition() is recognized
import { interpolatePath } from 'd3-interpolate-path';
import { BatchData } from '@/lib/processData'; // Adjust to your actual import
import { 
  createScales, 
  updateYScale, 
  addAxes, 
  Dimensions, 
  AxesConfig,
  validateDimensions,
  getChartBoundaries 
} from './chartUtils';

type ChartState = {
  data: BatchData[]
  dataType: 'industries' | 'tags'
  selectedCategory: string | null
  previousSelectedCategory: string | null
  colorScale: d3.ScaleOrdinal<string, string>
  categories: string[]
  isTransitioning?: boolean
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
    .x(d => (x(d.data.name) ?? 0))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5))

  const single = d3.area<any>()
    .x(d => (x(d.name) ?? 0) )
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
    .style('cursor', d => d.key === 'Other' ? 'default' : 'pointer')
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
    .on('click', (event: MouseEvent, d: any) => {
      event.preventDefault()
      event.stopPropagation()
      
      // Prevent clicking on "Other" category
      if (d.key === 'Other') return;
      
      // Create and dispatch a custom event for category selection
      const customEvent = new CustomEvent('categorySelect', {
        bubbles: true,
        detail: { category: d.key }
      })
      event.target?.dispatchEvent(customEvent)
    })
}

export function initializeChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chartId: string,
  dimensions: Dimensions,
  state: ChartState
) {
  validateDimensions(dimensions)

  const { width, height, margin } = dimensions
  const { xStart, xEnd, chartWidth } = getChartBoundaries(dimensions)

  svg.selectAll('*').remove()
  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)

  const clipId = `clip-${chartId}`
  svg.append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('x', xStart)
    .attr('y', margin.top)
    .attr('width', chartWidth)
    .attr('height', height - margin.top - margin.bottom)

  const chartContainer = svg.append('g').attr('class', 'chart-container')
  const areaContainer = chartContainer.append('g')
    .attr('class', 'area-container')
    .attr('clip-path', `url(#${clipId})`)

  return { chartContainer, areaContainer }
}

export function updateChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  dimensions: Dimensions,
  state: ChartState
) {
  validateDimensions(dimensions)

  const { data, dataType, selectedCategory, previousSelectedCategory, colorScale, categories } = state

  // Create scales and get consistent boundaries
  const { x, y, xStart, xEnd, chartWidth } = createScales(data, dimensions, dataType)
  updateYScale(y, data, selectedCategory, dataType)

  // Determine if we should use transitions
  const isTransitioning = selectedCategory !== null || previousSelectedCategory !== null

  // Update axes
  const chartContainer = svg.select('g.chart-container')
  if (isTransitioning) {
    chartContainer.selectAll('g')
      .filter(function() {
        return !d3.select(this).classed('area-container')
      })
      .transition()
      .duration(600)
      .style('opacity', 0)
      .remove()
  } else {
    chartContainer.selectAll('g')
      .filter(function() {
        return !d3.select(this).classed('area-container')
      })
      .remove()
  }
  
  // Add new axes with updated scales and consistent boundaries
  addAxes(
    chartContainer as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
    dimensions,
    { x, y, xStart, xEnd, chartWidth },
    { selectedCategory: selectedCategory || '', dataType, isTransitioning }
  )

  // Update areas
  const areaContainer = svg.select('g.area-container')
  drawStackedArea(areaContainer, data, categories, x, y, colorScale, {
    ...state,
    isTransitioning
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

  // Calculate category sizes and sort them
  const categorySums = new Map<string, number>()
  const nonOtherCategories = categories.filter(cat => cat !== 'Other')
  
  nonOtherCategories.forEach(category => {
    const total = d3.sum(data, d => {
      const categoryData = dataType === 'industries'
        ? d.percentage_industries_among_total_industries
        : d.percentage_tags_among_total_tags
      return categoryData[category] || 0
    })
    categorySums.set(category, total)
  })

  // Sort categories by size (excluding "Other")
  const sortedCategories = nonOtherCategories
    .sort((a, b) => (categorySums.get(b) || 0) - (categorySums.get(a) || 0))

  // Add "Other" at the end (will be on top of the stack)
  const orderedCategories = [...sortedCategories, 'Other']

  // Reassign colors to ensure adjacent categories have different colors
  const allColors = [...colorScale.range()]
  const firstColor = allColors[0] // Get the first color for "Other"
  const colorAssignments = new Map<string, string>()
  
  // First assign the first color to "Other"
  colorAssignments.set('Other', firstColor)
  
  // Then assign colors to the rest of the categories
  sortedCategories.forEach((category, index) => {
    if (index === 0) {
      // First category takes the first available color
      colorAssignments.set(category, allColors[0])
    } else {
      // For subsequent categories, find a color different from the previous one
      const previousColor = colorAssignments.get(sortedCategories[index - 1])
      const suitableColor = allColors.find(color => 
        color !== previousColor && 
        !Array.from(colorAssignments.values()).includes(color)
      ) || allColors[index % allColors.length] // Fallback if no suitable color found
      
      colorAssignments.set(category, suitableColor)
    }
  })

  // Update the color scale with new assignments
  colorScale.domain(orderedCategories)
    .range(orderedCategories.map(cat => colorAssignments.get(cat)!))

  // Create stack generator with ordered categories
  const stackGen = d3.stack<BatchData>()
    .keys(orderedCategories)
    .value((d, key) => {
      if (selectedCategory) {
        return dataType === 'industries'
          ? d.percentage_companies_per_industries[key] || 0
          : d.percentage_companies_per_tags[key] || 0
      }

      if (key === 'Other') {
        // Calculate Other as the remaining percentage to reach 100%
        const data = dataType === 'industries'
          ? d.percentage_industries_among_total_industries
          : d.percentage_tags_among_total_tags
        const sum = Object.entries(data || {})
          .filter(([k]) => k !== 'Other')
          .reduce((acc, [, value]) => acc + (value || 0), 0)
        return Math.max(0, 100 - sum)
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
      dataType,
      isUnselecting: true
    })
  } else {
    // For dataType changes or date range updates, update immediately without transition
    handleStackedViewTransition(paths, containerElement, {
      previousSelectedCategory,
      selectedCategory,
      colorScale,
      stackedArea,
      tooltip,
      dataType,
      isUnselecting: false
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
    isUnselecting?: boolean
  }
) {
  const { previousSelectedCategory, colorScale, stackedArea, tooltip, isUnselecting } = config
  const containerSelection = d3.select(container)

  // Exit old paths immediately
  paths.exit().remove()

  // Enter new paths
  const enterSelection = paths.enter()
    .append('path')
    .attr('class', 'area')
    .attr('fill', (d: any) => colorScale(d.key))
    .attr('d', stackedArea)
    .attr('opacity', isUnselecting ? 0 : 1)

  // Update paths
  const mergedSelection = enterSelection.merge(paths)
  
  if (isUnselecting) {
    // Only transition when explicitly unselecting a category
    mergedSelection
      .transition()
      .duration(600)
      .attr('d', stackedArea)
      .attr('opacity', 1)
      .attr('fill', (d: any) => colorScale(d.key))
  } else {
    // Immediate update for all other cases
    mergedSelection
      .attr('d', stackedArea)
      .attr('opacity', 1)
      .attr('fill', (d: any) => colorScale(d.key))
  }

  setupTooltipHandlers(mergedSelection, tooltip)
}


