
import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  queryExecutionTime: number;
  renderTime: number;
  memoryUsage: number;
  timestamp: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = () => {
    const startTime = performance.now();
    setIsMonitoring(true);
    
    return {
      endMonitoring: () => {
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        const newMetric: PerformanceMetrics = {
          queryExecutionTime: executionTime,
          renderTime: 0, // Will be updated by render monitoring
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          timestamp: Date.now()
        };
        
        setMetrics(prev => [...prev.slice(-9), newMetric]); // Keep last 10 metrics
        setIsMonitoring(false);
        
        // Log performance for development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PERFORMANCE] ${componentName}: ${executionTime.toFixed(2)}ms`);
        }
      }
    };
  };

  const getAverageExecutionTime = () => {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, metric) => sum + metric.queryExecutionTime, 0) / metrics.length;
  };

  const getPerformanceScore = () => {
    const avgTime = getAverageExecutionTime();
    if (avgTime < 100) return 'Excellent';
    if (avgTime < 300) return 'Good';
    if (avgTime < 1000) return 'Fair';
    return 'Poor';
  };

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    getAverageExecutionTime,
    getPerformanceScore
  };
};
