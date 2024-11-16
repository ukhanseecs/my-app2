
import { Toggle } from '@/components/ui/toggle'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ResourceListProps {
  quickAccessResources: string[];
  apiResources: { [key: string]: string[] };
  selectedResources: { [key: string]: boolean };
  toggleResourceSelection: (resource: string) => void;
}

function ResourceList({ quickAccessResources, apiResources, selectedResources, toggleResourceSelection }: ResourceListProps) {
  return (
    <Accordion type="multiple" className="w-full" defaultValue={['quick-access', 'all-objects', 'Core (v1)', 'Apps', 'Other']}>
      <AccordionItem value="quick-access">
        <AccordionTrigger>Quick Access</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            {quickAccessResources.map(resource => (
              <Toggle
                key={resource.charAt(0).toUpperCase() + resource.slice(1)}
                pressed={selectedResources[resource] || false}
                onPressedChange={() => toggleResourceSelection(resource)}
                className={
                  selectedResources[resource]
                    ? 'bg-light-blue-700 text-white'
                    : 'bg-light-blue-200 text-black hover:bg-light-blue-400'
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
                            ? 'bg-light-green-700 text-white'
                            : 'bg-light-green-200 text-black hover:bg-light-green-400'
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
  )
}

export { ResourceList }