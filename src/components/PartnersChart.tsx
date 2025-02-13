import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import '@/styles/components/chart.css';

const orangeScale = [
  '#C2C091',
  '#F9F264', 
  '#FFF52B', 
  '#BE120C',
  '#F8D1BF', 
  '#EC9065', 
  '#FC844B', 
  '#FF0900', 
  '#D44400', 
  '#9E461C',  
  '#E9E9E9', 
  '#828282', 
  '#000000', 
];

interface Company {
  company_name: string;
  team_size: number;
}

interface BatchData {
  [key: string]: Company[];
}

interface PartnerData {
  bybatch: BatchData;
}

interface PartnersData {
  [key: string]: PartnerData;
}

interface PartnersChartProps {
  data: PartnersData;
  dateRange: [number, number];
}

interface CompanyNode extends Company {
  cluster: number;
  partnerId: string;
  radius: number;
  x: number;
  y: number;
  cellX: number;
  cellY: number;
  cellWidth: number;
  cellHeight: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

const PartnersChart = ({ data, dateRange }: PartnersChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const [toolkitVisible, setToolkitVisible] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          // Reset zoom when chart comes back into view
          if (entry.isIntersecting && svgRef.current && zoomRef.current) {
            const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
            svg.transition()
              .duration(750)
              .call(zoomRef.current.transform as any, d3.zoomIdentity);
          }
        });
      },
      {
        threshold: 0.1 // Trigger when at least 10% of the element is visible
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || !containerRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup dimensions with adjusted margins for better visibility
    const containerWidth = containerRef.current.clientWidth;
    const width = Math.min(containerWidth, 1200);
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };
    const innerWidth = width - margin.left - margin.right;
    
    // Get total number of partners first (unfiltered)
    const totalPartners = Object.keys(data).length;
    
    // Calculate layout dimensions based on total partners
    const isMobile = width < 768;
    const cols = isMobile ? 3 : 4;
    const rows = Math.ceil(totalPartners / cols);
    const cellWidth = (width - margin.left - margin.right) / cols;
    
    // Calculate cell height based on viewport height (70vh)
    const availableHeight = window.innerHeight * 0.7;
    const cellHeight = (availableHeight - margin.top - margin.bottom) / rows;
    const totalHeight = cellHeight * rows + margin.top + margin.bottom;
    
    // Calculate bubble size scaling factor based on the smaller of cell dimensions
    const bubbleScale = Math.min(cellWidth, cellHeight) * 0.0032;
    
    // Create SVG with dynamic height and zoom behavior
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current)
      .attr('width', width)
      .attr('height', '70vh');

    // Add a container group for proper margin handling and zooming
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Initialize zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.9, 4])
      .translateExtent([
        [-width/2, -window.innerHeight * 0.7/2], // Adjust translate extent based on viewport height
        [width * 1.5, window.innerHeight * 0.7 * 1.5]
      ])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // Store zoom reference for resetting later
    zoomRef.current = zoom;

    // Apply zoom behavior
    svg.call(zoom);

    // Set initial transform
    svg.call(zoom.transform as any, d3.zoomIdentity);

    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(Object.keys(data).map((_, i) => i.toString()))
      .range(orangeScale);

    const spacing = Math.min(cellWidth, cellHeight) * 0.5;

    // Create company nodes with better initial positions
    const companyNodes: CompanyNode[] = Object.entries(data).map(([name, partnerData]) => {
      const companies = Object.entries(partnerData.bybatch)
        .filter(([batchName]) => {
          const year = 2000 + parseInt(batchName.slice(-2));
          return year >= dateRange[0] && year <= dateRange[1];
        })
        .flatMap(([_, companies]) => companies);
      return { name, companies };
    }).filter(partner => partner.companies.length > 0).flatMap((partner, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const centerPosX = col * cellWidth + cellWidth / 2;
      const centerPosY = row * cellHeight + cellHeight / 2;

      return partner.companies.map((company, j) => {
        const angle = (j / partner.companies.length) * 2 * Math.PI;
        const spiralRadius = Math.min(spacing * 0.4, 
          (Math.sqrt(j + 1) / Math.sqrt(partner.companies.length)) * spacing * 0.8);
        
        return {
          ...company,
          cluster: i,
          partnerId: partner.name,
          radius: Math.sqrt(company.team_size) * bubbleScale,
          x: centerPosX + Math.cos(angle) * spiralRadius,
          y: centerPosY + Math.sin(angle) * spiralRadius,
          cellX: col * cellWidth,
          cellY: row * cellHeight,
          cellWidth,
          cellHeight,
          vx: 0,
          vy: 0
        };
      });
    });

    // Create company circles
    const companies = g.selectAll<SVGCircleElement, CompanyNode>('.company-node')
      .data(companyNodes)
      .join('circle')
      .attr('class', 'company-node')
      .attr('r', d => d.radius)
      .style('fill', d => colorScale(d.cluster.toString()) as string)
      .style('opacity', 0.8)
      .style('cursor', 'grab')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);


    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden');

    // Function to position tooltip within viewport bounds
    const positionTooltip = (event: MouseEvent, content: string) => {
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

    // Add hover interactions
    companies
      .on('mouseover', (event, d) => {
        positionTooltip(
          event, 
          `${d.company_name}<br>Team size: ${d.team_size}<br>Partner: ${d.partnerId}`
        );
      })
      .on('mousemove', (event, d) => {
        positionTooltip(
          event,
          `${d.company_name}<br>Team size: ${d.team_size}<br>Partner: ${d.partnerId}`
        );
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

    // Setup simulation with adjusted forces
    const simulation = d3.forceSimulation(companyNodes)
      .stop(); // Stop initial simulation

    // Function to run simulation for a single partner's grid cell
    const runGridSimulation = async (partnerIndex: number) => {
      const partnerNodes = companyNodes.filter(node => node.cluster === partnerIndex);
      if (partnerNodes.length === 0) return;

      // Reset positions to initial spiral layout
      const col = partnerIndex % cols;
      const row = Math.floor(partnerIndex / cols);
      const centerPosX = col * cellWidth + cellWidth / 2;
      const centerPosY = row * cellHeight + cellHeight / 2;

      partnerNodes.forEach((node, j) => {
        const angle = (j / partnerNodes.length) * 2 * Math.PI;
        const spiralRadius = Math.min(spacing * 0.4,
          (Math.sqrt(j + 1) / Math.sqrt(partnerNodes.length)) * spacing * 0.8);
        node.x = centerPosX + Math.cos(angle) * spiralRadius;
        node.y = centerPosY + Math.sin(angle) * spiralRadius;
      });

      // Create local simulation for this grid
      const localSimulation = d3.forceSimulation(partnerNodes)
        .alphaDecay(0.2) // Much slower decay for 6th partner
        .velocityDecay( 0.6) // Less velocity decay for more movement
        .alpha(0.5) // Higher initial alpha for longer simulation
        .force('cluster', (alpha) => {
          const k = alpha * 0.4; // Gentler force for longer movement
          for (let node of partnerNodes) {
            const targetX = node.cellX + cellWidth / 2;
            const targetY = node.cellY + cellHeight / 2;
            node.vx = (node.vx || 0) + (targetX - node.x) * k;
            node.vy = (node.vy || 0) + (targetY - node.y) * k;
          }
        })
        .force('collide', d3.forceCollide((d: CompanyNode) => d.radius + 1).iterations(10))
        .force('bound', () => {
          for (let node of partnerNodes) {
            const padding = node.radius;
            node.x = Math.max(node.cellX + padding,
                      Math.min(node.cellX + cellWidth - padding, node.x));
            node.y = Math.max(node.cellY + padding,
                      Math.min(node.cellY + cellHeight - padding, node.y));
          }
        });

      // Update positions during simulation
      localSimulation.on('tick', () => {
        svg.selectAll<SVGCircleElement, CompanyNode>('.company-node')
          .filter(d => d.cluster === partnerIndex)
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
      });

      // Wait for simulation to complete or force end after 5 seconds
      await Promise.race([
        new Promise<void>(resolve => {
          localSimulation.on('end', () => {
            localSimulation.stop();
            resolve();
          });
        }),
        new Promise<void>(resolve => setTimeout(() => {
          localSimulation.stop();
          resolve();
        }, 5000))
      ]);
    };

    // Run simulations sequentially
    const runAllSimulations = async () => {
      for (let i = 0; i < companyNodes.length; i += 2) {
        // Run two simulations in parallel
        const promises = [
          runGridSimulation(i),
          // Only run second simulation if there is a partner left
          i + 1 < companyNodes.length ? runGridSimulation(i + 1) : Promise.resolve()
        ];
        await Promise.all(promises);
      }
    };

    // Store simulation reference (for cleanup)
    simulationRef.current = simulation;

    // Run simulations once when component mounts
    runAllSimulations();

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, dateRange]);

  useEffect(() => {
    const handleResize = () => {
      // Re-render chart when window resizes
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        if (svgRef.current) {
          const width = Math.min(containerWidth, 1200);
          d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', '70vh');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create legend component
  const Legend = () => {
    const legendWrapperRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
      const element = legendWrapperRef.current?.querySelector('.partners-legend-scroll') as HTMLElement;
      if (element) {
        const canScrollLeft = element.scrollLeft > 0;
        const canScrollRight = element.scrollLeft < (element.scrollWidth - element.clientWidth - 1);
        
        setCanScrollLeft(canScrollLeft);
        setCanScrollRight(canScrollRight);
      }
    }, []);

    useEffect(() => {
      const element = legendWrapperRef.current?.querySelector('.partners-legend-scroll') as HTMLElement;
      if (element) {
        element.addEventListener('scroll', checkScroll);
        // Initial check
        checkScroll();
        
        // Check on resize
        const resizeObserver = new ResizeObserver(checkScroll);
        resizeObserver.observe(element);

        return () => {
          element.removeEventListener('scroll', checkScroll);
          resizeObserver.disconnect();
        };
      }
    }, [checkScroll]);

    const activePartners = Object.entries(data)
      .filter(([_, partnerData]) => {
        const hasCompaniesInRange = Object.entries(partnerData.bybatch)
          .some(([batchName]) => {
            const year = 2000 + parseInt(batchName.slice(-2));
            return year >= dateRange[0] && year <= dateRange[1];
          });
        return hasCompaniesInRange;
      })
      .map(([name]) => name);

    const colorScale = d3.scaleOrdinal()
      .domain(activePartners.map((_, i) => i.toString()))
      .range(orangeScale);

    return (
      <div 
        ref={legendWrapperRef}
        className={`partner-legend ${canScrollLeft ? 'can-scroll-left' : ''} ${canScrollRight ? 'can-scroll-right' : ''}`}
      >
        <div className="partners-legend-scroll">
          <div>
            {activePartners.map((partner, i) => (
              <div key={partner} className="partner-legend-item">
                <div 
                  className="partner-legend-color" 
                  style={{ backgroundColor: colorScale(i.toString()) as string }} 
                />
                <span>{partner}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    
    <div 
      ref={containerRef}
      className="partners-chart-container" 
      style={{ width: '90vw', position: 'relative', margin: '0 auto' }}
      onMouseEnter={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(true); }}
      onMouseLeave={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(false); }}
      onClick={() => { if(!window.matchMedia('(hover: hover)').matches) setToolkitVisible(prev => !prev); }}
    >
      <div className="partners-chart-wrapper">
        <svg ref={svgRef}></svg>
      </div>
      <Legend />
    </div>
  );
};

export default PartnersChart; 