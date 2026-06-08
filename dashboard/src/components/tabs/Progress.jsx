import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { m } from 'framer-motion'
import { Clock, User } from 'lucide-react'

function Progress({ data }) {
  const progress = data?.progress || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-white">Progress</h2>

      <div className="relative pl-8">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-cortex-border"></div>
        
        <ScrollArea className="h-[calc(100vh-250px)]">
          {progress.map((entry, i) => (
            <m.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative mb-6"
            >
              <div className="absolute -left-4 top-4 w-3 h-3 rounded-full bg-cortex-cyan border-2 border-cortex-bg"></div>
              
              <Card className="glass-panel border-cortex-border ml-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                    {entry.agent && (
                      <Badge variant="success">
                        <User size={12} className="mr-1" />
                        {entry.agent}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-white">{entry.task}</p>
                  
                  {entry.file_path && (
                    <Badge variant="info" className="mt-2">{entry.file_path}</Badge>
                  )}
                  
                  {entry.notes && (
                    <p className="text-sm text-gray-400 mt-2">{entry.notes}</p>
                  )}
                </CardContent>
              </Card>
            </m.div>
          ))}
          
          {progress.length === 0 && (
            <div className="text-center text-gray-500 py-8 ml-4">No progress logged yet</div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

export default Progress
