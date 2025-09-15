import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { Role, Team, TeamMember, Product } from '@/types/roadmap';

interface ImportRow {
  positionId: string;
  name: string;
  jobTitle: string;
  product: string;
  subTeam: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

interface DataImportDialogProps {
  roles: Role[];
  teams: Team[];
  products: Product[];
  onImportComplete: () => void;
}

export function DataImportDialog({ roles, teams, products, onImportComplete }: DataImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const { toast } = useToast();

  const parseExcelFile = async (selectedFile: File) => {
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      const headers = data[0] as string[];
      const positionIdIndex = headers.findIndex(h => h?.toLowerCase().includes('position'));
      const nameIndex = headers.findIndex(h => h?.toLowerCase().includes('name'));
      const jobTitleIndex = headers.findIndex(h => h?.toLowerCase().includes('job') || h?.toLowerCase().includes('title'));
      const productIndex = headers.findIndex(h => h?.toLowerCase().includes('product'));
      const subTeamIndex = headers.findIndex(h => h?.toLowerCase().includes('team'));

      if (positionIdIndex === -1 || nameIndex === -1 || jobTitleIndex === -1 || productIndex === -1 || subTeamIndex === -1) {
        throw new Error('Required columns not found. Expected: Position ID, Name, Job Title, Product, Sub-Team');
      }

      const parsedData: ImportRow[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as string[];
        if (!row[positionIdIndex] || !row[nameIndex]) continue;

        parsedData.push({
          positionId: String(row[positionIdIndex]).trim(),
          name: String(row[nameIndex]).trim(),
          jobTitle: String(row[jobTitleIndex] || '').trim(),
          product: String(row[productIndex] || '').trim(),
          subTeam: String(row[subTeamIndex] || '').trim(),
          status: 'pending'
        });
      }

      setImportData(parsedData);
      toast({
        title: "File parsed successfully",
        description: `Found ${parsedData.length} employee records to import`,
      });
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: error instanceof Error ? error.message : "Failed to parse Excel file",
        variant: "destructive",
      });
    }
  };

  const processImport = async () => {
    if (importData.length === 0) return;

    setIsProcessing(true);
    const updatedData = [...importData];
    
    try {
      // Create missing roles and teams first
      const uniqueJobTitles = [...new Set(importData.map(row => row.jobTitle).filter(Boolean))];
      const uniqueTeamProducts = [...new Set(importData.map(row => `${row.product}|${row.subTeam}`).filter(combo => combo.split('|')[0] && combo.split('|')[1]))];

      const roleMap = new Map(roles.map(r => [r.name.toLowerCase(), r]));
      const teamMap = new Map(teams.map(t => [t.name.toLowerCase(), t]));
      const productMap = new Map(products.map(p => [p.name.toLowerCase(), p]));

      // Create missing roles
      for (const jobTitle of uniqueJobTitles) {
        if (!roleMap.has(jobTitle.toLowerCase())) {
          const { data: newRole, error } = await supabase
            .from('roles')
            .insert({ name: jobTitle, display_name: jobTitle })
            .select()
            .single();
          
          if (!error && newRole) {
            roleMap.set(jobTitle.toLowerCase(), newRole);
          }
        }
      }

      // Create missing teams with correct product assignment
      for (const teamProduct of uniqueTeamProducts) {
        const [productName, teamName] = teamProduct.split('|');
        const product = productMap.get(productName.toLowerCase());
        
        if (!teamMap.has(teamName.toLowerCase()) && product) {
          const { data: newTeam, error } = await supabase
            .from('teams')
            .insert({ name: teamName, product_id: product.id })
            .select()
            .single();
          
          if (!error && newTeam) {
            teamMap.set(teamName.toLowerCase(), newTeam);
          }
        }
      }

      // Process each employee
      for (let i = 0; i < updatedData.length; i++) {
        const row = updatedData[i];
        
        try {
          // Check if employee already exists
          const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('position_id', row.positionId)
            .single();

          if (existingMember) {
            row.status = 'error';
            row.error = 'Employee already exists';
            continue;
          }

          const role = roleMap.get(row.jobTitle.toLowerCase());
          const team = teamMap.get(row.subTeam.toLowerCase());
          const product = productMap.get(row.product.toLowerCase());

          if (!role) {
            row.status = 'error';
            row.error = 'Role not found';
            continue;
          }

          if (!product) {
            row.status = 'error';
            row.error = 'Product not found';
            continue;
          }

          if (!team) {
            row.status = 'error';
            row.error = 'Team not found';
            continue;
          }

          // Create team member
          const { error: memberError } = await supabase
            .from('team_members')
            .insert({
              name: row.name,
              position_id: row.positionId,
              role_id: role.id,
              team_id: team.id,
              start_date: new Date().toISOString().split('T')[0]
            });

          if (memberError) {
            row.status = 'error';
            row.error = memberError.message;
          } else {
            row.status = 'success';
          }
        } catch (error) {
          row.status = 'error';
          row.error = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      setImportData(updatedData);
      setImportComplete(true);
      
      const successCount = updatedData.filter(row => row.status === 'success').length;
      const errorCount = updatedData.filter(row => row.status === 'error').length;
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${successCount} employees. ${errorCount} failed.`,
      });

      if (successCount > 0) {
        onImportComplete();
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setImportData([]);
    setImportComplete(false);
    setIsProcessing(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import Employee Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Employee Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!file && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-lg font-medium">Select Excel file to upload</span>
                  <p className="text-sm text-muted-foreground mt-2">
                    File should contain: Position ID, Name, Job Title, Sub-Team columns
                  </p>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      setFile(selectedFile);
                      parseExcelFile(selectedFile);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {importData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview Import Data</h3>
                <div className="space-x-2">
                  <Button variant="outline" onClick={resetDialog}>
                    Reset
                  </Button>
                  {!importComplete && (
                    <Button 
                      onClick={processImport} 
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Import Data'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Sub-Team</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.positionId}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.jobTitle}</TableCell>
                        <TableCell>{row.product}</TableCell>
                        <TableCell>{row.subTeam}</TableCell>
                        <TableCell>
                          {row.status === 'pending' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {row.status === 'success' && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Success
                            </Badge>
                          )}
                          {row.status === 'error' && (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              {row.error}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}