// This file is created as requested.
'use client';

import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    status: string[];
    department: string[];
    location: string[];
    experience: { min: number; max: number };
  };
  onFiltersChange: (filters: any) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange
}) => {
  const [localFilters, setLocalFilters] = React.useState(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      status: [],
      department: [],
      location: [],
      experience: { min: 0, max: 20 }
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const statusOptions = [
    { value: 'applied', label: 'Applied' },
    { value: 'screening', label: 'Screening' },
    { value: 'interview', label: 'Interview' },
    { value: 'offer', label: 'Offer' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const departmentOptions = [
    { value: 'engineering', label: 'Engineering' },
    { value: 'product', label: 'Product' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'sales', label: 'Sales' }
  ];

  const locationOptions = [
    { value: 'san-francisco', label: 'San Francisco, CA' },
    { value: 'new-york', label: 'New York, NY' },
    { value: 'los-angeles', label: 'Los Angeles, CA' },
    { value: 'seattle', label: 'Seattle, WA' },
    { value: 'austin', label: 'Austin, TX' },
    { value: 'remote', label: 'Remote' }
  ];

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <div className='flex items-center space-x-2'>
            <Filter className='w-5 h-5 text-gray-600' />
            <h2 className='text-lg font-semibold text-gray-900'>Filters</h2>
          </div>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='w-5 h-5' />
          </Button>
        </div>

        <div className='p-6 space-y-6'>
          {/* Status Filter */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Status
            </label>
            <Select
              value={localFilters.status[0] || ''}
              onValueChange={(value) => {
                setLocalFilters(prev => ({
                  ...prev,
                  status: value ? [value] : []
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Statuses</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Department
            </label>
            <Select
              value={localFilters.department[0] || ''}
              onValueChange={(value) => {
                setLocalFilters(prev => ({
                  ...prev,
                  department: value ? [value] : []
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select department' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Departments</SelectItem>
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Filter */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Location
            </label>
            <Select
              value={localFilters.location[0] || ''}
              onValueChange={(value) => {
                setLocalFilters(prev => ({
                  ...prev,
                  location: value ? [value] : []
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select location' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Locations</SelectItem>
                {locationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Experience Range */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Experience Range (years)
            </label>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Min</label>
                <Select
                  value={localFilters.experience.min.toString()}
                  onValueChange={(value) => {
                    setLocalFilters(prev => ({
                      ...prev,
                      experience: { ...prev.experience, min: parseInt(value) }
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 21 }, (_, i) => i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Max</label>
                <Select
                  value={localFilters.experience.max.toString()}
                  onValueChange={(value) => {
                    setLocalFilters(prev => ({
                      ...prev,
                      experience: { ...prev.experience, max: parseInt(value) }
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 21 }, (_, i) => i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between p-6 border-t border-gray-200'>
          <Button variant='outline' onClick={handleClearFilters}>
            Clear All
          </Button>
          <div className='space-x-3'>
            <Button variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};