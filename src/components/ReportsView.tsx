import { useState, useMemo } from 'react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Filter } from 'lucide-react';
import { Project, TeamMember, ProjectAssignment } from '@/types/roadmap';

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
  startDate: string;
  endDate: string;
  percentAllocation: number;
  weeklyHours: number;
  totalHours: number;
  projectStatus: string;
  isRnD: boolean;
}

export function ReportsView({ projects, teamMembers, assignments }: ReportsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // rd, non-rd, all

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

      reports.push({
        id: assignment.id,
        projectName: project.name,
        teamMemberName: teamMember.name,
        teamName: teamMember.team?.name || 'Unknown Team',
        roleName: teamMember.role?.name || 'Unknown Role',
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        percentAllocation: assignment.percent_allocation,
        weeklyHours,
        totalHours,
        projectStatus: project.status,
        isRnD: project.is_rd
      });
    });

    return reports;
  }, [projects, teamMembers, assignments]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return reportData.filter(report => {
      // Search query filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        report.projectName.toLowerCase().includes(searchLower) ||
        report.teamMemberName.toLowerCase().includes(searchLower) ||
        report.teamName.toLowerCase().includes(searchLower) ||
        report.roleName.toLowerCase().includes(searchLower);

      // Project search filter
      const matchesProject = !projectSearch || 
        report.projectName.toLowerCase().includes(projectSearch.toLowerCase());

      // Product filter
      const project = projects.find(p => p.id === assignments.find(a => a.id === report.id)?.project_id);
      const matchesProduct = productFilter === 'all' || 
        project?.products?.some(p => p.id === productFilter);

      // Status filter  
      const matchesStatus = statusFilter === 'all' || report.projectStatus === statusFilter;

      // Assignee filter
      const matchesAssignee = assigneeFilter === 'all' || 
        teamMembers.find(tm => tm.name === assigneeFilter)?.id === assignments.find(a => a.id === report.id)?.team_member_id;

      // Type filter (R&D vs Product)
      const matchesType = typeFilter === 'all' || 
        (typeFilter === 'rd' && report.isRnD) ||
        (typeFilter === 'product' && !report.isRnD);

      return matchesSearch && matchesProject && matchesProduct && matchesStatus && matchesAssignee && matchesType;
    });
  }, [reportData, searchQuery, projectSearch, productFilter, statusFilter, assigneeFilter, typeFilter, projects, teamMembers, assignments]);

  // Get unique values for filters
  const uniqueProducts = useMemo(() => {
    const productSet = new Set<{id: string, name: string}>();
    projects.forEach(project => {
      project.products?.forEach(product => {
        productSet.add({id: product.id, name: product.name});
      });
    });
    return Array.from(productSet);
  }, [projects]);
  
  const uniqueStatuses = [...new Set(projects.map(p => p.status))];
  const uniqueAssignees = [...new Set(teamMembers.map(tm => tm.name))];

  // Summary statistics
  const totalHours = filteredData.reduce((sum, item) => sum + item.totalHours, 0);
  const rdHours = filteredData.filter(item => item.isRnD).reduce((sum, item) => sum + item.totalHours, 0);
  const productHours = filteredData.filter(item => !item.isRnD).reduce((sum, item) => sum + item.totalHours, 0);

  const exportToCSV = () => {
    const headers = [
      'Project', 'Team Member', 'Team', 'Role', 'Start Date', 'End Date', 
      'Allocation %', 'Weekly Hours', 'Total Hours', 'Status', 'Type'
    ];
    
    const rows = filteredData.map(item => [
      item.projectName,
      item.teamMemberName,
      item.teamName,
      item.roleName,
      item.startDate,
      item.endDate,
      item.percentAllocation,
      item.weeklyHours.toFixed(1),
      item.totalHours.toFixed(1),
      item.projectStatus,
      item.isRnD ? 'R&D' : 'Product'
    ]);

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
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Project Assignment Hours Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Row */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[140px]">
                <Input
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                />
              </div>

              <div className="min-w-[120px]">
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Product: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Product: All</SelectItem>
                    {uniqueProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assignee: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Assignee: All</SelectItem>
                    {uniqueAssignees.map(assignee => (
                      <SelectItem key={assignee} value={assignee}>
                        {assignee}
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
                <div className="text-2xl font-bold text-green-600">{productHours.toFixed(0)}h</div>
                <div className="text-sm text-muted-foreground">Product Hours</div>
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
                        {assignment.isRnD ? 'R&D' : 'Product'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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