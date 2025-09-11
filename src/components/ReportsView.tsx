import { useState, useMemo, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Download, DollarSign } from 'lucide-react';
import { Project, TeamMember, ProjectAssignment } from '@/types/roadmap';
import { useUserRole } from '@/hooks/useUserRole';

interface ReportsViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  assignments: ProjectAssignment[];
}

interface AssignmentReport {
  id: string;
  projectName: string;
  teamMemberName: string;
  teamName: string;
  roleName: string;
  hourlyRate: number | null;
  startDate: string;
  endDate: string;
  percentAllocation: number;
  weeklyHours: number;
  totalHours: number;
  totalCost: number;
  projectStatus: string;
  isRnD: boolean;
  projectId: string;
  teamMemberId: string;
}

export function ReportsView({ projects, teamMembers, assignments }: ReportsViewProps) {
  const { isAdmin } = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [productFilterValue, setProductFilterValue] = useState<string>('all');
  const [statusFilterValue, setStatusFilterValue] = useState<string>('all');
  const [assigneeFilterValue, setAssigneeFilterValue] = useState<string>('all');
  const [typeFilterValue, setTypeFilterValue] = useState<string>('all');
  const [showFinancials, setShowFinancials] = useState(false);

  const projectSearchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectSearchRef.current && !projectSearchRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const STANDARD_WORK_HOURS_PER_WEEK = 40;

  // Process assignment data
  const reportData = useMemo(() => {
    const reports: AssignmentReport[] = [];

    assignments.forEach(assignment => {
      const project = projects.find(p => p.id === assignment.project_id);
      const teamMember = teamMembers.find(tm => tm.id === assignment.team_member_id);
      
      if (!project || !teamMember || !assignment.start_date || !assignment.end_date) return;

      const startDate = parseISO(assignment.start_date);
      const endDate = parseISO(assignment.end_date);
      const weeklyHours = (assignment.percent_allocation / 100) * STANDARD_WORK_HOURS_PER_WEEK;
      
      // Calculate total hours based on duration
      const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const durationInWeeks = Math.ceil(durationInDays / 7);
      const totalHours = weeklyHours * durationInWeeks;
      const hourlyRate = teamMember.role?.hourly_rate || 0;
      const totalCost = totalHours * hourlyRate;

      reports.push({
        id: assignment.id,
        projectName: project.name,
        teamMemberName: teamMember.name,
        teamName: teamMember.team?.name || 'Unknown Team',
        roleName: teamMember.role?.display_name || teamMember.role?.name || 'Unknown Role',
        hourlyRate,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        percentAllocation: assignment.percent_allocation,
        weeklyHours,
        totalHours,  
        totalCost,
        projectStatus: project.status,
        isRnD: project.is_rd,
        projectId: project.id,
        teamMemberId: teamMember.id
      });
    });

    return reports;
  }, [projects, teamMembers, assignments]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return reportData.filter(report => {
      // General search query filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        report.projectName.toLowerCase().includes(searchLower) ||
        report.teamMemberName.toLowerCase().includes(searchLower) ||
        report.teamName.toLowerCase().includes(searchLower) ||
        report.roleName.toLowerCase().includes(searchLower);

      // Selected project filter (takes priority over search term)
      const matchesProjectSelection = !selectedProjectId || report.projectId === selectedProjectId;

      // Product filter
      const project = projects.find(p => p.id === report.projectId);
      const matchesProduct = productFilterValue === 'all' || 
        project?.products?.some(p => p.id === productFilterValue);

      // Status filter  
      const matchesStatus = statusFilterValue === 'all' || report.projectStatus === statusFilterValue;

      // Assignee filter
      const matchesAssignee = assigneeFilterValue === 'all' || report.teamMemberId === assigneeFilterValue;

      // Type filter (R&D vs Product)
      const matchesType = typeFilterValue === 'all' || 
        (typeFilterValue === 'rd' && report.isRnD) ||
        (typeFilterValue === 'product' && !report.isRnD);

      return matchesSearch && matchesProjectSelection && matchesProduct && matchesStatus && matchesAssignee && matchesType;
    });
  }, [reportData, searchQuery, selectedProjectId, productFilterValue, statusFilterValue, assigneeFilterValue, typeFilterValue, projects]);

  // Filtered projects for dropdown
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm) return projects.slice(0, 10);
    return projects.filter(project =>
      project.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
    ).slice(0, 10);
  }, [projects, projectSearchTerm]);

  // Get the selected project name for display
  const selectedProjectName = selectedProjectId ? 
    projects.find(p => p.id === selectedProjectId)?.name || '' : '';

  const handleProjectSelect = (project: Project) => {
    setSelectedProjectId(project.id);
    setProjectSearchTerm(project.name);
    setShowProjectDropdown(false);
  };

  const handleProjectSearchChange = (value: string) => {
    setProjectSearchTerm(value);
    if (!value) {
      setSelectedProjectId('');
    }
    setShowProjectDropdown(value.length > 0);
  };

  const clearProjectSelection = () => {
    setProjectSearchTerm('');
    setSelectedProjectId('');
    setShowProjectDropdown(false);
  };

  // Get unique values for filters
  const availableProducts = useMemo(() => {
    const productSet = new Set<{id: string, name: string}>();
    projects.forEach(project => {
      project.products?.forEach(product => {
        productSet.add({id: product.id, name: product.name});
      });
    });
    return Array.from(productSet);
  }, [projects]);
  
  const availableStatuses = [...new Set(projects.map(p => p.status))];
  const availableAssignees = teamMembers.map(tm => ({ id: tm.id, name: tm.name }));

  // Summary statistics
  const totalHours = filteredData.reduce((sum, item) => sum + item.totalHours, 0);
  const totalCost = filteredData.reduce((sum, item) => sum + item.totalCost, 0);
  const rdHours = filteredData.filter(item => item.isRnD).reduce((sum, item) => sum + item.totalHours, 0);
  const rdCost = filteredData.filter(item => item.isRnD).reduce((sum, item) => sum + item.totalCost, 0);
  const productHours = filteredData.filter(item => !item.isRnD).reduce((sum, item) => sum + item.totalHours, 0);
  const productCost = filteredData.filter(item => !item.isRnD).reduce((sum, item) => sum + item.totalCost, 0);

  const exportToCSV = () => {
    const headers = showFinancials && isAdmin
      ? [
          'Project', 'Team Member', 'Team', 'Role', 'Hourly Rate', 'Start Date', 'End Date', 
          'Allocation %', 'Weekly Hours', 'Total Hours', 'Total Cost', 'Status', 'Type'
        ]
      : [
          'Project', 'Team Member', 'Team', 'Role', 'Start Date', 'End Date', 
          'Allocation %', 'Weekly Hours', 'Total Hours', 'Status', 'Type'
        ];
    
    const rows = filteredData.map(item => {
      const baseRow = [
        item.projectName,
        item.teamMemberName,
        item.teamName,
        item.roleName
      ];

      if (showFinancials && isAdmin) {
        baseRow.push(`$${item.hourlyRate?.toFixed(2) || '0.00'}`);
      }

      baseRow.push(
        item.startDate,
        item.endDate,
        item.percentAllocation.toString(),
        item.weeklyHours.toFixed(1),
        item.totalHours.toFixed(1)
      );

      if (showFinancials && isAdmin) {
        baseRow.push(`$${item.totalCost.toFixed(2)}`);
      }

      baseRow.push(
        item.projectStatus,
        item.isRnD ? 'R&D' : 'Product'
      );

      return baseRow;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-assignments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Project Assignment Hours Report
            </CardTitle>
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <Label htmlFor="show-financials">Show Financials</Label>
                <Switch
                  id="show-financials"
                  checked={showFinancials}
                  onCheckedChange={setShowFinancials}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Row */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[140px] relative" ref={projectSearchRef}>
                <div className="relative">
                  <Input
                    placeholder="Search projects..."
                    value={projectSearchTerm}
                    onChange={(e) => handleProjectSearchChange(e.target.value)}
                    onFocus={() => setShowProjectDropdown(projectSearchTerm.length > 0)}
                  />
                  {selectedProjectId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={clearProjectSelection}
                    >
                      ×
                    </Button>
                  )}
                </div>
                
                {showProjectDropdown && filteredProjects.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm border-b border-border last:border-b-0"
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project.team?.name} • {project.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="min-w-[120px]">
                <Select value={productFilterValue} onValueChange={setProductFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Product: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Product: All</SelectItem>
                    {availableProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={typeFilterValue} onValueChange={setTypeFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Type: All</SelectItem>
                    <SelectItem value="rd">R&D</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={statusFilterValue} onValueChange={setStatusFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    {availableStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={assigneeFilterValue} onValueChange={setAssigneeFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assignee: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Assignee: All</SelectItem>
                    {availableAssignees.map(assignee => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button onClick={exportToCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{filteredData.length}</div>
                <div className="text-sm text-muted-foreground">Assignments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totalHours.toFixed(0)}h</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
                {showFinancials && isAdmin && (
                  <div className="text-xs text-green-600 font-medium">${totalCost.toFixed(0)}</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{rdHours.toFixed(0)}h</div>
                <div className="text-sm text-muted-foreground">R&D Hours</div>
                {showFinancials && isAdmin && (
                  <div className="text-xs text-blue-600 font-medium">${rdCost.toFixed(0)}</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{productHours.toFixed(0)}h</div>
                <div className="text-sm text-muted-foreground">Product Hours</div>
                {showFinancials && isAdmin && (
                  <div className="text-xs text-green-600 font-medium">${productCost.toFixed(0)}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  {showFinancials && isAdmin && (
                    <TableHead className="text-right">Hourly Rate</TableHead>
                  )}
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Allocation %</TableHead>
                  <TableHead className="text-right">Weekly Hours</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  {showFinancials && isAdmin && (
                    <TableHead className="text-right">Total Cost</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.projectName}</TableCell>
                    <TableCell>{assignment.teamMemberName}</TableCell>
                    <TableCell>{assignment.teamName}</TableCell>
                    <TableCell>{assignment.roleName}</TableCell>
                    {showFinancials && isAdmin && (
                      <TableCell className="text-right font-mono">
                        ${assignment.hourlyRate?.toFixed(2) || '0.00'}
                      </TableCell>
                    )}
                    <TableCell>{format(parseISO(assignment.startDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(assignment.endDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right">{assignment.percentAllocation}%</TableCell>
                    <TableCell className="text-right">{assignment.weeklyHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-medium">{assignment.totalHours.toFixed(0)}h</TableCell>
                    {showFinancials && isAdmin && (
                      <TableCell className="text-right font-medium font-mono text-green-600">
                        ${assignment.totalCost.toFixed(2)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline">{assignment.projectStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.isRnD ? "default" : "secondary"}>
                        {assignment.isRnD ? 'R&D' : 'Product'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={showFinancials && isAdmin ? 13 : 11} 
                      className="text-center text-muted-foreground py-8"
                    >
                      No assignments found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}