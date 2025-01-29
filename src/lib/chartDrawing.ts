import * as d3 from 'd3';
import 'd3-transition'; // Ensure .transition() is recognized
import { interpolatePath } from 'd3-interpolate-path';
import { BatchData } from '@/lib/processData'; // Adjust to your actual import
import { createScales, calculateYDomain, addAxes } from '@/lib/chartUtils';
import { stack } from 'd3';

type AreaData = d3.Series<BatchData, string> & { data?: BatchData[] };

type ChartState = {
  data: BatchData[]
  dataType: 'industries' | 'tags'
  selectedCategory: string | null
  previousSelectedCategory: string | null
  colorScale: d3.ScaleOrdinal<string, string>
  categories: string[]
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
  dimensions: { width: number; height: number; margin: any },
  state: ChartState
) {
  const { width, height, margin } = dimensions
  // Clear any existing content
  svg.selectAll('*').remove()

  // Configure the SVG viewport
  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Create a clip path to ensure the chart doesn't overflow its bounds
  const clipId = `clip-${chartId}`
  svg.append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('x', margin.left)
    .attr('y', margin.top)
    .attr('width', width - margin.left - margin.right)
    .attr('height', height - margin.top - margin.bottom)

  // Create main container for the chart
  const chartContainer = svg.append('g')
    .attr('class', 'chart-container')

  // Create container for the area paths with clipping applied
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
  dimensions: { width: number; height: number; margin: any },
  state: ChartState
) {
  const { width, height, margin } = dimensions
  const { data, dataType, selectedCategory, previousSelectedCategory, colorScale, categories } = state

  // Create scales for x and y axes
  const { x } = createScales(data, width, height, margin, dataType)
  const yDomain = calculateYDomain(data, categories, selectedCategory, dataType)
  const y = d3.scaleLinear()
    .domain(yDomain)
    .range([height - margin.bottom, margin.top])

  // Update axes with transition
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
    x,
    y,
    height,
    margin,
    width,
    selectedCategory,
    dataType
  )

  // Update the stacked area chart
  const areaContainer = svg.select('g.area-container')
  drawStackedArea(areaContainer, data, categories, x, y, colorScale, dataType, selectedCategory, previousSelectedCategory)
}

/**
 * Draws the stacked area chart with transitions between different states.
 * Handles both stacked view and single category focus view.
 * 
 * @param container - The container element for the area paths
 * @param data - Array of batch data to visualize
 * @param categories - Array of category names
 * @param x - X-axis scale
 * @param y - Y-axis scale
 * @param color - Color scale for categories
 * @param dataType - Type of data being displayed (industries/tags)
 * @param selectedCategory - Currently selected category (if any)
 * @param previousSelectedCategory - Previously selected category (for transitions)
 */
