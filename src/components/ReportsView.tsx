import { useState, useMemo, useEffect, useRef } from 'react';
import { format, parseISO, differenceInDays, max, min, subDays, subMonths, startOfYear, endOfDay, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Download, Calendar as CalendarIcon, X } from 'lucide-react';
import { Project, TeamMember, ProjectAssignment } from '@/types/roadmap';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

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
  const [teamFilterValue, setTeamFilterValue] = useState<string>('all');
  const [statusFilterValue, setStatusFilterValue] = useState<string>('all');
  const [assigneeFilterValue, setAssigneeFilterValue] = useState<string>('all');
  const [rdFilterValue, setRdFilterValue] = useState<string>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

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

  // Helper function to calculate hours for a date range intersection
  const calculateHoursForDateRange = (assignmentStart: string, assignmentEnd: string, percentAllocation: number, filterFromDate?: Date, filterToDate?: Date) => {
    const assignmentStartDate = parseISO(assignmentStart);
    const assignmentEndDate = parseISO(assignmentEnd);
    const weeklyHours = (percentAllocation / 100) * STANDARD_WORK_HOURS_PER_WEEK;
    
    // If no date range filter, calculate full assignment duration
    if (!filterFromDate || !filterToDate) {
      const durationInDays = Math.ceil((assignmentEndDate.getTime() - assignmentStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const durationInWeeks = Math.ceil(durationInDays / 7);
      return weeklyHours * durationInWeeks;
    }
    
    // Calculate intersection between assignment period and filter date range
    const intersectionStart = max([assignmentStartDate, startOfDay(filterFromDate)]);
    const intersectionEnd = min([assignmentEndDate, endOfDay(filterToDate)]);
    
    // If no intersection, return 0 hours
    if (intersectionStart > intersectionEnd) {
      return 0;
    }
    
    // Calculate hours for the intersection period
    const intersectionDays = differenceInDays(intersectionEnd, intersectionStart) + 1;
    const intersectionWeeks = intersectionDays / 7;
    return weeklyHours * intersectionWeeks;
  };

  // Process assignment data
  const reportData = useMemo(() => {
    const reports: AssignmentReport[] = [];

    assignments.forEach(assignment => {
      const project = projects.find(p => p.id === assignment.project_id);
      const teamMember = teamMembers.find(tm => tm.id === assignment.team_member_id);
      
      if (!project || !teamMember || !assignment.start_date || !assignment.end_date) return;

      const weeklyHours = (assignment.percent_allocation / 100) * STANDARD_WORK_HOURS_PER_WEEK;
      const totalHours = calculateHoursForDateRange(assignment.start_date, assignment.end_date, assignment.percent_allocation, fromDate, toDate);
      const hourlyRate = 0; // Removed financial tracking
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
  }, [projects, teamMembers, assignments, fromDate, toDate]);

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

      // Team filter
      const matchesTeam = teamFilterValue === 'all' || report.teamName === teamFilterValue;

      // Status filter  
      const matchesStatus = statusFilterValue === 'all' || report.projectStatus === statusFilterValue;

      // Assignee filter
      const matchesAssignee = assigneeFilterValue === 'all' || report.teamMemberId === assigneeFilterValue;

      // R&D filter
      const matchesRD = rdFilterValue === 'all' || 
        (rdFilterValue === 'yes' && report.isRnD) ||
        (rdFilterValue === 'no' && !report.isRnD);

      return matchesSearch && matchesProjectSelection && matchesProduct && matchesTeam && matchesStatus && matchesAssignee && matchesRD;
    });
  }, [reportData, searchQuery, selectedProjectId, productFilterValue, teamFilterValue, statusFilterValue, assigneeFilterValue, rdFilterValue, projects]);

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

  // Date range preset functions
  const setDateRangePreset = (preset: string) => {
    const today = new Date();
    switch (preset) {
      case 'last30':
        setFromDate(subDays(today, 30));
        setToDate(today);
        break;
      case 'last3months':
        setFromDate(subMonths(today, 3));
        setToDate(today);
        break;
      case 'last6months':
        setFromDate(subMonths(today, 6));
        setToDate(today);
        break;
      case 'thisyear':
        setFromDate(startOfYear(today));
        setToDate(today);
        break;
      case 'clear':
        setFromDate(undefined);
        setToDate(undefined);
        break;
    }
  };

  // Get unique values for filters
  const availableProducts = useMemo(() => {
    const productMap = new Map<string, {id: string, name: string}>();
    projects.forEach(project => {
      project.products?.forEach(product => {
        productMap.set(product.id, {id: product.id, name: product.name});
      });
    });
    return Array.from(productMap.values());
  }, [projects]);
  
  const availableTeams = useMemo(() => {
    const teamSet = new Set<string>();
    reportData.forEach(report => {
      if (report.teamName && report.teamName !== 'Unknown Team') {
        teamSet.add(report.teamName);
      }
    });
    return Array.from(teamSet).sort();
  }, [reportData]);
  
  const availableStatuses = useMemo(() => [...new Set(projects.map(p => p.status))], [projects]);
  const availableAssignees = useMemo(() => {
    const assigneeMap = new Map<string, {id: string, name: string}>();
    teamMembers.forEach(tm => {
      assigneeMap.set(tm.id, {id: tm.id, name: tm.name});
    });
    return Array.from(assigneeMap.values());
  }, [teamMembers]);

  // Summary statistics
  const totalHours = filteredData.reduce((sum, item) => sum + item.totalHours, 0);
  const totalCost = filteredData.reduce((sum, item) => sum + item.totalCost, 0);
  const rdHours = filteredData.filter(item => item.isRnD).reduce((sum, item) => sum + item.totalHours, 0);
  const rdCost = filteredData.filter(item => item.isRnD).reduce((sum, item) => sum + item.totalCost, 0);
  const nonRdHours = filteredData.filter(item => !item.isRnD).reduce((sum, item) => sum + item.totalHours, 0);
  const nonRdCost = filteredData.filter(item => !item.isRnD).reduce((sum, item) => sum + item.totalCost, 0);

  const exportToCSV = () => {
    const dateRangeStr = fromDate && toDate 
      ? `${format(fromDate, 'yyyy-MM-dd')}-to-${format(toDate, 'yyyy-MM-dd')}`
      : format(new Date(), 'yyyy-MM-dd');
    
    const headers = [
      'Project', 'Team Member', 'Team', 'Role', 'Start Date', 'End Date', 
      'Allocation %', 'Weekly Hours', 'Total Hours', 'Status', 'R&D'
    ];
    
    const dateRangeInfo = fromDate && toDate 
      ? [`Date Range: ${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`]
      : ['Date Range: All dates'];
      
    const rows = filteredData.map(item => {
      const baseRow = [
        item.projectName,
        item.teamMemberName,
        item.teamName,
        item.roleName
      ];

      baseRow.push(
        item.startDate,
        item.endDate,
        item.percentAllocation.toString(),
        item.weeklyHours.toFixed(1),
        item.totalHours.toFixed(1)
      );

      baseRow.push(
        item.projectStatus,
        item.isRnD ? 'Yes' : 'No'
      );

      return baseRow;
    });

    const csvContent = [dateRangeInfo, [], headers, ...rows]
      .map(row => Array.isArray(row) ? row.map(cell => `"${cell}"`).join(',') : '')
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-assignments-${dateRangeStr}.csv`;
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
              <Button 
                onClick={exportToCSV}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range Section */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Date Range Filter</Label>
                {(fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('clear')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3 items-center">
                {/* From Date Picker */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">From:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal text-xs",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {fromDate ? format(fromDate, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* To Date Picker */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">To:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal text-xs",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {toDate ? format(toDate, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Preset Buttons */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('last30')}
                    className="h-7 px-2 text-xs"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('last3months')}
                    className="h-7 px-2 text-xs"
                  >
                    Last 3 Months
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('last6months')}
                    className="h-7 px-2 text-xs"
                  >
                    Last 6 Months
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRangePreset('thisyear')}
                    className="h-7 px-2 text-xs"
                  >
                    This Year
                  </Button>
                </div>
              </div>

              {/* Date Range Display */}
              {(fromDate || toDate) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {fromDate && toDate ? (
                    <>Showing hours for assignments between {format(fromDate, 'PPP')} and {format(toDate, 'PPP')}</>
                  ) : fromDate ? (
                    <>Showing hours for assignments from {format(fromDate, 'PPP')} onwards</>
                  ) : toDate ? (
                    <>Showing hours for assignments up to {format(toDate, 'PPP')}</>
                  ) : null}
                </div>
              )}
            </div>

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
                <Select value={teamFilterValue} onValueChange={setTeamFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Team: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Team: All</SelectItem>
                    {availableTeams.map(team => (
                      <SelectItem key={team} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={rdFilterValue} onValueChange={setRdFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="R&D: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">R&D: All</SelectItem>
                    <SelectItem value="yes">R&D: Yes</SelectItem>
                    <SelectItem value="no">R&D: No</SelectItem>
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
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{rdHours.toFixed(0)}h</div>
                <div className="text-sm text-muted-foreground">R&D Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{nonRdHours.toFixed(0)}h</div>
                <div className="text-sm text-muted-foreground">Non-R&D Hours</div>
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
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Allocation %</TableHead>
                  <TableHead className="text-right">Weekly Hours</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>R&D</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.projectName}</TableCell>
                    <TableCell>{assignment.teamMemberName}</TableCell>
                    <TableCell>{assignment.teamName}</TableCell>
                    <TableCell>{assignment.roleName}</TableCell>
                    <TableCell>{format(parseISO(assignment.startDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(assignment.endDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right">{assignment.percentAllocation}%</TableCell>
                    <TableCell className="text-right">{assignment.weeklyHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-medium">{assignment.totalHours.toFixed(0)}h</TableCell>
                    <TableCell>
                      <Badge variant="outline">{assignment.projectStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.isRnD ? "default" : "secondary"}>
                        {assignment.isRnD ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={11} 
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