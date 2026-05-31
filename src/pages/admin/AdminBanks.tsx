// src/pages/admin/AdminBanks.tsx
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Upload, Download, Search, Trash, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { useBanks, Bank } from '@/hooks/useBanks';

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AE', name: 'UAE' },
  { code: 'SG', name: 'Singapore' },
];

export default function AdminBanks() {
  const { banks, addBank, updateBank, deleteBank, uploadBanksCSV, deleteMultipleBanks, clearAllBanks } = useBanks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [selectedBanks, setSelectedBanks] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    country: 'US',
    networkPercentage: 74,
    remark: 'average' as 'successful' | 'average' | 'poor',
  });

  // Filter banks based on search and country
  const filteredBanks = () => {
    let filtered = banks;
    if (searchQuery) {
      filtered = filtered.filter(bank => 
        bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(bank => bank.country === selectedCountry);
    }
    return filtered;
  };

  const handleAddBank = () => {
    if (!formData.name.trim()) {
      toast.error('Bank name is required');
      return;
    }
    addBank(formData);
    toast.success(`Bank "${formData.name}" added successfully`);
    setFormData({ name: '', country: 'US', networkPercentage: 74, remark: 'average' });
    setIsAddModalOpen(false);
  };

  const handleUpdateBank = () => {
    if (!editingBank) return;
    updateBank(editingBank.id, {
      name: formData.name,
      country: formData.country,
      networkPercentage: formData.networkPercentage,
      remark: formData.remark,
    });
    toast.success(`Bank "${formData.name}" updated successfully`);
    setEditingBank(null);
    setFormData({ name: '', country: 'US', networkPercentage: 74, remark: 'average' });
  };

  const handleDeleteBank = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteBank(id);
      toast.success(`Bank "${name}" deleted`);
      // Remove from selected if it was selected
      setSelectedBanks(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Toggle single bank selection
  const toggleSelectBank = (id: string) => {
    setSelectedBanks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle select all banks
  const toggleSelectAll = () => {
    const currentBanks = filteredBanks();
    if (selectedBanks.size === currentBanks.length && currentBanks.length > 0) {
      // Deselect all
      setSelectedBanks(new Set());
    } else {
      // Select all filtered banks
      const newSet = new Set<string>();
      currentBanks.forEach(bank => newSet.add(bank.id));
      setSelectedBanks(newSet);
    }
  };

  // Delete selected banks
  const handleDeleteSelected = () => {
    if (selectedBanks.size === 0) {
      toast.error('No banks selected');
      return;
    }
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSelected = () => {
    deleteMultipleBanks(Array.from(selectedBanks));
    toast.success(`Deleted ${selectedBanks.size} bank(s)`);
    setSelectedBanks(new Set());
    setIsDeleteModalOpen(false);
  };

  // Clear all banks
  const handleClearAll = () => {
    if (banks.length === 0) {
      toast.error('No banks to clear');
      return;
    }
    setIsClearAllModalOpen(true);
  };

  const confirmClearAll = () => {
    clearAllBanks();
    toast.success(`All ${banks.length} banks have been cleared`);
    setSelectedBanks(new Set());
    setIsClearAllModalOpen(false);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase().split(',');
      
      const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('bank'));
      const countryIndex = headers.findIndex(h => h.includes('country'));
      
      if (nameIndex === -1) {
        toast.error('CSV must have a "Bank Name" column');
        return;
      }
      
      const banksData: Array<{ name: string; country: string }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length > nameIndex && values[nameIndex].trim()) {
          banksData.push({
            name: values[nameIndex].trim(),
            country: countryIndex !== -1 && values[countryIndex] ? values[countryIndex].trim().toUpperCase() : 'US',
          });
        }
      }
      
      if (banksData.length === 0) {
        toast.error('No valid bank data found in CSV');
        return;
      }
      
      const newBanks = uploadBanksCSV(banksData);
      toast.success(`Successfully uploaded ${newBanks.length} banks with random percentages (54-94%)`);
    };
    
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadCSVTemplate = () => {
    const csv = 'Bank Name,Country\nJPMorgan Chase,US\nBarclays,GB\nDeutsche Bank,DE\nBNP Paribas,FR\nFirst Bank of Nigeria,NG\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const currentFilteredBanks = filteredBanks();
  const isAllSelected = currentFilteredBanks.length > 0 && selectedBanks.size === currentFilteredBanks.length;

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Bank Management</h1>
            <p className="text-muted-foreground">Manage banks for the withdrawal system. Total banks: {banks.length}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gold text-black hover:bg-gold/90">
                  <Plus className="w-4 h-4 mr-2" /> Add Bank
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Bank</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Bank Name *</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      placeholder="Enter bank name" 
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Network Percentage (54-94%)</Label>
                    <Input 
                      type="number" 
                      min={54} 
                      max={94} 
                      value={formData.networkPercentage} 
                      onChange={(e) => setFormData({ ...formData, networkPercentage: parseInt(e.target.value) || 74 })} 
                    />
                  </div>
                  <div>
                    <Label>Remark</Label>
                    <Select value={formData.remark} onValueChange={(v: any) => setFormData({ ...formData, remark: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="successful">Successful</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddBank} className="w-full bg-gold text-black">Add Bank</Button>
                </div>
              </DialogContent>
            </Dialog>

            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".csv,.txt" 
              onChange={handleCSVUpload} 
              className="hidden" 
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Upload CSV
            </Button>
            <Button variant="outline" onClick={downloadCSVTemplate}>
              <Download className="w-4 h-4 mr-2" /> Template
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            📌 <strong>CSV Upload:</strong> Each bank gets a random network percentage (54-94%). 
            Use <strong>Search</strong> to find banks, <strong>checkbox</strong> to select multiple, and <strong>Clear All</strong> to delete everything.
          </p>
        </div>

        {/* Filters + Bulk Actions */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  className="pl-9" 
                  placeholder="Search by bank name or country..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌍 All Countries ({banks.length})</SelectItem>
                  {countries.map(c => {
                    const count = banks.filter(b => b.country === c.code).length;
                    return <SelectItem key={c.code} value={c.code}>{c.name} ({count})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Action Buttons */}
            {selectedBanks.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-gold" />
                  <span className="text-sm font-medium">{selectedBanks.size} bank(s) selected</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedBanks(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-between items-center border-t pt-3">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={currentFilteredBanks.length === 0}
                >
                  {isAllSelected ? <Square className="w-4 h-4 mr-1" /> : <CheckSquare className="w-4 h-4 mr-1" />}
                  {isAllSelected ? 'Deselect All' : 'Select All'} ({currentFilteredBanks.length})
                </Button>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleClearAll}
                disabled={banks.length === 0}
              >
                <Trash className="w-4 h-4 mr-1" /> Clear All Banks
              </Button>
            </div>
          </div>
        </Card>

        {/* Banks Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={isAllSelected && currentFilteredBanks.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Network %</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentFilteredBanks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-50" />
                        <p>No banks found</p>
                        <p className="text-sm">Click "Add Bank" or "Upload CSV" to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentFilteredBanks.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedBanks.has(bank.id)}
                          onCheckedChange={() => toggleSelectBank(bank.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{bank.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-muted rounded-full text-xs">
                          {bank.country}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bank.networkPercentage >= 80 ? 'bg-green-500/20 text-green-600' :
                          bank.networkPercentage >= 65 ? 'bg-yellow-500/20 text-yellow-600' :
                          'bg-red-500/20 text-red-600'
                        }`}>
                          {bank.networkPercentage}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          bank.remark === 'successful' ? 'bg-green-500/20 text-green-600' :
                          bank.remark === 'average' ? 'bg-yellow-500/20 text-yellow-600' :
                          'bg-red-500/20 text-red-600'
                        }`}>
                          {bank.remark}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(bank.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingBank(bank);
                            setFormData({ name: bank.name, country: bank.country, networkPercentage: bank.networkPercentage, remark: bank.remark });
                          }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteBank(bank.id, bank.name)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingBank} onOpenChange={(open) => !open && setEditingBank(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Bank</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Bank Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div><Label>Country</Label><Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Network Percentage</Label><Input type="number" min={54} max={94} value={formData.networkPercentage} onChange={(e) => setFormData({ ...formData, networkPercentage: parseInt(e.target.value) || 74 })} /></div>
              <div><Label>Remark</Label><Select value={formData.remark} onValueChange={(v: any) => setFormData({ ...formData, remark: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="successful">Successful</SelectItem><SelectItem value="average">Average</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
              <Button onClick={handleUpdateBank} className="w-full bg-gold text-black">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Selected Confirmation Dialog */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Selected Banks
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete <strong>{selectedBanks.size}</strong> selected bank(s)?</p>
              <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteSelected}>Delete {selectedBanks.size} Bank(s)</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear All Confirmation Dialog */}
        <Dialog open={isClearAllModalOpen} onOpenChange={setIsClearAllModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Clear All Banks
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete <strong>ALL {banks.length} banks</strong>?</p>
              <p className="text-sm text-muted-foreground mt-2">This action cannot be undone. You will lose all bank data.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsClearAllModalOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmClearAll}>Clear All Banks</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}