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
  const containerRef = useRef<HTMLDivElement>(null)
  const [worldData, setWorldData] = useState<any>(null)
  const [toolkitVisible, setToolkitVisible] = useState(false)
  const gRef = useRef<SVGGElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  // Load GeoJSON data only once when component mounts
  useEffect(() => {
    d3.json('/filtered_countries.geojson').then((data: any) => {
      setWorldData(data)
    })
  }, [])

  // Initialize Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting)
          // Reset zoom when map comes back into view
          if (entry.isIntersecting && mapRef.current && zoomRef.current) {
            const svg = d3.select<SVGSVGElement, unknown>(mapRef.current)
            svg.transition()
              .duration(750)
              .call(zoomRef.current.transform as any, d3.zoomIdentity)
          }
        })
      },
      {
        threshold: 0.1 // Trigger when at least 10% of the element is visible
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Initialize zoom behavior with simplified settings
  useEffect(() => {
    if (!mapRef.current || !gRef.current) return

    const svg = d3.select<SVGSVGElement, unknown>(mapRef.current)
    const g = d3.select(gRef.current)

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    // Store zoom reference for resetting later
    zoomRef.current = zoom

    svg.call(zoom)

    // Set initial transform
    svg.call(zoom.transform as any, d3.zoomIdentity)
  }, [])

  // Memoize the update function
  const updateMap = useMemo(() => {
    return (data: BatchData[], dateRange: [number, number], worldData: any) => {
      if (!mapRef.current || !gRef.current || !data?.length || !worldData) return

      const svg = d3.select(mapRef.current)
      const width = svg.node()?.getBoundingClientRect().width || 1200
      const height = svg.node()?.getBoundingClientRect().height || 800

      // Adjust scale and center based on screen size
      const isMobile = width < 768
      const scale = isMobile ? 200 : 200
      const center: [number, number] = isMobile ? [-100, 66] : [-15, 56]

      const projection = d3.geoMercator()
        .scale(scale)
        .center(center)
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

        let left = event.pageX + 10;
        let top = event.pageY - 10;

        if (left + tooltipRect.width > viewportWidth) {
          left = event.pageX - tooltipRect.width - 10;
        }

        if (top + tooltipRect.height > viewportHeight) {
          top = event.pageY - tooltipRect.height - 10;
        }

        left = Math.max(10, left);
        top = Math.max(10, top);

        tooltip
          .style('left', left + 'px')
          .style('top', top + 'px');
      };

      const g = d3.select(gRef.current)
      
      // Update paths
      const paths = g.selectAll('path')
        .data(worldData.features)
        .join('path')
        .attr('d', path as any)
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

      // Add event listeners to the paths in g
      paths
        .on('mouseover', (event, d: any) => {
          const count = locationCounts.get(d.properties.ISO_A3) || 0
          if (count > 0) {
            d3.select(event.currentTarget)
              .transition()
              .duration(50)
              .attr('stroke', '#000')
              .attr('stroke-width', 0.5)
            
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
            .duration(50)
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
    <div 
      ref={containerRef}
      className="visualization-container"
      onMouseEnter={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(true); }}
      onMouseLeave={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(false); }}
      onClick={() => { if(!window.matchMedia('(hover: hover)').matches) setToolkitVisible(prev => !prev); }}
      style={{ position: 'relative', width: '90vw', margin: '0 auto' }}
    >
      <div className="visualization-header">
        <h2 className="chart-title">Geographic Distribution</h2>
      </div>
      <div className="map-wrapper">
        <svg
          ref={mapRef}
          width="100%"
          height="100%"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid meet"
        >
          <g ref={gRef}></g>
        </svg>
      </div>
    </div>
  )
} 