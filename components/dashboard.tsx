'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
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

const queryClient = new QueryClient()

interface ResourceDetails {
  apiVersion: string;
  kind: string;
  metadata: {
    labels?: { [key: string]: string };
  };
}

function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState<{ type: string; name: string; namespace: string; details?: ResourceDetails } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [selectedResources, setSelectedResources] = useState<{ [key: string]: boolean }>({})
  const [mounted, setMounted] = useState(false)
  const [apiResources, setApiResources] = useState<{ [key: string]: string[] }>({})
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
        'Pods', 'Deployments', 'Services', 'Configmaps', 'Secrets', 'Ingresses',
        'Namespaces', 'Persistentvolumeclaims', 'Horizontalpodautoscalers', 'Cronjobs'
      ]

      setQuickAccessResources(
        resourceTypes.filter((type: string) => commonResources.includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()))
      )

      const groupedResources = {
        'Core (v1)': resourceTypes.filter((type: string) =>
          ['Pods', 'Services', 'Namespaces', 'Configmaps', 'Secrets'].includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
        ),
        'Apps': resourceTypes.filter((type: string) =>
          ['Deployments', 'Statefulsets', 'Daemonsets'].includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
        ),
        'Other': resourceTypes.filter((type: string) =>
          !commonResources.includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
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

  const handleResourceClick = async (resource: { type: string; name: string; namespace: string; details?: ResourceDetails }) => {
    if (selectedResource?.type === resource.type && selectedResource?.name === resource.name) {
      setSelectedResource(null)
      return
    }

    try {
      const response = await fetch(`http://localhost:8080/details/${resource.type.toLowerCase()}/${resource.name}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch details for ${resource.type}/${resource.name}`)
      }
      const details = await response.json()
      setSelectedResource({
        ...resource,
        details,
        namespace: resource.namespace
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

          const resources = names.map((name: string) => ({
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
    Pods: '#ADD8E6',         // Light Blue
    Deployments: '#90EE90',  // Light Green
    Services: '#87CEFA',     // Sky Blue
    Configmaps: '#98FB98',   // Pale Green
    Secrets: '#FFD700',      // Gold
    Ingresses: '#FFA07A',    // Light Salmon
    Namespaces: '#9370DB',   // Medium Purple
    Persistentvolumeclaims: '#FFDAB9', // Peach Puff
    Horizontalpodautoscalers: '#AFEEEE', // Pale Turquoise
    Cronjobs: '#E6E6FA',     // Lavender
    Statefulsets: '#FFB6C1', // Light Pink
    Daemonsets: '#F0E68C',   // Khaki
    Jobs: '#D8BFD8',         // Thistle
    Configurations: '#B0E0E6', // Powder Blue
    Servicesaccounts: '#FF6347', // Tomato
    Nodes: '#4682B4',        // Steel Blue
    Persistentvolumes: '#FFFACD', // Lemon Chiffon
    Storageclasses: '#FFDEAD', // Navajo White
    Endpoints: '#A52A2A',    // Brown
    default: '#A9A9A9'       // Grey for any undefined types
  }), [])

  const calculatePosition = (index: number, total: number) => {
    const columns = 3
    const row = Math.floor(index / columns)
    const col = index % columns

    const itemWidth = 25
    const itemHeight = 15
    const horizontalSpacing = 10  // Increase spacing for better separation
    const verticalSpacing = 10    // Increase spacing for better separation

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
    <div className="flex h-screen">
      <div className="w-64 p-4 border-r overflow-auto bg-background text-foreground" style={{ flexShrink: 0 }}>
        <Input
          type="search"
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <Accordion type="multiple" className="w-full" defaultValue={['quick-access', 'all-objects', 'Core (v1)', 'Apps', 'Other']}>
          <AccordionItem value="quick-access">
            <AccordionTrigger>Quick Access</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {quickAccessResources.map(resource => (
                  <Toggle
                    key={resource.charAt(0).toUpperCase() + resource.slice(1)}
                    pressed={selectedResources[resource] || false}
                    onPressedChange={() => {
                      console.log('Toggle pressed for:', resource)
                      toggleResourceSelection(resource)
                    }}
                    className={
                      selectedResources[resource]
                        ? 'bg-light-blue-700 text-white'  // Active state
                        : 'bg-light-blue-200 text-black hover:bg-light-blue-400' // Inactive state
                    }
                  >
                    {resource.charAt(0).toUpperCase() + resource.slice(1)}
                  </Toggle>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="all-objects">
            <AccordionTrigger>All Objects</AccordionTrigger>
            <AccordionContent>
              {Object.entries(apiResources).map(([group, resources]) => (
                <Accordion type="multiple" className="w-full" key={group} defaultValue={[group]}>
                  <AccordionItem value={group}>
                    <AccordionTrigger>{group}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 overflow-y-auto max-h-40">
                        {resources.map(resource => (
                          <Toggle
                            key={resource}
                            pressed={selectedResources[resource] || false}
                            onPressedChange={() => toggleResourceSelection(resource)}
                            className={
                              selectedResources[resource]
                                ? 'bg-light-green-700 text-white'  // Active state
                                : 'bg-light-green-200 text-black hover:bg-light-green-400' // Inactive state
                            }
                          >
                            {resource.charAt(0).toUpperCase() + resource.slice(1)}
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
        </div>
        <div className="border rounded-lg p-4 h-[calc(100vh-12rem)] overflow-auto max-w-full">
          <motion.div
            style={{
              scale: zoomLevel,
              transition: 'scale 0.2s',
              maxWidth: '100%',
            }}
            className="w-full h-full bg-accent/20 rounded-md relative overflow-auto"
          >
            {filteredResources.length === 0 ? (
              <div>No resources found</div>
            ) : (
              <div className="grid grid-cols-3 gap-6 overflow-y-scroll max-h-[70vh]">
                {filteredResources.map((resource, index) => (
                  <motion.div
                    key={`${resource.type}-${resource.name}`}
                    layout
                    initial={false}
                    className="p-2 rounded-md shadow-md cursor-pointer flex flex-col items-start"
                    style={{
                      backgroundColor: resourceTypeColors[resource.type.charAt(0).toUpperCase() + resource.type.slice(1).toLowerCase() as keyof typeof resourceTypeColors] || resourceTypeColors.default,
                      boxShadow: selectedResource?.type === resource.type && selectedResource?.name === resource.name ? '0px 0px 10px #000' : 'none',
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
                    <div className="text-xs mt-2 px-2 py-1 bg-gray-200 rounded-md">Type: {resource.type}</div>
                    <div className="text-xs mt-1 px-2 py-1 bg-gray-200 rounded-md">Namespace: {resource.namespace}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
      {selectedResource && (
        <Card className="flex-1 p-4 m-4 bg-card text-card-foreground h-[calc(100vh-3rem)]" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', maxWidth: '50%' }}>
          <CardHeader>
            <CardTitle className="text-xl font-bold">{selectedResource.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 h-full flex flex-col">
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
                        <span className="text-sm">{value as string | number | boolean | null | undefined}</span>
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
                <div className="mt-4 flex-1 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-indigo-600">
                  <pre className="bg-gray-900 p-4 rounded-md overflow-x-auto text-sm font-mono text-green-400" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', lineHeight: '1.5', maxWidth: '100%' }}>
                    <code>
                      {JSON.stringify(selectedResource.details, null, 2)
                        .split('\n')
                        .map((line, i) => (
                          <span key={i} className="block" style={{ color: line.includes('"') ? '#32CD32' : '#ADFF2F' }}>
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
