import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download } from 'lucide-react';
import { Project, TeamMember, ProjectAssignment } from '@/types/roadmap';

interface ReportsViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  assignments: ProjectAssignment[];
}

interface HoursReport {
  projectName: string;
  teamMemberName: string;
  weekOf: string;
  hoursAllocated: number;
  percentageAllocation: number;
  isRnD: boolean;
  projectId: string;
  teamMemberId: string;
}

export function ReportsView({ projects, teamMembers, assignments }: ReportsViewProps) {
  const [reportType, setReportType] = useState<'project' | 'person' | 'initiative'>('project');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [initiativeFilter, setInitiativeFilter] = useState<'all' | 'rd' | 'non-rd'>('all');

  const STANDARD_WORK_HOURS_PER_WEEK = 40;

  // Calculate hours report data
  const hoursData = useMemo(() => {
    const startDateObj = parseISO(startDate);
    const endDateObj = parseISO(endDate);
    const weeks = eachWeekOfInterval({ start: startDateObj, end: endDateObj });
    
    const reports: HoursReport[] = [];

    assignments.forEach(assignment => {
      if (!assignment.start_date || !assignment.end_date) return;

      const project = projects.find(p => p.id === assignment.project_id);
      const teamMember = teamMembers.find(tm => tm.id === assignment.team_member_id);
      
      if (!project || !teamMember) return;

      const assignmentStart = parseISO(assignment.start_date);
      const assignmentEnd = parseISO(assignment.end_date);

      weeks.forEach(week => {
        const weekStart = startOfWeek(week);
        const weekEnd = endOfWeek(week);

        // Check if this week overlaps with the assignment period
        const weekOverlapsAssignment = isWithinInterval(weekStart, { start: assignmentStart, end: assignmentEnd }) ||
                                      isWithinInterval(weekEnd, { start: assignmentStart, end: assignmentEnd }) ||
                                      isWithinInterval(assignmentStart, { start: weekStart, end: weekEnd });

        if (weekOverlapsAssignment) {
          const percentageAllocation = assignment.percent_allocation || 100;
          const hoursAllocated = (percentageAllocation / 100) * STANDARD_WORK_HOURS_PER_WEEK;

          reports.push({
            projectName: project.name,
            teamMemberName: teamMember.name,
            weekOf: format(weekStart, 'yyyy-MM-dd'),
            hoursAllocated,
            percentageAllocation,
            isRnD: project.is_rd,
            projectId: project.id,
            teamMemberId: teamMember.id
          });
        }
      });
    });

    // Apply filters
    return reports.filter(report => {
      const projectMatches = selectedProject === 'all' || report.projectId === selectedProject;
      const memberMatches = selectedMember === 'all' || report.teamMemberId === selectedMember;
      const initiativeMatches = initiativeFilter === 'all' || 
                               (initiativeFilter === 'rd' && report.isRnD) ||
                               (initiativeFilter === 'non-rd' && !report.isRnD);
      
      return projectMatches && memberMatches && initiativeMatches;
    });
  }, [projects, teamMembers, assignments, startDate, endDate, selectedProject, selectedMember, initiativeFilter]);

  // Aggregate data based on report type
  const aggregatedData = useMemo(() => {
    const aggregated = new Map<string, { 
      key: string; 
      name: string; 
      totalHours: number; 
      rdHours: number; 
      nonRdHours: number; 
      projects: Set<string>;
      weeks: Set<string>;
    }>();

    hoursData.forEach(report => {
      let key: string;
      let name: string;

      switch (reportType) {
        case 'project':
          key = report.projectId;
          name = report.projectName;
          break;
        case 'person':
          key = report.teamMemberId;
          name = report.teamMemberName;
          break;
        case 'initiative':
          key = report.isRnD ? 'rd' : 'non-rd';
          name = report.isRnD ? 'R&D' : 'Product Development';
          break;
      }

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          key,
          name,
          totalHours: 0,
          rdHours: 0,
          nonRdHours: 0,
          projects: new Set(),
          weeks: new Set()
        });
      }

      const item = aggregated.get(key)!;
      item.totalHours += report.hoursAllocated;
      item.projects.add(report.projectName);
      item.weeks.add(report.weekOf);

      if (report.isRnD) {
        item.rdHours += report.hoursAllocated;
      } else {
        item.nonRdHours += report.hoursAllocated;
      }
    });

    return Array.from(aggregated.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [hoursData, reportType]);

  const totalHours = aggregatedData.reduce((sum, item) => sum + item.totalHours, 0);
  const totalRdHours = aggregatedData.reduce((sum, item) => sum + item.rdHours, 0);
  const totalNonRdHours = aggregatedData.reduce((sum, item) => sum + item.nonRdHours, 0);

  const exportToCSV = () => {
    const headers = ['Name', 'Total Hours', 'R&D Hours', 'Product Hours', 'Projects Count', 'Weeks Count'];
    const rows = aggregatedData.map(item => [
      item.name,
      item.totalHours.toFixed(1),
      item.rdHours.toFixed(1),
      item.nonRdHours.toFixed(1),
      item.projects.size,
      item.weeks.size
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hours-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Hours Reporting
          </CardTitle>
          <CardDescription>
            Analyze time allocation across projects and initiatives based on team member assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={(value: 'project' | 'person' | 'initiative') => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">By Project</SelectItem>
                  <SelectItem value="person">By Person</SelectItem>
                  <SelectItem value="initiative">By Initiative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input 
                id="start-date"
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input 
                id="end-date"
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-filter">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-filter">Team Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initiative-filter">Initiative</Label>
              <Select value={initiativeFilter} onValueChange={(value: 'all' | 'rd' | 'non-rd') => setInitiativeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Initiatives</SelectItem>
                  <SelectItem value="rd">R&D Only</SelectItem>
                  <SelectItem value="non-rd">Product Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{totalRdHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">R&D Hours</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{totalNonRdHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Product Hours</p>
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Hours by {reportType === 'project' ? 'Project' : reportType === 'person' ? 'Team Member' : 'Initiative'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">R&D Hours</TableHead>
                  <TableHead className="text-right">Product Hours</TableHead>
                  <TableHead className="text-right">% R&D</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Weeks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedData.map((item) => {
                  const rdPercentage = item.totalHours > 0 ? (item.rdHours / item.totalHours) * 100 : 0;
                  
                  return (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-blue-600">{item.rdHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-green-600">{item.nonRdHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={rdPercentage > 50 ? "default" : "secondary"}>
                          {rdPercentage.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.projects.size}</TableCell>
                      <TableCell className="text-right">{item.weeks.size}</TableCell>
                    </TableRow>
                  );
                })}
                {aggregatedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No data found for the selected filters and date range
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