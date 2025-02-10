'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { BatchData } from '@/lib/processData'
import { processLocations } from '@/lib/mapUtils'
import '@/styles/layouts/map.css'

type DensityMapProps = {
  data: BatchData[]
  dateRange: [number, number]
}

export default function DensityMap({ data, dateRange }: DensityMapProps) {
  const mapRef = useRef<SVGSVGElement>(null)
  const [worldData, setWorldData] = useState<any>(null)
  const [toolkitVisible, setToolkitVisible] = useState(false);

  // Load GeoJSON data only once when component mounts
  useEffect(() => {
    d3.json('/filtered_countries.geojson').then((data: any) => {
      setWorldData(data)
    })
  }, [])

  // Memoize the update function
  const updateMap = useMemo(() => {
    return (data: BatchData[], dateRange: [number, number], worldData: any) => {
      if (!mapRef.current || !data?.length || !worldData) return

      const svg = d3.select(mapRef.current)
      const width = 1200
      const height = 600

      const projection = d3.geoMercator()
        .scale(180)
        .center([0, 20])
        .translate([width / 2, height / 2])

      const path = d3.geoPath().projection(projection)

      // Aggregate location data
      const locationCounts = new Map<string, number>()
      data.forEach(batch => {
        const year = 2000 + parseInt(batch.name.slice(-2))
        if (year >= dateRange[0] && year <= dateRange[1]) {
          Object.entries(batch.locations).forEach(([country, count]) => {
            const current = locationCounts.get(country) || 0
            locationCounts.set(country, current + count)
          })
        }
      })

      // Create logarithmic color scale
      const maxCount = Math.max(...Array.from(locationCounts.values()))
      const colorScale = d3.scaleLog()
        .domain([1, maxCount])
        .range(['#ffeae1', '#DC510F'] as any)
        .clamp(true)

      // Function to position tooltip within viewport bounds
      const positionTooltip = (event: MouseEvent, content: string) => {
        const tooltip = d3.select('.map-tooltip');
        tooltip
          .style('visibility', 'visible')
          .html(content);

        const tooltipNode = tooltip.node() as HTMLElement;
        const tooltipRect = tooltipNode.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate position
        let left = event.pageX + 10;
        let top = event.pageY - 10;

        // Adjust if tooltip would go off right edge
        if (left + tooltipRect.width > viewportWidth) {
          left = event.pageX - tooltipRect.width - 10;
        }

        // Adjust if tooltip would go off bottom edge
        if (top + tooltipRect.height > viewportHeight) {
          top = event.pageY - tooltipRect.height - 10;
        }

        // Ensure tooltip doesn't go off left or top edge
        left = Math.max(10, left);
        top = Math.max(10, top);

        tooltip
          .style('left', left + 'px')
          .style('top', top + 'px');
      };

      // Initial setup of paths if they don't exist
      if (svg.select('path').empty()) {
        svg.selectAll('path')
          .data(worldData.features)
          .join('path')
          .attr('d', path as any)
          .attr('fill', '#ffffff')
      }

      // Update paths with transition
      svg.selectAll('path')
        .data(worldData.features)
        .transition()
        .duration(750)
        .attr('fill', (d: any) => {
          const count = locationCounts.get(d.properties.ISO_A3) || 0
          return count > 0 ? colorScale(count) : '#ffffff'
        })

      // Create tooltip if it doesn't exist
      d3.select('body')
        .selectAll('.map-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'map-tooltip')
        .style('visibility', 'hidden');

      // Add event listeners
      svg.selectAll('path')
        .on('mouseover', (event, d: any) => {
          const count = locationCounts.get(d.properties.ISO_A3) || 0
          if (count > 0) {
            d3.select(event.currentTarget)
              .transition()
              .duration(150)
              .attr('stroke', '#000')
              .attr('stroke-width', 1)
            
            const countryName = d.properties.ADMIN === 'United States of America' ? 'USA' : d.properties.ADMIN;
            positionTooltip(event, `${countryName}: ${count} companies`);
          }
        })
        .on('mousemove', (event, d: any) => {
          const count = locationCounts.get(d.properties.ISO_A3) || 0
          if (count > 0) {
            const countryName = d.properties.ADMIN === 'United States of America' ? 'USA' : d.properties.ADMIN;
            positionTooltip(event, `${countryName}: ${count} companies`);
          }
        })
        .on('mouseout', (event) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(150)
            .attr('stroke', null)
            .attr('stroke-width', null)
          
          d3.select('.map-tooltip').style('visibility', 'hidden')
        })
    }
  }, [])

  // Update map when data, date range, or world data changes
  useEffect(() => {
    if (worldData) {
      updateMap(data, dateRange, worldData)
    }
  }, [data, dateRange, worldData, updateMap])

  return (
    <div className="visualization-container"
         onMouseEnter={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(true); }}
         onMouseLeave={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(false); }}
         onClick={() => { if(!window.matchMedia('(hover: hover)').matches) setToolkitVisible(prev => !prev); }}
         style={{ position: 'relative' }}>
      <div className="visualization-header">
        <h2 className="chart-title">Geographic Distribution</h2>
      </div>
      <svg
        ref={mapRef}
        width="1200"
        height="600"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  )
} 