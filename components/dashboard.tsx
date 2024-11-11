'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, ZoomIn, ZoomOut, Maximize2, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const queryClient = new QueryClient()

function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const { theme, setTheme } = useTheme()
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [selectedResources, setSelectedResources] = useState({})
  const [mounted, setMounted] = useState(false)
  const [apiResources, setApiResources] = useState([])
  const [quickAccessResources, setQuickAccessResources] = useState([])
  const [showYaml, setShowYaml] = useState(false)

  const { data: resourceTypes, isLoading: isLoadingResources, error: resourceTypesError } = useQuery({
    queryKey: ['resourceTypes'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8080/')
      if (!response.ok) {
        throw new Error('Failed to fetch resource types')
      }
      return response.json()
    },
  })

  useEffect(() => {
    if (resourceTypes) {
      const commonResources = [
        'pods', 'deployments', 'services', 'configmaps', 'secrets', 'ingresses',
        'namespaces', 'persistentvolumeclaims', 'horizontalpodautoscalers', 'cronjobs'
      ]

      setQuickAccessResources(
        resourceTypes.filter(type => commonResources.includes(type.toLowerCase()))
      )

      const groupedResources = {
        'Core (v1)': resourceTypes.filter(type =>
          ['pods', 'services', 'namespaces', 'configmaps', 'secrets'].includes(type.toLowerCase())
        ),
        'Apps': resourceTypes.filter(type =>
          ['deployments', 'statefulsets', 'daemonsets'].includes(type.toLowerCase())
        ),
        'Other': resourceTypes.filter(type =>
          !commonResources.includes(type.toLowerCase())
        )
      }
      setApiResources(groupedResources)
    }
  }, [resourceTypes])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleZoom = useCallback((delta: number) => {
    setZoomLevel((prevZoom) => Math.max(0.5, Math.min(2, prevZoom + delta)))
  }, [])

  useHotkeys('ctrl+=', () => handleZoom(0.1), [handleZoom])
  useHotkeys('ctrl+-', () => handleZoom(-0.1), [handleZoom])
  useHotkeys('ctrl+0', () => setZoomLevel(1), [])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullScreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullScreen(false)
      }
    }
  }

  const toggleResourceSelection = (resourceType: string) => {
    console.log('Before toggle:', selectedResources)
    setSelectedResources(prev => {
      const newState = {
        ...prev,
        [resourceType]: !prev[resourceType]
      }
      console.log('After toggle:', newState)
      return newState
    })
  }

  const handleResourceClick = async (resource) => {
    try {
      const response = await fetch(`http://localhost:8080/details/${resource.type.toLowerCase()}/${resource.name}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch details for ${resource.type}/${resource.name}`)
      }
      const details = await response.json()
      setSelectedResource({
        ...resource,
        details
      })
    } catch (error) {
      console.error('Error fetching resource details:', error)
    }
  }

  const { data: resources, isLoading: isLoadingResourceList, error: resourcesError } = useQuery({
    queryKey: ['resources', selectedResources],
    queryFn: async () => {
      const selectedTypes = Object.entries(selectedResources)
        .filter(([_, isSelected]) => isSelected)
        .map(([type]) => type)

      console.log('Selected types:', selectedTypes)

      if (selectedTypes.length === 0) return []

      const results = []
      for (const type of selectedTypes) {
        try {
          console.log(`Fetching ${type}...`)
          const response = await fetch(`http://localhost:8080/list/${type.toLowerCase()}`)
          if (!response.ok) {
            throw new Error(`Failed to fetch ${type}`)
          }
          const names = await response.json()
          console.log(`Response for ${type}:`, names)

          const resources = names.map(name => ({
            id: `${type}-${name}`,
            type: type,
            name: name,
            namespace: 'default'
          }))
          results.push({ type, resources })
        } catch (error) {
          console.error(`Error fetching ${type}:`, error)
        }
      }
      console.log('Final results:', results)
      return results
    },
    enabled: Object.values(selectedResources).some(v => v)
  })

  const filteredResources = useMemo(() => {
    console.log('Resources in memo:', resources)
    if (!resources) return []

    const result = resources
      .flatMap(({ type, resources }) => resources)
      .filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    console.log('Filtered resources:', result)
    return result
  }, [resources, searchTerm])

  const resourceTypeColors = useMemo(() => ({
    pods: '#FF6B6B',         // Red
    deployments: '#4ECDC4',  // Teal
    services: '#45B7D1',     // Blue
    configmaps: '#96CEB4',   // Sage Green
    secrets: '#FFEEAD',      // Light Yellow
    ingresses: '#D4A5A5',    // Dusty Rose
    namespaces: '#9FA8DA',   // Light Purple
    persistentvolumeclaims: '#FFD93D', // Yellow
    horizontalpodautoscalers: '#95E1D3', // Mint
    cronjobs: '#A8E6CF',     // Light Green
    default: '#A9A9A9'       // Grey for any undefined types
  }), [])

  const calculatePosition = (index: number, total: number) => {
    const columns = 3
    const row = Math.floor(index / columns)
    const col = index % columns

    const itemWidth = 25
    const itemHeight = 15
    const horizontalSpacing = 5
    const verticalSpacing = 5

    return {
      left: `${col * (itemWidth + horizontalSpacing)}%`,
      top: `${row * (itemHeight + verticalSpacing)}%`,
      width: `${itemWidth}%`,
      position: 'absolute' as const,
    }
  }

  if (isLoadingResources) return <div>Loading resources...</div>
  if (isLoadingResourceList) return <div>Loading resources...</div>
  if (resourceTypesError) return <div>Error: {resourceTypesError.message}</div>
  if (resourcesError) return <div>Error: {resourcesError.message}</div>

  console.log('Selected Resources:', selectedResources)
  console.log('Filtered Resources:', filteredResources)

  return (
    <div className={`flex h-screen ${mounted && theme === 'dark' ? 'dark' : ''}`}>
      <div className="w-64 p-4 border-r overflow-auto bg-background text-foreground">
        <Input
          type="search"
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="quick-access">
            <AccordionTrigger>Quick Access</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {quickAccessResources.map(resource => (
                  <Toggle
                    key={resource}
                    pressed={selectedResources[resource] || false}
                    onPressedChange={() => {
                      console.log('Toggle pressed for:', resource)
                      toggleResourceSelection(resource)
                    }}
                  >
                    {resource}
                  </Toggle>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="all-objects">
            <AccordionTrigger>All Objects</AccordionTrigger>
            <AccordionContent>
              {Object.entries(apiResources).map(([group, resources]) => (
                <Accordion type="multiple" className="w-full" key={group}>
                  <AccordionItem value={group}>
                    <AccordionTrigger>{group}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {resources.map(resource => (
                          <Toggle
                            key={resource}
                            pressed={selectedResources[resource] || false}
                            onPressedChange={() => toggleResourceSelection(resource)}
                          >
                            {resource}
                          </Toggle>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="flex-1 p-4 overflow-hidden bg-background text-foreground">
        <div className="flex justify-between mb-4">
          <div>
            <Button onClick={() => handleZoom(0.1)} className="mr-2">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button onClick={() => handleZoom(-0.1)} className="mr-2">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button onClick={() => setZoomLevel(1)} className="mr-2">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button onClick={toggleFullScreen}>
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </Button>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle dark mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="border rounded-lg p-4 h-[calc(100vh-12rem)] overflow-hidden">
          <motion.div
            style={{
              scale: zoomLevel,
              transition: 'scale 0.2s',
            }}
            className="w-full h-full bg-accent/20 rounded-md relative"
          >
            {filteredResources.length === 0 ? (
              <div>No resources found</div>
            ) : (
              filteredResources.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  layout
                  initial={false}
                  className="absolute p-2 rounded-md shadow-md cursor-pointer"
                  style={{
                    ...calculatePosition(index, filteredResources.length),
                    backgroundColor: resourceTypeColors[resource.type.toLowerCase()] || resourceTypeColors.default,
                  }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleResourceClick(resource)}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '100%' }}>
                          {resource.name}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{resource.type}</p>
                        <p>Namespace: {resource.namespace}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </div>
      {selectedResource && (
        <Card className="w-96 p-4 m-4 bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-xl font-bold">{selectedResource.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Type:</span>
                  <span>{selectedResource.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Namespace:</span>
                  <span>{selectedResource.namespace}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">API Version:</span>
                  <span>{selectedResource.details?.apiVersion}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">Kind:</span>
                  <span>{selectedResource.details?.kind}</span>
                </div>
              </div>

              {selectedResource.details?.metadata?.labels && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Labels:</h3>
                  <div className="pl-4 space-y-1">
                    {Object.entries(selectedResource.details.metadata.labels).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{key}:</span>
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowYaml(!showYaml)}
              >
                {showYaml ? 'Hide YAML' : 'Show YAML'}
              </Button>

              {showYaml && (
                <div className="mt-4">
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre">
                    <code>
                      {JSON.stringify(selectedResource.details, null, 2)
                        .split('\n')
                        .map((line, i) => (
                          <span key={i} className="block" style={{ color: line.includes('"') ? '#a6e22e' : '#f8f8f2' }}>
                            {line}
                          </span>
                        ))
                      }
                    </code>
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function DashboardComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  )
}