import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Project } from '@/types/roadmap';
import { useToast } from '@/hooks/use-toast';

// Future-proof field configuration for dynamic export handling
type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'reference' | 'array';

interface ExportFieldConfig {
  displayName: string;
  type: FieldType;
  optional?: boolean;
  resolver?: (project: Project) => string | number | boolean;
  formatter?: (value: any) => string;
}

// Configuration for all Project fields with future-proof defaults
const exportFieldConfig: Record<keyof Project | string, ExportFieldConfig> = {
  name: { displayName: 'Project Name', type: 'string' },
  description: { displayName: 'Description', type: 'string', optional: true },
  link: { displayName: 'Link', type: 'string', optional: true },
  team_id: { 
    displayName: 'Team', 
    type: 'reference', 
    resolver: (project) => project.team?.name || 'Unassigned' 
  },
  start_date: { 
    displayName: 'Start Date', 
    type: 'date',
    formatter: (value) => value ? new Date(value).toLocaleDateString('en-US') : ''
  },
  end_date: { 
    displayName: 'End Date', 
    type: 'date',
    formatter: (value) => value ? new Date(value).toLocaleDateString('en-US') : ''
  },
  value_score: { displayName: 'Value Score', type: 'number' },
  is_rd: { 
    displayName: 'R&D Project', 
    type: 'boolean',
    formatter: (value) => value ? 'Yes' : 'No'
  },
  color: { displayName: 'Color', type: 'string', optional: true },
  // Handle relationship fields
  products: { 
    displayName: 'Products', 
    type: 'array',
    resolver: (project) => project.products?.map(p => p.name).join(', ') || ''
  },
  assignees: { 
    displayName: 'Assignees', 
    type: 'array',
    resolver: (project) => project.assignees?.map(a => a.name).join(', ') || ''
  }
};

// Fields to exclude from export (internal/metadata fields)
const excludeFields: Set<keyof Project> = new Set([
  'id', 'created_at', 'updated_at', 'team'
]);

export function useProjectExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToExcel = async (projects: Project[], filename?: string) => {
    if (projects.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no projects to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // Get all Project keys dynamically and filter out excluded fields
      const projectKeys = Object.keys(projects[0]) as (keyof Project)[];
      const exportableFields = projectKeys.filter(key => !excludeFields.has(key));

      // Build headers dynamically based on configuration
      const headers: string[] = [];
      const fieldProcessors: Array<(project: Project) => any> = [];

      exportableFields.forEach(field => {
        const config = exportFieldConfig[field];
        
        if (config) {
          // Use configured field
          headers.push(config.displayName);
          fieldProcessors.push((project: Project) => {
            let value: any;
            
            if (config.resolver) {
              value = config.resolver(project);
            } else {
              value = project[field];
            }

            if (config.formatter && value != null) {
              return config.formatter(value);
            }

            return value || '';
          });
        } else {
          // Auto-handle unknown fields with sensible defaults
          const fieldName = field.toString();
          const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          headers.push(displayName);
          
          fieldProcessors.push((project: Project) => {
            const value = project[field];
            
            // Smart formatting based on value type
            if (typeof value === 'boolean') {
              return value ? 'Yes' : 'No';
            } else if (value instanceof Date) {
              return value.toLocaleDateString('en-US');
            } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
              return new Date(value).toLocaleDateString('en-US');
            } else if (Array.isArray(value)) {
              return value.map(item => 
                typeof item === 'object' && item.name ? item.name : item
              ).join(', ');
            }
            
            return value || '';
          });
        }
      });

      // Transform project data using field processors
      const exportData = projects.map(project => {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = fieldProcessors[index](project);
        });
        return row;
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-fit column widths
      const columnWidths = headers.map(header => ({
        wch: Math.max(
          header.length + 2,
          Math.max(...exportData.map(row => String(row[header] || '').length)) + 2
        )
      }));
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      const sheetName = `Projects Export - ${new Date().toLocaleDateString('en-US')}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate filename with current date
      const defaultFilename = `projects-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      const finalFilename = filename || defaultFilename;

      // Download the file
      XLSX.writeFile(workbook, finalFilename);

      toast({
        title: "Export successful",
        description: `${projects.length} projects exported to ${finalFilename}`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the projects. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToExcel,
    isExporting
  };
}