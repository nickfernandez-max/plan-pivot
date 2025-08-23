import React, { useState, useMemo, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Edit2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths, startOfMonth, differenceInMonths } from 'date-fns';
import { TeamMember, Team, Product, TeamMembership } from '@/types/roadmap';
import { EditTeamMemberDialog } from '@/components/EditTeamMemberDialog';


interface TeamMembersViewProps {
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  memberships: TeamMembership[];
  onAddTeamMember: (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddTeam: (team: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => void;
  onAddMembership: (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMembership: (id: string, updates: Partial<TeamMembership>) => Promise<any>;
  onDeleteMembership: (id: string) => Promise<any> | void;
}

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  team_id: z.string().min(1, "Team is required"),
  start_date: z.string().min(1, "Start date is required"),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
});

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  product_id: z.string().optional(),
  ideal_size: z.number().min(1, "Ideal team size must be at least 1").optional(),
});

export function TeamMembersView({ 
  teamMembers, 
  teams, 
  products, 
  memberships,
  onAddTeamMember, 
  onUpdateTeamMember, 
  onAddProduct, 
  onUpdateProduct,
  onAddTeam,
  onUpdateTeam,
  onAddMembership,
  onUpdateMembership,
  onDeleteMembership,
}: TeamMembersViewProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddTeamDialogOpen, setIsAddTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const form = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      role: "",
      team_id: "",
      start_date: "",
    },
  });

  // Generate timeline (6 months from now)
  const timelineMonths = useMemo(() => {
    const months = [];
    const startDate = startOfMonth(new Date());
    
    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(startDate, i);
      months.push({
        date: monthDate,
        label: format(monthDate, 'MMM yyyy'),
        shortLabel: format(monthDate, 'MMM')
      });
    }
    
    return months;
  }, []);

  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6366F1",
    },
  });

  const teamForm = useForm<z.infer<typeof teamSchema>>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      product_id: "none",
      ideal_size: 1,
    },
  });

  // Group teams by product, then team members by team
  const groupedData = useMemo(() => {
    const productsWithTeams = products.map(product => ({
      product,
      teams: teams.filter(team => team.product_id === product.id).map(team => ({
        team,
        members: teamMembers.filter(member => member.team_id === team.id)
      })).filter(group => group.members.length > 0)
    })).filter(group => group.teams.length > 0);

    const teamsWithoutProduct = teams.filter(team => !team.product_id).map(team => ({
      team,
      members: teamMembers.filter(member => member.team_id === team.id)
    })).filter(group => group.members.length > 0);

    return { productsWithTeams, teamsWithoutProduct };
  }, [teams, teamMembers, products]);

  // Calculate actual member count for a team in a specific month using memberships data
  const getActualMemberCount = (teamId: string, monthDate: Date) => {
    const monthKey = format(monthDate, 'yyyy-MM-01');
    return memberships?.filter(membership => {
      const member = teamMembers.find(tm => tm.id === membership.team_member_id);
      if (!member) return false;
      
      // Find which team the member belongs to via their memberships
      const membershipForMonth = memberships.find(m => 
        m.team_member_id === membership.team_member_id &&
        m.team_id === teamId &&
        m.start_month <= monthKey &&
        (!m.end_month || m.end_month >= monthKey)
      );
      
      return !!membershipForMonth;
    }).length || 0;
  };

  // Get color class based on staffing level
  const getStaffingColorClass = (actual: number, ideal: number) => {
    if (actual < ideal) return "text-destructive"; // Red for understaffed
    if (actual > ideal) return "text-green-600"; // Green for overstaffed
    return "text-foreground"; // Neutral for perfectly staffed
  };

  // Calculate member involvement (placeholder - could be enhanced with actual project data)
  const getMemberInvolvement = (member: TeamMember, monthDate: Date) => {
    const memberStartDate = new Date(member.start_date);
    if (monthDate >= memberStartDate) {
      // Placeholder: return 1 if member has started, could be enhanced with actual project allocation
      return 1;
    }
    return 0;
  };

  const onSubmit = (values: z.infer<typeof teamMemberSchema>) => {
    onAddTeamMember(values as Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>);
    form.reset();
    setIsAddDialogOpen(false);
  };

  const onProductSubmit = (values: z.infer<typeof productSchema>) => {
    onAddProduct(values as Omit<Product, 'id' | 'created_at' | 'updated_at'>);
    productForm.reset();
    setIsAddProductDialogOpen(false);
  };

  const onTeamSubmit = (values: z.infer<typeof teamSchema>) => {
    // Convert "none" back to empty string for database
    const submitValues = {
      ...values,
      product_id: values.product_id === "none" ? undefined : values.product_id
    };
    
    if (editingTeam) {
      onUpdateTeam(editingTeam.id, submitValues);
      setEditingTeam(null);
    } else {
      onAddTeam(submitValues as Omit<Team, 'id' | 'created_at' | 'updated_at'>);
    }
    teamForm.reset();
    setIsAddTeamDialogOpen(false);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    teamForm.reset({
      name: team.name,
      description: team.description || "",
      color: team.color || "#3B82F6",
      product_id: team.product_id || "none",
      ideal_size: team.ideal_size || 1,
    });
    setIsAddTeamDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Team Members</h2>
          <p className="text-muted-foreground">Manage your team members and their involvement over time</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddTeamDialogOpen} onOpenChange={(open) => {
            setIsAddTeamDialogOpen(open);
            if (!open) {
              setEditingTeam(null);
              teamForm.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
                <DialogDescription>
                  {editingTeam ? 'Update the team details.' : 'Create a new team for your organization.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...teamForm}>
                <form onSubmit={teamForm.handleSubmit(onTeamSubmit)} className="space-y-4">
                  <FormField
                    control={teamForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter team name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter team description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamForm.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Product</SelectItem>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamForm.control}
                    name="ideal_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ideal Team Size</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="Enter ideal team size" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsAddTeamDialogOpen(false);
                      setEditingTeam(null);
                      teamForm.reset();
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingTeam ? 'Update Team' : 'Add Team'}</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Create a new product that teams can be assigned to.
                </DialogDescription>
              </DialogHeader>
              <Form {...productForm}>
                <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
                  <FormField
                    control={productForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Product</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
              <DialogDescription>
                Add a new person to your team.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Software Engineer, Product Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Member</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Member Overview</CardTitle>
          <CardDescription>
            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} across {teams.length} team{teams.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No team members found</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Team Member
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-48">Name</TableHead>
                     <TableHead className="w-40">Role</TableHead>
                     <TableHead className="w-32">Start Date</TableHead>
                     {timelineMonths.map((month) => (
                       <TableHead key={month.label} className="text-center w-20">
                         <div className="text-xs">
                           <div>{month.shortLabel}</div>
                           <div className="text-muted-foreground">{format(month.date, 'yyyy')}</div>
                         </div>
                       </TableHead>
                     ))}
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {/* Teams grouped by products */}
                  {groupedData.productsWithTeams.map(({ product, teams: productTeams }) => (
                    <Fragment key={product.id}>
                      {/* Product header row */}
                      <TableRow className="bg-accent">
                         <TableCell 
                           colSpan={3 + timelineMonths.length}
                           className="font-bold text-lg"
                           style={{ 
                             borderLeftColor: product.color || 'hsl(var(--primary))',
                             borderLeftWidth: '6px'
                           }}
                         >
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            {product.name}
                            <Badge variant="secondary">
                              {productTeams.reduce((sum, { members }) => sum + members.length, 0)} member{productTeams.reduce((sum, { members }) => sum + members.length, 0) !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Teams within this product */}
                      {productTeams.map(({ team, members }) => (
                        <Fragment key={team.id}>
                           {/* Team header row */}
                           <TableRow className="bg-muted/50">
                             <TableCell 
                               className="font-semibold pl-8"
                               style={{ 
                                 borderLeftColor: team.color || 'hsl(var(--primary))',
                                 borderLeftWidth: '4px'
                               }}
                             >
                               <div className="flex items-center gap-3">
                                 <span>{team.name}</span>
                                 <Badge variant="secondary" className="text-xs">
                                   Ideal: {team.ideal_size || 1}
                                 </Badge>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => handleEditTeam(team)}
                                   className="h-6 w-6 p-0 ml-auto"
                                 >
                                   <Edit2 className="w-3 h-3" />
                                 </Button>
                               </div>
                             </TableCell>
                             <TableCell className="font-semibold text-muted-foreground">
                               <span className="text-xs">Actual →</span>
                             </TableCell>
                             <TableCell></TableCell>
                             {timelineMonths.map((month) => {
                               const actualCount = getActualMemberCount(team.id, month.date);
                               const idealCount = team.ideal_size || 1;
                               return (
                                 <TableCell key={month.label} className="text-center">
                                   <Badge 
                                     variant="outline" 
                                     className={`text-xs px-1 py-0 min-w-[20px] justify-center ${getStaffingColorClass(actualCount, idealCount)}`}
                                   >
                                     {actualCount}
                                   </Badge>
                                 </TableCell>
                               );
                             })}
                           </TableRow>
                          
                          {/* Team member rows */}
                          {members.map((member) => (
                            <TableRow key={member.id}>
                               <TableCell className="font-medium pl-12">
                                 <div className="flex items-center justify-between gap-2">
                                   <span className="truncate">{member.name}</span>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-6 w-6 p-0"
                                     onClick={() => setEditingMember(member)}
                                     title="Edit memberships"
                                   >
                                     <Edit2 className="w-3 h-3" />
                                   </Button>
                                 </div>
                               </TableCell>
                               <TableCell className="text-muted-foreground">{member.role}</TableCell>
                              <TableCell>{format(new Date(member.start_date), 'MMM d, yyyy')}</TableCell>
                              {timelineMonths.map((month) => {
                                const involvement = getMemberInvolvement(member, month.date);
                                return (
                                  <TableCell key={month.label} className="text-center">
                                    <div 
                                      className="w-8 h-8 mx-auto rounded flex items-center justify-center text-xs font-medium"
                                      style={{
                                        backgroundColor: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))') + '20'
                                          : 'transparent',
                                        color: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))')
                                          : 'hsl(var(--muted-foreground))',
                                        border: involvement > 0 
                                          ? `1px solid ${team.color || 'hsl(var(--primary))'}`
                                          : '1px solid hsl(var(--border))'
                                      }}
                                    >
                                      {involvement > 0 ? involvement : ''}
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                    </Fragment>
                  ))}

                  {/* Teams without products */}
                  {groupedData.teamsWithoutProduct.length > 0 && (
                    <Fragment>
                      <TableRow className="bg-accent">
                         <TableCell 
                           colSpan={3 + timelineMonths.length}
                           className="font-bold text-lg"
                         >
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Unassigned Teams
                            <Badge variant="secondary">
                              {groupedData.teamsWithoutProduct.reduce((sum, { members }) => sum + members.length, 0)} member{groupedData.teamsWithoutProduct.reduce((sum, { members }) => sum + members.length, 0) !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {groupedData.teamsWithoutProduct.map(({ team, members }) => (
                        <Fragment key={team.id}>
                           {/* Team header row */}
                           <TableRow className="bg-muted/50">
                             <TableCell 
                               className="font-semibold pl-8"
                               style={{ 
                                 borderLeftColor: team.color || 'hsl(var(--primary))',
                                 borderLeftWidth: '4px'
                               }}
                             >
                               <div className="flex items-center gap-3">
                                 <span>{team.name}</span>
                                 <Badge variant="secondary" className="text-xs">
                                   Ideal: {team.ideal_size || 1}
                                 </Badge>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => handleEditTeam(team)}
                                   className="h-6 w-6 p-0 ml-auto"
                                 >
                                   <Edit2 className="w-3 h-3" />
                                 </Button>
                               </div>
                             </TableCell>
                             <TableCell className="font-semibold text-muted-foreground">
                               <span className="text-xs">Actual →</span>
                             </TableCell>
                             <TableCell></TableCell>
                             {timelineMonths.map((month) => {
                               const actualCount = getActualMemberCount(team.id, month.date);
                               const idealCount = team.ideal_size || 1;
                               return (
                                 <TableCell key={month.label} className="text-center">
                                   <Badge 
                                     variant="outline" 
                                     className={`text-xs px-1 py-0 min-w-[20px] justify-center ${getStaffingColorClass(actualCount, idealCount)}`}
                                   >
                                     {actualCount}
                                   </Badge>
                                 </TableCell>
                               );
                             })}
                           </TableRow>
                          
                          {/* Team member rows */}
                          {members.map((member) => (
                             <TableRow key={member.id}>
                               <TableCell className="font-medium pl-12">
                                 <div className="flex items-center justify-between gap-2">
                                   <span className="truncate">{member.name}</span>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-6 w-6 p-0"
                                     onClick={() => setEditingMember(member)}
                                     title="Edit memberships"
                                   >
                                     <Edit2 className="w-3 h-3" />
                                   </Button>
                                 </div>
                               </TableCell>
                               <TableCell className="text-muted-foreground">{member.role}</TableCell>
                              <TableCell>{format(new Date(member.start_date), 'MMM d, yyyy')}</TableCell>
                              {timelineMonths.map((month) => {
                                const involvement = getMemberInvolvement(member, month.date);
                                return (
                                  <TableCell key={month.label} className="text-center">
                                    <div 
                                      className="w-8 h-8 mx-auto rounded flex items-center justify-center text-xs font-medium"
                                      style={{
                                        backgroundColor: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))') + '20'
                                          : 'transparent',
                                        color: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))')
                                          : 'hsl(var(--muted-foreground))',
                                        border: involvement > 0 
                                          ? `1px solid ${team.color || 'hsl(var(--primary))'}`
                                          : '1px solid hsl(var(--border))'
                                      }}
                                    >
                                      {involvement > 0 ? involvement : ''}
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                    </Fragment>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditTeamMemberDialog
        member={editingMember}
        teams={teams}
        memberships={memberships}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onAddMembership={onAddMembership}
        onUpdateMembership={onUpdateMembership}
        onDeleteMembership={onDeleteMembership}
      />
    </div>
  );
}
