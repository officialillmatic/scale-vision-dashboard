
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface CallFilterBarProps {
  dateRange: [Date | null, Date | null];
  setDateRange: React.Dispatch<React.SetStateAction<[Date | null, Date | null]>>;
  totalCalls: number;
  isLoading: boolean;
}

export function CallFilterBar({ dateRange, setDateRange, totalCalls, isLoading }: CallFilterBarProps) {
  const [startDate, endDate] = dateRange;
  
  const formattedDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'MMM d, yyyy')}`;
    }
    if (endDate) {
      return `Until ${format(endDate, 'MMM d, yyyy')}`;
    }
    return 'Select date range';
  };
  
  const clearDateRange = () => {
    setDateRange([null, null]);
  };
  
  return (
    <Card className="p-4 flex flex-col sm:flex-row items-center justify-between">
      <div className="mb-4 sm:mb-0 w-full sm:w-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[300px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formattedDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={startDate || new Date()}
              selected={{
                from: startDate || undefined,
                to: endDate || undefined,
              }}
              onSelect={(range) => {
                setDateRange([range?.from || null, range?.to || null]);
              }}
              numberOfMonths={2}
            />
            <div className="flex items-center justify-between p-3 border-t">
              <Button variant="ghost" size="sm" onClick={clearDateRange}>
                Clear
              </Button>
              <Button size="sm" onClick={() => document.body.click()}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <span>
              Showing <span className="font-medium">{totalCalls}</span> calls
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
