import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, Save, Trash2, Edit2, X, Eye, Code, Copy, 
  Check, Star, StarOff, Loader2, ChevronDown, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Link2, Image as ImageIcon, Heading1, Heading2, List, ListOrdered,
  Undo, Redo, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface EmailTemplate {
  id: string;
  template_name: string;
  subject_line: string;
  body_html: string;
  is_default: boolean;
  created_at: string;
  description?: string;
  category?: string;
}

const DEFAULT_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
      padding: 30px;
      text-align: center;
    }
    .logo {
      max-width: 180px;
      height: auto;
    }
    .content {
      padding: 30px;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #DA123E;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    h1 { color: #1a1a2e; margin-bottom: 20px; }
    p { line-height: 1.6; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/Public-assets/logo.png" 
           alt="Universal Stock Trade" class="logo" />
    </div>
    <div class="content">
      <h1>Hello {{name}},</h1>
      <p>Your personalized content here...</p>
      <a href="#" class="button">Take Action</a>
    </div>
    <div class="footer">
      <p>Universal Stock Trade • support@ustrader24.online</p>
      <p>&copy; 2024 Universal Stock Trade. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

export function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  
  const [formData, setFormData] = useState({
    template_name: '',
    subject_line: '',
    body_html: DEFAULT_TEMPLATE_HTML,
    description: '',
    category: 'general',
    is_default: false,
  });

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error(`Failed to load templates: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      template_name: '',
      subject_line: '',
      body_html: DEFAULT_TEMPLATE_HTML,
      description: '',
      category: 'general',
      is_default: false,
    });
  };

  // Edit template
  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      template_name: template.template_name,
      subject_line: template.subject_line,
      body_html: template.body_html,
      description: template.description || '',
      category: template.category || 'general',
      is_default: template.is_default || false,
    });
    setIsEditing(true);
    setIsCreating(false);
    setActiveTab('editor');
  };

  // Create new template
  const handleCreate = () => {
    resetForm();
    setSelectedTemplate(null);
    setIsCreating(true);
    setIsEditing(false);
    setActiveTab('editor');
  };

  // Save template
  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!formData.subject_line.trim()) {
      toast.error('Please enter a subject line');
      return;
    }
    if (!formData.body_html.trim()) {
      toast.error('Please enter email content');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (isCreating) {
        // Insert new template
        const { error } = await supabase
          .from('email_templates')
          .insert({
            template_name: formData.template_name,
            subject_line: formData.subject_line,
            body_html: formData.body_html,
            description: formData.description,
            category: formData.category,
            is_default: formData.is_default,
            created_by: session.user.id,
          });

        if (error) throw error;
        toast.success('Template created successfully!');
      } else if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update({
            template_name: formData.template_name,
            subject_line: formData.subject_line,
            body_html: formData.body_html,
            description: formData.description,
            category: formData.category,
            is_default: formData.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully!');
      }

      setIsEditing(false);
      setIsCreating(false);
      fetchTemplates();
      resetForm();
    } catch (error: any) {
      toast.error(`Failed to save template: ${error.message}`);
    }
  };

  // Delete template
  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete template "${template.template_name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;
      toast.success('Template deleted');
      fetchTemplates();
      if (selectedTemplate?.id === template.id) {
        setIsEditing(false);
        setSelectedTemplate(null);
      }
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  // Set as default (removes default from others)
  const setAsDefault = async (template: EmailTemplate) => {
    try {
      // Remove default from all templates
      await supabase
        .from('email_templates')
        .update({ is_default: false })
        .neq('id', template.id);
      
      // Set this template as default
      const { error } = await supabase
        .from('email_templates')
        .update({ is_default: true })
        .eq('id', template.id);

      if (error) throw error;
      toast.success(`${template.template_name} is now the default template`);
      fetchTemplates();
    } catch (error: any) {
      toast.error(`Failed to set as default: ${error.message}`);
    }
  };

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body_html;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setFormData({ ...formData, body_html: newText });
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 10);
    }
  };

  const getPreviewHtml = () => {
    return formData.body_html
      .replace(/{{name}}/g, 'John Doe')
      .replace(/{{email}}/g, 'user@example.com')
      .replace(/{{date}}/g, new Date().toLocaleDateString())
      .replace(/{{amount}}/g, '€1,000')
      .replace(/{{transaction_id}}/g, 'TXN-123456789');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#DA123E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Email Templates</h2>
          <p className="text-gray-400">Create and manage professional email templates</p>
        </div>
        <Button onClick={handleCreate} className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {/* Template List */}
      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card className="bg-[#1a0b2e] border-[#DA123E33]">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">No templates yet. Create your first template!</p>
              <Button onClick={handleCreate} variant="outline" className="mt-4 border-[#DA123E33] text-gray-300">
                <Plus className="w-4 h-4 mr-2" /> Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="bg-[#1a0b2e] border-[#DA123E33] hover:border-[#DA123E] transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{template.template_name}</h3>
                      {template.is_default && (
                        <Badge className="bg-gold text-black text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEdit(template)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setAsDefault(template)}
                        className="text-gray-400 hover:text-yellow-500"
                        title="Set as default"
                      >
                        {template.is_default ? <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(template)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-gray-400 line-clamp-1">
                    {template.subject_line}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                    <span className="truncate max-w-[200px]">{template.category || 'General'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {(isEditing || isCreating) && (
        <Dialog open={true} onOpenChange={() => {
          setIsEditing(false);
          setIsCreating(false);
          resetForm();
        }}>
          <DialogContent className={`max-w-6xl max-h-[90vh] overflow-y-auto bg-[#1a0b2e] border border-[#DA123E33] ${fullscreen ? 'fixed inset-0 max-w-none rounded-none' : ''}`}>
            <DialogHeader>
              <DialogTitle className="text-white flex justify-between items-center">
                <span>{isCreating ? 'Create New Template' : `Edit Template: ${selectedTemplate?.template_name}`}</span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFullscreen(!fullscreen)}
                    className="text-gray-400"
                  >
                    {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsEditing(false);
                      setIsCreating(false);
                      resetForm();
                    }}
                    className="text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#0b0821] border border-[#DA123E33]">
                <TabsTrigger value="editor" className="data-[state=active]:bg-[#DA123E] data-[state=active]:text-white">
                  <Code className="w-4 h-4 mr-2" /> Editor
                </TabsTrigger>
                <TabsTrigger value="preview" className="data-[state=active]:bg-[#DA123E] data-[state=active]:text-white">
                  <Eye className="w-4 h-4 mr-2" /> Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-4 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Template Name *</Label>
                    <Input
                      value={formData.template_name}
                      onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                      placeholder="e.g., Welcome Email, Deposit Confirmation"
                      className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Category</Label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full mt-1 p-2 bg-[#0b0821] border border-[#DA123E33] rounded-md text-white"
                    >
                      <option value="general">General</option>
                      <option value="welcome">Welcome</option>
                      <option value="transaction">Transaction</option>
                      <option value="security">Security</option>
                      <option value="promotion">Promotion</option>
                      <option value="announcement">Announcement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Subject Line *</Label>
                  <Input
                    value={formData.subject_line}
                    onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                    placeholder="Email subject line"
                    className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Description (Optional)</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template"
                    className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                  />
                </div>

                {/* Variables Help */}
                <div className="p-3 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                  <p className="text-sm text-gray-300 mb-2">Available Variables (click to insert):</p>
                  <div className="flex flex-wrap gap-2">
                    {['{{name}}', '{{email}}', '{{date}}', '{{amount}}', '{{transaction_id}}'].map((variable) => (
                      <Button
                        key={variable}
                        size="sm"
                        variant="outline"
                        onClick={() => insertVariable(variable)}
                        className="border-[#DA123E33] text-gray-300 hover:bg-[#DA123E] hover:text-white"
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* HTML Editor */}
                <div>
                  <Label className="text-gray-300">HTML Content *</Label>
                  <div className="mt-1 border border-[#DA123E33] rounded-lg overflow-hidden">
                    <div className="bg-[#0b0821] p-2 border-b border-[#DA123E33] flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => insertVariable('<strong>')} className="text-gray-400">B</Button>
                      <Button size="sm" variant="ghost" onClick={() => insertVariable('<em>')} className="text-gray-400">I</Button>
                      <div className="w-px h-6 bg-[#DA123E33] mx-1" />
                      <Button size="sm" variant="ghost" onClick={() => insertVariable('<h1>')} className="text-gray-400">H1</Button>
                      <Button size="sm" variant="ghost" onClick={() => insertVariable('<h2>')} className="text-gray-400">H2</Button>
                      <div className="w-px h-6 bg-[#DA123E33] mx-1" />
                      <Button size="sm" variant="ghost" onClick={() => insertVariable('<a href="#">')} className="text-gray-400">Link</Button>
                      <Button size="sm" variant="ghost" onClick={() => insertVariable('<img src="url" alt="description" />')} className="text-gray-400">Image</Button>
                    </div>
                    <Textarea
                      id="html-editor"
                      value={formData.body_html}
                      onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                      placeholder="<h1>Hello {{name}},</h1><p>Your message here...</p>"
                      rows={20}
                      className="font-mono text-sm bg-[#0b0821] border-0 text-white resize-none"
                    />
                  </div>
                </div>

                {/* Default Template Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                  <Label className="text-gray-300">Set as default template</Label>
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border border-[#DA123E33] rounded-lg overflow-hidden bg-white">
                  <div className="bg-gray-100 p-2 border-b flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subject: {formData.subject_line || 'No subject'}</span>
                    <Button size="sm" variant="ghost" onClick={() => setActiveTab('editor')} className="text-gray-600">
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <div 
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setIsCreating(false);
                  resetForm();
                }}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white">
                <Save className="w-4 h-4 mr-2" />
                {isCreating ? 'Create Template' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}