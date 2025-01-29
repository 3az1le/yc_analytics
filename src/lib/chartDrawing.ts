import * as d3 from 'd3';
import 'd3-transition'; // Ensure .transition() is recognized
import { interpolatePath } from 'd3-interpolate-path';
import { BatchData } from '@/lib/processData'; // Adjust to your actual import
import { createScales, calculateYDomain, addAxes } from '@/lib/chartUtils';

type AreaData = d3.Series<BatchData, string> & { data?: BatchData[] };

type ChartState = {
  data: BatchData[]
  dataType: 'industries' | 'tags'
  selectedCategory: string | null
  previousSelectedCategory: string | null
  colorScale: d3.ScaleOrdinal<string, string>
  categories: string[]
}

export function initializeChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  chartId: string,
  dimensions: { width: number; height: number; margin: any },
  state: ChartState
) {
  const { width, height, margin } = dimensions
  svg.selectAll('*').remove()

  // Set explicit SVG dimensions
  svg
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // Add clip path
  const clipId = `clip-${chartId}`
  svg.append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('x', margin.left)
    .attr('y', margin.top)
    .attr('width', width - margin.left - margin.right)
    .attr('height', height - margin.top - margin.bottom)

  // Create containers
  const chartContainer = svg.append('g')
    .attr('class', 'chart-container')

  const areaContainer = chartContainer.append('g')
    .attr('class', 'area-container')
    .attr('clip-path', `url(#${clipId})`)
  
  
  return { chartContainer, areaContainer }
}

export function updateChart(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  dimensions: { width: number; height: number; margin: any },
  state: ChartState
) {
  const { width, height, margin } = dimensions
  const { data, dataType, selectedCategory, previousSelectedCategory, colorScale, categories } = state

  const { x } = createScales(data, width, height, margin, dataType)
  const yDomain = calculateYDomain(data, categories, selectedCategory, dataType)
  const y = d3.scaleLinear()
    .domain(yDomain)
    .range([height - margin.bottom, margin.top])

  // Update axes
  const chartContainer = svg.select('g.chart-container')
  chartContainer.selectAll('g')
    .filter(function() {
      return !d3.select(this).classed('area-container')
    })
    .remove()
  
  addAxes(
    chartContainer as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
    x,
    y,
    height,
    margin,
    width
  )

  // Update areas
  const areaContainer = svg.select('g.area-container')

  drawStackedArea(areaContainer, data, categories, x, y, colorScale, dataType, selectedCategory, previousSelectedCategory)
  
}

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
  // Guard if no valid data
  if (!data?.[0]?.[dataType]) return;

  // Build stacked data
  const stack = d3.stack<BatchData>()
    .keys(categories)
    .value((d, key) => d[dataType]?.[key] || 0);

  const stackedData = stack(data);

  // Area generator for stacked
  const area = d3.area<d3.SeriesPoint<BatchData>>()
    .x(d => (x(d.data.name) ?? 0) + x.bandwidth() / 2)
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Area generator for single category
  const singleArea = d3.area<AreaData>()
    .x(d => (x(d.name) ?? 0) + x.bandwidth() / 2)
    .y0(() => y(0))
    .y1(d => {
      // Only selectedCategory gets a non-zero height
      const value = selectedCategory ? d[dataType]?.[selectedCategory] || 0 : 0;
      return y(value);
    })
    .curve(d3.curveCatmullRom.alpha(0.5));

  /**
   * Data bound to paths changes depending on whether we're in "stacked" mode
   * or focusing on a single category.
   */
  const boundData = selectedCategory
    ? [{ key: selectedCategory, index: 0, data } as AreaData]
    : stackedData;

  const paths = container.selectAll<SVGPathElement, AreaData>('path.area')
    .data(boundData, (d: any) => d.key);

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
      // .attr('opacity', 0)
      .attr('d', (d: AreaData) => {
        // If coming from single category view, start from that shape
        if (wasShowingSingleCategory && d.key === previousSelectedCategory) {
          const previousPath = container.selectAll<SVGPathElement, AreaData>('path.area')
            .filter(p => p.key === previousSelectedCategory);
          return !previousPath.empty() ? previousPath.attr('d') : area(d);
        }
        return area(d);
      });

    // MERGE + UPDATE
    enterSelection.merge(paths)
      .transition()
      .duration(600)
      .attr('fill', (d: AreaData) => color(d.key))
      .attr('d', (d: AreaData) => area(d))
      .attr('opacity', 1);
  }
}