export function drawStackedArea(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: BatchData[],
  categories: string[],
  x: d3.ScaleBand<string>,
  y: d3.ScaleLinear<number, number>,
  color: d3.ScaleOrdinal<string, string>,
  dataType: 'industries' | 'tags',
  selectedCategory: string | null,
  previousSelectedCategory: string | null
) {
  // Process data to include "Other" category
  const processedData = data.map(d => {
    const currentData = dataType === 'industries' 
      ? d.percentage_industries_among_total_industries 
      : d.percentage_tags_among_total_tags;

    const total = Object.values(currentData).reduce((sum, val) => sum + (val || 0), 0);
    const otherPercentage = Math.max(0, 100 - total);
    
    const newData = { ...d };
    if (dataType === 'industries') {
      newData.percentage_industries_among_total_industries = {
        ...currentData,
        Other: otherPercentage
      };
    } else {
      newData.percentage_tags_among_total_tags = {
        ...currentData,
        Other: otherPercentage
      };
    }
    return newData;
  });

  // Include "Other" in categories list
  const extendedCategories = [...categories, 'Other'];

  // Create stack generator
  const stack = d3.stack<BatchData>()
    .keys(extendedCategories)
    .value((d, key) => {
      if (selectedCategory) {
        // When category is selected, show percentage per companies
        return dataType === 'industries'
          ? d.percentage_companies_per_industries[key] || 0
          : d.percentage_companies_per_tags[key] || 0;
      } else {
        // In stacked view, show percentage among total
        const data = dataType === 'industries'
          ? d.percentage_industries_among_total_industries
          : d.percentage_tags_among_total_tags;
        return data[key] || 0;
      }
    });

  const stackedData = stack(processedData);

  // Create area generators for both stacked and single category views
  const area = d3.area<d3.SeriesPoint<BatchData>>()
    .x(d => (x(d.data.name) ?? 0) + x.bandwidth() / 2)
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const singleArea = d3.area<AreaData>()
    .x(d => (x(d.name) ?? 0) + x.bandwidth() / 2)
    .y0(() => y(0))
    .y1(d => {
      const value = selectedCategory ? d[dataType]?.[selectedCategory] || 0 : 0;
      return y(value);
    })
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Determine which data to bind based on view mode
  const boundData = selectedCategory
    ? [{ key: selectedCategory, index: 0, data } as AreaData]
    : stackedData;

  // Bind data to paths
  const paths = container.selectAll<SVGPathElement, AreaData>('path.area')
    .data(boundData, (d: any) => d.key);

  // Create tooltip if it doesn't exist
  let tooltip = d3.select('body').select('.area-tooltip')
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'area-tooltip')
  }

  // Add hover handlers to the paths
  const handleMouseOver = (event: MouseEvent, d: any) => {
    tooltip
      .classed('visible', true)
      .html(d.key)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`);
  };

  const handleMouseMove = (event: MouseEvent) => {
    tooltip
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`);
  };

  const handleMouseOut = () => {
    tooltip.classed('visible', false);
  };

  // Handle transitions based on view mode
  if (selectedCategory) {
    // First transition: fade out non-selected categories
    paths.exit()
      .filter(d => d.key !== selectedCategory)
      .transition()
      .duration(600)
      .attr('opacity', 0)
      .remove();

    // Keep the selected category's path
    const singleEnter = paths.enter()
      .append('path')
      .attr('class', 'area')
      .attr('d', d => {
        // If coming from stacked view (no previous category)
        if (!previousSelectedCategory) {
          const stackedPath = container.selectAll('path.area')
            .filter(p => p.key === selectedCategory);
          return !stackedPath.empty() ? stackedPath.attr('d') : area(d);
        }
        // If switching between categories
        const previousPath = container.selectAll('path.area')
          .filter(p => p.key === previousSelectedCategory);
        return !previousPath.empty() ? previousPath.attr('d') : area(d);
      })
      // .attr('opacity', 0);

    // Morph the selected category's path
    /// PROBLEM IS IN HERE !!!!!
    singleEnter.merge(paths)
      .transition()
      .duration(600)
      .attr('opacity', 1)
      .attrTween('d', function(d) {
        let prevD = '';
        
       
        // If switching between categories
        const previousPath = container.selectAll('path.area')
          .filter(p => p.key === selectedCategory);
        prevD = !previousPath.empty() ? previousPath.attr('d') : '';
      
        
        const newD = singleArea(d.data!);
        return interpolatePath(prevD, newD);
      })
      .attr('fill', d => color(d.key));

    // Add the handlers to both enter and update selections
    singleEnter.merge(paths)
      .style('cursor', 'pointer')
      .on('mouseover', handleMouseOver)
      .on('mousemove', handleMouseMove)
      .on('mouseout', handleMouseOut);
  } else {
    // When returning to stacked view
    const wasShowingSingleCategory = previousSelectedCategory !== null;
    
    // EXIT old paths
    paths.exit()
      .transition()
      .duration(400)
      // .attr('opacity', 0)
      .remove();

    // ENTER new stacked paths
    const enterSelection = paths.enter()
      .append('path')
      .attr('class', 'area')
      .attr('fill', (d: AreaData) => color(d.key))
      .style('cursor', 'pointer')
      .on('mouseover', handleMouseOver)
      .on('mousemove', handleMouseMove)
      .on('mouseout', handleMouseOut)
      .attr('d', (d: AreaData) => {
        if (wasShowingSingleCategory && d.key === previousSelectedCategory) {
          const previousPath = container.selectAll<SVGPathElement, AreaData>('path.area')
            .filter(p => p.key === previousSelectedCategory);
          return !previousPath.empty() ? previousPath.attr('d') : area(d);
        }
        return area(d);
      });

    // MERGE + UPDATE
    //if previous selected category, transition, else no transition
    if (previousSelectedCategory) {
      enterSelection.merge(paths)
        .transition()
        .duration(600)
        .attr('fill', (d: AreaData) => color(d.key))
        .attr('d', (d: AreaData) => area(d))
        .attr('opacity', 1);
    } else if (previousSelectedCategory && !selectedCategory) {
      enterSelection.merge(paths)
        .attr('fill', (d: AreaData) => color(d.key))
        .attr('d', (d: AreaData) => area(d))
        .attr('opacity', 1);
    }
  }
}
